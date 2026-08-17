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
import { cookies } from 'next/headers';
import { getPractitionerSession, type PractitionerSession } from '@/lib/practitioner-session';
import { PRACTITIONER_COOKIE, verifyPractitionerCookie } from '@/lib/checkout-handoff';
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
  let session = await getPractitionerSession();

  /* Checkout runs on a SEPARATE domain, and the Supabase auth cookie is scoped
     to the storefront — so on meritcheckout.com the line above finds nothing
     and the cart would price at full retail. A practice would browse at their
     rate and be charged list.
     /api/checkout/claim restores the practice here as a signed cookie, the
     same way it restores the affiliate cookies so the commission path runs
     identically. The signature is the load-bearing part: an unsigned id would
     let any buyer grant themselves account pricing. We still read the practice
     from the database rather than trusting anything in the cookie beyond the
     verified id, so a deactivated account stops getting the rate immediately. */
  if (!session) {
    const signed = cookies().get(PRACTITIONER_COOKIE)?.value;
    const applicationId = verifyPractitionerCookie(signed);
    if (applicationId) {
      const app = await prisma.practitionerApplication
        .findFirst({
          where: { id: applicationId, status: 'APPROVED' },
          select: {
            id: true, email: true, practiceName: true, providerName: true,
            priceMultiplierBps: true, retailDiscountBps: true,
          },
        })
        .catch(() => null);
      if (app) {
        session = {
          email: app.email,
          userId: '',
          applicationId: app.id,
          practiceName: app.practiceName,
          providerName: app.providerName,
          tier: 'standard',
          priceMultiplierBps: app.priceMultiplierBps ?? 10000,
          retailDiscountBps: app.retailDiscountBps ?? null,
        };
      }
    }
  }

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

  /* Flat "X% off retail" deals.
   *
   * This sits ABOVE the physician book on purpose. A practice signed at
   * "10% off list" is not on the book, and the book cannot express that
   * deal: physicianPriceCents is an absolute per-SKU price whose implied
   * discount ranges from 10% to 44% off retail across the live catalog, so
   * no single multiplier yields a flat percentage. Worse, a SKU with no
   * physicianPriceCents falls through to full retail — the practice would
   * silently get 0% off on exactly the products we forgot to price.
   *
   * Deriving from retail on every request also means the deal survives
   * price changes. Per-SKU override rows store absolute cents, so raising
   * a retail price quietly changes the practice's real discount; a bps
   * figure stays 10% off forever. Explicit overrides still win, because
   * those are a deliberate per-SKU decision.
   */
  const retailBps = ctx.session.retailDiscountBps;
  if (retailBps != null && retailBps > 0 && retailBps < 10000) {
    const discounted = Math.max(1, Math.round((p.priceCents * (10000 - retailBps)) / 10000));
    return { effectivePriceCents: discounted, isPractitionerPricing: true };
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
