import 'server-only';
import crypto from 'crypto';
import type Stripe from 'stripe';
import { prisma } from './db';
import { stripe, statementDescriptorSuffix, STRIPE_MIN_CHARGE_CENTS } from './stripe';
import { priceCart, isPriceError, FREE_SHIPPING_CENTS_THRESHOLD, FLAT_SHIPPING_CENTS, type CartLineIn } from './checkout-pricing';
import { preCreateOrder, recordOrderEvent } from './orders';
import { checkoutOrigin } from './checkout-domain';
import { sendEmail } from './email';
import type { RetailSubscription } from './generated/prisma';
import {
  subscriptionStarted,
  subscriptionUpcoming,
  subscriptionPaymentFailed,
  subscriptionEnded,
  type SubEmailLine,
} from './subscription-emails';

/**
 * Retail Subscribe & Save, for real.
 *
 * How it works, start to finish:
 *   1. A cart with Subscribe lines pays through the normal card checkout. The
 *      PaymentIntent carries a Stripe Customer and setup_future_usage, so the
 *      card is kept at Stripe. The buyer ticks a consent box first.
 *   2. When that payment succeeds, the webhook calls startSubscriptionsFromOrder,
 *      which writes one RetailSubscription per renewal schedule in the order.
 *   3. Every day /api/cron/subscription-renewals emails anyone renewing in the
 *      next three days, then charges everyone who is due. A renewal is a
 *      normal order: priced at the subscriber's locked price, persisted
 *      PENDING_PAYMENT, charged off-session, and fulfilled by the same
 *      payment_intent.succeeded webhook as every other card order.
 *   4. The buyer manages it from a signed link (skip, pause, cancel, new card).
 *
 * Stripe sees what it sees for any Merit charge: an amount, "Merit order",
 * and internal ids. No product names, no Stripe invoices, no Stripe emails.
 *
 * Practitioner accounts are not enrolled: their price depends on a signed-in
 * session that a background job does not have.
 */

export type Cadence = { unit: 'week' | 'month'; count: number };
export type SubLine = { handle: string; title: string; bundleLabel: string; unitCents: number; qty: number; imageUrl?: string | null };

const MAX_FAILED_ATTEMPTS = 3;
const RETRY_DAYS = 3;
export const REMINDER_DAYS = 3;
const OPS_TO = process.env.OPS_NOTIFY_EMAIL || 'info@meritsciences.com';

export function isSubscribeLabel(bundleLabel: string): boolean {
  return (bundleLabel || '').toLowerCase().includes('subscribe');
}

/**
 * The renewal schedule a Subscribe line was sold on, read from the label the
 * buyer saw ("Subscribe · Every 6 weeks"). The catalog's quick-add writes
 * Subscribe labels with no schedule in them; those renew monthly, which is
 * the schedule the catalog toggle advertises. Null for a one-time line.
 */
export function cadenceForLabel(bundleLabel: string): Cadence | null {
  if (!isSubscribeLabel(bundleLabel)) return null;
  const m = /every\s+(?:(\d+)\s+)?(week|month)s?/i.exec(bundleLabel);
  if (!m) return { unit: 'month', count: 1 };
  const count = m[1] ? parseInt(m[1], 10) : 1;
  if (!Number.isFinite(count) || count < 1 || count > 12) return { unit: 'month', count: 1 };
  return { unit: m[2].toLowerCase() as 'week' | 'month', count };
}

export function cadenceText(c: Cadence): string {
  return c.count === 1 ? `every ${c.unit}` : `every ${c.count} ${c.unit}s`;
}

export function addInterval(from: Date, c: Cadence, times = 1): Date {
  const d = new Date(from);
  if (c.unit === 'week') d.setUTCDate(d.getUTCDate() + 7 * c.count * times);
  else d.setUTCMonth(d.getUTCMonth() + c.count * times);
  return d;
}

const cadenceOf = (s: Pick<RetailSubscription, 'intervalUnit' | 'intervalCount'>): Cadence => ({
  unit: s.intervalUnit === 'week' ? 'week' : 'month',
  count: s.intervalCount,
});

