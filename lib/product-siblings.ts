import 'server-only';
import { prisma } from './db';

/**
 * Sibling = a product that shares the same `compound` as the one being
 * viewed but is sold at a different vialSize (e.g. Retatrutide 10mg vs
 * Retatrutide 30mg). The PDP renders a size selector listing all
 * siblings so a buyer landing on 10mg can switch to 30mg in one click
 * without backtracking to the catalog.
 *
 * Until the ProductVariant data model lands (Phase B), siblings are
 * separate Product rows linked at query time by exact compound match.
 * That's why the inventory importer creates per-size drafts instead of
 * collapsing them.
 */
export type Sibling = {
  handle: string;
  title: string;
  vialSize: string;
  priceCents: number;
  stockQty: number;
  /** Is this the product currently being viewed? */
  isCurrent: boolean;
};

export async function getSiblings(
  compound: string,
  currentHandle: string,
): Promise<Sibling[]> {
  if (!compound) return [];
  try {
    const rows = await prisma.product.findMany({
      where: {
        compound: { equals: compound, mode: 'insensitive' },
        status: 'ACTIVE',
      },
      select: {
        handle: true,
        title: true,
        vialSize: true,
        priceCents: true,
        stockQty: true,
      },
    });
    // Need at least 2 sibling products for a picker to be useful
    if (rows.length <= 1) return [];
    return rows
      .sort((a, b) => sizeWeight(a.vialSize) - sizeWeight(b.vialSize))
      .map((r) => ({
        handle: r.handle,
        title: r.title,
        vialSize: r.vialSize,
        priceCents: r.priceCents,
        stockQty: r.stockQty,
        isCurrent: r.handle === currentHandle,
      }));
  } catch (err) {
    // Resilient to DB unavailability during builds (same posture as
    // listProducts in lib/catalog.ts)
    console.warn('[getSiblings] DB query failed, returning none', err);
    return [];
  }
}

/**
 * Numeric weight for sorting vialSize strings. "5mg" → 5, "1500mg" →
 * 1500, "10000IU" → 10000. Strips units, returns the first numeric
 * value. Used to order pickers smallest-to-largest.
 */
function sizeWeight(s: string): number {
  const m = String(s).match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}
