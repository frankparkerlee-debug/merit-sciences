import 'server-only';
import { unstable_cache } from 'next/cache';
import { prisma } from './db';
import type { Product } from './product-types';
import type { Product as DbProduct } from './generated/prisma/index.js';

// Product data is identical for every visitor and changes rarely, but
// the storefront pages are force-dynamic (per-user pricing) so they
// re-query the (cross-region) DB on every hit. Cache the raw product
// reads in Next's data cache so anonymous traffic serves from memory
// instead of a ~70ms cross-country round-trip per request. Admin
// product mutations call revalidateTag('products') to bust instantly.
const PRODUCTS_TAG = 'products';
const PRODUCTS_REVALIDATE_SECONDS = 300;

// Re-export the shared type + utilities so existing server-side imports
// from '@/lib/catalog' keep working.
export type { Product } from './product-types';
export { money } from './product-types';

/**
 * List products from Supabase. Returns the same Product shape as the
 * legacy fs-backed version so storefront callers (catalog, PDP, home,
 * stacks) keep rendering identically.
 *
 * filter.channel='rua' includes 'both' (RUA channel sees RUA-only AND
 * both-channel products). This matches the legacy fs behavior.
 */
export async function listProducts(filter?: {
  status?: Product['status'];
  channel?: Product['channel'];
}): Promise<Product[]> {
  const where: any = {};
  if (filter?.status) where.status = statusToDb(filter.status);
  if (filter?.channel) {
    if (filter.channel === 'rua') {
      where.channel = { in: ['RUA', 'BOTH'] };
    } else if (filter.channel === 'clinic') {
      where.channel = { in: ['CLINIC', 'BOTH'] };
    } else {
      where.channel = 'BOTH';
    }
  }
  // Resilient — return [] if DB is unavailable (missing table, exhausted
  // pool, etc) so build-time prerender doesn't crash the entire deploy.
  // The cache only stores SUCCESSFUL results: a thrown error propagates
  // out of unstable_cache (not cached) and is caught here, so a transient
  // DB blip can't pin an empty list for the whole revalidate window.
  try {
    return await cachedFindProducts(where);
  } catch (err) {
    console.warn('[catalog] listProducts query failed — returning empty list', err);
    return [];
  }
}

const cachedFindProducts = unstable_cache(
  async (where: any): Promise<Product[]> => {
    const rows = await prisma.product.findMany({ where, orderBy: { createdAt: 'asc' } });
    return rows.map(dbToProduct);
  },
  ['catalog-list-products'],
  { revalidate: PRODUCTS_REVALIDATE_SECONDS, tags: [PRODUCTS_TAG] },
);

const cachedFindProduct = unstable_cache(
  async (handle: string): Promise<Product | null> => {
    const row = await prisma.product.findUnique({ where: { handle } });
    return row ? dbToProduct(row) : null;
  },
  ['catalog-get-product'],
  { revalidate: PRODUCTS_REVALIDATE_SECONDS, tags: [PRODUCTS_TAG] },
);

export async function getProduct(handle: string): Promise<Product | null> {
  try {
    return await cachedFindProduct(handle);
  } catch (err) {
    console.warn(`[catalog] getProduct("${handle}") query failed — returning null`, err);
    return null;
  }
}

/* ─── DB <-> Product shape conversion ─── */

function dbToProduct(r: DbProduct): Product {
  return {
    handle: r.handle,
    title: r.title,
    compound: r.compound,
    eyebrow: r.eyebrow,
    vialSize: r.vialSize,
    format: r.format.toLowerCase() as Product['format'],
    oneLiner: r.oneLiner,
    priceCents: r.priceCents,
    compareAtCents: r.compareAtCents ?? undefined,
    bundles: (r.bundles as any) ?? undefined,
    spec: {
      cas: r.specCas ?? undefined,
      mw: r.specMw ?? undefined,
      formula: r.specFormula ?? undefined,
      sequence: r.specSequence ?? undefined,
      aminoAcids: r.specAminoAcids ?? undefined,
    },
    lot: {
      id: r.lotId,
      purity: r.lotPurity,
      testedDate: r.lotTestedDate,
      bud: r.lotBud,
      coaUrl: r.lotCoaUrl ?? undefined,
    },
    segment: r.segment.toLowerCase() as Product['segment'],
    channel: r.channel.toLowerCase() as Product['channel'],
    shopifySuspended: r.shopifySuspended || undefined,
    status: r.status.toLowerCase() as Product['status'],
    imageUrl: r.imageUrl ?? undefined,
    images: r.images.length > 0 ? r.images : undefined,
  };
}

function statusToDb(s: Product['status']): 'ACTIVE' | 'DRAFT' {
  return s === 'active' ? 'ACTIVE' : 'DRAFT';
}
