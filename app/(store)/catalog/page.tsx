import { listProducts } from '@/lib/catalog';
import type { Product } from '@/lib/product-types';
import { familyByCompound, familySortRank } from '@/lib/catalog-meta';
import { withPricingMany } from '@/lib/pricing';
import { getActiveReferral } from '@/lib/referral';
import { JsonLd } from '@/components/JsonLd';

/** Numeric weight for sorting "5mg" / "1500mg" / "10000IU" strings. */
function sizeWeight(s: string): number {
  const m = String(s).match(/(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}
import { CatalogClient } from './CatalogClient';

export const metadata = {
  title: 'Catalog',
  description:
    'The full Merit Sciences catalog — lab-verified research compounds, HPLC-tested ≥99% per lot with a scannable COA on every label. Browse by pathway family or build a stack. Ships 48hr from San Antonio.',
};
// Force-dynamic — see app/page.tsx for rationale (Supabase pool cap).
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────
// Family classification — runs server-side once, passed to the client
// component as static data so we don't ship the classifier code in the
// browser bundle.
// ─────────────────────────────────────────────────────────────────────────
// The catalog's family taxonomy is defined once, in lib/catalog-meta.ts, and
// resolved from the compound name. There used to be a second, older taxonomy
// here — a hand-keyed FAMILY_BY_HANDLE map with its own union ('peptides' |
// 'cofactors' | 'blends') that took precedence over the classifier.
//
// It was quietly breaking merchandising. Half its handles no longer existed
// after the SKU rename ('klow', 'semax', 'bpc-157-tb-500'), so those entries
// were dead. The handles that DID match overrode the classifier with families
// the filter chips understood — while everything unmapped fell through to the
// real classifier and came back 'healing' / 'aesthetic' / 'gh' / 'longevity',
// which no chip matched. Seven live SKUs, Wolverine and KLOW among them, were
// reachable only under "All compounds".
//
// One taxonomy now. Re-export so the client keeps importing Family from here.
export type { Family } from '@/lib/catalog-meta';

// Stack templates — pre-built bundles named for common research use cases.
// Each template references its compound handles; the client resolves them
// to live product data so prices/lots reflect the current catalog.
export type StackTemplate = {
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  handles: string[];           // ordered handles for the stack
  bundleDiscountPct: number;   // applied to combined single-vial price
  accentColor: 'cobalt' | 'amber' | 'violet' | 'emerald';
};

const STACK_TEMPLATES: StackTemplate[] = [
  {
    slug: 'recovery-stack',
    name: 'The Recovery Stack',
    subtitle: 'Tissue + copper-peptide signaling',
    description: 'Wolverine paired with GHK-Cu — the most-stacked pair in our catalog for repair-pathway research.',
    handles: ['bpc-10mg-tb-10mg-wolverine-20mg', 'ghk-cu'],
    bundleDiscountPct: 10,
    accentColor: 'cobalt',
  },
  {
    slug: 'cellular-stack',
    name: 'The Cellular Stack',
    subtitle: 'Mitochondrial · coenzyme · signaling',
    description: 'NAD+, MOTS-c, and GHK-Cu — three molecules in the cellular-pathway literature, in one shipment.',
    handles: ['nad-500mg', 'mots-c', 'ghk-cu'],
    bundleDiscountPct: 12,
    accentColor: 'amber',
  },
  {
    slug: 'neuro-pair',
    name: 'The Neuropeptide Pair',
    subtitle: 'Russian heptapeptides',
    description: 'Selank and Semax — the two most-studied compounds in neuropeptide research, almost always stacked together.',
    handles: ['selank', 'semax-30mg'],
    bundleDiscountPct: 10,
    accentColor: 'violet',
  },
  {
    slug: 'gh-stack',
    name: 'The GH-Axis Stack',
    subtitle: 'Secretagogue + downstream',
    description: 'Sermorelin paired with IGF-1 LR3 — secretagogue plus downstream growth factor in the same shipment.',
    handles: ['sermorelin', 'igf-1-lr3'],
    bundleDiscountPct: 10,
    accentColor: 'emerald',
  },
];

// Pharmacist's notes — short editorial blurbs attached to specific
// handles. Reads as the pharmacist's voice in the catalog.
const PHARMACIST_NOTES: Record<string, string> = {
  'bpc-10mg-tb-10mg-wolverine-20mg':
    'The most-studied pentadecapeptide combination in the catalog. Wolverine ships with both BPC-157 and TB-500 co-formulated in one vial.',
  'nad-500mg':
    'A coenzyme, not a peptide. Stocked because the cellular-pathway literature is deep and reorders are consistent.',
  'bpc157-ghk-cu-50-tb500-kpv-klow-80mg':
    'Multi-pathway blend, co-formulated at our US facility. One vial, four signaling pathways under research.',
  'retatrutide-10mg':
    'Triple-agonist — newer than Tirzepatide. Limited literature but increasing research interest.',
  'pt-141':
    'Neuroendocrine pathway research. Stack-level demand higher than catalog-level, often paired with Selank.',
};

// Restock signals used to live here as hand-written static data — the
// original comment described them as "fake-but-plausible". On a storefront
// whose entire argument is that its numbers are real, telling a buyer a lot
// "released this week" when nothing released is the one thing that cannot
// ship. Removed rather than reworded. When inventory exposes real lot
// scheduling, this can come back sourced from it.

/**
 * Cost per milligram, in cents, or null when the vial size doesn't parse.
 *
 * This is the number the category refuses to publish. A 10mg vial at $60 and
 * a 30mg vial at $150 look like "$60" and "$150" on a shelf; per-mg they are
 * $6.00 and $5.00, and the bigger vial is the better buy by 17%. Every
 * peptide storefront leaves the buyer to work that out, which is precisely
 * why it's worth showing: it is the one comparison that cannot be gamed by
 * pack size, and publishing it is the merchandising equivalent of publishing
 * the COA.
 */
function centsPerMg(p: Product): number | null {
  const m = /([\d.]+)\s*mg/i.exec(p.vialSize);
  if (!m) return null;
  const mg = parseFloat(m[1]);
  if (!isFinite(mg) || mg <= 0) return null;
  return p.priceCents / mg;
}

// Server data prep — runs once at request time, hands a single bundle
// to the client component.
export default async function CatalogPage() {
  const rawProducts = await listProducts({ status: 'active' });
  // Decorate with effective pricing — practitioner price replaces
  // priceCents in-place when a signed-in practitioner is browsing,
  // retail stays for non-practitioners + the strikethrough comparison.
  const products = await withPricingMany(rawProducts);
  const isPractitionerPricing = products[0]?.isPractitionerPricing ?? false;

  // Accessories = bacteriostatic water + anything explicitly tagged.
  // Everything else goes in the main grid — including newly-imported
  // drafts that aren't yet hand-mapped in FAMILY_BY_HANDLE. Family is
  // resolved per-product via getFamilyForProduct() with a compound-
  // keyword fallback.
  const isAccessory = (p: Product) => /bacteriostatic|bac-water|bac_water/i.test(p.handle);
  const main = products.filter((p) => !isAccessory(p));
  const accessories = products.filter(isAccessory);

  // Enrich each product with its family + pharmacist note + restock signal
  // so the client doesn't need to do this lookup work.
  const enriched = main.map((p) => ({
    product: p,
    family: familyByCompound(p.compound),
    pharmacistNote: PHARMACIST_NOTES[p.handle] ?? null,
    restock: null,
    centsPerMg: centsPerMg(p),
  }));

  // Best-seller sort: GLP-1 first (Tirzepatide, Semaglutide, Retatrutide),
  // then healing → aesthetic → GH → longevity → neuro → bioregs → niche.
  // Within a family, sort by compound name then by numeric vial size
  // (5mg → 10mg → 30mg) so multi-size families read in ascending order.
  enriched.sort((a, b) => {
    const familyDiff = familySortRank(a.family) - familySortRank(b.family);
    if (familyDiff !== 0) return familyDiff;
    const compoundDiff = a.product.compound.localeCompare(b.product.compound);
    if (compoundDiff !== 0) return compoundDiff;
    return sizeWeight(a.product.vialSize) - sizeWeight(b.product.vialSize);
  });

  // Stack templates resolved to live product data
  const stacksResolved = STACK_TEMPLATES.map((stack) => {
    const items = stack.handles
      .map((h) => products.find((p) => p.handle === h))
      .filter(Boolean) as Product[];
    if (items.length !== stack.handles.length) {
      // Loud on the server rather than a silent disappearance: a stack that
      // vanishes from the catalog while its /stacks/[slug] page still exists
      // is invisible until someone happens to notice the gap.
      const missing = stack.handles.filter((h) => !products.some((p) => p.handle === h));
      console.warn(`[catalog] stack "${stack.slug}" hidden — missing handles: ${missing.join(', ')}`);
      return null;
    }
    const sumCents = items.reduce((acc, p) => acc + p.priceCents, 0);
    const discountedCents = Math.round(sumCents * (1 - stack.bundleDiscountPct / 100));
    return {
      ...stack,
      items,
      sumCents,
      discountedCents,
      savedCents: sumCents - discountedCents,
    };
  }).filter(Boolean) as Array<StackTemplate & {
    items: Product[];
    sumCents: number;
    discountedCents: number;
    savedCents: number;
  }>;

  // Referral pricing: if the visitor arrived via an active affiliate link,
  // surface the buyer discount as a strikethrough across the catalog.
  const referral = await getActiveReferral();

  // The catalog carried no structured data. An ItemList of Products is what
  // lets an answer engine enumerate what Merit actually sells rather than
  // inferring it from link text. Prices are real and server-resolved, so they
  // are safe to state; omitted entirely when the DB is unavailable rather
  // than asserting an empty catalog.
  const catalogSchema = enriched.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': 'https://meritsciences.com/catalog#page',
        url: 'https://meritsciences.com/catalog',
        name: 'Merit Sciences catalog — research compounds',
        isPartOf: { '@id': 'https://meritsciences.com/#website' },
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: enriched.length,
          itemListElement: enriched.slice(0, 100).map((e, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': 'Product',
              '@id': `https://meritsciences.com/products/${e.product.handle}#product`,
              name: `${e.product.title} ${e.product.vialSize}`,
              url: `https://meritsciences.com/products/${e.product.handle}`,
              brand: { '@id': 'https://meritsciences.com/#organization' },
              offers: {
                '@type': 'Offer',
                price: (e.product.priceCents / 100).toFixed(2),
                priceCurrency: 'USD',
                availability: 'https://schema.org/InStock',
                url: `https://meritsciences.com/products/${e.product.handle}`,
              },
            },
          })),
        },
      }
    : null;

  return (
    <>
    {catalogSchema && <JsonLd data={catalogSchema} />}
    <CatalogClient
      products={enriched}
      stacks={stacksResolved}
      accessories={accessories}
      totalCount={products.length}
      isPractitionerPricing={isPractitionerPricing}
      referralPct={referral?.discountPct ?? 0}
    />
    </>
  );
}
