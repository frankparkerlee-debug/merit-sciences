import { prisma } from './db';
import { tierForOrderCount } from './affiliate';
import { computeGrossProfitCommission, referringAffiliateFor } from './practitioner-commission';
import { detectSelfPurchase } from './self-purchase';

/* ─────────────────────────────────────────────────────────────────────────
   COMMISSION REPAIR — create an OrderCommission from a PERSISTED order.

   The live path (lib/paypal-fulfillment.ts) records commissions at capture
   time from the PayPal payload. Two classes of order slip through it:

   1. History: code-typed orders from before the Order.affiliateId fallback
      shipped — attributed on the Order row, but no commission was written
      (first confirmed hit: Amanda, $19.03).
   2. No attribution at all: the buyer used no link and no code, but the
      affiliate demonstrably drove the sale and Parker assigns it manually.

   This module rebuilds the commission from the Order row alone — no PayPal
   payload needed — using the same rules as the live path: evergreen
   customer link, tier from trailing-30 volume, self-purchases earn $0,
   idempotent on the order's PayPal ids.

   Deliberate divergence for MANUAL assignment: the live path silently
   re-credits the evergreen affiliate when the link disagrees. An explicit
   admin assignment credits the affiliate the admin named — but the
   evergreen link itself is NOT rewritten, so future organic orders still
   credit the original affiliate. The conflict is surfaced in the result
   rather than silently resolved either way.
   ───────────────────────────────────────────────────────────────────────── */

// Statuses whose money actually landed (and stayed). REFUNDED is excluded —
// a commission written for a refunded order would immediately need clawback.
// PARTIALLY_REFUNDED is included; the clawback flow owns any adjustment.
const COMMISSIONABLE = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'PARTIALLY_REFUNDED'] as const;

export type RepairResult = {
  orderId: string; // Order.id (db)
  paypalOrderId: string;
  outcome: 'created' | 'skipped' | 'blocked';
  reason?:
    | 'already-recorded'
    | 'no-affiliate'
    | 'affiliate-not-active'
    | 'not-commissionable-status'
    | 'zero-base'
    | 'no-buyer-email';
  commissionCents?: number;
  affiliateSlug?: string;
  selfPurchase?: boolean;
  basis?: 'REVENUE' | 'GROSS_PROFIT';
  evergreenConflict?: { creditedSlug: string; linkedSlug: string } | null;
};

