import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import Stripe from 'stripe';
import { prisma } from './db';
import { stripe, statementDescriptorSuffix } from './stripe';
import { recordOrderEvent } from './orders';

/**
 * Card-on-file for practitioner accounts.
 *
 * Two constraints shape this file.
 *
 * 1. Stripe must never see meritsciences.com. The storefront and the payment
 *    domain are deliberately separated, so card capture has to happen on the
 *    checkout origin — which is also where the practitioner's storefront
 *    session does not exist. Hence the signed token below: the storefront
 *    mints it from a verified session, and the checkout origin verifies it
 *    without needing that session.
 *
 * 2. We store nothing that could reconstruct a card. Brand, last4 and expiry
 *    are mirrored only so the portal can say which card is on file; the
 *    instrument stays at Stripe behind a PaymentMethod id.
 */

const SECRET = process.env.CRON_SECRET || 'dev-secret';
/** Deliberately short — it authorises attaching a card to an account. */
const TTL_MS = 30 * 60 * 1000;
/**
 * An emailed link needs longer than a portal click-through: the provider gets
 * to it after clinic, not in the next half hour. A week is the balance
 * between that and a forwarded email becoming a standing grant.
 */
export const EMAILED_CARD_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function mac(payload: string): string {
  return createHmac('sha256', SECRET).update(`card:${payload}`).digest('base64url').slice(0, 32);
}

/** Sign a short-lived grant to add a card to one practice. */
export function signCardToken(applicationId: string, now: number, ttlMs: number = TTL_MS): string {
  const payload = Buffer.from(JSON.stringify({ a: applicationId, e: now + ttlMs })).toString('base64url');
  return `${payload}.${mac(payload)}`;
}

/** Returns the application id, or null if forged, malformed or expired. */
export function verifyCardToken(token: string | null | undefined, now: number): string | null {
  if (!token) return null;
  const i = token.lastIndexOf('.');
  if (i <= 0) return null;
  const payload = token.slice(0, i);
  const expected = mac(payload);
  const a = Buffer.from(token.slice(i + 1));
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { a: applicationId, e } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof applicationId !== 'string' || typeof e !== 'number' || e < now) return null;
    return applicationId;
  } catch {
    return null;
  }
}

/**
 * The Stripe Customer for a practice, created on first use.
 *
 * Nothing product-identifying goes to Stripe — same rule the PaymentIntent
 * path follows. The metadata carries our application id so a Stripe-side
 * lookup can find the account, and nothing about what they buy.
 */
