/**
 * Guaranteed ops notification for paid orders.
 *
 * The fulfillment team works off these emails, so a missed one is a shipment
 * that sits. The previous arrangement lost them in at least five ways: the
 * send rode inside issueOrderConfirmationEmail (so it never ran unless the
 * CUSTOMER email ran), that call was gated on `isNew` (so a redelivered
 * webhook skipped it), it was fire-and-forget (so a process turnover dropped
 * it), it raced the customer email into Resend's rate limiter, and its result
 * was discarded (so every one of those failures was invisible).
 *
 * Two layers now:
 *
 *   1. INLINE  — fulfillCapturedOrder awaits notifyOpsOfOrder() right after the
 *                order is promoted. Sequential with the customer email, never
 *                parallel, so two sends can't collide in Resend's limiter.
 *   2. SWEEP   — a cron re-checks recent paid orders and sends any that have
 *                no ADMIN_NOTIFIED event. This is what makes the guarantee
 *                hold when the inline attempt fails for a reason we haven't
 *                thought of: Resend down, Render restarting mid-webhook, a
 *                transient DB blip.
 *
 * Both call the same idempotent function, so the sweep can never double-send.
 */
import 'server-only';
import { prisma } from './db';
import { issueAdminOrderNotification, recordOrderEvent } from './orders';

/** Statuses that mean money is in and the team needs to act. */
const NOTIFIABLE_STATUSES = ['PAID', 'PROCESSING'] as const;

export type OpsNotifyResult =
  | { ok: true; sent: true; to: string[] }
  | { ok: true; sent: false; reason: 'already_notified' }
  | { ok: false; error: string };

/**
 * Notify ops about an order, at most once.
 *
 * Idempotent on the ADMIN_NOTIFIED event rather than on a column: the event is
 * written in the same flow as the send, so "did we tell them" and "is it in the
 * timeline" can never disagree.
 */
export async function notifyOpsOfOrder(orderId: string): Promise<OpsNotifyResult> {
  const already = await prisma.orderEvent.findFirst({
    where: { orderId, kind: 'ADMIN_NOTIFIED' },
    select: { id: true },
  });
  if (already) return { ok: true, sent: false, reason: 'already_notified' };

  const result = await issueAdminOrderNotification(orderId, 'new_order').catch((err) => ({
    ok: false as const,
    error: err instanceof Error ? err.message : String(err),
  }));

  if (result.ok) {
    await recordOrderEvent({
      orderId,
      kind: 'ADMIN_NOTIFIED',
      message: `Ops notified: ${result.to.join(', ')}.`,
      metadata: { email_id: result.id, to: result.to, type: 'admin_new_order' },
    });
    return { ok: true, sent: true, to: result.to };
  }

  // Deliberately NOT recorded as ADMIN_NOTIFIED, so the sweep retries it.
  console.error(`[ops-notify] order ${orderId} — notification failed:`, result.error);
  await recordOrderEvent({
    orderId,
    kind: 'EMAIL_FAILED',
    message: `Ops notification NOT sent: ${result.error}`,
    metadata: { type: 'admin_new_order', error: result.error },
  });
  return { ok: false, error: result.error };
}

/**
 * Find paid orders nobody was told about and tell them.
 *
 * `hours` bounds the lookback so a permanently-failing old order isn't retried
 * forever; 48h is comfortably longer than any realistic outage while still
 * letting an order placed overnight get picked up.
 */
export async function sweepOpsNotifications(
  opts: { hours?: number; limit?: number } = {},
): Promise<{ scanned: number; sent: number; failed: number; skipped: number }> {
  const hours = opts.hours ?? 48;
  const limit = opts.limit ?? 50;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const candidates = await prisma.order.findMany({
    where: {
      status: { in: [...NOTIFIABLE_STATUSES] },
      createdAt: { gte: since },
      events: { none: { kind: 'ADMIN_NOTIFIED' } },
    },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  // Sequential with a gap between sends. Resend's default allowance is small
  // and a backlog is exactly when we'd blow through it — the one moment the
  // retry must not fail for the same reason the original did.
  for (const { id } of candidates) {
    const result = await notifyOpsOfOrder(id);
    if (!result.ok) failed++;
    else if (result.sent) sent++;
    else skipped++;
    await new Promise((r) => setTimeout(r, 600));
  }

  return { scanned: candidates.length, sent, failed, skipped };
}
