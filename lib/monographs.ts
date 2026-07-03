// Research monographs — the SEO/AEO surface of the library. One structured
// research page per compound, generated from lib/research-data.ts (academic,
// cited, RUO-framed) and enriched with question-shaped FAQs + key findings so
// answer-engines (ChatGPT/Perplexity) can quote them and Google can rank them.
//
// Every monograph carries: what it is, how it works, what the research shows,
// applications, handling, an FAQ, real references, and a conservative pointer
// to the matching research-grade product.
import { RESEARCH_DATA, type ResearchData } from './research-data';

export type Faq = { q: string; a: string };

// Static product facts for the trust callout. Sourced from the live catalog;
// kept here so the callout renders with zero DB dependency (fast + resilient)
// and survives a DB blip. `fromPrice` is the single-vial entry price in USD.
export type ProductRef = { handle: string; fromPrice: number; purity: string; vialSize: string };

export type CompoundMeta = {
  key: string; // RESEARCH_DATA key
  slug: string; // /library/<slug>
  title: string; // real display name
  aka: string[]; // synonyms — search + schema "sameAs"/alternateName
  tagline: string; // one line for cards + meta description lead
  product?: ProductRef; // matching active product (conservative productization)
  protocolSlug?: string; // matching reconstitution protocol article
  relatedSlugs?: string[]; // trial deep-dives / evidence summaries
};

