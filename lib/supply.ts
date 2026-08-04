/**
 * Supply line data access — collagen, wound care, and DME.
 *
 * Read paths for the clinic storefront on meritcheckout.com. Kept separate
 * from lib/products.ts because the two catalogs share no fields worth
 * abstracting over: one is lot-tracked research compounds, the other is
 * HCPCS-coded medical supplies sold by the box.
 *
 * Pricing note: every product is priced PER BOX. `unitsPerBox` exists so the
 * UI can show the per-unit maths, which is how clinics actually compare — a
 * buyer who orders 10 boxes of 2x2 alginate is thinking in pieces, not boxes.
 */
import 'server-only';
import { prisma } from './db';
import type { SupplyCategory } from '@/lib/generated/prisma';
import type { SupplyListItem } from './supply-shared';

// Re-exported so existing server-side imports keep working unchanged.
export {
  SUPPLY_CATEGORIES,
  categoryLabel,
  money,
  perUnit,
  type SupplyListItem,
} from './supply-shared';




const LIST_SELECT = {
  handle: true,
  title: true,
  brand: true,
  eyebrow: true,
  category: true,
  oneLiner: true,
  priceCents: true,
  compareAtCents: true,
  sku: true,
  size: true,
  unitsPerBox: true,
  hcpcsCode: true,
  imageUrl: true,
  stockQty: true,
  rxOnly: true,
  sterile: true,
} as const;

/** Every active product, in curated order. */
export async function listSupplyProducts(
  opts: { category?: SupplyCategory } = {},
): Promise<SupplyListItem[]> {
  try {
    return await prisma.supplyProduct.findMany({
      where: { status: 'ACTIVE', ...(opts.category ? { category: opts.category } : {}) },
      select: LIST_SELECT,
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });
  } catch (err) {
    // Build-time and cold-start DB unavailability must not take the page down;
    // the storefront renders empty rather than 500ing. Same posture as the
    // peptide catalog.
    console.error('[supply] listSupplyProducts failed', err);
    return [];
  }
}

export async function getSupplyProduct(handle: string) {
  try {
    return await prisma.supplyProduct.findFirst({
      where: { handle, status: 'ACTIVE' },
    });
  } catch (err) {
    console.error('[supply] getSupplyProduct failed', err);
    return null;
  }
}

/** Same brand, excluding the current item — the useful "related" axis here. */
export async function relatedSupplyProducts(
  handle: string,
  brand: string | null,
  category: SupplyCategory,
): Promise<SupplyListItem[]> {
  try {
    return await prisma.supplyProduct.findMany({
      where: {
        status: 'ACTIVE',
        handle: { not: handle },
        ...(brand ? { brand } : { category }),
      },
      select: LIST_SELECT,
      orderBy: [{ sortOrder: 'asc' }],
      take: 4,
    });
  } catch {
    return [];
  }
}


