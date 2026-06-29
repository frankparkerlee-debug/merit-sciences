// Shared catalog metadata — used by both /catalog and /products/[handle].
// Pure data + types, safe to import from either client or server context.

import type { Product } from '@/lib/product-types';

export type Family =
  | 'glp1'           // Tirzepatide, Semaglutide, Retatrutide, Cagrilintide — #1 demand
  | 'healing'        // BPC-157, TB-500, KPV, Wolverine — recovery / soft tissue
  | 'aesthetic'      // GHK-Cu, GLOW, KLOW, Melanotan-II — skin / cosmetic
  | 'gh'             // CJC, Ipamorelin, Tesamorelin, Sermorelin, IGF-1, AOD — GH axis
  | 'longevity'      // NAD+, Glutathione, Epitalon, MOTS-c, Thymosin Alpha-1
  | 'neuropeptides'  // Selank, Semax, PT-141, DSIP, Kisspeptin, Oxytocin
  | 'bioregulators'  // Cardiogen, Cartalax, Prostamax, Pinealon, Thymalin
  | 'niche'          // FOXO4-DRI, SLU-PP-332, PNC-27, LL-37, VIP, etc.
  // Legacy values kept so existing FAMILY_BY_HANDLE entries still type-check.
  // Catalog code maps these to the new families via familyRank/order maps.
  | 'peptides'
  | 'cofactors'
  | 'blends';

export const FAMILY_BY_HANDLE: Record<string, Family> = {
  'bpc-157-tb-500':     'blends',
  'thymosin-alpha-1':   'peptides',
  'aod-9604':           'peptides',
  'igf-1-lr3':          'peptides',
  'sermorelin':         'peptides',
  'th9507':             'peptides',
  'ly3298176':          'glp1',
  'ly3437943':          'glp1',
  'nad-500mg':          'cofactors',
  'ghk-cu':             'cofactors',
  'mots-c':             'cofactors',
  'epitalon':           'cofactors',
  'selank':             'neuropeptides',
  'semax':              'neuropeptides',
  'pt-141':             'neuropeptides',
  'melanotan-ii':       'neuropeptides',
  'klow':               'blends',
};

export const FAMILY_LABELS: Record<Family, string> = {
  glp1:          'GLPs',
  healing:       'Healing',
  aesthetic:     'Aesthetic',
  gh:            'Growth Hormone',
  longevity:     'Longevity',
  neuropeptides: 'Neuropeptides',
  bioregulators: 'Bioregulators',
  niche:         'Research',
  // Legacy aliases
  peptides:      'Peptides',
  cofactors:     'Cofactors',
  blends:        'Blends',
};

/**
 * Fallback family classifier — used when a new product from the inventory
 * importer doesn't yet appear in FAMILY_BY_HANDLE. Buckets by compound
 * name keyword so 50+ new drafts can show on /catalog immediately without
 * hand-mapping every handle. Specific overrides in FAMILY_BY_HANDLE always
 * win — this is just the safety net.
 */
export function familyByCompound(compound: string): Family {
  const c = compound.toLowerCase();

  // ── #1 GLPs (metabolic / weight-loss / body-comp) ────────────
  // Includes the GLP-1/2 agonists proper plus the broader fat-loss
  // family the peptide market lumps with them: Tesamorelin (GHRH for
  // visceral fat), AOD-9604 (GH lipolytic fragment), 5-Amino-1MQ
  // (NNMT inhibitor). All sold under the "GLPs" header.
  if (/(retatrutide|tirzepatide|semaglutide|cagrilintide|liraglutide|tesamorelin|aod-?9604|5-amino-?1mq)/.test(c)) return 'glp1';

  // ── #2 Healing / recovery (soft tissue, gut, wound) ──────────
  if (/(wolverine|bpc[\s-]*157|bpc.*tb|tb[\s-]*500|kpv|thymosin\s*b)/.test(c)) return 'healing';

  // ── #3 Aesthetic / cosmetic ──────────────────────────────────
  // GHK-Cu, GLOW (GHK+BPC+TB), KLOW (GHK+BPC+TB+KPV), Melanotan
  if (/(klow|glow|ghk[\s-]*cu|melanotan)/.test(c)) return 'aesthetic';

  // ── #4 Growth hormone axis (muscle / recovery, NOT fat loss) ─
  // Tesamorelin + AOD-9604 are in the GLPs bucket above, not here.
  if (/(cjc[\s-]*1295|ipamorelin|ipa\b|sermorelin|igf-?1|ghrp|mk-?677)/.test(c)) return 'gh';

  // ── #5 Longevity / anti-aging cofactors ──────────────────────
  if (/(nad|glutathione|epitalon|mots|thymosin\s*alpha|thymalin|5-amino-1mq)/.test(c)) return 'longevity';

  // ── #6 Neuropeptides / cognition / sexual function ───────────
  if (/(selank|semax|pt-?141|kisspeptin|dsip|oxytocin|vip|pe[\s-]*22)/.test(c)) return 'neuropeptides';

  // ── #7 Russian bioregulators (Khavinson peptides) ────────────
  if (/(cardiogen|cartalax|prostamax|pinealon|chonluten)/.test(c)) return 'bioregulators';

  // ── #8 Niche / research-only ─────────────────────────────────
  // Fallthrough for FOXO4-DRI, SLU-PP-332, PNC-27, LL-37, PTD-DBM,
  // Follistatin, HCG, etc. — everything that's still actively researched
  // but doesn't fit a clear tier.
  return 'niche';
}

