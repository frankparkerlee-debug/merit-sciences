// Pure type + utility module — safe to import from client OR server.
// No fs / path / node-only deps.

export type Product = {
  handle: string;
  title: string;
  compound: string;
  eyebrow: string;
  vialSize: string;
  format: 'lyophilized' | 'reconstituted';
  oneLiner: string;
  // Price stored in cents to avoid float math at the cart layer.
  priceCents: number;
  compareAtCents?: number;
  // ── Decorated by lib/pricing.ts at render time ───────────────────
  // When a signed-in approved practitioner is browsing, lib/pricing
  // overwrites `priceCents` with the practitioner-tier price and
  // preserves the original retail value on `retailPriceCents` for
  // strikethrough rendering. Both fields are undefined for non-
  // practitioner traffic.
  retailPriceCents?: number;
  isPractitionerPricing?: boolean;
  bundles?: { label: string; vials: number; priceCents: number; retailPriceCents?: number }[];
  // Chemistry metafields surfaced on PDP spec block
  spec: {
    cas?: string;
    mw?: string;
    formula?: string;
    sequence?: string;
    aminoAcids?: number;
  };
  // Current shipping lot + COA reference
  lot: {
    id: string;
    purity: string;
    testedDate: string;
    bud: string;
    coaUrl?: string;
  };
  // Buyer-segment tag — drives positioning copy on PDP
  segment: 'biohacker' | 'clinic' | 'aesthetic' | 'athletic' | 'researcher';
  // RUO retail vs clinic-only (gated) vs both
  channel: 'rua' | 'clinic' | 'both';
  // Set true if the SKU was suspended on Shopify — surfaces a notice on PDP
  shopifySuspended?: boolean;
  status: 'active' | 'draft';
  // Product imagery (Shopify CDN URLs for now, migrate to /public/products/ later)
  imageUrl?: string;
  images?: string[];
};

export function money(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Standard bundle ladder DERIVED from a single per-vial price. The price is
 * the single source of truth — editing a product's priceCents flows to every
 * pack tier automatically. Multipliers are uniform across the whole catalog
 * (verified): Single 1.0× · 3-Pack 0.95× · 6-Pack 0.90× · Subscribe 0.90×.
 * Replaces the hand-maintained `bundles` JSON, which went stale whenever a
 * price was edited without re-editing the array — the exact cause of the
 * $169.99-pill / $135-body split on Retatrutide 30mg.
 */
export function deriveBundles(perVialCents: number): NonNullable<Product['bundles']> {
  return [
    { label: 'Single', vials: 1, priceCents: perVialCents },
    { label: '3-Pack', vials: 3, priceCents: Math.round(perVialCents * 3 * 0.95) },
    { label: '6-Pack', vials: 6, priceCents: Math.round(perVialCents * 6 * 0.9) },
    { label: 'Subscribe & Save 10%', vials: 1, priceCents: Math.round(perVialCents * 0.9) },
  ];
}

/**
 * Resolve a product image URL with a Merit-branded placeholder fallback.
 * Use this everywhere a product image is rendered so newly created
 * draft products (no imageUrl yet) still show a clean visual instead
 * of broken-image icons or empty slots.
 *
 * The placeholder SVG lives at /public/products/placeholder-vial.svg
 * and stays consistent across catalog cards, PDPs, cart drawer, emails,
 * cross-sell modules, etc.
 */
export const PRODUCT_PLACEHOLDER_IMAGE = '/products/placeholder-vial.webp';

export function productImage(imageUrl: string | null | undefined): string {
  return imageUrl || PRODUCT_PLACEHOLDER_IMAGE;
}
