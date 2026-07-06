import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkDeliveryStatus, handleDeliveryNotify } from '@/lib/shipstation';
import { syncPendingTrackingToPayPal } from '@/lib/paypal-tracking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // up to 60s to poll many orders

/**
 * Hourly cron: poll ShipStation for delivery confirmations on every
 * SHIPPED order from the last 30 days. Auto-flips DELIVERED.
 *
 * Auth: bearer token matching CRON_SECRET env var. Render Cron jobs
 * inject the token via Authorization header.
 *
 * Idempotent — orders already DELIVERED are filtered out at query time.
 * Won't downgrade CANCELED / REFUNDED.
 *
 * Returns a summary JSON so cron logs show what happened:
 *   { checked: N, deliveredNow: M, errors: [...] }
 */
export async function GET(req: Request) {
  // ── Auth ──
  const auth = req.headers.get('authorization') ?? '';
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: 'CRON_SECRET not configured on server' },
      { status: 500 },
    );
  }
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  // ── Find candidate orders ──
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const candidates = await prisma.order.findMany({
    where: {
      status: 'SHIPPED',
      shippedAt: { gte: thirtyDaysAgo },
      // Must have tracking — can't check delivery without it
      trackingNumber: { not: null },
      shippingCarrier: { not: null },
    },
    select: {
      id: true,
      paypalOrderId: true,
      trackingNumber: true,
      shippingCarrier: true,
    },
  });

  let deliveredNow = 0;
  const errors: Array<{ orderId: string; error: string }> = [];

  for (const order of candidates) {
    if (!order.trackingNumber || !order.shippingCarrier) continue;
    try {
      const status = await checkDeliveryStatus(order.shippingCarrier, order.trackingNumber);
      if (status.delivered) {
        const result = await handleDeliveryNotify({
          tracking_number: order.trackingNumber,
          delivered_at: status.deliveredAt?.toISOString() ?? null,
        });
        if (result.ok) deliveredNow++;
        else errors.push({ orderId: order.id, error: result.error ?? 'unknown' });
      }
    } catch (err: any) {
      errors.push({ orderId: order.id, error: err?.message ?? 'unknown' });
    }
  }

  // ── PayPal tracking sync (seller protection) ──
  // Sweep shipped/delivered orders whose tracking hasn't been pushed to
  // PayPal yet. Covers ShipStation-marked shipments (which bypass the admin
  // action) and backfills history. Idempotent via paypalTrackingSyncedAt.
  const paypalTracking = await syncPendingTrackingToPayPal();

  return NextResponse.json({
    ok: true,
    checked: candidates.length,
    deliveredNow,
    paypalTracking,
    errors: errors.length > 0 ? errors : undefined,
    ranAt: new Date().toISOString(),
  });
}
