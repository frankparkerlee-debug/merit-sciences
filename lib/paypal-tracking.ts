import { prisma } from './db';
import { addPayPalTracker, type PayPalTrackerCarrier } from './paypal';
import { recordOrderEvent } from './orders';

/**
 * Push shipped orders' tracking numbers to PayPal (Add Tracking API).
 *
 * Why: tracking on file is PayPal's strongest seller-health signal for
 * physical goods — it wins "item not received" disputes automatically and
 * measurably lowers the odds of reserves/freezes on a young account.
 *
 * Idempotent via orders.paypalTrackingSyncedAt:
 *   - null      → candidate for sync
 *   - timestamp → done (synced, or permanently unsyncable — see below)
 *
 * Runs from two places:
 *   - the admin mark-shipped action (detached, immediate)
 *   - the hourly check-deliveries cron (sweeps ShipStation-marked shipments
 *     and anything the immediate path missed)
 */

const CARRIER_MAP: Record<string, PayPalTrackerCarrier> = {
  ups: 'UPS',
  usps: 'USPS',
  fedex: 'FEDEX',
  dhl: 'DHL',
};

/**
 * Real parcel tracking only. Clinic hand-offs are recorded with
 * pseudo-tracking like "Patient Pick-Up" — pushing those to PayPal would be
 * worse than pushing nothing (a tracker that never shows movement).
 */
function isRealTrackingNumber(tracking: string): boolean {
  const t = tracking.trim();
  if (/pick|local|n\/?a|hand|deliver/i.test(t)) return false;
  return /^[A-Za-z0-9]{8,34}$/.test(t);
}

type SyncResult = 'synced' | 'skipped' | 'failed';

/**
 * Sync one order's tracking to PayPal. Never throws.
 *
 * Permanent no-gos (no capture id, manual order, pseudo-tracking, unmapped
 * carrier, 4xx from PayPal — e.g. a capture that lives on the OLD PayPal
 * account) get their syncedAt stamped so the cron stops retrying them.
 * Transient failures (5xx/network) stay unstamped and retry next sweep.
 */
export async function syncOrderTrackingToPayPal(orderId: string): Promise<SyncResult> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        paypalOrderId: true,
        paypalCaptureId: true,
        trackingNumber: true,
        shippingCarrier: true,
        paypalTrackingSyncedAt: true,
      },
    });
    if (!order || order.paypalTrackingSyncedAt) return 'skipped';
    if (!order.trackingNumber) return 'skipped';

    const markDone = () =>
      prisma.order.update({
        where: { id: order.id },
        data: { paypalTrackingSyncedAt: new Date() },
      });

    // Manual/imported orders have no PayPal transaction to attach to.
    if (!order.paypalCaptureId || order.paypalOrderId?.startsWith('manual_')) {
      await markDone();
      return 'skipped';
    }
    if (!isRealTrackingNumber(order.trackingNumber)) {
      await markDone();
      return 'skipped';
    }
    const carrier = CARRIER_MAP[(order.shippingCarrier ?? '').toLowerCase()];
    if (!carrier) {
      await markDone();
      return 'skipped';
    }

    const result = await addPayPalTracker({
      captureId: order.paypalCaptureId,
      trackingNumber: order.trackingNumber.trim(),
      carrier,
    });

    if (result.ok) {
      await markDone();
      await recordOrderEvent({
        orderId: order.id,
        kind: 'ADMIN_COMMENT',
        message: `Tracking ${order.trackingNumber} pushed to PayPal (seller protection).`,
        metadata: { source: 'paypal_tracking_sync', carrier },
      });
      return 'synced';
    }

    if (result.status >= 400 && result.status < 500) {
      // Permanent: bad/foreign transaction id (e.g. captured on the previous
      // PayPal account before the MoR swap). Stamp it so we stop retrying,
      // but leave a breadcrumb.
      await markDone();
      await recordOrderEvent({
        orderId: order.id,
        kind: 'ADMIN_COMMENT',
        message: `PayPal tracking sync not possible for this transaction (HTTP ${result.status}) — likely captured on a previous PayPal account. No action needed.`,
        metadata: { source: 'paypal_tracking_sync', detail: result.detail },
      });
      return 'skipped';
    }

    console.error('[paypal-tracking] transient failure for order', order.id, result.detail);
    return 'failed';
  } catch (err) {
    console.error('[paypal-tracking] sync error for order', orderId, err);
    return 'failed';
  }
}

/**
 * Sweep all unsynced shipped/delivered orders (newest ship window first is
 * not important; oldest first drains the backfill deterministically).
 */
export async function syncPendingTrackingToPayPal(limit = 25): Promise<{
  candidates: number;
  synced: number;
  skipped: number;
  failed: number;
}> {
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  let candidates: Array<{ id: string }> = [];
  try {
    candidates = await prisma.order.findMany({
      where: {
        status: { in: ['SHIPPED', 'DELIVERED'] },
        trackingNumber: { not: null },
        paypalTrackingSyncedAt: null,
        createdAt: { gte: sixtyDaysAgo },
      },
      select: { id: true },
      orderBy: { shippedAt: 'asc' },
      take: limit,
    });
  } catch (err) {
    console.error('[paypal-tracking] sweep query failed', err);
    return { candidates: 0, synced: 0, skipped: 0, failed: 0 };
  }

  const tally = { candidates: candidates.length, synced: 0, skipped: 0, failed: 0 };
  for (const { id } of candidates) {
    const r = await syncOrderTrackingToPayPal(id);
    tally[r === 'synced' ? 'synced' : r === 'skipped' ? 'skipped' : 'failed']++;
  }
  return tally;
}
