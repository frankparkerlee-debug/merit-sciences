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
  bundles?: { label: string; vials: number; priceCents: number }[];
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
