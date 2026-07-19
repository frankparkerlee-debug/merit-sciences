/**
 * Customer lifecycle engine — the post-purchase revenue sequences. Run daily
 * by /api/cron/customer-emails. Three beats, disjoint windows, each sent at
 * most once per order:
 *
 *   post_delivery  · deliveredAt +3d→21d  · "Arrived?" check-in with the
 *                    one-click reorder button (renderPostDeliveryFollowUp)
 *   replenishment  · paidAt +35d→70d     · vial plausibly running low →
 *                    rebuild-the-order CTA (renderReplenishment)
 *   winback        · paidAt +75d→180d    · lapsed customer, latest order only
 *                    → new-lots + rebuild CTA (renderWinBack)
 *
 * Dedupe: an OrderEvent (kind CONFIRMATION_EMAIL_SENT) with
 * metadata.lifecycle = <beat> — the OrderEventKind enum is frozen in Postgres
 * (pooler can't migrate), so the marker lives in metadata, and the admin
 * timeline shows these sends for free.
 *
 * Suppression: any NewsletterSubscriber row with isSubscribed=false for the
 * customer's email blocks all beats (unsubscribeNewsletter upserts that row
 * even for never-subscribed buyers). Replenishment/win-back only fire when
 * the referenced order is still the customer's LATEST — a newer purchase
 * resets the clock naturally.
 */
import 'server-only';
import { prisma } from './db';
import { sendEmail } from './email';
import { recordOrderEvent, generateLookupToken, lookupUrlFor, getCrossSellProducts } from './orders';
import { renderPostDeliveryFollowUp } from './email-templates';
import { renderReplenishment, renderWinBack } from './customer-emails';
import { reorderUrlFor } from './reorder';
import { unsubUrl } from './prospect-journey';
import { SITE } from './marketing-email-shell';

const DAY = 24 * 3600 * 1000;
// Per-beat, per-run ceiling. Volumes are small; this is a backlog guard.
const BEAT_CAP = 40;
// Orders that count as "successful" for lifecycle purposes.
const OK_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const;

type BeatResult = { sent: number; skipped: number; errors: number };
export type CustomerTickResult = {
  postDelivery: BeatResult;
  replenishment: BeatResult;
  winback: BeatResult;
};

function daysAgo(now: Date, n: number): Date {
  return new Date(now.getTime() - n * DAY);
}

async function alreadySent(orderId: string, beat: string): Promise<boolean> {
  const hit = await prisma.orderEvent.findFirst({
    where: { orderId, metadata: { path: ['lifecycle'], equals: beat } },
    select: { id: true },
  });
  return Boolean(hit);
}

async function isSuppressed(email: string): Promise<boolean> {
  const row = await prisma.newsletterSubscriber.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { isSubscribed: true },
  });
  return row ? !row.isSubscribed : false;
}

async function hasNewerOrder(customerId: string, paidAt: Date): Promise<boolean> {
  const newer = await prisma.order.findFirst({
    where: { customerId, paidAt: { gt: paidAt }, status: { in: [...OK_STATUSES] } },
    select: { id: true },
  });
  return Boolean(newer);
}

async function markSent(orderId: string, beat: string, emailId: string | null, to: string) {
  await recordOrderEvent({
    orderId,
    kind: 'CONFIRMATION_EMAIL_SENT',
    message: `Lifecycle email sent (${beat}) to ${to}.`,
    metadata: { lifecycle: beat, email_id: emailId },
  });
}

/* ── Beat 1 · post-delivery follow-up (+3d, with the reorder button) ─────── */
async function tickPostDelivery(now: Date): Promise<BeatResult> {
  const r: BeatResult = { sent: 0, skipped: 0, errors: 0 };
  const orders = await prisma.order.findMany({
    where: {
      status: 'DELIVERED',
      deliveredAt: { gte: daysAgo(now, 21), lte: daysAgo(now, 3) },
    },
    include: { lines: { select: { handle: true, title: true } } },
    orderBy: { deliveredAt: 'asc' },
    take: BEAT_CAP * 3,
  });

  for (const o of orders) {
    if (r.sent >= BEAT_CAP) break;
    try {
      if (await alreadySent(o.id, 'post_delivery')) { r.skipped++; continue; }
      if (await isSuppressed(o.customerEmail)) { r.skipped++; continue; }

      const token = await generateLookupToken(o.id, o.customerEmail);
      const crossSell = await getCrossSellProducts(o.lines.map((l) => l.handle));
      const { subject, html, text } = renderPostDeliveryFollowUp({
        customerName: o.customerName,
        paypalOrderId: o.paypalOrderId,
        primaryProductTitle: o.lines[0]?.title || 'Merit',
        lookupUrl: lookupUrlFor(o.id, token),
        catalogUrl: `${SITE}/catalog`,
        reorderUrl: reorderUrlFor(o.id),
        crossSell,
      });
      const res = await sendEmail({ to: o.customerEmail, subject, html, text });
      if (!res.ok) throw new Error(res.error);
      await markSent(o.id, 'post_delivery', res.id, o.customerEmail);
      r.sent++;
    } catch (err) {
      console.error(`[customer-tick] post_delivery failed for order ${o.id}`, err);
      r.errors++;
    }
  }
  return r;
}

