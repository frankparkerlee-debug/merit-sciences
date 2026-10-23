/**
 * Regulatory facts per compound, keyed by monograph slug (lib/monographs.ts).
 *
 *   fdaStatus  one sentence (plus the research-use line) on FDA status.
 *   wada       one sentence on the WADA Prohibited List, or null when the
 *              compound is not named there (never inferred from S0).
 *   sources    the primary documents each fact was checked against.
 *
 * Verified 2026-10-22 against Drugs@FDA (openFDA), FDA's 503A category list
 * (updated 2026-05-14), FDA's Category 2 page (2026-04-22), the July 23-24
 * 2026 Pharmacy Compounding Advisory Committee meeting (votes as reported by
 * Healio; FDA has posted no minutes), 78 FR 14095 (Geref), and the WADA 2026
 * Prohibited List. As of that date no FDA rule or Federal Register notice has
 * followed the July 2026 committee votes; an "interim access policy" was sent
 * for White House review in mid-October 2026 and is unpublished.
 *
 * RECHECK ON 2027-01-01: the WADA 2027 List adds SLU-PP-332 under S4 and,
 * per USADA, names peptides generally under S0, so several null `wada`
 * entries may change.
 *
 * RT3 and TZ2 by code only: no names, brands or sources that name them.
 * Any compound without an entry gets GENERIC_STATUS.
 */

export type CompoundStatus = {
  fdaStatus: string;
  wada: string | null;
  sources: string[];
};

const RUO = 'Supplied for research use only.';
export const GENERIC_FDA_STATUS = `Not approved by the FDA for any use. ${RUO}`;

const SRC = {
  drugsFda: 'https://www.accessdata.fda.gov/scripts/cder/daf/',
  cat503a: 'https://www.fda.gov/media/94155/download',
  bulks503a: 'https://www.fda.gov/drugs/human-drug-compounding/bulk-drug-substances-used-compounding-under-section-503a-fdc-act',
  cat2: 'https://www.fda.gov/drugs/human-drug-compounding/certain-bulk-drug-substances-use-compounding-may-present-significant-safety-risks',
  pcac: 'https://www.fda.gov/advisory-committees/advisory-committee-calendar/july-23-24-2026-meeting-pharmacy-compounding-advisory-committee-07232026',
  pcacVotes: 'https://www.healio.com/news/endocrinology/20260915/fda-committee-recommends-looser-restrictions-for-several-peptides',
  geref: 'https://www.govinfo.gov/content/pkg/FR-2013-03-04/pdf/2013-04827.pdf',
  wada2026: 'https://www.wada-ama.org/en/prohibited-list',
};

const PCAC_RECOMMENDED = (name: string) =>
  `${name} is not approved by the FDA for any use. An FDA advisory committee recommended it for the 503A compounding list in July 2026, but no FDA rule has followed. ${RUO}`;

const BRANDED_ONLY = (molecule: string, soldAs: string) =>
  `${molecule} is FDA-approved only as specific branded prescription drug products; research material sold as ${soldAs} is not one of those products and is not FDA-approved. ${RUO}`;

