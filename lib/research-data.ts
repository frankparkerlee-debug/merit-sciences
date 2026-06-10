/**
 * Per-compound research metadata — narrative descriptions, mechanism
 * of action, half-life / solubility, and peer-reviewed citations.
 *
 * ─────────────────────────────────────────────────────────────────────
 * CITATIONS — VERIFY BEFORE LAUNCH
 * ─────────────────────────────────────────────────────────────────────
 * Every citation in this file carries `verify: true` if it was sourced
 * from training data and has NOT yet been validated by a human against
 * the live PubMed / DOI record. The pharmacy team must confirm:
 *   1. The DOI / PMID resolves to the cited paper (no typos)
 *   2. The author, journal, year fields are correct
 *   3. The cited claim accurately reflects the paper's conclusions
 *
 * Grep for `verify: true` to find every claim that needs checking.
 * Once verified, set `verify: false` (or remove the flag entirely).
 * ─────────────────────────────────────────────────────────────────────
 */

export type Citation = {
  title: string;
  authors: string;          // "First-Author Last et al."
  journal: string;
  year: number;
  doi?: string;
  pubmedId?: string;
  url: string;              // canonical link — DOI URL preferred
  verify?: boolean;         // [VERIFY] tag for unvalidated training-data refs
};

export type ResearchData = {
  description: string[];               // 2-3 paragraphs, academic tone
  compoundClass?: string;              // "Stable gastric pentadecapeptide"
  discovery?: string;                  // 1-line origin
  mechanism?: string;                  // proposed mechanism, RUO-framed
  halfLife?: string;                   // preclinical / research-context only
  solubility?: string;                 // research handling guidance
  researchApplications?: string[];     // 3-5 short bullets
  references: Citation[];
};