const linesOf = (s: Pick<RetailSubscription, 'lines'>): SubLine[] => (s.lines as unknown as SubLine[]) ?? [];

/* ── Signed manage links ─────────────────────────────────────────────────
   Stateless HMAC over the subscription id, context-prefixed so a token from
   the reorder or unsubscribe flows (same secret chain) can never open one. */
const SECRET = process.env.UNSUB_SECRET || process.env.CRON_SECRET || 'merit-unsub-fallback';
const sig = (id: string) => crypto.createHmac('sha256', SECRET).update(`subscription:${id}`).digest('base64url').slice(0, 32);

export function manageToken(id: string): string {
  return `${id}.${sig(id)}`;
}

export function verifyManageToken(token: string | null | undefined): string | null {
  const t = String(token ?? '');
  const dot = t.lastIndexOf('.');
  if (dot <= 0) return null;
  const id = t.slice(0, dot);
  const given = t.slice(dot + 1);
  if (!id || id.length > 64 || given.length !== 32) return null;
  const a = Buffer.from(given);
  const b = Buffer.from(sig(id));
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? id : null;
}

/** The manage page lives on the payment domain: it mounts Stripe's card form. */
export function manageUrl(id: string): string {
  const base = (checkoutOrigin() || process.env.NEXT_PUBLIC_SITE_URL || 'https://meritsciences.com').replace(/\/$/, '');
  return `${base}/pay/subscription/${manageToken(id)}`;
}

/* ── Stripe customer for a retail subscriber ─────────────────────────────── */
export async function ensureRetailCustomer(email: string, name: string): Promise<string> {
  const e = email.trim().toLowerCase();
  const prior = await prisma.retailSubscription.findFirst({
    where: { customerEmail: e },
    orderBy: { createdAt: 'desc' },
    select: { stripeCustomerId: true },
  });
  if (prior?.stripeCustomerId) return prior.stripeCustomerId;
  const customer = await stripe().customers.create({
    email: e,
    name: name || undefined,
    // Identifies the kind of account, nothing about what it buys.
    metadata: { kind: 'retail-subscriber' },
  });
  return customer.id;
}

/* ── Quote: what a renewal costs ──────────────────────────────────────────
   Price lock: a subscriber keeps the per-unit price they signed up at for as
   long as the subscription runs (the product page promises the same reorder
   price). If the store price has since dropped, they get the lower one.
   priceCart still runs every time, because it is what knows whether each
   product can be sold today and what it is now called. */
async function quote(sub: RetailSubscription) {
  const stored = linesOf(sub);
  const lines: CartLineIn[] = stored.map((l) => ({
    handle: l.handle,
    title: l.title,
    bundleLabel: l.bundleLabel,
    unitCents: Math.max(1, Math.round(Number(l.unitCents) || 1)),
    qty: l.qty,
    imageUrl: l.imageUrl ?? undefined,
  }));
  // No code and no buyer session: the plain Subscribe price, nothing stacked.
  const priced = await priceCart({ lines, buyerEmail: sub.customerEmail });
  if (isPriceError(priced)) return priced;

  // priceCart keeps line order, so the stored price lines up by index.
  const locked = priced.lines.map((l, i) => {
    const was = Math.round(Number(stored[i]?.unitCents) || 0);
    return { ...l, unitCents: was > 0 ? Math.min(was, l.unitCents) : l.unitCents };
  });
  const subtotalCents = locked.reduce((sum, l) => sum + l.unitCents * l.qty, 0);
  const shippingCents = subtotalCents >= FREE_SHIPPING_CENTS_THRESHOLD ? 0 : FLAT_SHIPPING_CENTS;
  return { ...priced, lines: locked, subtotalCents, shippingCents, discountCents: 0, totalCents: subtotalCents + shippingCents };
}