// ── The 20 compounds. slug ≠ protocol slug (no collision). ────────────────
export const COMPOUND_META: CompoundMeta[] = [
  {
    key: 'ly3298176', slug: 'tirzepatide', title: 'Tirzepatide',
    aka: ['LY3298176', 'GIP/GLP-1 receptor agonist', 'dual incretin agonist'],
    tagline: 'The dual GIP/GLP-1 receptor agonist studied in the SURMOUNT and SURPASS programs.',
    product: { handle: 'tirzepatide-10mg', fromPrice: 75, purity: '≥99%', vialSize: '10 mg' },
    protocolSlug: 'tirzepatide-reconstitution-protocol',
    relatedSlugs: ['surmount-1-tirzepatide-obesity-research', 'surpass-2-tirzepatide-vs-semaglutide'],
  },
  {
    key: 'ly3437943', slug: 'retatrutide', title: 'Retatrutide',
    aka: ['LY3437943', 'triple agonist', 'GIP/GLP-1/glucagon agonist'],
    tagline: 'The first triple GIP/GLP-1/glucagon receptor agonist to clear Phase 2 trials.',
    product: { handle: 'retatrutide-10mg', fromPrice: 100, purity: '≥99%', vialSize: '10 mg' },
    protocolSlug: 'ly3437943-reconstitution-protocol',
    relatedSlugs: ['ly3437943-triple-1-research-summary'],
  },
  {
    key: 'semaglutide', slug: 'semaglutide', title: 'Semaglutide',
    aka: ['GLP-1 receptor agonist'],
    tagline: 'The acylated GLP-1 receptor agonist benchmarked against tirzepatide in SURPASS-2.',
    product: { handle: 'semaglutide-10mg', fromPrice: 65, purity: '≥99%', vialSize: '10 mg' },
    relatedSlugs: ['surpass-2-tirzepatide-vs-semaglutide'],
  },
  {
    key: 'th9507', slug: 'tesamorelin', title: 'Tesamorelin',
    aka: ['TH9507', 'stabilized GHRH analog'],
    tagline: 'A stabilized growth-hormone-releasing-hormone analog studied for visceral adiposity.',
    product: { handle: 'th9507', fromPrice: 87, purity: '≥99%', vialSize: '10 mg' },
    protocolSlug: 'tesamorelin-reconstitution-protocol',
  },
  {
    key: 'bpc-157-tb-500', slug: 'bpc-157-tb-500', title: 'BPC-157 + TB-500 (Wolverine)',
    aka: ['Wolverine blend', 'BPC-157', 'TB-500', 'Thymosin Beta-4 fragment'],
    tagline: 'A co-formulation of two repair-pathway peptides in a single lyophilized vial.',
    product: { handle: 'bpc-10mg-tb-10mg-wolverine-20mg', fromPrice: 100, purity: '≥99%', vialSize: '20 mg' },
    protocolSlug: 'bpc-157-tb-500-blend-reconstitution-protocol',
    relatedSlugs: ['bpc-157-preclinical-evidence'],
  },
  {
    key: 'thymosin-alpha-1', slug: 'thymosin-alpha-1', title: 'Thymosin Alpha-1',
    aka: ['Tα1', 'Zadaxin', 'thymalfasin'],
    tagline: 'A 28-amino-acid immunomodulatory peptide approved abroad as Zadaxin.',
    product: { handle: 'thymosin-alpha-1', fromPrice: 132, purity: '≥99%', vialSize: '10 mg' },
    protocolSlug: 'thymosin-alpha-1-reconstitution-protocol',
  },
  {
    key: 'aod-9604', slug: 'aod-9604', title: 'AOD-9604',
    aka: ['GH fragment 176-191', 'lipolytic fragment'],
    tagline: 'A modified fragment of growth hormone studied for lipolytic activity.',
    product: { handle: 'aod-9604', fromPrice: 86, purity: '≥99%', vialSize: '5 mg' },
  },
  {
    key: 'igf-1-lr3', slug: 'igf-1-lr3', title: 'IGF-1 LR3',
    aka: ['Long R3 IGF-1', 'insulin-like growth factor 1 LR3'],
    tagline: 'A long-acting analog of insulin-like growth factor 1 used in cell-culture research.',
    product: { handle: 'igf-1-lr3', fromPrice: 92, purity: '≥99%', vialSize: '1 mg' },
  },
  {
    key: 'sermorelin', slug: 'sermorelin', title: 'Sermorelin',
    aka: ['GHRH(1-29)', 'sermorelin acetate'],
    tagline: 'The 29-amino-acid active fragment of growth-hormone-releasing hormone.',
    product: { handle: 'sermorelin', fromPrice: 69, purity: '≥99%', vialSize: '10 mg' },
  },
  {
    key: 'nad-500mg', slug: 'nad', title: 'NAD+',
    aka: ['nicotinamide adenine dinucleotide', 'NAD'],
    tagline: 'The central redox coenzyme studied across cellular-energy and aging models.',
    product: { handle: 'nad-500mg', fromPrice: 85, purity: '≥99%', vialSize: '500 mg' },
    protocolSlug: 'nad-reconstitution-protocol',
    relatedSlugs: ['nad-cellular-aging-research'],
  },
  {
    key: 'ghk-cu', slug: 'ghk-cu', title: 'GHK-Cu',
    aka: ['copper tripeptide-1', 'copper peptide', 'GHK'],
    tagline: 'A copper-binding tripeptide studied for skin remodeling and repair signaling.',
    product: { handle: 'ghk-cu', fromPrice: 86, purity: '≥99%', vialSize: '100 mg' },
    protocolSlug: 'ghk-cu-reconstitution-protocol',
  },
  {
    key: 'mots-c', slug: 'mots-c', title: 'MOTS-c',
    aka: ['mitochondrial-derived peptide', 'mitochondrial ORF of the 12S rRNA-c'],
    tagline: 'A mitochondrial-derived peptide studied in metabolic-regulation models.',
    product: { handle: 'mots-c', fromPrice: 138, purity: '≥99%', vialSize: '40 mg' },
    protocolSlug: 'mots-c-reconstitution-protocol',
  },
  {
    key: 'epitalon', slug: 'epitalon', title: 'Epitalon',
    aka: ['Epithalon', 'AEDG peptide'],
    tagline: 'A synthetic tetrapeptide investigated for telomerase and circadian signaling.',
    product: { handle: 'epitalon', fromPrice: 115, purity: '≥99%', vialSize: '50 mg' },
    protocolSlug: 'epitalon-reconstitution-protocol',
  },
  {
    key: 'selank', slug: 'selank', title: 'Selank',
    aka: ['TP-7', 'tuftsin analog'],
    tagline: 'A synthetic heptapeptide analog of tuftsin studied in anxiolytic models.',
    product: { handle: 'selank', fromPrice: 56, purity: '≥99%', vialSize: '10 mg' },
  },
  {
    key: 'semax', slug: 'semax', title: 'Semax',
    aka: ['ACTH(4-10) analog', 'Met-Glu-His-Phe-Pro-Gly-Pro'],
    tagline: 'A synthetic ACTH(4-10) analog studied in neuroprotection and BDNF models.',
    product: { handle: 'semax', fromPrice: 56, purity: '≥99%', vialSize: '10 mg' },
    protocolSlug: 'semax-reconstitution-protocol',
  },
  {
    key: 'pt-141', slug: 'pt-141', title: 'PT-141',
    aka: ['Bremelanotide', 'melanocortin agonist'],
    tagline: 'A cyclic heptapeptide melanocortin-receptor agonist (bremelanotide).',
    product: { handle: 'pt-141', fromPrice: 58, purity: '≥99%', vialSize: '10 mg' },
  },
  {
    key: 'melanotan-ii', slug: 'melanotan-ii', title: 'Melanotan II',
    aka: ['MT-II', 'α-MSH analog'],
    tagline: 'A synthetic analog of α-melanocyte-stimulating hormone studied for melanogenesis.',
    product: { handle: 'melanotan-ii', fromPrice: 58, purity: '≥99%', vialSize: '10 mg' },
  },
  {
    key: '5-amino-1mq', slug: '5-amino-1mq', title: '5-Amino-1MQ',
    aka: ['NNMT inhibitor', '5-amino-1-methylquinolinium'],
    tagline: 'A small-molecule NNMT inhibitor studied in metabolic and adipocyte models.',
    product: { handle: '5-amino-1mq-50mg', fromPrice: 65, purity: '≥99%', vialSize: '50 mg' },
  },
  {
    key: 'glow', slug: 'glow-blend', title: 'GLOW Blend (BPC-157 · GHK-Cu · TB-500)',
    aka: ['GLOW', 'skin blend'],
    tagline: 'A three-peptide repair + skin-signaling co-formulation in one vial.',
    product: { handle: 'bpc157-ghk-cu-50-tb500-glow-70mg', fromPrice: 145, purity: '≥99%', vialSize: '70 mg' },
    protocolSlug: 'glow-blend-reconstitution-protocol',
  },
  {
    key: 'klow', slug: 'klow-blend', title: 'KLOW Blend (BPC-157 · GHK-Cu · TB-500 · KPV)',
    aka: ['KLOW', 'four-peptide blend'],
    tagline: 'A four-peptide repair blend adding the KPV tripeptide to the GLOW base.',
    product: { handle: 'klow', fromPrice: 175, purity: '≥99%', vialSize: '80 mg' },
    protocolSlug: 'klow-blend-reconstitution-protocol',
  },
];

