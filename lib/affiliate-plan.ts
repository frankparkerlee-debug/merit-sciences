import 'server-only';
import { prisma } from './db';
import { planRateBp, tierForOrderCount, type AffiliatePlan } from './affiliate';

/**
 * Resolves the commission rate for one order, honouring the affiliate's
 * plan:
 *   · split plan (joined on/after 2026-10-02): first order of a referred
 *     customer pays firstOrderRateBp, every later order repeatRateBp;
 *   · legacy (plan columns NULL): the flat program tier, computed from the
 *     affiliate's trailing-30-day order count as of `asOf`, exactly as
 *     before.
 *
 * "First order" is decided by the caller from the CustomerAffiliateLink:
 * live paths use `link.totalOrders === 0`; repair and backfill count the
 * commissions already recorded for that customer before the order's date,
 * so re-running history books the same rates the live path would have.
 */
export async function getAffiliatePlan(affiliateId: string): Promise<AffiliatePlan | null> {
  return prisma.affiliate.findUnique({
    where: { id: affiliateId },
    select: { firstOrderRateBp: true, repeatRateBp: true },
  });
}

export async function commissionRateBpFor(
  affiliateId: string,
  opts: { isFirstOrder: boolean; asOf?: Date },
): Promise<number> {
  const plan = await getAffiliatePlan(affiliateId);
  const split = planRateBp(plan, opts.isFirstOrder);
  if (split != null) return split;

  const asOf = opts.asOf ?? new Date();
  const since = new Date(asOf.getTime() - 30 * 24 * 60 * 60 * 1000);
  const trailing30 = await prisma.orderCommission.count({
    where: { affiliateId, occurredAt: { gte: since, lte: asOf }, status: { not: 'CLAWED_BACK' } },
  });
  return tierForOrderCount(trailing30).rateBp;
}

/** For repair/backfill: has this customer link any commission recorded
 *  before `before`? If not, the order being (re)booked was the first. */
export async function isFirstOrderForLink(linkId: string, before: Date): Promise<boolean> {
  const prior = await prisma.orderCommission.count({
    where: { customerLinkId: linkId, status: { not: 'CLAWED_BACK' }, occurredAt: { lt: before } },
  });
  return prior === 0;
}