export const COMPOUND_STATUS: Record<string, CompoundStatus> = {
  // Code-named products: no names, brands or name-bearing sources.
  tz2: {
    fdaStatus: `Merit's TZ2 is research material and is not an FDA-approved drug product. ${RUO}`,
    wada: null,
    sources: [],
  },
  rt3: {
    fdaStatus: `RT3 is not FDA-approved; it is investigational. ${RUO}`,
    wada: null,
    sources: [],
  },
  semaglutide: {
    fdaStatus: BRANDED_ONLY('Semaglutide', 'semaglutide'),
    // Monitoring Program only since 2024; not prohibited.
    wada: null,
    sources: [SRC.drugsFda, SRC.wada2026],
  },
  tesamorelin: {
    fdaStatus: BRANDED_ONLY('Tesamorelin', 'tesamorelin'),
    wada: 'Tesamorelin is named on the WADA 2026 Prohibited List under S2 as a growth hormone releasing hormone analogue and is prohibited at all times.',
    sources: [SRC.drugsFda, SRC.wada2026],
  },
  'bpc-157': {
    fdaStatus: PCAC_RECOMMENDED('BPC-157'),
    wada: 'BPC-157 is named on the WADA 2026 Prohibited List under S0, non-approved substances, and is prohibited at all times.',
    sources: [SRC.pcac, SRC.pcacVotes, SRC.cat2, SRC.wada2026],
  },
  'tb-500': {
    fdaStatus: PCAC_RECOMMENDED('TB-500'),
    wada: 'TB-500 is named on the WADA 2026 Prohibited List under S2 as a thymosin beta-4 derivative and is prohibited at all times.',
    sources: [SRC.pcac, SRC.pcacVotes, SRC.cat2, SRC.wada2026],
  },
  'bpc-157-tb-500': {
    fdaStatus: `Neither BPC-157 nor TB-500 is approved by the FDA for any use, and no FDA-approved product combines them. ${RUO}`,
    wada: 'Both components are named on the WADA 2026 Prohibited List: BPC-157 under S0 and TB-500 under S2.',
    sources: [SRC.pcac, SRC.pcacVotes, SRC.cat2, SRC.wada2026],
  },
  'glow-blend': {
    fdaStatus: `None of its components (BPC-157, GHK-Cu, TB-500) is approved by the FDA for any use, and no FDA-approved product combines them. ${RUO}`,
    wada: 'Two components are named on the WADA 2026 Prohibited List: BPC-157 under S0 and TB-500 under S2.',
    sources: [SRC.pcacVotes, SRC.cat503a, SRC.cat2, SRC.wada2026],
  },
  'klow-blend': {
    fdaStatus: `None of its components (BPC-157, GHK-Cu, TB-500, KPV) is approved by the FDA for any use, and no FDA-approved product combines them. ${RUO}`,
    wada: 'Two components are named on the WADA 2026 Prohibited List: BPC-157 under S0 and TB-500 under S2.',
    sources: [SRC.pcacVotes, SRC.cat503a, SRC.cat2, SRC.wada2026],
  },
  'thymosin-alpha-1': {
    fdaStatus: `Thymosin alpha-1 (thymalfasin) is approved as a prescription drug in some countries outside the United States but has never been approved by the FDA. ${RUO}`,
    wada: null,
    sources: [SRC.drugsFda, SRC.cat2],
  },
  'aod-9604': {
    fdaStatus: GENERIC_FDA_STATUS,
    wada: 'AOD-9604 is named on the WADA 2026 Prohibited List under S2 as a growth hormone fragment and is prohibited at all times.',
    sources: [SRC.drugsFda, SRC.cat2, SRC.wada2026],
  },
  'igf-1-lr3': {
    fdaStatus: `IGF-1 LR3 is not approved by the FDA for any use; it is a modified analog distinct from the FDA-approved form of IGF-1. ${RUO}`,
    wada: 'IGF-1 and its analogues, which include IGF-1 LR3, are prohibited at all times under S2 of the WADA 2026 Prohibited List.',
    sources: [SRC.drugsFda, SRC.wada2026],
  },
  sermorelin: {
    fdaStatus: `Sermorelin was FDA-approved as Geref, which its sponsor discontinued in 2008; in 2013 FDA determined it was not withdrawn for reasons of safety or effectiveness. Research material sold as sermorelin is not FDA-approved. ${RUO}`,
    wada: 'Sermorelin is named on the WADA 2026 Prohibited List under S2 as a growth hormone releasing hormone analogue and is prohibited at all times.',
    sources: [SRC.geref, SRC.drugsFda, SRC.wada2026],
  },
  nad: {
    fdaStatus: `NAD+ is not approved by the FDA as a drug for any use. ${RUO}`,
    wada: null,
    sources: [SRC.drugsFda, SRC.cat503a],
  },
  'ghk-cu': {
    fdaStatus: GENERIC_FDA_STATUS,
    wada: null,
    sources: [SRC.cat503a, SRC.cat2],
  },
  'mots-c': {
    fdaStatus: PCAC_RECOMMENDED('MOTS-c'),
    wada: 'MOTS-c is named on the WADA 2026 Prohibited List under S4 as a metabolic modulator (AMPK activator) and is prohibited at all times.',
    sources: [SRC.pcac, SRC.pcacVotes, SRC.wada2026],
  },
  epitalon: {
    fdaStatus: PCAC_RECOMMENDED('Epitalon'),
    wada: null,
    sources: [SRC.pcac, SRC.pcacVotes, SRC.cat2],
  },
  selank: {
    fdaStatus: GENERIC_FDA_STATUS,
    wada: null,
    sources: [SRC.drugsFda, SRC.cat2],
  },
  semax: {
    fdaStatus: PCAC_RECOMMENDED('Semax'),
    wada: null,
    sources: [SRC.pcac, SRC.pcacVotes],
  },
  'pt-141': {
    fdaStatus: BRANDED_ONLY('Bremelanotide, the molecule known as PT-141,', 'PT-141'),
    wada: null,
    sources: [SRC.drugsFda],
  },
  'melanotan-ii': {
    fdaStatus: GENERIC_FDA_STATUS,
    wada: null,
    sources: [SRC.drugsFda, SRC.cat2],
  },
  '5-amino-1mq': {
    fdaStatus: GENERIC_FDA_STATUS,
    wada: null,
    sources: [SRC.drugsFda],
  },
  'cjc-1295': {
    fdaStatus: GENERIC_FDA_STATUS,
    wada: 'CJC-1295 is named on the WADA 2026 Prohibited List under S2 as a growth hormone releasing hormone analogue and is prohibited at all times.',
    sources: [SRC.cat2, SRC.wada2026],
  },
  ipamorelin: {
    fdaStatus: GENERIC_FDA_STATUS,
    wada: 'Ipamorelin is named on the WADA 2026 Prohibited List under S2 as a growth hormone secretagogue and is prohibited at all times.',
    sources: [SRC.drugsFda, SRC.cat2, SRC.wada2026],
  },
  'kisspeptin-10': {
    fdaStatus: `Kisspeptin-10 is not approved by the FDA for any use, and FDA lists it among bulk drug substances that may present significant safety risks in compounding. ${RUO}`,
    wada: 'Kisspeptin and its agonist analogues are prohibited in male athletes at all times under S2 of the WADA 2026 Prohibited List.',
    sources: [SRC.cat503a, SRC.cat2, SRC.wada2026],
  },
  dsip: {
    fdaStatus: `DSIP (emideltide) is not approved by the FDA for any use, and an FDA advisory committee voted against recommending it for the 503A compounding list in July 2026. ${RUO}`,
    wada: null,
    sources: [SRC.pcac, SRC.pcacVotes, SRC.cat2],
  },
  kpv: {
    fdaStatus: PCAC_RECOMMENDED('KPV'),
    wada: null,
    sources: [SRC.pcac, SRC.pcacVotes, SRC.cat2],
  },
  'slu-pp-332': {
    fdaStatus: GENERIC_FDA_STATUS,
    // Not on the 2026 List; added to the 2027 List under S4 (effective
    // 2027-01-01). Replace then with: "SLU-PP-332 is named on the WADA 2027
    // Prohibited List under S4 as a metabolic modulator and is prohibited at
    // all times."
    wada: null,
    sources: [SRC.drugsFda, SRC.wada2026],
  },
};

export function getCompoundStatus(slug: string | undefined): CompoundStatus {
  return (slug && COMPOUND_STATUS[slug]) || { fdaStatus: GENERIC_FDA_STATUS, wada: null, sources: [] };
}

/** The FDA-status FAQ, shared by the PDP and the monograph so both say the
 *  same thing. `name` is the page's display name for the compound. */
export function fdaStatusFaq(name: string, slug: string | undefined): { q: string; a: string } {
  const s = getCompoundStatus(slug);
  return { q: `Is ${name} FDA-approved?`, a: s.wada ? `${s.fdaStatus} ${s.wada}` : s.fdaStatus };
}