export async function recordCommissionFromOrder(
  orderDbId: string,
  opts: { assignAffiliateId?: string } = {},
): Promise<RepairResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderDbId },
    select: {
      id: true,
      paypalOrderId: true,
      paypalCaptureId: true,
      paypalPayerId: true,
      customerEmail: true,
      // Names feed the self-purchase check (see lib/self-purchase.ts).
      customerName: true,
      shippingFullName: true,
      status: true,
      subtotalCents: true,
      discountCents: true,
      affiliateId: true,
      practitionerApplicationId: true,
      lines: { select: { handle: true, bundleLabel: true, unitCents: true, qty: true } },
    },
  });
  if (!order) throw new Error(`Order ${orderDbId} not found`);

  const base: RepairResult = { orderId: order.id, paypalOrderId: order.paypalOrderId, outcome: 'blocked' };

  if (!(COMMISSIONABLE as readonly string[]).includes(order.status)) {
    return { ...base, reason: 'not-commissionable-status' };
  }

  // Idempotency FIRST — an existing row for either PayPal id means the live
  // path (or a previous repair) already booked this order.
  const existing = await prisma.orderCommission.findFirst({
    where: {
      OR: [
        { paypalOrderId: order.paypalOrderId },
        ...(order.paypalCaptureId ? [{ paypalCaptureId: order.paypalCaptureId }] : []),
      ],
    },
    select: { id: true },
  });
  if (existing) return { ...base, outcome: 'skipped', reason: 'already-recorded' };

  // Manual assignment writes attribution onto the Order row itself, so the
  // order detail, exports, and any later repair all agree.
  const isManualAssign = !!opts.assignAffiliateId;
  let affiliateId = opts.assignAffiliateId ?? order.affiliateId;
  if (!affiliateId) return { ...base, reason: 'no-affiliate' };
  if (isManualAssign && order.affiliateId !== affiliateId) {
    await prisma.order.update({ where: { id: order.id }, data: { affiliateId } });
  }

  const affiliate = await prisma.affiliate.findUnique({
    where: { id: affiliateId },
    select: { id: true, slug: true, email: true, status: true, name: true, paypalEmail: true },
  });
  if (!affiliate || affiliate.status !== 'ACTIVE') {
    return { ...base, reason: 'affiliate-not-active' };
  }

  const buyerEmail = order.customerEmail?.toLowerCase() ?? null;
  if (!buyerEmail) return { ...base, reason: 'no-buyer-email' };

  // Evergreen link: find-or-create by email, exactly like the live path.
  let creditedAffiliateId = affiliate.id;
  let evergreenConflict: RepairResult['evergreenConflict'] = null;
  let link = await prisma.customerAffiliateLink.findUnique({ where: { customerEmail: buyerEmail } });
  if (!link) {
    link = await prisma.customerAffiliateLink.create({
      data: { customerEmail: buyerEmail, paypalPayerId: order.paypalPayerId, affiliateId: affiliate.id },
    });
  } else if (link.affiliateId !== affiliate.id) {
    if (isManualAssign) {
      // Admin said THIS order belongs to THIS affiliate — honor it for this
      // order, keep the evergreen link untouched, and surface the conflict.
      const linked = await prisma.affiliate.findUnique({
        where: { id: link.affiliateId },
        select: { slug: true },
      });
      evergreenConflict = { creditedSlug: affiliate.slug, linkedSlug: linked?.slug ?? link.affiliateId };
    } else {
      creditedAffiliateId = link.affiliateId; // historical lock wins, as live
    }
  }

  /* Judged against the CREDITED affiliate, after the lock above — same rule as
     the live recorder. See lib/self-purchase.ts for why an email equality
     against the pre-lock affiliate was wrong twice over. */
  const creditedIdentity =
    creditedAffiliateId === affiliate.id
      ? affiliate
      : await prisma.affiliate.findUnique({
          where: { id: creditedAffiliateId },
          select: { email: true, name: true, paypalEmail: true },
        });

  const isSelfPurchase = detectSelfPurchase(creditedIdentity, {
    email: buyerEmail,
    customerName: order.customerName ?? null,
    shippingFullName: order.shippingFullName ?? null,
  }).isSelf;

  const orderTotalCents = Number(order.subtotalCents) - Number(order.discountCents);
  if (!(orderTotalCents > 0)) return { ...base, reason: 'zero-base' };

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const trailing30 = await prisma.orderCommission.count({
    where: { affiliateId: creditedAffiliateId, occurredAt: { gte: since }, status: { not: 'CLAWED_BACK' } },
  });
  let { rateBp } = tierForOrderCount(trailing30);
  let commissionCents = isSelfPurchase ? 0 : Math.floor((orderTotalCents * rateBp) / 10_000);

  /* Same basis rule as the live recorder: when the credited affiliate is the
     one who introduced this practice, the commission is 20% of GROSS PROFIT,
     not a share of revenue. Without this, a manual assign on a physician
     order books at the flat tier — roughly double Parker's formula. */
  let basis: 'REVENUE' | 'GROSS_PROFIT' = 'REVENUE';
  let gp: Awaited<ReturnType<typeof computeGrossProfitCommission>> | null = null;
  const practitionerReferrer = await referringAffiliateFor(
    buyerEmail,
    order.practitionerApplicationId,
  ).catch(() => null);
  if (practitionerReferrer != null && practitionerReferrer === creditedAffiliateId && order.lines.length > 0) {
    gp = await computeGrossProfitCommission(
      order.lines.map((l) => ({
        handle: l.handle,
        bundleLabel: l.bundleLabel,
        unitCents: Number(l.unitCents),
        qty: l.qty,
      })),
    );
    basis = 'GROSS_PROFIT';
    rateBp = gp.rateBp;
    commissionCents = isSelfPurchase ? 0 : gp.commissionCents;
    if (gp.uncostedHandles.length > 0) {
      console.warn(
        `[repair] gross-profit withheld on ${order.paypalOrderId}: no cost for ${gp.uncostedHandles.join(', ')}`,
      );
    }
  }

  try {
    await prisma.$transaction([
      prisma.orderCommission.create({
        data: {
          paypalOrderId: order.paypalOrderId,
          paypalCaptureId: order.paypalCaptureId,
          paypalPayerId: order.paypalPayerId,
          customerLinkId: link.id,
          affiliateId: creditedAffiliateId,
          orderTotalCents: BigInt(orderTotalCents),
          commissionRateBp: rateBp,
          commissionCents: BigInt(commissionCents),
          basis,
          productCostCents: gp ? BigInt(gp.productCostCents) : null,
          shippingDeductionCents: gp ? BigInt(gp.shippingDeductionCents) : null,
          grossProfitCents: gp ? BigInt(gp.grossProfitCents) : null,
          status: 'PENDING',
        },
      }),
      prisma.customerAffiliateLink.update({
        where: { id: link.id },
        data: { totalOrders: { increment: 1 }, totalCommissionCents: { increment: BigInt(commissionCents) } },
      }),
    ]);
  } catch (err: any) {
    if (err?.code === 'P2002') return { ...base, outcome: 'skipped', reason: 'already-recorded' };
    throw err;
  }

  return {
    ...base,
    outcome: 'created',
    commissionCents,
    affiliateSlug: affiliate.slug,
    selfPurchase: isSelfPurchase,
    basis,
    evergreenConflict,
  };
}

/** Orders whose money landed, that carry affiliate attribution, but have no
 *  commission row — the backfill candidates. */
export async function findUncreditedOrders() {
  const orders = await prisma.order.findMany({
    where: { affiliateId: { not: null }, status: { in: COMMISSIONABLE as any } },
    select: {
      id: true,
      paypalOrderId: true,
      paypalCaptureId: true,
      customerEmail: true,
      subtotalCents: true,
      discountCents: true,
      discountCode: true,
      createdAt: true,
      affiliateId: true,
      status: true,
    },
    orderBy: { createdAt: 'asc' },
  });
  if (orders.length === 0) return [];

  const commissions = await prisma.orderCommission.findMany({
    where: { paypalOrderId: { in: orders.map((o) => o.paypalOrderId) } },
    select: { paypalOrderId: true },
  });
  const credited = new Set(commissions.map((c) => c.paypalOrderId));

  const affiliates = await prisma.affiliate.findMany({
    where: { id: { in: [...new Set(orders.map((o) => o.affiliateId!) )] } },
    select: { id: true, slug: true, status: true },
  });
  const bySlug = new Map(affiliates.map((a) => [a.id, a]));

  return orders
    .filter((o) => !credited.has(o.paypalOrderId))
    .map((o) => ({
      orderDbId: o.id,
      paypalOrderId: o.paypalOrderId,
      createdAt: o.createdAt,
      customerEmail: o.customerEmail,
      status: o.status,
      discountCode: o.discountCode,
      baseCents: Number(o.subtotalCents) - Number(o.discountCents),
      affiliateSlug: bySlug.get(o.affiliateId!)?.slug ?? o.affiliateId!,
      affiliateActive: bySlug.get(o.affiliateId!)?.status === 'ACTIVE',
    }));
}
