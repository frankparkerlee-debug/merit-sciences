import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { findUncreditedOrders, recordCommissionFromOrder } from '@/lib/affiliate-repair';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Affiliate commission backfill — repairs orders that carry affiliate
 * attribution (Order.affiliateId set by a typed code or a referral cookie)
 * but never got an OrderCommission row. The main historical cause: the
 * capture-time recorder read only PayPal custom_id until the
 * Order.affiliateId fallback shipped, so code-typed sales attributed but
 * earned $0.
 *
 *   GET  /api/admin/affiliates/backfill   → preview (no writes): the
 *        uncredited orders, who they'd credit, and the commission base.
 *   POST /api/admin/affiliates/backfill   → execute: books each through
 *        the shared repair engine (same evergreen/tier/self-purchase rules
 *        as the live path; idempotent, so re-running is safe).
 *
 * Admin-gated. Orders whose affiliate is not ACTIVE are listed in the
 * preview but will report `blocked` on execution — reactivate the
 * affiliate first if they should earn.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const candidates = await findUncreditedOrders();
  return NextResponse.json({
    count: candidates.length,
    totalBaseCents: candidates.reduce((s, c) => s + c.baseCents, 0),
    orders: candidates.map((c) => ({
      ...c,
      baseDollars: (c.baseCents / 100).toFixed(2),
    })),
  });
}

export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const candidates = await findUncreditedOrders();
  const results = [];
  for (const c of candidates) {
    try {
      results.push(await recordCommissionFromOrder(c.orderDbId));
    } catch (err: any) {
      results.push({
        orderId: c.orderDbId,
        paypalOrderId: c.paypalOrderId,
        outcome: 'blocked' as const,
        reason: `error: ${err?.message ?? 'unknown'}`,
      });
    }
  }

  const created = results.filter((r) => r.outcome === 'created');
  const totalCents = created.reduce((s, r: any) => s + (r.commissionCents ?? 0), 0);
  console.log(
    `[backfill] by ${admin.email}: ${created.length}/${results.length} commissions created, $${(totalCents / 100).toFixed(2)} total`,
  );
  return NextResponse.json({
    ran: results.length,
    created: created.length,
    totalCommissionCents: totalCents,
    totalCommissionDollars: (totalCents / 100).toFixed(2),
    results,
  });
}