function emailLines(lines: Array<{ title: string; qty: number; unitCents: number; imageUrl?: string | null }>): SubEmailLine[] {
  return lines.map((l) => ({ title: l.title, qty: l.qty, lineCents: Number(l.unitCents) * l.qty, imageUrl: l.imageUrl ?? null }));
}

async function mail(to: string, r: { subject: string; html: string; text: string }) {
  const res = await sendEmail({ to, subject: r.subject, html: r.html, text: r.text });
  if (!res.ok) console.error(`[subscriptions] email "${r.subject}" to ${to} failed: ${res.error}`);
}

async function tellOps(subject: string, body: string) {
  await sendEmail({ to: OPS_TO, subject, html: `<pre style="font:14px/1.5 monospace;white-space:pre-wrap">${body.replace(/</g, '&lt;')}</pre>`, text: body }).catch(() => {});
}

/* ── Start: called by the Stripe webhook after a first order is paid ─────── */
export async function startSubscriptionsFromOrder(orderId: string, pi: Stripe.PaymentIntent): Promise<number> {
  const customerId = typeof pi.customer === 'string' ? pi.customer : pi.customer?.id ?? null;
  const paymentMethodId = typeof pi.payment_method === 'string' ? pi.payment_method : pi.payment_method?.id ?? null;
  if (!customerId || !paymentMethodId) return 0;

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { lines: true } });
  if (!order || order.status === 'PENDING_PAYMENT' || order.practitionerApplicationId) return 0;

  const groups = new Map<string, { cadence: Cadence; lines: SubLine[] }>();
  for (const l of order.lines) {
    const cadence = cadenceForLabel(l.bundleLabel);
    if (!cadence) continue;
    const key = `${cadence.unit}:${cadence.count}`;
    if (!groups.has(key)) groups.set(key, { cadence, lines: [] });
    groups.get(key)!.lines.push({
      handle: l.handle, title: l.title, bundleLabel: l.bundleLabel, unitCents: Number(l.unitCents), qty: l.qty, imageUrl: l.imageUrl,
    });
  }
  if (groups.size === 0) return 0;

  let card: { brand: string | null; last4: string | null } = { brand: null, last4: null };
  try {
    const pm = await stripe().paymentMethods.retrieve(paymentMethodId);
    card = { brand: pm.card?.brand ?? null, last4: pm.card?.last4 ?? null };
    // Default instrument, so a later card update has one place to replace.
    await stripe().customers.update(customerId, { invoice_settings: { default_payment_method: paymentMethodId } });
  } catch (err) {
    console.error('[subscriptions] could not read the saved card', err);
  }

  let started = 0;
  for (const { cadence, lines } of groups.values()) {
    const where = { originOrderId_intervalUnit_intervalCount: { originOrderId: order.id, intervalUnit: cadence.unit, intervalCount: cadence.count } };
    if (await prisma.retailSubscription.findUnique({ where, select: { id: true } })) continue; // webhook redelivery

    const nextChargeAt = addInterval(new Date(), cadence);
    let sub: RetailSubscription;
    try {
      sub = await prisma.retailSubscription.create({
        data: {
          customerEmail: order.customerEmail.toLowerCase(),
          customerName: order.customerName ?? order.shippingFullName ?? '',
          customerPhone: null,
          shippingFullName: order.shippingFullName ?? order.customerName ?? '',
          shippingLine1: order.shippingLine1 ?? '',
          shippingLine2: order.shippingLine2 ?? null,
          shippingCity: order.shippingCity ?? '',
          shippingState: order.shippingState ?? '',
          shippingZip: order.shippingZip ?? '',
          stripeCustomerId: customerId,
          paymentMethodId,
          cardBrand: card.brand,
          cardLast4: card.last4,
          lines: lines as unknown as object,
          intervalUnit: cadence.unit,
          intervalCount: cadence.count,
          nextChargeAt,
          originOrderId: order.id,
          affiliateId: order.affiliateId ?? null,
        },
      });
    } catch (err: any) {
      if (err?.code === 'P2002') continue; // lost a race with a redelivery
      throw err;
    }
    started++;

    await recordOrderEvent({
      orderId: order.id,
      kind: 'ADMIN_COMMENT',
      message: `Subscription started: ${lines.map((l) => `${l.qty} x ${l.title}`).join(', ')}, ${cadenceText(cadence)}. Next charge ${nextChargeAt.toISOString().slice(0, 10)}.`,
      metadata: { retailSubscriptionId: sub.id },
    }).catch(() => {});

    const q = await quote(sub).catch(() => null);
    await mail(
      sub.customerEmail,
      subscriptionStarted({
        firstName: sub.customerName.split(' ')[0] || '',
        lines: emailLines(q && !isPriceError(q) ? q.lines : lines),
        cadence: cadenceText(cadence),
        nextChargeAt,
        renewalTotalCents: q && !isPriceError(q) ? q.totalCents : null,
        card: card.last4 ? `${card.brand ?? 'card'} ending ${card.last4}` : null,
        manageUrl: manageUrl(sub.id),
      }),
    );
  }
  return started;
}