export async function ensureStripeCustomer(applicationId: string): Promise<string> {
  const app = await prisma.practitionerApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, email: true, practiceName: true, stripeCustomerId: true },
  });
  if (!app) throw new Error('Application not found');
  if (app.stripeCustomerId) return app.stripeCustomerId;

  const customer = await stripe().customers.create(
    {
      email: app.email,
      name: app.practiceName,
      metadata: { applicationId: app.id },
    },
    { idempotencyKey: `practitioner-customer-${app.id}` },
  );
  await prisma.practitionerApplication.update({
    where: { id: app.id },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

/** Mirror the displayable card facts after a SetupIntent succeeds. */
export async function storeCardFromSetupIntent(
  applicationId: string,
  setupIntentId: string,
): Promise<{ brand: string; last4: string } | null> {
  const si = await stripe().setupIntents.retrieve(setupIntentId, { expand: ['payment_method'] });
  if (si.status !== 'succeeded') return null;

  const pm = si.payment_method as Stripe.PaymentMethod | null;
  if (!pm || typeof pm === 'string' || !pm.card) return null;

  // Verify the intent really belongs to this practice before trusting it —
  // the id arrives from the browser.
  const app = await prisma.practitionerApplication.findUnique({
    where: { id: applicationId },
    select: { stripeCustomerId: true },
  });
  if (!app?.stripeCustomerId || si.customer !== app.stripeCustomerId) return null;

  // Make it the default so an off-session charge picks it up without being
  // told which instrument to use.
  await stripe().customers.update(app.stripeCustomerId, {
    invoice_settings: { default_payment_method: pm.id },
  });

  await prisma.practitionerApplication.update({
    where: { id: applicationId },
    data: {
      cardPaymentMethodId: pm.id,
      cardBrand: pm.card.brand,
      cardLast4: pm.card.last4,
      cardExpMonth: pm.card.exp_month,
      cardExpYear: pm.card.exp_year,
      cardAddedAt: new Date(),
    },
  });
  return { brand: pm.card.brand, last4: pm.card.last4 };
}

export type SavedCard = { brand: string; last4: string; expMonth: number; expYear: number };

/** Displayable facts for the card an APPROVED practice has on file, or null. */
export async function savedCardFor(applicationId: string): Promise<SavedCard | null> {
  const app = await prisma.practitionerApplication
    .findFirst({
      where: { id: applicationId, status: 'APPROVED' },
      select: { cardPaymentMethodId: true, cardBrand: true, cardLast4: true, cardExpMonth: true, cardExpYear: true },
    })
    .catch(() => null);
  if (!app?.cardPaymentMethodId || !app.cardBrand || !app.cardLast4 || !app.cardExpMonth || !app.cardExpYear) {
    return null;
  }
  return { brand: app.cardBrand, last4: app.cardLast4, expMonth: app.cardExpMonth, expYear: app.cardExpYear };
}

/**
 * Mirror a card that was saved DURING a checkout (a PaymentIntent opened with
 * setup_future_usage), as opposed to the SetupIntent path above. Same
 * ownership check: the instrument must already belong to this practice's own
 * Stripe customer, because the ids arrive from a webhook payload.
 */
export async function storeCardFromPaymentMethod(
  applicationId: string,
  paymentMethodId: string,
): Promise<{ brand: string; last4: string } | null> {
  const app = await prisma.practitionerApplication.findUnique({
    where: { id: applicationId },
    select: { stripeCustomerId: true },
  });
  if (!app?.stripeCustomerId) return null;

  const pm = await stripe().paymentMethods.retrieve(paymentMethodId);
  if (!pm.card || pm.customer !== app.stripeCustomerId) return null;

  await stripe().customers.update(app.stripeCustomerId, {
    invoice_settings: { default_payment_method: pm.id },
  });
  await prisma.practitionerApplication.update({
    where: { id: applicationId },
    data: {
      cardPaymentMethodId: pm.id,
      cardBrand: pm.card.brand,
      cardLast4: pm.card.last4,
      cardExpMonth: pm.card.exp_month,
      cardExpYear: pm.card.exp_year,
      cardAddedAt: new Date(),
    },
  });
  return { brand: pm.card.brand, last4: pm.card.last4 };
}

export type ChargeSavedCardResult =
  | { ok: true; status: 'succeeded'; paymentIntentId: string }
  | { ok: true; status: 'requires_action'; paymentIntentId: string; clientSecret: string }
  | { ok: false; code: 'no-card' | 'not-pending' | 'declined' | 'error'; message: string };

/**
 * Charge a practice's card on file for an order that is already persisted
 * and PENDING_PAYMENT. The amount is the order's stored total, never a
 * client figure, and Stripe sees the same three fields every other charge
 * sends: amount, a generic description, internal ids in metadata.
 *
 * Who initiated it changes one thing. `admin` is an off-session charge (the
 * provider asked for it over the phone or by email and is not present), so
 * a card that insists on authentication fails here and the order falls back
 * to a pay link. `buyer` is on-session: the provider is at checkout, so
 * Stripe may return requires_action and the browser completes it.
 *
 * Fulfilment is NOT run here. The order's processor id is pointed at the
 * intent and the Stripe webhook promotes it exactly as it does for every
 * other card payment, so there is one path that books orders, not two.
 */
export async function chargeSavedCard(args: {
  orderId: string;
  idempotencyKey: string;
  initiatedBy: 'buyer' | 'admin';
}): Promise<ChargeSavedCardResult> {
  const order = await prisma.order.findUnique({
    where: { id: args.orderId },
    select: {
      id: true, status: true, totalCents: true, customerEmail: true,
      affiliateId: true, discountCode: true, practitionerApplicationId: true,
    },
  });
  if (!order) return { ok: false, code: 'error', message: 'Order not found.' };
  if (order.status !== 'PENDING_PAYMENT') {
    return { ok: false, code: 'not-pending', message: 'This order is not awaiting payment.' };
  }
  if (!order.practitionerApplicationId) {
    return { ok: false, code: 'no-card', message: 'This order is not linked to a practitioner account.' };
  }

  const app = await prisma.practitionerApplication.findFirst({
    where: { id: order.practitionerApplicationId, status: 'APPROVED' },
    select: { stripeCustomerId: true, cardPaymentMethodId: true, cardBrand: true, cardLast4: true },
  });
  if (!app?.stripeCustomerId || !app.cardPaymentMethodId) {
    return { ok: false, code: 'no-card', message: 'This practice has no card on file.' };
  }

  const amountCents = Number(order.totalCents);
  if (!(amountCents >= 50)) {
    return { ok: false, code: 'error', message: 'Order total is below the $0.50 card minimum.' };
  }

  let pi;
  try {
    pi = await stripe().paymentIntents.create(
      {
        amount: amountCents,
        currency: 'usd',
        description: 'Merit order',
        statement_descriptor_suffix: statementDescriptorSuffix(),
        customer: app.stripeCustomerId,
        payment_method: app.cardPaymentMethodId,
        payment_method_types: ['card'],
        confirm: true,
        off_session: args.initiatedBy === 'admin',
        metadata: {
          orderId: order.id,
          buyerEmail: order.customerEmail || '',
          affiliateId: order.affiliateId ?? '',
          discountCode: order.discountCode ?? '',
          practitionerApplicationId: order.practitionerApplicationId,
          chargedBy: args.initiatedBy,
        },
      },
      { idempotencyKey: args.idempotencyKey },
    );
  } catch (err: any) {
    console.error('[practitioner-card] charge failed', {
      type: err?.type, code: err?.code, decline: err?.decline_code, message: err?.message,
    });
    const card = `${app.cardBrand ?? 'card'} ending ${app.cardLast4 ?? '????'}`;
    await recordOrderEvent({
      orderId: order.id,
      kind: 'ADMIN_COMMENT',
      message: `Card on file (${card}) was not charged: ${err?.message ?? 'Stripe error'}`,
      metadata: { stripeCode: err?.code ?? null, declineCode: err?.decline_code ?? null },
    }).catch(() => { /* logging never blocks */ });
    if (err?.type === 'StripeCardError') {
      return {
        ok: false,
        code: 'declined',
        message:
          err?.code === 'authentication_required'
            ? 'The card requires the cardholder to authenticate, so it cannot be charged without them.'
            : err?.message ?? 'The card was declined.',
      };
    }
    return { ok: false, code: 'error', message: 'Could not charge the card. Try again in a moment.' };
  }

  // Point the order at the intent so the webhook promotes THIS order.
  await prisma.order.update({ where: { id: order.id }, data: { paypalOrderId: pi.id } });

  const card = `${app.cardBrand ?? 'card'} ending ${app.cardLast4 ?? '????'}`;
  await recordOrderEvent({
    orderId: order.id,
    kind: 'ADMIN_COMMENT',
    message:
      pi.status === 'succeeded'
        ? `Charged card on file (${card}) for $${(amountCents / 100).toFixed(2)}, ${args.initiatedBy === 'admin' ? 'initiated by Merit' : 'initiated by the buyer at checkout'}.`
        : `Card on file (${card}) charge is ${pi.status}.`,
    metadata: { stripePaymentIntentId: pi.id, chargedBy: args.initiatedBy },
  }).catch(() => { /* logging never blocks */ });

  if (pi.status === 'succeeded') return { ok: true, status: 'succeeded', paymentIntentId: pi.id };
  if (pi.status === 'requires_action' && pi.client_secret) {
    return { ok: true, status: 'requires_action', paymentIntentId: pi.id, clientSecret: pi.client_secret };
  }
  return { ok: false, code: 'error', message: `Payment is ${pi.status.replace(/_/g, ' ')}; it was not completed.` };
}

/** Detach at Stripe and clear our mirror. Best-effort on the Stripe side. */
export async function removeCard(applicationId: string): Promise<void> {
  const app = await prisma.practitionerApplication.findUnique({
    where: { id: applicationId },
    select: { cardPaymentMethodId: true },
  });
  if (app?.cardPaymentMethodId) {
    await stripe().paymentMethods.detach(app.cardPaymentMethodId).catch(() => {
      /* already detached, or gone — clearing our side is what matters */
    });
  }
  await prisma.practitionerApplication.update({
    where: { id: applicationId },
    data: {
      cardPaymentMethodId: null, cardBrand: null, cardLast4: null,
      cardExpMonth: null, cardExpYear: null, cardAddedAt: null,
    },
  });
}
