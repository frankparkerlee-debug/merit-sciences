// Shared catalog metadata — used by both /catalog and /products/[handle].
// Pure data + types, safe to import from either client or server context.

import type { Product } from '@/lib/product-types';

export type Family = 'peptides' | 'glp1' | 'cofactors' | 'neuropeptides' | 'blends';

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
  peptides:      'Peptides',
  glp1:          'GLP-1',
  cofactors:     'Cofactors',
  neuropeptides: 'Neuropeptides',
  blends:        'Blends',
};

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
    'Multi-pathway blend, co-formulated at our 503B facility. One vial, four signaling pathways under research.',
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