// ── Hand-written depth for the flagship compounds (grounded, RUO-framed). ──
// Everything else falls back to auto-generated FAQs (see autoFaqs). Add entries
// here to deepen a page; keyFindings power the "What the research shows" block.
export const MONOGRAPH_EXTRAS: Record<string, { keyFindings?: string[]; faqs?: Faq[] }> = {
  ly3298176: {
    keyFindings: [
      'In SURMOUNT-1 (NEJM 2022), a 72-week randomized trial in 2,539 adults with obesity, participants in the highest-dose arm saw a mean body-weight reduction of roughly 20.9% from baseline versus about 3.1% on placebo — the largest effect reported for an incretin agent at the time of publication.',
      'In SURPASS-2 (NEJM 2021), tirzepatide was compared head-to-head against semaglutide 1 mg in type-2-diabetes research; all three tirzepatide doses produced greater reductions in HbA1c and body weight than semaglutide in the study population.',
      'The dual mechanism — simultaneous agonism at the GIP and GLP-1 receptors — is the design feature most cited in the literature as the basis for its effect size relative to single-incretin GLP-1 agonists.',
      'Gastrointestinal effects (nausea, diarrhea) were the most frequently reported adverse events across the trial program, generally mild-to-moderate and most common during dose escalation.',
    ],
    faqs: [
      { q: 'What is tirzepatide?', a: 'Tirzepatide (research code LY3298176) is a synthetic dual agonist that activates both the GIP and GLP-1 receptors. It is the compound studied in the SURMOUNT (obesity) and SURPASS (type-2-diabetes) clinical-trial programs. Merit supplies it as a lyophilized research compound for research use only — not for human or veterinary use.' },
      { q: 'How does tirzepatide work?', a: 'It is a "dual incretin" — a single peptide engineered to activate two gut-hormone receptors at once (GIP and GLP-1). Published trials attribute its effect size relative to single-receptor GLP-1 agonists to this combined mechanism. Mechanistic descriptions here summarize published findings and are not clinical claims.' },
      { q: 'What did the tirzepatide trials show?', a: 'In SURMOUNT-1, the highest-dose arm showed a mean body-weight reduction of about 20.9% over 72 weeks versus ~3.1% on placebo. In SURPASS-2, it produced greater HbA1c and weight reductions than semaglutide 1 mg. See the linked SURMOUNT-1 and SURPASS-2 summaries for trial design and full outcomes.' },
      { q: 'How is tirzepatide reconstituted for research?', a: 'A lyophilized vial is reconstituted with bacteriostatic water; concentration equals vial mass divided by diluent volume. See the Tirzepatide reconstitution protocol for a step-by-step guide and a research calculator. This is reference information for laboratory handling, not a dosing recommendation.' },
      { q: 'Is Merit tirzepatide for human use?', a: 'No. It is sold strictly for research use only — not for human or veterinary use, and not for diagnostic or therapeutic use. Every lot ships with a certificate of analysis documenting ≥99% HPLC purity.' },
    ],
  },
};