/* ── Reminders: three days before each charge ────────────────────────────── */
export async function sendUpcomingReminders(now = new Date(), dry = false) {
  const horizon = new Date(now.getTime() + REMINDER_DAYS * 24 * 3600 * 1000);
  const due = await prisma.retailSubscription.findMany({
    where: { status: 'ACTIVE', nextChargeAt: { gt: now, lte: horizon } },
    take: 200,
  });
  const todo = due.filter((s) => !s.reminderSentFor || s.reminderSentFor.getTime() !== s.nextChargeAt.getTime());
  if (dry) return { reminders: todo.length };
  let sent = 0;
  for (const sub of todo) {
    const q = await quote(sub).catch(() => null);
    if (!q || isPriceError(q)) continue; // the renewal run reports the problem
    await mail(
      sub.customerEmail,
      subscriptionUpcoming({
        firstName: sub.customerName.split(' ')[0] || '',
        lines: emailLines(q.lines),
        chargeAt: sub.nextChargeAt,
        totalCents: q.totalCents,
        shippingCents: q.shippingCents,
        card: sub.cardLast4 ? `${sub.cardBrand ?? 'card'} ending ${sub.cardLast4}` : null,
        manageUrl: manageUrl(sub.id),
      }),
    );
    await prisma.retailSubscription.update({ where: { id: sub.id }, data: { reminderSentFor: sub.nextChargeAt } });
    sent++;
  }
  return { reminders: sent };
}

/* ── Renew one subscription ──────────────────────────────────────────────── */
export type RenewResult =
  | { id: string; outcome: 'charged'; orderId: string; totalCents: number }
  | { id: string; outcome: 'declined' | 'ended' | 'unavailable' | 'skipped' | 'error'; detail: string };

