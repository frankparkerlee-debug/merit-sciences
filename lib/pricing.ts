/**
 * Pricing source of truth.
 *
 * Public surfaces always render `effectivePriceCents` (not `priceCents`).
 * The helpers here resolve which price a buyer should see using a
 * four-step waterfall — per-SKU override → book-level multiplier on
 * Product.physicianPriceCents → bare physicianPriceCents → retail.
 *
 *   const products = await withPricingMany(rawProducts);
 *   products[0].effectivePriceCents   // base price to render
 *   products[0].isPractitionerPricing // true → "practitioner price applied" pill
 *   products[0].bundles               // re-priced if practitioner
 */

import 'server-only';
import { getPractitionerSession, type PractitionerSession } from '@/lib/practitioner-session';
import { prisma } from '@/lib/db';
import { deriveBundles, type Product } from '@/lib/product-types';

export type PricingContext = {
  session: PractitionerSession | null;
  /** Map of productHandle → override priceCents for the signed-in
   *  practitioner. Empty if no session or no overrides assigned. */
  overrides: Map<string, number>;
};

export type PricedProduct = Product & {
  effectivePriceCents: number;
  isPractitionerPricing: boolean;
};

/** Cheap helper for non-Product shapes that still have priceCents +
 *  physicianPriceCents fields (e.g. catalog query subsets). Pass
 *  `handle` so the resolver can pick up per-SKU overrides. */
export type PricingFields = {
  handle?: string;
  priceCents: number;
  physicianPriceCents?: number | null;
  bundles?: Product['bundles'];
};

export async function getPricingContext(): Promise<PricingContext> {
  const session = await getPractitionerSession();
  if (!session) return { session: null, overrides: new Map() };

  const rows = await prisma.practitionerPriceOverride.findMany({
    where: { applicationId: session.applicationId },
    select: { productHandle: true, priceCents: true },
  });
  const overrides = new Map<string, number>(
    rows.map((r) => [r.productHandle, r.priceCents]),
  );
  return { session, overrides };
}

/**
 * Resolve the price a buyer should see for a single product. Pure
 * function — pass the ctx in so callers can fetch it once and reuse.
 *
 * Waterfall:
 *   1. No practitioner session → retail.
 *   2. Override row exists for (practitioner, handle) → use override.
 *   3. physicianPriceCents present → apply book-level multiplier.
 *   4. Fallback → retail (no practitioner price configured for this SKU).
 */
export function priceFor(
  p: PricingFields,
  ctx: PricingContext,
): { effectivePriceCents: number; isPractitionerPricing: boolean } {
  if (!ctx.session) {
    return { effectivePriceCents: p.priceCents, isPractitionerPricing: false };
  }

  if (p.handle) {
    const override = ctx.overrides.get(p.handle);
    if (override != null && override > 0) {
      return { effectivePriceCents: override, isPractitionerPricing: true };
    }
  }

  if (p.physicianPriceCents != null && p.physicianPriceCents > 0) {
    const mult = ctx.session.priceMultiplierBps ?? 10000;
    const adjusted = Math.max(1, Math.round((p.physicianPriceCents * mult) / 10000));
    return { effectivePriceCents: adjusted, isPractitionerPricing: true };
  }

  return { effectivePriceCents: p.priceCents, isPractitionerPricing: false };
}

/**
 * Re-price the bundle ladder (Single / 3-Pack / 6-Pack / Subscribe) for
 * a practitioner. We compute each bundle as `vials × effectivePerVial`
 * so the wholesale discount applies uniformly across pack sizes and
 * the original retail bundle savings stay intact relative to the
 * practitioner base.
 */
export function bundlesFor(
  bundles: NonNullable<Product['bundles']>,
  retailPerVial: number,
  effectivePerVial: number,
  isPractitionerPricing: boolean,
): NonNullable<Product['bundles']> {
  if (!isPractitionerPricing) return bundles;
  return bundles.map((b) => {
    // Keep the original retail/practitioner discount ratio so a 3-pack
    // still costs less per vial than a single, even on the practitioner
    // tier. Fallback to vials × effectivePerVial if the bundle's retail
    // ratio is somehow off.
    const retailRatio = retailPerVial > 0 ? b.priceCents / (b.vials * retailPerVial) : 1;
    const practitionerCents = Math.round(b.vials * effectivePerVial * retailRatio);
    // Preserve the original retail price on `retailPriceCents` so the
    // PDP buybox can render a strikethrough across all pack sizes
    // without recomputing.
    return { ...b, priceCents: practitionerCents, retailPriceCents: b.priceCents };
  });
}

/**
 * Decorate a single product with effective pricing + re-priced bundles.
 * Use this in PDP server pages where you already have the session.
 */
export async function withPricing<T extends Product>(product: T): Promise<T & {
  effectivePriceCents: number;
  isPractitionerPricing: boolean;
}> {
  const ctx = await getPricingContext();
  return decorate(product, ctx);
}

/**
 * Decorate many products with one session fetch. Use for catalog grids.
 */
export async function withPricingMany<T extends Product>(products: T[]): Promise<Array<T & {
  effectivePriceCents: number;
  isPractitionerPricing: boolean;
}>> {
  const ctx = await getPricingContext();
  return products.map((p) => decorate(p, ctx));
}

function decorate<T extends Product>(
  product: T,
  ctx: PricingContext,
): T & {
  effectivePriceCents: number;
  retailPriceCents: number;
  isPractitionerPricing: boolean;
} {
  const { effectivePriceCents, isPractitionerPricing } = priceFor(
    { handle: product.handle, priceCents: product.priceCents, physicianPriceCents: (product as unknown as { physicianPriceCents?: number | null }).physicianPriceCents },
    ctx,
  );
  // Overwrite `priceCents` with the effective price so every existing
  // `money(p.priceCents)` reader (catalog cards, PDP, cart, checkout)
  // automatically picks up practitioner pricing with no UI changes.
  // The original retail value is preserved on `retailPriceCents` for
  // strikethrough comparison rendering.
  const retailPriceCents = product.priceCents;
  return {
    ...product,
    priceCents: effectivePriceCents,
    retailPriceCents,
    effectivePriceCents,
    isPractitionerPricing,
    // Bundles are DERIVED from the retail price (not the stored JSON) so the
    // pack / subscribe tiers always track the live price; bundlesFor then
    // re-prices the ladder for a signed-in practitioner (no-op for retail).
    bundles: bundlesFor(
      deriveBundles(retailPriceCents),
      retailPriceCents,
      effectivePriceCents,
      isPractitionerPricing,
    ),
    // Same overwrite trick for compareAtCents — when practitioner sees
    // a struck-through "was $X" marker, that X should also be the
    // practitioner-tier "was", not retail's marketing was.
    compareAtCents: product.compareAtCents,
  };
}