/**
 * Best-seller ordering — lower number = shown first on /catalog.
 * Based on real peptide e-commerce demand patterns (June 2026 baseline):
 * GLP-1 dominates everything; healing is steady #2; aesthetic and GH
 * cluster mid-pack; bioregulators and niche bring up the rear.
 *
 * Legacy family labels ('peptides', 'cofactors', 'blends') get mapped
 * to sensible defaults so existing seed data doesn't sink to the bottom.
 */
export const FAMILY_SORT_RANK: Record<Family, number> = {
  glp1:           1,
  healing:        2,
  aesthetic:      3,
  gh:             4,
  longevity:      5,
  neuropeptides:  6,
  bioregulators:  7,
  niche:          8,
  // Legacy buckets — placed alongside their nearest new home
  blends:         2,  // BPC+TB, Wolverine → treat as healing
  peptides:       4,  // Mostly single-peptide GH axis or healing → GH bucket
  cofactors:      5,  // Mostly longevity supports
};

export function familySortRank(f: Family | null | undefined): number {
  if (!f) return 999;
  return FAMILY_SORT_RANK[f] ?? 999;
}

export type StackTemplate = {
  slug: string;
  name: string;
  subtitle: string;
  description: string;
  handles: string[];
  bundleDiscountPct: number;
  accentColor: 'cobalt' | 'amber' | 'violet' | 'emerald';
};

export const STACK_TEMPLATES: StackTemplate[] = [
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

export const PHARMACIST_NOTES: Record<string, string> = {
  'bpc-157-tb-500':
    'The most-studied pentadecapeptide combination in the catalog. Wolverine ships with both BPC-157 and TB-500 co-formulated in one vial.',
  'nad-500mg':
    'A coenzyme, not a peptide. Stocked because the cellular-pathway literature is deep and reorders are consistent.',
  'klow':
    'Multi-pathway blend, co-formulated at our US facility. One vial, four signaling pathways under research.',
  'ly3437943':
    'Triple-agonist — newer than Tirzepatide. Limited literature but increasing research interest.',
  'pt-141':
    'Neuroendocrine pathway research. Stack-level demand higher than catalog-level, often paired with Selank.',
};

export type RestockSignal = {
  status: 'fresh' | 'low' | 'restocking';
  message: string;
};

export const RESTOCK_SIGNALS: Record<string, RestockSignal> = {
  'ly3437943':       { status: 'low',        message: 'Current lot ships through July 2026' },
  'mots-c':          { status: 'fresh',      message: 'New lot — released this week' },
  'sermorelin':      { status: 'restocking', message: 'Next lot releases July 12, 2026' },
};

// ── Stack helpers ─────────────────────────────────────────────────────

export type StackResolved = StackTemplate & {
  items: Product[];
  sumCents: number;
  discountedCents: number;
  savedCents: number;
};

/**
 * Find all stacks that include a given product handle.
 * Used on the PDP to suggest "this product pairs well with these stacks."
 */
export function stacksContaining(handle: string, products: Product[]): StackResolved[] {
  return STACK_TEMPLATES
    .filter((s) => s.handles.includes(handle))
    .map((stack) => {
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
    })
    .filter(Boolean) as StackResolved[];
}

export function familyLabel(f: Family): string {
  return FAMILY_LABELS[f];
}

export function getFamily(handle: string): Family | null {
  return FAMILY_BY_HANDLE[handle] ?? null;
}

/**
 * Resolve a product's family — handle-specific override wins, otherwise
 * fall back to compound-keyword classification. Always returns a value,
 * so newly-imported drafts show up on the catalog without manual
 * handle-mapping.
 */
export function getFamilyForProduct(p: { handle: string; compound: string }): Family {
  return FAMILY_BY_HANDLE[p.handle] ?? familyByCompound(p.compound);
}

/**
 * Build a cart line item for a resolved stack. Single line per stack
 * (preserves the discount + the stack identity in the cart drawer).
 * The first component's image becomes the thumbnail; the rest are
 * surfaced via the `components` metadata + a "+N" badge in the drawer.
 */
export function stackToCartLine(stack: StackResolved): {
  handle: string;
  title: string;
  bundleLabel: string;
  unitCents: number;
  imageUrl?: string;
  components: string[];
} {
  const componentNames = stack.items.map((p) => p.title).join(' + ');
  return {
    handle: `stack:${stack.slug}`,
    title: stack.name,
    bundleLabel: `${componentNames} · save ${stack.bundleDiscountPct}%`,
    unitCents: stack.discountedCents,
    imageUrl: stack.items[0]?.imageUrl,
    components: stack.items.map((p) => p.handle),
  };
}

export function getStack(slug: string): StackTemplate | null {
  return STACK_TEMPLATES.find((s) => s.slug === slug) ?? null;
}