// Phase 1 — six marquee compounds populated with research data sourced
// from training-data knowledge of well-known peptide literature. Each
// citation carries verify: true until the pharmacy team confirms.
export const RESEARCH_DATA: Record<string, ResearchData> = {

  // ─── Wolverine Blend (BPC-157 + TB-500) ────────────────────────────
  'bpc-157-tb-500': {
    compoundClass: 'Pentadecapeptide (BPC-157) + Thymosin Beta-4 fragment (TB-500) co-formulation',
    discovery:
      'BPC-157 was first characterized at the University of Zagreb by the Sikiric laboratory in the early 1990s as a stable fragment of body protection compound, a polypeptide identified in gastric juice. Thymosin Beta-4 (the parent peptide of TB-500) was originally isolated from bovine thymus by Allan Goldstein in 1981.',
    description: [
      'BPC-157 is a synthetic pentadecapeptide consisting of fifteen amino acids (Gly-Glu-Pro-Pro-Pro-Gly-Lys-Pro-Ala-Asp-Asp-Ala-Gly-Leu-Val) derived from a fragment of body protection compound, a polypeptide originally identified in human gastric juice. It is notable in the peptide literature for unusually high stability in acidic environments — a property that has made it a frequent subject of preclinical investigation.',
      'TB-500 is a synthetic acetylated 17-amino-acid fragment of Thymosin Beta-4 (Tβ4), a 43-amino-acid peptide naturally expressed in most mammalian tissues. The fragment corresponds to the active actin-binding region of the parent peptide.',
      'The Wolverine co-formulation places both peptides in a single lyophilized vial at 10 mg each. Researchers requesting this blend most commonly cite combined-pathway repair studies as their rationale for the pairing.',
    ],
    mechanism:
      'BPC-157 has been investigated in preclinical models for effects on angiogenesis (VEGF/VEGFR2 axis modulation), nitric oxide system regulation, growth hormone receptor expression, and dopaminergic / serotonergic system interactions. TB-500 functions primarily as an actin-sequestering protein involved in cell motility, organogenesis, and the regulation of actin polymerization in research models. Both peptides remain under active investigation; mechanisms described above reflect preclinical findings, not clinical conclusions.',
    halfLife: 'BPC-157: ~4 hr (preclinical, rat). TB-500: not well-characterized in the public literature.',
    solubility: 'Both peptides reconstitute readily in bacteriostatic water at 2–5 mg/mL.',
    researchApplications: [
      'Tissue-repair pathway investigation',
      'Tendon and ligament healing models',
      'Vascular angiogenesis research',
      'GI mucosal integrity studies',
      'Actin cytoskeleton dynamics',
    ],
    references: [
      {
        title: 'Stable Gastric Pentadecapeptide BPC 157 in Honor of Professor Pavao Stuhli',
        authors: 'Sikiric P, Seiwerth S, Rucman R, et al.',
        journal: 'Current Pharmaceutical Design',
        year: 2018,
        doi: '10.2174/1381612824666180220150610',
        pubmedId: '29521229',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29521229/',
        verify: true,
      },
      {
        title: 'Thymosin β4: a multi-functional regenerative peptide. Basic properties and clinical applications',
        authors: 'Goldstein AL, Hannappel E, Sosne G, Kleinman HK',
        journal: 'Expert Opinion on Biological Therapy',
        year: 2012,
        doi: '10.1517/14712598.2012.634793',
        pubmedId: '22074409',
        url: 'https://pubmed.ncbi.nlm.nih.gov/22074409/',
        verify: true,
      },
    ],
  },

  // ─── GHK-Cu ─────────────────────────────────────────────────────────
  'ghk-cu': {
    compoundClass: 'Copper-binding tripeptide (glycyl-L-histidyl-L-lysine + Cu²⁺)',
    discovery:
      'Isolated from human serum by Loren Pickart in 1973 as a factor that, when added to liver cultures from elderly donors, restored a younger gene-expression profile.',
    description: [
      'GHK is a naturally occurring tripeptide with the amino-acid sequence glycyl-L-histidyl-L-lysine. When complexed with copper(II), the resulting GHK-Cu chelate forms a planar coordination structure that is the bioactive form referenced in most of the published research literature.',
      'GHK-Cu is one of the most extensively studied copper-binding peptides in cell-biology research. Pickart and colleagues have demonstrated effects on a wide range of gene-expression endpoints in cultured cells.',
    ],
    mechanism:
      'Modulates gene expression in cultured fibroblasts (downregulation of TGF-β and upregulation of decorin reported in dermal research models). Facilitates copper transport across cell membranes. Has been associated with anti-inflammatory cytokine profiles and fibroblast activation in preclinical work.',
    halfLife: 'Short serum half-life (minutes) reported in preclinical pharmacokinetic studies.',
    solubility: 'Highly soluble in bacteriostatic water; presents a distinctive blue color in solution from the Cu²⁺ chelate.',
    researchApplications: [
      'Dermal fibroblast research',
      'Hair follicle biology',
      'Gene-expression studies',
      'Wound-healing cell-culture models',
      'Copper-trafficking pathway investigation',
    ],
    references: [
      {
        title: 'Regenerative and Protective Actions of the GHK-Cu Peptide in the Light of the New Gene Data',
        authors: 'Pickart L, Margolina A',
        journal: 'International Journal of Molecular Sciences',
        year: 2018,
        doi: '10.3390/ijms19071987',
        pubmedId: '29986520',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29986520/',
        verify: true,
      },
      {
        title: 'The human tri-peptide GHK and tissue remodeling',
        authors: 'Pickart L',
        journal: 'Journal of Biomaterials Science, Polymer Edition',
        year: 2008,
        doi: '10.1163/156856208784909435',
        pubmedId: '18644225',
        url: 'https://pubmed.ncbi.nlm.nih.gov/18644225/',
        verify: true,
      },
    ],
  },

  // ─── Tirzepatide (LY3298176) ────────────────────────────────────────
  'ly3298176': {
    compoundClass: 'Dual GIP / GLP-1 receptor agonist (synthetic 39-amino-acid peptide)',
    discovery:
      'Developed by Eli Lilly. First characterized in the open scientific literature in 2018 (Coskun et al.).',
    description: [
      'Tirzepatide (research code LY3298176) is a synthetic 39-amino-acid peptide engineered to act as a single-molecule dual agonist at the glucose-dependent insulinotropic polypeptide (GIP) receptor and the glucagon-like peptide-1 (GLP-1) receptor. The molecule incorporates a C20 fatty-acid moiety that supports extended duration of action via albumin binding.',
      'Tirzepatide is a regulated therapeutic compound approved for human use under separate brand names in regulated channels. The Merit Sciences offering is supplied for research use only — not for human or veterinary administration. Researchers must confirm jurisdictional eligibility before procurement.',
    ],
    mechanism:
      'Binds and activates both the GIP receptor and the GLP-1 receptor with picomolar affinity. The dual-incretin pharmacology is reported to produce additive effects on insulin secretion and glucagon suppression in preclinical metabolic research models.',
    halfLife: '~5 days (preclinical).',
    solubility: 'Reconstitutes in bacteriostatic water; clear solution.',
    researchApplications: [
      'Incretin signaling research',
      'Glucose homeostasis models',
      'Receptor pharmacology',
      'Comparative GLP-1 / GIP agonist studies',
    ],
    references: [
      {
        title: 'LY3298176, a novel dual GIP and GLP-1 receptor agonist for the treatment of type 2 diabetes mellitus',
        authors: 'Coskun T, Sloop KW, Loghin C, et al.',
        journal: 'Molecular Metabolism',
        year: 2018,
        doi: '10.1016/j.molmet.2018.09.009',
        pubmedId: '30473097',
        url: 'https://pubmed.ncbi.nlm.nih.gov/30473097/',
        verify: true,
      },
    ],
  },

  // ─── Sermorelin (GHRH 1-29) ────────────────────────────────────────
  'sermorelin': {
    compoundClass: 'GHRH receptor agonist — 29-amino-acid fragment of growth-hormone-releasing hormone',
    discovery:
      'The shortest N-terminal fragment of GHRH retaining full biological activity at GHRH receptors. Synthesized and characterized following identification of full-length GHRH by Guillemin and colleagues in the early 1980s.',
    description: [
      'Sermorelin is the synthetic acetate salt of GHRH(1-29), the N-terminal 29 amino acids of human growth-hormone-releasing hormone (somatocrinin). It is the shortest GHRH fragment known to retain full intrinsic activity at the GHRH receptor and is among the most-studied secretagogues in the public research literature.',
      'Unlike growth hormone itself, sermorelin acts upstream by stimulating endogenous pituitary GH release in a physiologic pulsatile pattern, preserving negative-feedback regulation by somatostatin and IGF-1.',
    ],
    mechanism:
      'Selective agonist at the GHRH receptor on anterior pituitary somatotrophs. Receptor activation triggers cAMP-mediated calcium influx and stimulates pulsatile growth hormone release from pituitary stores.',
    halfLife: '~10–20 min (rapid serum clearance is characteristic of GHRH analogs).',
    solubility: 'Highly soluble in bacteriostatic water; stable for ~30 days refrigerated after reconstitution.',
    researchApplications: [
      'GH / IGF-1 axis research',
      'Pituitary somatotroph function',
      'GHRH receptor pharmacology',
      'Comparative secretagogue studies',
    ],
    references: [
      {
        title: 'Sermorelin: a better approach to management of adult-onset growth hormone insufficiency?',
        authors: 'Walker RF',
        journal: 'Clinical Interventions in Aging',
        year: 2006,
        pubmedId: '18046891',
        url: 'https://pubmed.ncbi.nlm.nih.gov/18046891/',
        verify: true,
      },
    ],
  },

  // ─── Selank ────────────────────────────────────────────────────────
  'selank': {
    compoundClass: 'Synthetic heptapeptide (Thr-Lys-Pro-Arg-Pro-Gly-Pro) — tuftsin analog',
    discovery:
      'Developed in Russia at the Institute of Molecular Genetics of the Russian Academy of Sciences. Designed as a stabilized analog of the immunomodulatory peptide tuftsin (Thr-Lys-Pro-Arg).',
    description: [
      'Selank is a synthetic heptapeptide consisting of the human tuftsin tetrapeptide (Thr-Lys-Pro-Arg) extended with the C-terminal tripeptide -Pro-Gly-Pro. The C-terminal extension confers significant proteolytic resistance, supporting longer in-vivo activity than the parent tuftsin.',
      'Selank is one of two Russian-developed heptapeptides commonly co-studied in the neuropeptide literature; the other (Semax) is structurally distinct but is often cited alongside Selank in research on neurotrophic and behavioral endpoints.',
    ],
    mechanism:
      'Reported effects on GABAergic and serotonergic neurotransmission in preclinical research. Modulates BDNF and NGF expression in some rodent models. Acts intranasally or peripherally with reported CNS bioavailability.',
    halfLife: 'Short circulating half-life; CNS effects reported well beyond serum-detectable window in research models.',
    solubility: 'Soluble in bacteriostatic water; sublingual / intranasal formulations are common in the research literature.',
    researchApplications: [
      'Anxiolytic-pathway research',
      'BDNF / NGF expression studies',
      'Neuropeptide receptor research',
      'Comparative tuftsin-analog studies',
    ],
    references: [
      {
        title: 'The temporary dynamics of inflammation-related genes expression under tuftsin analog Selank action',
        authors: 'Kolomin T, Shadrina M, Slominsky P, et al.',
        journal: 'Molecular Immunology',
        year: 2013,
        pubmedId: '24011687',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24011687/',
        verify: true,
      },
    ],
  },

  // ─── NAD+ ──────────────────────────────────────────────────────────
  'nad-500mg': {
    compoundClass: 'Pyridine nucleotide coenzyme — NOT a peptide',
    discovery:
      'NAD was discovered by Arthur Harden and William John Young in 1906 during fermentation research. Sirtuin biology — a major focus of contemporary NAD+ research — emerged through the work of Leonard Guarente, David Sinclair, and others in the late 1990s and 2000s.',
    description: [
      'Nicotinamide Adenine Dinucleotide (NAD+) is a pyridine nucleotide coenzyme present in every living cell. It is not a peptide and does not fit the strict "research peptide" category — it is stocked because the cellular-pathway literature on NAD+ is deep, the reorder pattern is consistent, and many of the researchers buying Merit peptides also work with NAD+.',
      'NAD+ functions both as a redox cofactor and as a substrate for an expanding family of NAD-consuming enzymes including the sirtuins (SIRT1-7), poly(ADP-ribose) polymerases (PARPs), and CD38.',
    ],
    mechanism:
      'Redox cofactor in catabolic and biosynthetic pathways (NAD+/NADH cycling). Substrate for sirtuin deacetylase activity. Substrate for PARP-mediated DNA damage signaling. Central to mitochondrial electron-transport-chain function.',
    halfLife: 'Variable by route; intracellular NAD+ pools are continuously cycled.',
    solubility: 'Highly water-soluble. Reconstitute in bacteriostatic water.',
    researchApplications: [
      'Sirtuin biology research',
      'Mitochondrial bioenergetics',
      'PARP / DNA-damage-response signaling',
      'Cellular aging models',
      'Metabolic flux studies',
    ],
    references: [
      {
        title: 'NAD+ and sirtuins in aging and disease',
        authors: 'Imai S, Guarente L',
        journal: 'Trends in Cell Biology',
        year: 2014,
        doi: '10.1016/j.tcb.2014.04.002',
        pubmedId: '24786309',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24786309/',
        verify: true,
      },
    ],
  },

  // Remaining 12 compounds fall back to the "research data being
  // verified" placeholder in the PDP. Populate one at a time as the
  // pharmacy team validates citation + mechanism content.
};

export function getResearchData(handle: string): ResearchData | null {
  return RESEARCH_DATA[handle] ?? null;
}
