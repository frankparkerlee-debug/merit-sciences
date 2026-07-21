/**
 * Approved-counterpart data — the compliant backbone of the compound
 * education sequences. Every outcome number here is attributed to an
 * FDA-approved (or formerly-approved / foreign-approved) reference drug and
 * its published trial — NEVER to a Merit vial. Reporting a trial result for
 * an approved drug is science journalism; promising that result from our
 * research compound is an unapproved-drug claim. We only do the former.
 *
 * `stat` values are verified against primary sources (NEJM / Lilly / Novo /
 * FDA label). If you edit one, re-verify — a wrong trial number on these
 * emails is the single highest-risk thing we send.
 *
 * RUO framing is applied by the renderer (lib/product-sequences.ts) on every
 * beat; do not bake outcome promises into these strings.
 */

export type Counterpart = {
  handle: string;            // catalog product handle (must exist)
  compound: string;         // display name
  aka?: string;             // short parenthetical, e.g. "GLP-1/GIP dual agonist"
  lane: 'weight' | 'metabolic' | 'vitality' | 'gh' | 'immune';
  // The approved / formerly-approved / foreign-approved reference drug(s).
  brandNames: string[];     // e.g. ["Mounjaro", "Zepbound"]
  sponsor: string;          // e.g. "Eli Lilly"
  approvalStatus:
    | 'fda-approved'
    | 'fda-approved-discontinued'
    | 'foreign-approved'
    | 'investigational';
  approvalNote: string;     // one honest sentence about the status
  // The headline trial result — ATTRIBUTED TO THE APPROVED DRUG.
  trial: {
    name: string;           // e.g. "SURMOUNT-1"
    sponsorDrug: string;    // the drug the number belongs to
    stat: string;           // e.g. "22.5% mean body weight reduction"
    detail: string;         // dose + duration + population
    source: string;         // journal + year
  } | null;
  meritAngle: string;       // why buy the research compound from Merit
};