export async function renewSubscription(sub: RetailSubscription, now = new Date()): Promise<RenewResult> {
  if (sub.status !== 'ACTIVE' && sub.status !== 'PAST_DUE') return { id: sub.id, outcome: 'skipped', detail: `status ${sub.status}` };
  if (sub.nextChargeAt > now) return { id: sub.id, outcome: 'skipped', detail: 'not due' };

  const cadence = cadenceOf(sub);
  const priced = await quote(sub);
  if (isPriceError(priced) || priced.totalCents < STRIPE_MIN_CHARGE_CENTS) {
    // Usually a product that was unpublished. Do not charge, do not count it
    // against the buyer's card; try again tomorrow and tell a person.
    const detail = isPriceError(priced) ? priced.error : 'total below the card minimum';
    await prisma.retailSubscription.update({
      where: { id: sub.id },
      data: { nextChargeAt: new Date(now.getTime() + 24 * 3600 * 1000) },
    });
    await tellOps(
      `Subscription could not renew: ${sub.customerEmail}`,
      `Subscription ${sub.id} (${sub.customerEmail}) was due and could not be priced.\nReason: ${detail}\nItems: ${linesOf(sub).map((l) => `${l.qty} x ${l.title} [${l.handle}]`).join(', ')}\nNothing was charged. It will be tried again tomorrow.`,
    );
    return { id: sub.id, outcome: 'unavailable', detail };
  }

  // One key per subscription per scheduled charge: a second run on the same
  // day, or a retry after a lost response, cannot charge the cycle twice.
  const cycleKey = `${sub.id}_${sub.nextChargeAt.toISOString().slice(0, 10)}_${sub.failedAttempts}`;

  const order = await preCreateOrder({
    paypalOrderId: `pending_sub_${cycleKey}`,
    customerEmail: sub.customerEmail,
    customerName: sub.customerName,
    customerPhone: sub.customerPhone,
    shippingFullName: sub.shippingFullName,
    shippingLine1: sub.shippingLine1,
    shippingLine2: sub.shippingLine2,
    shippingCity: sub.shippingCity,
    shippingState: sub.shippingState,
    shippingZip: sub.shippingZip,
    subtotalCents: priced.subtotalCents,
    shippingCents: priced.shippingCents,
    discountCents: 0,
    totalCents: priced.totalCents,
    discountCode: null,
    affiliateId: sub.affiliateId,
    practitionerApplicationId: null,
    lines: priced.lines.map((l) => ({ handle: l.handle, title: l.title, bundleLabel: l.bundleLabel, unitCents: l.unitCents, qty: l.qty })),
  });
  // The buyer attested research use when they subscribed; the renewal ships
  // under that same attestation.
  await prisma.order.update({ where: { id: order.id }, data: { ruoAttested: true, ruoAttestedAt: sub.createdAt } }).catch(() => {});

  let pi: Stripe.PaymentIntent;
  try {
    pi = await stripe().paymentIntents.create(
      {
        amount: priced.totalCents,
        currency: 'usd',
        description: 'Merit order',
        statement_descriptor_suffix: statementDescriptorSuffix(),
        customer: sub.stripeCustomerId,
        payment_method: sub.paymentMethodId,
        payment_method_types: ['card'],
        confirm: true,
        off_session: true,
        metadata: {
          orderId: order.id,
          buyerEmail: sub.customerEmail,
          affiliateId: sub.affiliateId ?? '',
          discountCode: '',
          practitionerApplicationId: '',
          retailSubscriptionId: sub.id,
        },
      },
      { idempotencyKey: `subrenew_${cycleKey}` },
    );
  } catch (err: any) {
    const reason: string = err?.message ?? 'The card could not be charged.';
    console.error('[subscriptions] renewal charge failed', { sub: sub.id, type: err?.type, code: err?.code, decline: err?.decline_code });
    // The order never got paid; remove it so admin has no stray "awaiting payment".
    await prisma.order.deleteMany({ where: { id: order.id, status: 'PENDING_PAYMENT' } }).catch(() => {});

    if (err?.type !== 'StripeCardError') {
      // Our side or Stripe's, not the card. Leave the schedule alone: the
      // next daily run retries the same cycle under the same key.
      return { id: sub.id, outcome: 'error', detail: reason };
    }

    const attempts = sub.failedAttempts + 1;
    if (attempts >= MAX_FAILED_ATTEMPTS) {
      await prisma.retailSubscription.update({
        where: { id: sub.id },
        data: { status: 'CANCELED', canceledAt: now, cancelReason: 'payment_failed', failedAttempts: attempts },
      });
      await mail(sub.customerEmail, subscriptionEnded({ firstName: sub.customerName.split(' ')[0] || '', reason: 'payment_failed', lines: emailLines(priced.lines) }));
      return { id: sub.id, outcome: 'ended', detail: reason };
    }
    const retryAt = new Date(now.getTime() + RETRY_DAYS * 24 * 3600 * 1000);
    await prisma.retailSubscription.update({
      where: { id: sub.id },
      data: { status: 'PAST_DUE', failedAttempts: attempts, nextChargeAt: retryAt },
    });
    await mail(
      sub.customerEmail,
      subscriptionPaymentFailed({
        firstName: sub.customerName.split(' ')[0] || '',
        card: sub.cardLast4 ? `${sub.cardBrand ?? 'card'} ending ${sub.cardLast4}` : null,
        retryAt,
        attemptsLeft: MAX_FAILED_ATTEMPTS - attempts,
        manageUrl: manageUrl(sub.id),
      }),
    );
    return { id: sub.id, outcome: 'declined', detail: reason };
  }

  if (pi.status !== 'succeeded') {
    await prisma.order.deleteMany({ where: { id: order.id, status: 'PENDING_PAYMENT' } }).catch(() => {});
    return { id: sub.id, outcome: 'error', detail: `payment is ${pi.status}` };
  }

  // Point the order at the intent; payment_intent.succeeded fulfils it like
  // any other card order (confirmation email, ShipStation, commission).
  await prisma.order.update({ where: { id: order.id }, data: { paypalOrderId: pi.id } });

  // Keep the original day of the cycle unless the charge ran more than a
  // cycle late (a long pause, a string of retries); then restart from today.
  const scheduled = sub.failedAttempts > 0 || addInterval(sub.nextChargeAt, cadence) <= now ? now : sub.nextChargeAt;
  await prisma.retailSubscription.update({
    where: { id: sub.id },
    data: {
      status: 'ACTIVE',
      failedAttempts: 0,
      cycleCount: { increment: 1 },
      lastChargedAt: now,
      lastOrderId: order.id,
      nextChargeAt: addInterval(scheduled, cadence),
      reminderSentFor: null,
    },
  });
  await recordOrderEvent({
    orderId: order.id,
    kind: 'ADMIN_COMMENT',
    message: `Subscription renewal ${sub.cycleCount + 1} (${cadenceText(cadence)}), charged to ${sub.cardBrand ?? 'card'} ending ${sub.cardLast4 ?? '????'}.`,
    metadata: { retailSubscriptionId: sub.id, stripePaymentIntentId: pi.id },
  }).catch(() => {});
  return { id: sub.id, outcome: 'charged', orderId: order.id, totalCents: priced.totalCents };
}

