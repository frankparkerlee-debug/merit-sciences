import 'server-only';
import { prisma } from './db';
import { tierForOrderCount } from './affiliate';

export type BackfillResult = {
  scanned: number;
  created: number;
  skipped: number;
  selfPurchases: number;
  totalCommissionCents: number;
  byAffiliate: Array<{ affiliateId: string; orders: number; commissionCents: number }>;
};

// Order states that represent a completed, commissionable sale. Excludes
// PENDING_PAYMENT (never captured), CANCELED, and REFUNDED (no commission owed).
const COMMISSIONABLE_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'PARTIALLY_REFUNDED'] as const;

/**
 * Backfill OrderCommission rows for orders that were attributed to an affiliate
 * (order.affiliateId set) but never produced a commission — the card-flow gap,
 * where PayPal omitted the payer email so the webhook bailed before writing one.
 *
 * Mirrors the live webhook EXACTLY:
 *   - commissionable base = subtotal − discount (shipping excluded)
 *   - rate = the affiliate's trailing-30-day tier AS OF the order's date, built
 *     up chronologically (counts commissions backfilled earlier in this run +
 *     any live ones, just like the webhook counts live ones at capture time)
 *   - self-purchase (buyer email === affiliate email) → a $0 commission row
 *   - find-or-create the customer→affiliate link (FK), bump its counters
 *
 * Idempotent: skips any order that already has a commission row (unique on
 * paypalOrderId), so it is safe to run more than once.
 */
export async function backfillMissingCommissions(): Promise<BackfillResult> {
  const orders = await prisma.order.findMany({
    where: {
      affiliateId: { not: null },
      status: { in: [...COMMISSIONABLE_STATUSES] },
    },
    orderBy: { createdAt: 'asc' }, // oldest first so trailing-30 tiers build up
    select: {
      paypalOrderId: true,
      paypalCaptureId: true,
      paypalPayerId: true,
      affiliateId: true,
      customerEmail: true,
      subtotalCents: true,
      discountCents: true,
      createdAt: true,
    },
  });

  const result: BackfillResult = {
    scanned: orders.length, created: 0, skipped: 0, selfPurchases: 0, totalCommissionCents: 0, byAffiliate: [],
  };
  const perAff = new Map<string, { orders: number; commissionCents: number }>();
  const affCache = new Map<string, { email: string; status: string } | null>();

  for (const o of orders) {
    const affiliateId = o.affiliateId!;

    // Already credited? skip — keeps re-runs idempotent.
    const existing = await prisma.orderCommission.findUnique({
      where: { paypalOrderId: o.paypalOrderId },
      select: { id: true },
    });
    if (existing) { result.skipped++; continue; }

    if (!affCache.has(affiliateId)) {
      affCache.set(affiliateId, await prisma.affiliate.findUnique({
        where: { id: affiliateId }, select: { email: true, status: true },
      }));
    }
    const aff = affCache.get(affiliateId);
    if (!aff || aff.status !== 'ACTIVE') { result.skipped++; continue; }

    const base = Math.max(0, Number(o.subtotalCents) - Number(o.discountCents));
    if (base <= 0) { result.skipped++; continue; }

    const email = o.customerEmail.toLowerCase();
    const isSelf = email === aff.email.toLowerCase();

    // Trailing-30-day tier as of the order's date.
    const since = new Date(o.createdAt.getTime() - 30 * 24 * 60 * 60 * 1000);
    const trailing30 = await prisma.orderCommission.count({
      where: { affiliateId, occurredAt: { gte: since, lte: o.createdAt }, status: { not: 'CLAWED_BACK' } },
    });
    const { rateBp } = tierForOrderCount(trailing30);
    const commissionCents = isSelf ? 0 : Math.floor((base * rateBp) / 10_000);

    // FK: find-or-create the customer→affiliate link.
    let link = await prisma.customerAffiliateLink.findUnique({ where: { customerEmail: email } });
    if (!link) {
      link = await prisma.customerAffiliateLink.create({
        data: { customerEmail: email, paypalPayerId: o.paypalPayerId, affiliateId },
      });
    }

    try {
      await prisma.$transaction([
        prisma.orderCommission.create({
          data: {
            paypalOrderId: o.paypalOrderId,
            paypalCaptureId: o.paypalCaptureId,
            paypalPayerId: o.paypalPayerId,
            customerLinkId: link.id,
            affiliateId,
            orderTotalCents: BigInt(base),
            commissionRateBp: rateBp,
            commissionCents: BigInt(commissionCents),
            status: 'PENDING',
            occurredAt: o.createdAt, // backdate to the order so history + tiers line up
          },
        }),
        prisma.customerAffiliateLink.update({
          where: { id: link.id },
          data: { totalOrders: { increment: 1 }, totalCommissionCents: { increment: BigInt(commissionCents) } },
        }),
      ]);
      result.created++;
      if (isSelf) result.selfPurchases++;
      result.totalCommissionCents += commissionCents;
      const agg = perAff.get(affiliateId) ?? { orders: 0, commissionCents: 0 };
      agg.orders++; agg.commissionCents += commissionCents;
      perAff.set(affiliateId, agg);
    } catch (err: any) {
      if (err?.code === 'P2002') { result.skipped++; continue; } // raced — already created
      throw err;
    }
  }

  result.byAffiliate = [...perAff.entries()].map(([affiliateId, v]) => ({ affiliateId, ...v }));
  return result;
}
