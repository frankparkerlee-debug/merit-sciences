import 'server-only';
import { prisma } from './db';

/**
 * Commission on orders from a practitioner account that an affiliate
 * introduced.
 *
 * Parker's formula:
 *   Product Revenue − Product Cost − (# of orders × $9.99) = Gross Profit
 *   Gross Profit × 20% = Commission
 *
 * This is a different model from the standard affiliate rate, which pays a
 * flat percentage of the order total. A practice buys at account pricing and
 * reorders steadily, so paying a share of REVENUE there would hand out
 * commission on volume that carries very little margin. Paying a share of what
 * the order actually earned keeps the incentive pointed at profitable volume.
 *
 * Commission is booked per order, so "# of orders" is 1 here and the $9.99
 * shipping deduction applies once to this order.
 */
export const PRACTITIONER_SHIPPING_DEDUCTION_CENTS = 999;
export const PRACTITIONER_COMMISSION_RATE_BP = 2000; // 20%

/** Vials actually shipped by one unit of a bundle line. */
export function vialsPerUnit(bundleLabel: string): number {
  const l = (bundleLabel || '').toLowerCase();
  if (l.includes('6-pack') || l.includes('6 pack')) return 6;
  if (l.includes('3-pack') || l.includes('3 pack')) return 3;
  return 1;
}

export type CommissionLine = {
  handle: string;
  bundleLabel: string;
  unitCents: number;
  qty: number;
};

export type GrossProfitResult = {
  revenueCents: number;
  productCostCents: number;
  shippingDeductionCents: number;
  grossProfitCents: number;
  commissionCents: number;
  rateBp: number;
  /** Handles we could not cost. Commission is withheld rather than guessed. */
  uncostedHandles: string[];
};

/**
 * Compute the gross-profit commission for a single order.
 *
 * Two things this gets right that a naive reading of the formula would not:
 *
 * 1. COST IS PER VIAL, NOT PER LINE. A "3-Pack" line with qty 1 ships three
 *    vials. Multiplying cost by qty alone would understate cost threefold and
 *    overpay commission by roughly the same margin.
 *
 * 2. A MISSING COST WITHHOLDS, IT DOES NOT ASSUME ZERO. Treating an unpriced
 *    SKU as free would silently pay commission on its entire revenue — the
 *    most expensive possible failure. The handle is reported instead so it can
 *    be fixed and the commission re-run.
 */
export async function computeGrossProfitCommission(
  lines: CommissionLine[],
): Promise<GrossProfitResult> {
  const handles = [...new Set(lines.map((l) => l.handle).filter(Boolean))];
  const products = handles.length
    ? await prisma.product.findMany({
        where: { handle: { in: handles } },
        select: { handle: true, costCents: true },
      })
    : [];
  const costByHandle = new Map(products.map((p) => [p.handle, p.costCents ?? null]));

  let revenueCents = 0;
  let productCostCents = 0;
  const uncostedHandles: string[] = [];

  for (const line of lines) {
    revenueCents += line.unitCents * line.qty;
    const cost = costByHandle.get(line.handle);
    if (cost == null || cost <= 0) {
      if (line.handle) uncostedHandles.push(line.handle);
      continue;
    }
    productCostCents += cost * vialsPerUnit(line.bundleLabel) * line.qty;
  }

  const shippingDeductionCents = PRACTITIONER_SHIPPING_DEDUCTION_CENTS;
  const grossProfitCents = revenueCents - productCostCents - shippingDeductionCents;

  // A negative-margin order earns nothing; it does not claw back from others.
  const commissionCents =
    uncostedHandles.length > 0
      ? 0
      : Math.max(0, Math.floor((grossProfitCents * PRACTITIONER_COMMISSION_RATE_BP) / 10_000));

  return {
    revenueCents,
    productCostCents,
    shippingDeductionCents,
    grossProfitCents,
    commissionCents,
    rateBp: PRACTITIONER_COMMISSION_RATE_BP,
    uncostedHandles,
  };
}

/** The affiliate who introduced this practice, if any. */
export async function referringAffiliateFor(customerEmail: string): Promise<string | null> {
  const app = await prisma.practitionerApplication.findFirst({
    where: { email: customerEmail.toLowerCase(), status: 'APPROVED' },
    select: { referredByAffiliateId: true },
  });
  return app?.referredByAffiliateId ?? null;
}
