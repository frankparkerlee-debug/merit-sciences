/**
 * Pricing source of truth.
 *
 * Public surfaces always render `effectivePriceCents` (not `priceCents`).
 * The helpers in this file resolve whether a signed-in practitioner gets
 * `Product.physicianPriceCents` instead, with bundle pricing recomputed
 * proportionally.
 *
 *   const products = await withPricingMany(rawProducts);
 *   products[0].effectivePriceCents   // base price to render
 *   products[0].isPractitionerPricing // true → show a "practitioner price applied" pill
 *   products[0].bundles               // bundles re-priced if practitioner
 */

import 'server-only';
import { getPractitionerSession, type PractitionerSession } from '@/lib/practitioner-session';
import type { Product } from '@/lib/product-types';

export type PricingContext = {
  session: PractitionerSession | null;
};

export type PricedProduct = Product & {
  effectivePriceCents: number;
  isPractitionerPricing: boolean;
};

/** Cheap helper for non-Product shapes that still have priceCents +
 *  physicianPriceCents fields (e.g. catalog query subsets). */
export type PricingFields = {
  priceCents: number;
  physicianPriceCents?: number | null;
  bundles?: Product['bundles'];
};

export async function getPricingContext(): Promise<PricingContext> {
  return { session: await getPractitionerSession() };
}

/**
 * Resolve the price a buyer should see for a single product. Pure
 * function — pass the session in so callers can fetch it once and reuse.
 */
export function priceFor(
  p: PricingFields,
  ctx: PricingContext,
): { effectivePriceCents: number; isPractitionerPricing: boolean } {
  const usePractitioner =
    !!(ctx.session && p.physicianPriceCents != null && p.physicianPriceCents > 0);
  return {
    effectivePriceCents: usePractitioner ? (p.physicianPriceCents as number) : p.priceCents,
    isPractitionerPricing: usePractitioner,
  };
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
  const { effectivePriceCents, isPractitionerPricing } = priceFor(product, ctx);
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
    bundles: product.bundles
      ? bundlesFor(product.bundles, retailPriceCents, effectivePriceCents, isPractitionerPricing)
      : product.bundles,
    // Same overwrite trick for compareAtCents — when practitioner sees
    // a struck-through "was $X" marker, that X should also be the
    // practitioner-tier "was", not retail's marketing was.
    compareAtCents: product.compareAtCents,
  };
}