/** Charge everything that is due. Called by the daily cron. */
export async function runRenewals(now = new Date(), limit = 50, dry = false) {
  const due = await prisma.retailSubscription.findMany({
    where: { status: { in: ['ACTIVE', 'PAST_DUE'] }, nextChargeAt: { lte: now } },
    orderBy: { nextChargeAt: 'asc' },
    take: limit,
  });
  if (dry) return { due: due.length, results: due.map((s) => ({ id: s.id, email: s.customerEmail, nextChargeAt: s.nextChargeAt })) };
  const results: RenewResult[] = [];
  for (const sub of due) {
    try {
      results.push(await renewSubscription(sub, now));
    } catch (err: any) {
      console.error('[subscriptions] renewal crashed', sub.id, err);
      results.push({ id: sub.id, outcome: 'error', detail: err?.message ?? String(err) });
    }
  }
  return { due: due.length, results };
}

/* ── Buyer and admin actions ─────────────────────────────────────────────── */
export type ManageAction = 'skip' | 'pause' | 'resume' | 'cancel';

export async function applyAction(id: string, action: ManageAction, by: 'buyer' | 'admin' = 'buyer') {
  const sub = await prisma.retailSubscription.findUnique({ where: { id } });
  if (!sub) return { ok: false as const, error: 'Subscription not found.' };
  if (sub.status === 'CANCELED') return { ok: false as const, error: 'This subscription has already ended.' };
  const now = new Date();
  const cadence = cadenceOf(sub);

  if (action === 'skip') {
    if (sub.status === 'PAUSED') return { ok: false as const, error: 'This subscription is paused.' };
    const from = sub.nextChargeAt > now ? sub.nextChargeAt : now;
    await prisma.retailSubscription.update({
      where: { id },
      data: { nextChargeAt: addInterval(from, cadence), status: 'ACTIVE', failedAttempts: 0, reminderSentFor: null },
    });
  } else if (action === 'pause') {
    await prisma.retailSubscription.update({ where: { id }, data: { status: 'PAUSED' } });
  } else if (action === 'resume') {
    if (sub.status !== 'PAUSED') return { ok: false as const, error: 'This subscription is not paused.' };
    // Never charge the moment someone resumes: give the reminder email its window.
    const earliest = new Date(now.getTime() + (REMINDER_DAYS + 1) * 24 * 3600 * 1000);
    await prisma.retailSubscription.update({
      where: { id },
      data: { status: 'ACTIVE', failedAttempts: 0, reminderSentFor: null, nextChargeAt: sub.nextChargeAt > earliest ? sub.nextChargeAt : earliest },
    });
  } else if (action === 'cancel') {
    await prisma.retailSubscription.update({
      where: { id },
      data: { status: 'CANCELED', canceledAt: now, cancelReason: by === 'admin' ? 'canceled_by_merit' : 'canceled_by_customer' },
    });
    await mail(sub.customerEmail, subscriptionEnded({ firstName: sub.customerName.split(' ')[0] || '', reason: 'canceled', lines: emailLines(linesOf(sub)) }));
  } else {
    return { ok: false as const, error: 'Unknown action.' };
  }
  return { ok: true as const, subscription: await prisma.retailSubscription.findUnique({ where: { id } }) };
}