export type Monograph = CompoundMeta & {
  research: ResearchData;
  keyFindings: string[];
  faqs: Faq[];
  excerpt: string;
};

// A small, always-safe FAQ set derived from the structured research fields, so
// every monograph emits FAQPage schema and answers the questions AI engines ask.
function autoFaqs(m: CompoundMeta, r: ResearchData): Faq[] {
  const faqs: Faq[] = [];
  const lead = r.description?.[0] ?? m.tagline;
  faqs.push({
    q: `What is ${m.title}?`,
    a: `${lead} Merit supplies it as a lyophilized research compound for research use only — not for human or veterinary use.`,
  });
  if (r.mechanism) {
    faqs.push({
      q: `How does ${m.title} work?`,
      a: `${r.mechanism} Mechanistic descriptions summarize published preclinical findings and are not clinical claims.`,
    });
  }
  if (r.halfLife) {
    faqs.push({ q: `What is the half-life of ${m.title}?`, a: `${r.halfLife} Values reflect preclinical or research-context reports, not clinical pharmacokinetics.` });
  }
  if (m.protocolSlug) {
    faqs.push({
      q: `How is ${m.title} reconstituted for research?`,
      a: `A lyophilized vial is reconstituted with bacteriostatic water; concentration equals vial mass divided by diluent volume. See the ${m.title} reconstitution protocol for a step-by-step guide and a research calculator.`,
    });
  }
  faqs.push({
    q: `Is Merit ${m.title} for human use?`,
    a: `No. It is sold strictly for research use only — not for human or veterinary use, and not for diagnostic or therapeutic use. Every lot ships with a certificate of analysis documenting ${m.product?.purity ?? '≥99%'} HPLC purity.`,
  });
  return faqs;
}

function buildMonograph(m: CompoundMeta): Monograph | null {
  const research = RESEARCH_DATA[m.key];
  if (!research) return null;
  const extras = MONOGRAPH_EXTRAS[m.key] ?? {};
  const firstPara = research.description?.[0] ?? m.tagline;
  const excerpt = firstPara.length > 185 ? firstPara.slice(0, 182).replace(/\s+\S*$/, '') + '…' : firstPara;
  return {
    ...m,
    research,
    keyFindings: extras.keyFindings ?? [],
    faqs: extras.faqs ?? autoFaqs(m, research),
    excerpt,
  };
}

export const MONOGRAPHS: Monograph[] = COMPOUND_META
  .map(buildMonograph)
  .filter((x): x is Monograph => x !== null);

const BY_SLUG = new Map(MONOGRAPHS.map((m) => [m.slug, m]));
export function getMonograph(slug: string): Monograph | undefined {
  return BY_SLUG.get(slug);
}
export const MONOGRAPH_SLUGS: string[] = MONOGRAPHS.map((m) => m.slug);