export const COUNTERPARTS: Record<string, Counterpart> = {
  'ly3298176': {
    handle: 'ly3298176',
    compound: 'Tirzepatide',
    aka: 'GLP-1 / GIP dual agonist',
    lane: 'weight',
    brandNames: ['Mounjaro', 'Zepbound'],
    sponsor: 'Eli Lilly',
    approvalStatus: 'fda-approved',
    approvalNote: 'Tirzepatide is the active molecule in Lilly’s FDA-approved Mounjaro and Zepbound.',
    trial: {
      name: 'SURMOUNT-1',
      sponsorDrug: 'the approved drug (tirzepatide 15 mg)',
      stat: '22.5% mean body-weight reduction',
      detail: 'at the 15 mg dose over 72 weeks, in adults with obesity or overweight',
      source: 'New England Journal of Medicine, 2022',
    },
    meritAngle:
      'The same molecule the branded pens are built on — pharmacy-grade, HPLC-verified per lot, with the COA public, at a fraction of the brand-name cost.',
  },
  'semaglutide': {
    handle: 'semaglutide',
    compound: 'Semaglutide',
    aka: 'GLP-1 receptor agonist',
    lane: 'weight',
    brandNames: ['Ozempic', 'Wegovy'],
    sponsor: 'Novo Nordisk',
    approvalStatus: 'fda-approved',
    approvalNote: 'Semaglutide is the active molecule in Novo Nordisk’s FDA-approved Ozempic and Wegovy.',
    trial: {
      name: 'STEP-1',
      sponsorDrug: 'the approved drug (semaglutide 2.4 mg)',
      stat: '14.9% mean body-weight reduction',
      detail: 'at the 2.4 mg dose over 68 weeks, in adults with overweight or obesity',
      source: 'New England Journal of Medicine, 2021',
    },
    meritAngle:
      'The most recognized molecule in the category — the same one, pharmacy-grade and lot-verified, with the receipt on every label.',
  },
  'ly3437943': {
    handle: 'ly3437943',
    compound: 'Retatrutide',
    aka: 'triple GLP-1 / GIP / glucagon agonist',
    lane: 'weight',
    brandNames: [],
    sponsor: 'Eli Lilly',
    approvalStatus: 'investigational',
    approvalNote:
      'Retatrutide is investigational — not yet FDA-approved — but its phase-2 data is the loudest number in the category, which is exactly why it belongs in the research conversation.',
    trial: {
      name: 'phase 2 obesity trial',
      sponsorDrug: 'retatrutide 12 mg (Lilly, investigational)',
      stat: '24.2% mean body-weight reduction',
      detail: 'at the 12 mg dose over 48 weeks, in adults with obesity',
      source: 'New England Journal of Medicine, 2023',
    },
    meritAngle:
      'The compound the whole field is watching, available for research now — pharmacy-grade, HPLC-verified, COA public per lot.',
  },
  'th9507': {
    handle: 'th9507',
    compound: 'Tesamorelin',
    aka: 'GHRH analog',
    lane: 'metabolic',
    brandNames: ['Egrifta'],
    sponsor: 'Theratechnologies',
    approvalStatus: 'fda-approved',
    approvalNote: 'Tesamorelin is FDA-approved as Egrifta for the reduction of excess visceral abdominal fat in a specific patient population.',
    trial: {
      name: 'pivotal Egrifta trials',
      sponsorDrug: 'the approved drug (tesamorelin)',
      stat: 'roughly 15–18% reduction in visceral adipose tissue',
      detail: 'over 26 weeks in the approved indication',
      source: 'pivotal trials supporting the FDA label',
    },
    meritAngle:
      'The molecule inside an actual FDA-approved product — available as a research compound, pharmacy-grade, lot-verified.',
  },
  'pt-141': {
    handle: 'pt-141',
    compound: 'PT-141',
    aka: 'bremelanotide, melanocortin agonist',
    lane: 'vitality',
    brandNames: ['Vyleesi'],
    sponsor: 'AMAG / Palatin',
    approvalStatus: 'fda-approved',
    approvalNote: 'PT-141 (bremelanotide) is FDA-approved as Vyleesi.',
    trial: null,
    meritAngle:
      'The same molecule as the approved product — pharmacy-grade, HPLC-verified per lot, COA public.',
  },
  'sermorelin': {
    handle: 'sermorelin',
    compound: 'Sermorelin',
    aka: 'GHRH analog',
    lane: 'gh',
    brandNames: ['Geref'],
    sponsor: 'formerly Serono',
    approvalStatus: 'fda-approved-discontinued',
    approvalNote:
      'Sermorelin was FDA-approved as Geref and later discontinued commercially — a business decision, not a safety withdrawal.',
    trial: null,
    meritAngle:
      'A molecule with an FDA-approval history, available again as a research compound — pharmacy-grade and lot-verified.',
  },
  'thymosin-alpha-1': {
    handle: 'thymosin-alpha-1',
    compound: 'Thymosin Alpha-1',
    aka: 'immune-signaling peptide',
    lane: 'immune',
    brandNames: ['Zadaxin'],
    sponsor: 'SciClone',
    approvalStatus: 'foreign-approved',
    approvalNote:
      'Thymosin Alpha-1 is approved and marketed as Zadaxin in more than 30 countries (not the US).',
    trial: null,
    meritAngle:
      'The molecule behind a drug approved across 30-plus countries — available for research, pharmacy-grade, COA per lot.',
  },
};

export const COUNTERPART_HANDLES = Object.keys(COUNTERPARTS);

// Lane → the hero sequence the self-segmentation picker enrolls into.
export const LANE_HERO: Record<Counterpart['lane'], string> = {
  weight: 'ly3298176',      // Tirzepatide (cross-sells semaglutide + retatrutide)
  metabolic: 'th9507',      // Tesamorelin
  vitality: 'pt-141',       // PT-141
  gh: 'sermorelin',         // Sermorelin
  immune: 'thymosin-alpha-1',
};

export function sequenceKeyFor(handle: string): string {
  return `seq-${handle}`;
}

export function counterpartForSequenceKey(key: string): Counterpart | null {
  const handle = key.startsWith('seq-') ? key.slice(4) : key;
  return COUNTERPARTS[handle] ?? null;
}