/* ── Beat 2 · replenishment (+35d→70d, latest order only) ────────────────── */
async function tickReplenishment(now: Date): Promise<BeatResult> {
  const r: BeatResult = { sent: 0, skipped: 0, errors: 0 };
  const orders = await prisma.order.findMany({
    where: {
      status: { in: [...OK_STATUSES] },
      paidAt: { gte: daysAgo(now, 70), lte: daysAgo(now, 35) },
    },
    include: { lines: { select: { title: true } } },
    orderBy: { paidAt: 'asc' },
    take: BEAT_CAP * 3,
  });

  for (const o of orders) {
    if (r.sent >= BEAT_CAP) break;
    try {
      if (await alreadySent(o.id, 'replenishment')) { r.skipped++; continue; }
      if (await hasNewerOrder(o.customerId, o.paidAt)) { r.skipped++; continue; }
      if (await isSuppressed(o.customerEmail)) { r.skipped++; continue; }

      const { subject, html, text } = renderReplenishment({
        firstName: o.customerName.split(/\s+/)[0] || 'there',
        primaryProductTitle: o.lines[0]?.title || 'your last order',
        reorderUrl: reorderUrlFor(o.id),
        unsubscribeUrl: unsubUrl(o.customerEmail),
      });
      const res = await sendEmail({ to: o.customerEmail, subject, html, text });
      if (!res.ok) throw new Error(res.error);
      await markSent(o.id, 'replenishment', res.id, o.customerEmail);
      r.sent++;
    } catch (err) {
      console.error(`[customer-tick] replenishment failed for order ${o.id}`, err);
      r.errors++;
    }
  }
  return r;
}

/* ── Beat 3 · win-back (+75d→180d, latest order only) ────────────────────── */
async function tickWinback(now: Date): Promise<BeatResult> {
  const r: BeatResult = { sent: 0, skipped: 0, errors: 0 };
  const orders = await prisma.order.findMany({
    where: {
      status: { in: [...OK_STATUSES] },
      paidAt: { gte: daysAgo(now, 180), lte: daysAgo(now, 75) },
    },
    include: { lines: { select: { title: true } } },
    orderBy: { paidAt: 'asc' },
    take: BEAT_CAP * 3,
  });

  for (const o of orders) {
    if (r.sent >= BEAT_CAP) break;
    try {
      if (await alreadySent(o.id, 'winback')) { r.skipped++; continue; }
      if (await hasNewerOrder(o.customerId, o.paidAt)) { r.skipped++; continue; }
      if (await isSuppressed(o.customerEmail)) { r.skipped++; continue; }

      const { subject, html, text } = renderWinBack({
        firstName: o.customerName.split(/\s+/)[0] || 'there',
        primaryProductTitle: o.lines[0]?.title || 'your last order',
        reorderUrl: reorderUrlFor(o.id),
        unsubscribeUrl: unsubUrl(o.customerEmail),
      });
      const res = await sendEmail({ to: o.customerEmail, subject, html, text });
      if (!res.ok) throw new Error(res.error);
      await markSent(o.id, 'winback', res.id, o.customerEmail);
      r.sent++;
    } catch (err) {
      console.error(`[customer-tick] winback failed for order ${o.id}`, err);
      r.errors++;
    }
  }
  return r;
}

export async function tickCustomers(now: Date = new Date()): Promise<CustomerTickResult> {
  return {
    postDelivery: await tickPostDelivery(now),
    replenishment: await tickReplenishment(now),
    winback: await tickWinback(now),
  };
}
