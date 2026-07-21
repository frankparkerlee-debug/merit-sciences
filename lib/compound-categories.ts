/**
 * Mechanism-class groupings for the CATEGORY education sequences — the layer
 * above the per-compound approved-counterpart sequences. Where a compound has
 * no FDA-approved sibling to borrow (NAD⁺, MOTS-c, epitalon, BPC-157…), the
 * compliant angle is the PATHWAY: what the mechanism class is, what published
 * research explores, and that Merit sells the research compound documented per
 * lot. Outcomes are never attributed to a Merit vial; RUO on every beat
 * (applied by lib/category-sequences.ts).
 *
 * Member handles must exist in the catalog. Per-compound science (research
 * applications, class) is pulled from the VERIFIED lib/research-data.ts at
 * render time — this file only defines the groupings + connective copy.
 *
 * NOTE: category terms ("GLP-1", "NAD⁺") are NOT ad-safe — they still trigger
 * Meta/Google rejection. These sequences are EMAIL + on-site only, same as the
 * compound sequences.
 */

export type CategoryMember = { handle: string; name: string };

export type CompoundCategory = {
  key: string;            // sequenceKey, e.g. "cat-incretin"
  slug: string;           // lane / interest tag suffix
  name: string;           // buyer-facing category name
  tagline: string;        // one-line pathway description (neutral / RUO)
  // Optional class-level bridge to the approved-drug category. Only where it's
  // factually a shared receptor class — never an outcome claim.
  classContext?: string;
  heroHandle: string;     // enroll redirect target (a concrete PDP)
  members: CategoryMember[];
};

export const COMPOUND_CATEGORIES: Record<string, CompoundCategory> = {
  'cat-incretin': {
    key: 'cat-incretin',
    slug: 'incretin',
    name: 'GLP-1 & incretin research',
    tagline: 'The incretin receptor class studied for metabolic and body-weight research.',
    classContext: 'This is the receptor class the approved GLP-1 medicines act on.',
    heroHandle: 'ly3298176',
    members: [
      { handle: 'semaglutide', name: 'Semaglutide' },
      { handle: 'ly3298176', name: 'Tirzepatide' },
      { handle: 'ly3437943', name: 'Retatrutide' },
    ],
  },
  'cat-cellular': {
    key: 'cat-cellular',
    slug: 'cellular',
    name: 'NAD⁺ & cellular longevity',
    tagline: 'NAD⁺ and the mitochondrial pathways at the center of cellular-energy and longevity research.',
    heroHandle: 'nad-500mg',
    members: [
      { handle: 'nad-500mg', name: 'NAD⁺' },
      { handle: 'mots-c', name: 'MOTS-c' },
      { handle: '5-amino-1mq', name: '5-Amino-1MQ' },
      { handle: 'epitalon', name: 'Epitalon' },
    ],
  },
  'cat-gh-axis': {
    key: 'cat-gh-axis',
    slug: 'gh-axis',
    name: 'Growth-hormone axis',
    tagline: 'Growth-hormone-releasing pathways and their downstream signals.',
    heroHandle: 'sermorelin',
    members: [
      { handle: 'sermorelin', name: 'Sermorelin' },
      { handle: 'th9507', name: 'Tesamorelin' },
      { handle: 'aod-9604', name: 'AOD-9604' },
      { handle: 'igf-1-lr3', name: 'IGF-1 LR3' },
    ],
  },
  'cat-repair': {
    key: 'cat-repair',
    slug: 'repair',
    name: 'Tissue repair',
    tagline: 'The tissue-repair and copper-peptide signaling pathways.',
    heroHandle: 'bpc-157-tb-500',
    members: [
      { handle: 'bpc-157-tb-500', name: 'Wolverine (BPC-157 + TB-500)' },
      { handle: 'ghk-cu', name: 'GHK-Cu' },
      { handle: 'glow', name: 'GLOW' },
      { handle: 'klow', name: 'KLOW' },
    ],
  },
  'cat-neuro': {
    key: 'cat-neuro',
    slug: 'neuro',
    name: 'Neuropeptides',
    tagline: 'The Russian research heptapeptides studied for neuro-signaling.',
    heroHandle: 'selank',
    members: [
      { handle: 'selank', name: 'Selank' },
      { handle: 'semax', name: 'Semax' },
    ],
  },
  'cat-melanocortin': {
    key: 'cat-melanocortin',
    slug: 'melanocortin',
    name: 'Melanocortin & vitality',
    tagline: 'The melanocortin receptor pathway.',
    heroHandle: 'pt-141',
    members: [
      { handle: 'pt-141', name: 'PT-141' },
      { handle: 'melanotan-ii', name: 'Melanotan II' },
    ],
  },
};

export const CATEGORY_KEYS = Object.keys(COMPOUND_CATEGORIES);

export function categoryForKey(key: string): CompoundCategory | null {
  return COMPOUND_CATEGORIES[key] ?? null;
}
