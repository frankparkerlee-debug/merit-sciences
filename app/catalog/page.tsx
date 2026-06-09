import { listProducts } from '@/lib/catalog';
import type { Product } from '@/lib/product-types';
import { CatalogClient } from './CatalogClient';

export const metadata = { title: 'Catalog' };

// ─────────────────────────────────────────────────────────────────────────
// Family classification — runs server-side once, passed to the client
// component as static data so we don't ship the classifier code in the
// browser bundle.
// ─────────────────────────────────────────────────────────────────────────
export type Family = 'peptides' | 'glp1' | 'cofactors' | 'neuropeptides' | 'blends';

const FAMILY_BY_HANDLE: Record<string, Family> = {
  // Single peptides — repair / growth / signaling
  'bpc-157-tb-500':     'blends',         // BPC + TB co-formulated, actually a blend
  'thymosin-alpha-1':   'peptides',
  'aod-9604':           'peptides',
  'igf-1-lr3':          'peptides',
  'sermorelin':         'peptides',
  'th9507':             'peptides',       // Tesamorelin — GHRH analog
  // GLP-1 / metabolic
  'ly3298176':          'glp1',           // Tirzepatide
  'ly3437943':          'glp1',           // Retatrutide
  // Cofactors / cellular
  'nad-500mg':          'cofactors',
  'ghk-cu':             'cofactors',
  'mots-c':             'cofactors',
  'epitalon':           'cofactors',
  // Neuropeptides
  'selank':             'neuropeptides',
  'semax':              'neuropeptides',
  'pt-141':             'neuropeptides',
  'melanotan-ii':       'neuropeptides',
  // Blends
  'klow':               'blends',
};

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
    handles: ['bpc-157-tb-500', 'ghk-cu'],
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
    handles: ['selank', 'semax'],
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
  'bpc-157-tb-500':
    'The most-studied pentadecapeptide combination in the catalog. Wolverine ships with both BPC-157 and TB-500 co-formulated in one vial.',
  'nad-500mg':
    'A coenzyme, not a peptide. Stocked because the cellular-pathway literature is deep and reorders are consistent.',
  'klow':
    'Multi-pathway blend, co-formulated at our 503B facility. One vial, four signaling pathways under research.',
  'ly3437943':
    'Triple-agonist — newer than Tirzepatide. Limited literature but increasing research interest.',
  'pt-141':
    'Neuroendocrine pathway research. Stack-level demand higher than catalog-level, often paired with Selank.',
};

// Restocking signals — fake-but-plausible "next lot" data for a few
// products. In a real build this comes from inventory + lot scheduling;
// here it lives as static data and signals scarcity/freshness.
const RESTOCK_SIGNALS: Record<string, { status: 'fresh' | 'low' | 'restocking'; message: string }> = {
  'ly3437943':       { status: 'low',        message: 'Current lot ships through July 2026' },
  'mots-c':          { status: 'fresh',      message: 'New lot — released this week' },
  'sermorelin':      { status: 'restocking', message: 'Next lot releases July 12, 2026' },
};

// Server data prep — runs once at request time, hands a single bundle
// to the client component.
export default function CatalogPage() {
  const products = listProducts({ status: 'active' });

  // Drop accessories from the main grid. They'll appear in a dedicated
  // section or live elsewhere (PDP upsell).
  const main = products.filter(
    (p) => p.handle in FAMILY_BY_HANDLE,
  );

  const accessories = products.filter((p) => !(p.handle in FAMILY_BY_HANDLE));

  // Enrich each product with its family + pharmacist note + restock signal
  // so the client doesn't need to do this lookup work.
  const enriched = main.map((p) => ({
    product: p,
    family: FAMILY_BY_HANDLE[p.handle],
    pharmacistNote: PHARMACIST_NOTES[p.handle] ?? null,
    restock: RESTOCK_SIGNALS[p.handle] ?? null,
  }));

  // Stack templates resolved to live product data
  const stacksResolved = STACK_TEMPLATES.map((stack) => {
    const items = stack.handles
      .map((h) => products.find((p) => p.handle === h))
      .filter(Boolean) as Product[];
    if (items.length !== stack.handles.length) return null;
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

  return (
    <CatalogClient
      products={enriched}
      stacks={stacksResolved}
      accessories={accessories}
      totalCount={products.length}
    />
  );
}