/** Replace the card after the buyer confirms a SetupIntent on the manage page. */
export async function replaceCard(id: string, setupIntentId: string) {
  const sub = await prisma.retailSubscription.findUnique({ where: { id } });
  if (!sub) return null;
  const si = await stripe().setupIntents.retrieve(setupIntentId, { expand: ['payment_method'] });
  const pm = si.payment_method as Stripe.PaymentMethod | null;
  // The id came from the browser: only trust it if it belongs to this customer.
  if (si.status !== 'succeeded' || si.customer !== sub.stripeCustomerId || !pm || typeof pm === 'string' || !pm.card) return null;
  await stripe().customers.update(sub.stripeCustomerId, { invoice_settings: { default_payment_method: pm.id } }).catch(() => {});
  const now = new Date();
  // Every subscription this buyer holds moves to the new card. One that was
  // past due is tried again on the next daily run.
  await prisma.retailSubscription.updateMany({
    where: { stripeCustomerId: sub.stripeCustomerId, status: { not: 'CANCELED' } },
    data: { paymentMethodId: pm.id, cardBrand: pm.card.brand, cardLast4: pm.card.last4 },
  });
  await prisma.retailSubscription.updateMany({
    where: { stripeCustomerId: sub.stripeCustomerId, status: 'PAST_DUE' },
    data: { status: 'ACTIVE', failedAttempts: 0, nextChargeAt: now },
  });
  return { brand: pm.card.brand, last4: pm.card.last4 };
}

/** Everything the manage page shows. */
export async function describeSubscription(id: string) {
  const sub = await prisma.retailSubscription.findUnique({ where: { id } });
  if (!sub) return null;
  const q = sub.status === 'CANCELED' ? null : await quote(sub).catch(() => null);
  const priced = q && !isPriceError(q) ? q : null;
  return {
    id: sub.id,
    status: sub.status,
    cadence: cadenceText(cadenceOf(sub)),
    nextChargeAt: sub.nextChargeAt.toISOString(),
    card: sub.cardLast4 ? `${sub.cardBrand ?? 'card'} ending ${sub.cardLast4}` : null,
    shipTo: [sub.shippingFullName, sub.shippingLine1, sub.shippingLine2, `${sub.shippingCity}, ${sub.shippingState} ${sub.shippingZip}`].filter(Boolean).join(', '),
    lines: (priced ? priced.lines : linesOf(sub)).map((l) => ({ title: l.title, qty: l.qty, lineCents: Number(l.unitCents) * l.qty, imageUrl: l.imageUrl ?? null })),
    subtotalCents: priced?.subtotalCents ?? null,
    shippingCents: priced?.shippingCents ?? null,
    totalCents: priced?.totalCents ?? null,
    failedAttempts: sub.failedAttempts,
    cycleCount: sub.cycleCount,
  };
}
