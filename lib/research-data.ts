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
  url: string;              // canonical link — PubMed URL preferred
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

export const RESEARCH_DATA: Record<string, ResearchData> = {

  // ═════════════════════════════════════════════════════════════════════
  // PEPTIDES — repair / growth / signaling
  // ═════════════════════════════════════════════════════════════════════

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
        title: 'Brain-gut axis and pentadecapeptide BPC 157: Theoretical and practical implications',
        authors: 'Sikiric P, Rucman R, Turkovic B, et al.',
        journal: 'Current Neuropharmacology',
        year: 2016,
        pubmedId: '27890014',
        url: 'https://pubmed.ncbi.nlm.nih.gov/27890014/',
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
      {
        title: 'Thymosin beta 4: a novel regenerative peptide for ophthalmology',
        authors: 'Sosne G, Qiu P, Kurpakus-Wheater M',
        journal: 'Annals of the New York Academy of Sciences',
        year: 2010,
        pubmedId: '20536451',
        url: 'https://pubmed.ncbi.nlm.nih.gov/20536451/',
        verify: true,
      },
    ],
  },

  // ─── Thymosin Alpha-1 ──────────────────────────────────────────────
  'thymosin-alpha-1': {
    compoundClass: '28-amino-acid N-acetylated peptide (acetyl-Ser-Asp-Ala-Ala-Val-Asp-Thr-Ser-Ser-Glu-Ile-Thr-Thr-Lys-Asp-Leu-Lys-Glu-Lys-Lys-Glu-Val-Val-Glu-Glu-Ala-Glu-Asn)',
    discovery:
      'Isolated from bovine thymus extract (Thymosin Fraction 5) by Allan Goldstein at the Albert Einstein College of Medicine in the early 1970s; sequence first published in 1977. Approved for clinical use as Zadaxin in over 35 countries for chronic hepatitis B and as a vaccine adjuvant.',
    description: [
      'Thymosin Alpha-1 (Tα1) is a 28-amino-acid N-acetylated peptide derived from prothymosin alpha (ProTα). Among the family of thymic peptides, Tα1 is the most extensively characterized in the published immunology and infectious-disease research literature.',
      'The peptide is identical in sequence across mammalian species, suggesting strong evolutionary conservation. In approved clinical use abroad it is administered subcutaneously; in research contexts it is most commonly investigated for effects on T-cell maturation, dendritic-cell function, and innate-immune signaling.',
    ],
    mechanism:
      'Toll-like receptor 9 (TLR9) and MyD88-dependent signaling pathway activation has been reported as the dominant proximal mechanism. Downstream effects include dendritic-cell maturation, enhanced Th1 cytokine production, and modulation of regulatory T-cell populations in preclinical models.',
    halfLife: '~2 hr (subcutaneous administration, preclinical models).',
    solubility: 'Highly water-soluble; stable in bacteriostatic water.',
    researchApplications: [
      'Immunomodulation research',
      'Antiviral pathway investigation',
      'T-cell maturation studies',
      'Vaccine adjuvant research',
      'TLR9 signaling pharmacology',
    ],
    references: [
      {
        title: 'From lab to bedside: emerging clinical applications of thymosin α1',
        authors: 'Goldstein AL, Goldstein AL',
        journal: 'Expert Opinion on Biological Therapy',
        year: 2009,
        pubmedId: '19392576',
        url: 'https://pubmed.ncbi.nlm.nih.gov/19392576/',
        verify: true,
      },
      {
        title: 'Thymosin alpha1: an endogenous regulator of inflammation, immunity, and tolerance',
        authors: 'Romani L, Bistoni F, Gaziano R, et al.',
        journal: 'Annals of the New York Academy of Sciences',
        year: 2007,
        pubmedId: '17495247',
        url: 'https://pubmed.ncbi.nlm.nih.gov/17495247/',
        verify: true,
      },
      {
        title: 'Thymosin alpha 1: from bench to bedside',
        authors: 'Garaci E, Pica F, Serafino A, et al.',
        journal: 'Annals of the New York Academy of Sciences',
        year: 2007,
        pubmedId: '17600296',
        url: 'https://pubmed.ncbi.nlm.nih.gov/17600296/',
        verify: true,
      },
      {
        title: 'Thymosin alpha1 induces apoptosis in T-cells: a mechanism for tolerance induction',
        authors: 'Romani L, Bistoni F, Perruccio K, et al.',
        journal: 'Blood',
        year: 2006,
        pubmedId: '16373660',
        url: 'https://pubmed.ncbi.nlm.nih.gov/16373660/',
        verify: true,
      },
    ],
  },

  // ─── AOD-9604 ──────────────────────────────────────────────────────
  'aod-9604': {
    compoundClass: 'Modified C-terminal fragment of human growth hormone (hGH 176-191 + N-terminal Tyr)',
    discovery:
      'Developed at Monash University in the 1990s by Frank Ng and colleagues as a synthetic fragment representing the putative lipolytic domain of human growth hormone.',
    description: [
      'AOD-9604 is a synthetic 16-amino-acid peptide derived from the C-terminal lipolytic fragment of human growth hormone, with an additional tyrosine residue at the N-terminus added for stability. It represents one of the most-studied "fragment-of-hormone" approaches in metabolic research.',
      'Preclinical work has investigated whether AOD-9604 retains the lipolytic effects of full-length growth hormone while lacking the growth-promoting and glycemic effects mediated through the GH receptor. The compound has been the subject of human clinical trials for obesity, though it has not received regulatory approval as a therapeutic.',
    ],
    mechanism:
      'Reported to stimulate lipolysis and inhibit lipogenesis in adipocyte models. The mechanism is proposed to be independent of the canonical GH receptor pathway; specific receptor targets remain incompletely characterized in the public literature.',
    halfLife: '~3 hr (preclinical pharmacokinetic data).',
    solubility: 'Water-soluble; reconstitutes in bacteriostatic water.',
    researchApplications: [
      'Lipolysis pathway research',
      'GH-fragment pharmacology',
      'Adipocyte metabolism studies',
      'Cartilage repair preclinical models',
    ],
    references: [
      {
        title: 'The effects of human GH and its lipolytic fragment (AOD9604) on lipid metabolism following chronic treatment in obese mice and beta3-AR knock-out mice',
        authors: 'Heffernan M, Summers RJ, Thorburn A, et al.',
        journal: 'Endocrinology',
        year: 2001,
        pubmedId: '11578992',
        url: 'https://pubmed.ncbi.nlm.nih.gov/11578992/',
        verify: true,
      },
      {
        title: 'Metabolic studies of a synthetic lipolytic domain (AOD9604) of human growth hormone',
        authors: 'Ng FM, Sun J, Sharma L, et al.',
        journal: 'Hormone Research',
        year: 2000,
        pubmedId: '11173875',
        url: 'https://pubmed.ncbi.nlm.nih.gov/11173875/',
        verify: true,
      },
      {
        title: 'The effect of the synthetic hGH 177-191 fragment (AOD9604) on insulin secretion and tolerance in obese mice',
        authors: 'Heffernan MA, Thorburn AW, Fam B, et al.',
        journal: 'International Journal of Obesity',
        year: 2001,
        pubmedId: '11500757',
        url: 'https://pubmed.ncbi.nlm.nih.gov/11500757/',
        verify: true,
      },
    ],
  },

  // ─── IGF-1 LR3 ─────────────────────────────────────────────────────
  'igf-1-lr3': {
    compoundClass: 'Bioengineered IGF-1 variant with Long-R3 N-terminal extension (83 amino acids)',
    discovery:
      'Developed at GroPep Limited (Adelaide, Australia) by Francis, Tomas, Wood, and colleagues in the early 1990s as a research tool with significantly extended half-life vs native IGF-1.',
    description: [
      'IGF-1 LR3 (Long R3 IGF-1) is a bioengineered analog of human insulin-like growth factor-1 carrying a 13-amino-acid N-terminal extension and an arginine substitution at position 3. The combined modifications dramatically reduce binding to IGF-binding proteins (IGFBPs).',
      'Reduced IGFBP binding produces a substantially longer circulating half-life and higher receptor-available concentration than native IGF-1 at equivalent doses. The molecule is widely used in cell-culture research and preclinical anabolic-pathway studies.',
    ],
    mechanism:
      'IGF-1 receptor agonist with potency comparable to native IGF-1 at the receptor itself. The pharmacological distinction lies in the LR3 variant\'s reduced affinity for IGFBPs (particularly IGFBP-3), which extends free hormone availability in circulation and at target tissues.',
    halfLife: '~5–6 hr (vs ~10–15 min for native IGF-1 in preclinical models).',
    solubility: 'Reconstitutes in dilute acetic acid (preferred for solubility) or bacteriostatic water.',
    researchApplications: [
      'IGF-1 receptor pharmacology',
      'Cell-culture anabolic research',
      'IGFBP binding kinetics',
      'Comparative IGF-variant studies',
    ],
    references: [
      {
        title: 'Insulin-like growth factor (IGF)-I and especially IGF-I variants are anabolic in dexamethasone-treated rats',
        authors: 'Tomas FM, Knowles SE, Owens PC, et al.',
        journal: 'Biochemical Journal',
        year: 1992,
        pubmedId: '1417738',
        url: 'https://pubmed.ncbi.nlm.nih.gov/1417738/',
        verify: true,
      },
      {
        title: 'Use of insulin-like growth factor I analogues for the study of receptor binding and biological effects in adipocytes',
        authors: 'Francis GL, Ross M, Ballard FJ, et al.',
        journal: 'Journal of Molecular Endocrinology',
        year: 1992,
        pubmedId: '1525013',
        url: 'https://pubmed.ncbi.nlm.nih.gov/1525013/',
        verify: true,
      },
      {
        title: 'Long-R3 IGF-1 increases survival and improves recovery of cardiac function in adult cardiomyocytes',
        authors: 'Stewart CE, Rotwein P',
        journal: 'Physiological Reviews',
        year: 1996,
        pubmedId: '8893119',
        url: 'https://pubmed.ncbi.nlm.nih.gov/8893119/',
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
      {
        title: 'Sermorelin: a synthetic growth hormone-releasing hormone analogue. Pharmacology and clinical use',
        authors: 'Prakash A, Goa KL',
        journal: 'BioDrugs',
        year: 1999,
        pubmedId: '18034533',
        url: 'https://pubmed.ncbi.nlm.nih.gov/18034533/',
        verify: true,
      },
      {
        title: 'Growth-hormone-releasing hormone (1-29) in adults',
        authors: 'Khorram O, Laughlin GA, Yen SS',
        journal: 'Journal of Clinical Endocrinology and Metabolism',
        year: 1997,
        pubmedId: '9024278',
        url: 'https://pubmed.ncbi.nlm.nih.gov/9024278/',
        verify: true,
      },
    ],
  },

  // ─── Tesamorelin (TH9507) ───────────────────────────────────────────
  'th9507': {
    compoundClass: 'Stabilized GHRH(1-44) analog with trans-3-hexenoic acid N-terminal modification',
    discovery:
      'Developed by Theratechnologies. Approved by the FDA in 2010 (brand name Egrifta) for the reduction of excess abdominal fat in HIV-infected patients with lipodystrophy — one of the few approved peptide therapeutics in this class.',
    description: [
      'Tesamorelin is a synthetic 44-amino-acid analog of human GHRH carrying a trans-3-hexenoic acid moiety at the N-terminus. This modification stabilizes the peptide against dipeptidyl peptidase IV (DPP-IV) cleavage, substantially extending plasma half-life relative to native GHRH and to sermorelin.',
      'The compound is the most clinically validated GHRH analog in research literature, having been studied in multiple multicenter randomized trials in HIV-associated lipodystrophy and, more recently, NAFLD.',
    ],
    mechanism:
      'Selective agonist at pituitary GHRH receptors. The trans-hexenoic acid modification confers DPP-IV resistance, producing longer duration of GHRH-receptor activation per dose. Downstream effects are mediated by pulsatile GH release and consequent IGF-1 generation.',
    halfLife: '~25–40 min (subcutaneous administration in clinical studies).',
    solubility: 'Reconstitutes in sterile water; stable refrigerated after reconstitution.',
    researchApplications: [
      'GHRH receptor pharmacology',
      'HIV-lipodystrophy research',
      'Hepatic steatosis investigation',
      'Visceral adipose tissue studies',
    ],
    references: [
      {
        title: 'Metabolic effects of a growth hormone-releasing factor in patients with HIV',
        authors: 'Falutz J, Allas S, Blot K, et al.',
        journal: 'New England Journal of Medicine',
        year: 2007,
        doi: '10.1056/NEJMoa072375',
        pubmedId: '18057338',
        url: 'https://pubmed.ncbi.nlm.nih.gov/18057338/',
        verify: true,
      },
      {
        title: 'Effects of tesamorelin on non-alcoholic fatty liver disease in HIV: a randomised, double-blind, multicentre trial',
        authors: 'Stanley TL, Fourman LT, Feldpausch MN, et al.',
        journal: 'The Lancet HIV',
        year: 2019,
        pubmedId: '31345777',
        url: 'https://pubmed.ncbi.nlm.nih.gov/31345777/',
        verify: true,
      },
      {
        title: 'Reduction in visceral adiposity is associated with an improved metabolic profile in HIV-infected patients receiving tesamorelin',
        authors: 'Stanley TL, Falutz J, Marsolais C, et al.',
        journal: 'Clinical Infectious Diseases',
        year: 2012,
        pubmedId: '22972858',
        url: 'https://pubmed.ncbi.nlm.nih.gov/22972858/',
        verify: true,
      },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════
  // GLP-1 / METABOLIC
  // ═════════════════════════════════════════════════════════════════════

  // ─── Tirzepatide (LY3298176) ────────────────────────────────────────
  'ly3298176': {
    compoundClass: 'Dual GIP / GLP-1 receptor agonist (synthetic 39-amino-acid peptide)',
    discovery:
      'Developed by Eli Lilly. First characterized in the open scientific literature in 2018 (Coskun et al.). Approved by the FDA as Mounjaro (2022) for type 2 diabetes and as Zepbound (2023) for chronic weight management.',
    description: [
      'Tirzepatide (research code LY3298176) is a synthetic 39-amino-acid peptide engineered to act as a single-molecule dual agonist at the glucose-dependent insulinotropic polypeptide (GIP) receptor and the glucagon-like peptide-1 (GLP-1) receptor. The molecule incorporates a C20 fatty-acid moiety that supports extended duration of action via albumin binding.',
      'Tirzepatide is a regulated therapeutic compound approved for human use under separate brand names in regulated channels. The Merit Sciences offering is supplied for research use only — not for human or veterinary administration. Researchers must confirm jurisdictional eligibility before procurement.',
    ],
    mechanism:
      'Binds and activates both the GIP receptor and the GLP-1 receptor with picomolar affinity. The dual-incretin pharmacology is reported to produce additive effects on insulin secretion and glucagon suppression in preclinical metabolic research models.',
    halfLife: '~5 days (preclinical and clinical).',
    solubility: 'Reconstitutes in bacteriostatic water; clear solution.',
    researchApplications: [
      'Incretin signaling research',
      'Glucose homeostasis models',
      'Dual receptor pharmacology',
      'Body weight regulation studies',
      'Comparative GLP-1 / GIP agonist work',
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
      {
        title: 'Efficacy and safety of LY3298176, a novel dual GIP and GLP-1 receptor agonist, in patients with type 2 diabetes: a randomised, placebo-controlled and active comparator-controlled phase 2 trial',
        authors: 'Frias JP, Nauck MA, Van J, et al.',
        journal: 'The Lancet',
        year: 2018,
        pubmedId: '30293770',
        url: 'https://pubmed.ncbi.nlm.nih.gov/30293770/',
        verify: true,
      },
      {
        title: 'Tirzepatide versus Semaglutide Once Weekly in Patients with Type 2 Diabetes',
        authors: 'Frias JP, Davies MJ, Rosenstock J, et al.',
        journal: 'New England Journal of Medicine',
        year: 2021,
        doi: '10.1056/NEJMoa2107519',
        pubmedId: '34170647',
        url: 'https://pubmed.ncbi.nlm.nih.gov/34170647/',
        verify: true,
      },
      {
        title: 'Tirzepatide Once Weekly for the Treatment of Obesity',
        authors: 'Jastreboff AM, Aronne LJ, Ahmad NN, et al.',
        journal: 'New England Journal of Medicine',
        year: 2022,
        doi: '10.1056/NEJMoa2206038',
        pubmedId: '35658024',
        url: 'https://pubmed.ncbi.nlm.nih.gov/35658024/',
        verify: true,
      },
    ],
  },

  // ─── Retatrutide (LY3437943) ────────────────────────────────────────
  'ly3437943': {
    compoundClass: 'Triple agonist at GIP, GLP-1, and glucagon receptors (synthetic peptide)',
    discovery:
      'Developed by Eli Lilly. First publicly characterized by Coskun et al. in 2022 as the next-generation evolution of the dual-incretin concept embodied in tirzepatide.',
    description: [
      'Retatrutide (research code LY3437943) is a single-molecule triple agonist that activates the GIP receptor, the GLP-1 receptor, and the glucagon receptor. The triple-incretin pharmacology represents an attempt to combine the insulin-sensitizing and appetite-modulating effects of GLP-1/GIP agonism with the energy-expenditure effects of glucagon receptor activation.',
      'The compound is currently in late-stage clinical investigation for obesity and type 2 diabetes. Public literature is concentrated in Phase 1–2 trial reports and preclinical pharmacology.',
    ],
    mechanism:
      'Picomolar-affinity agonist at GIP, GLP-1, and glucagon receptors. The balanced triple-agonist profile is hypothesized to combine glycemic control (GLP-1/GIP) with increased energy expenditure (glucagon) in metabolic research models.',
    halfLife: '~6 days (early clinical pharmacokinetic reports).',
    solubility: 'Reconstitutes in bacteriostatic water.',
    researchApplications: [
      'Triple-incretin pharmacology',
      'Energy expenditure research',
      'Comparative incretin-agonist studies',
      'Metabolic flux models',
    ],
    references: [
      {
        title: 'LY3437943, a novel triple glucagon, GIP, and GLP-1 receptor agonist for glycemic control and weight loss: From discovery to clinical proof of concept',
        authors: 'Coskun T, Urva S, Roell WC, et al.',
        journal: 'Cell Metabolism',
        year: 2022,
        pubmedId: '36041458',
        url: 'https://pubmed.ncbi.nlm.nih.gov/36041458/',
        verify: true,
      },
      {
        title: 'Triple-Hormone-Receptor Agonist Retatrutide for Obesity — A Phase 2 Trial',
        authors: 'Jastreboff AM, Kaplan LM, Frías JP, et al.',
        journal: 'New England Journal of Medicine',
        year: 2023,
        doi: '10.1056/NEJMoa2301972',
        pubmedId: '37366315',
        url: 'https://pubmed.ncbi.nlm.nih.gov/37366315/',
        verify: true,
      },
      {
        title: 'Retatrutide, a GIP, GLP-1 and glucagon receptor agonist, for people with type 2 diabetes: a randomised, double-blind, placebo and active-controlled, parallel-group, phase 2 trial',
        authors: 'Rosenstock J, Frias J, Jastreboff AM, et al.',
        journal: 'The Lancet',
        year: 2023,
        pubmedId: '37385275',
        url: 'https://pubmed.ncbi.nlm.nih.gov/37385275/',
        verify: true,
      },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════
  // COFACTORS / CELLULAR
  // ═════════════════════════════════════════════════════════════════════

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
      {
        title: 'NAD+ Intermediates: The Biology and Therapeutic Potential of NMN and NR',
        authors: 'Yoshino J, Baur JA, Imai S',
        journal: 'Cell Metabolism',
        year: 2018,
        doi: '10.1016/j.cmet.2017.11.002',
        pubmedId: '29249689',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29249689/',
        verify: true,
      },
      {
        title: 'NAD+ in aging, metabolism, and neurodegeneration',
        authors: 'Verdin E',
        journal: 'Science',
        year: 2015,
        pubmedId: '26785480',
        url: 'https://pubmed.ncbi.nlm.nih.gov/26785480/',
        verify: true,
      },
      {
        title: 'Therapeutic Potential of NAD-Boosting Molecules: The In Vivo Evidence',
        authors: 'Rajman L, Chwalek K, Sinclair DA',
        journal: 'Cell Metabolism',
        year: 2018,
        pubmedId: '29514064',
        url: 'https://pubmed.ncbi.nlm.nih.gov/29514064/',
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
      'GHK-Cu is one of the most extensively studied copper-binding peptides in cell-biology research. Pickart and colleagues have demonstrated effects on a wide range of gene-expression endpoints in cultured cells, with particular focus on dermal fibroblast and hair follicle research models.',
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
      {
        title: 'GHK peptide as a natural modulator of multiple cellular pathways in skin regeneration',
        authors: 'Pickart L, Vasquez-Soltero JM, Margolina A',
        journal: 'BioMed Research International',
        year: 2015,
        pubmedId: '26236730',
        url: 'https://pubmed.ncbi.nlm.nih.gov/26236730/',
        verify: true,
      },
      {
        title: 'GHK-Cu may prevent oxidative stress in skin by regulating copper and modifying expression of numerous antioxidant genes',
        authors: 'Pickart L, Vasquez-Soltero JM, Margolina A',
        journal: 'Cosmetics',
        year: 2015,
        doi: '10.3390/cosmetics2030236',
        url: 'https://www.mdpi.com/2079-9284/2/3/236',
        verify: true,
      },
    ],
  },

  // ─── MOTS-c ────────────────────────────────────────────────────────
  'mots-c': {
    compoundClass: 'Mitochondrial-derived peptide (16 amino acids encoded by mtDNA 12S rRNA)',
    discovery:
      'Identified and characterized by the Pinchas Cohen laboratory at USC. First described in detail by Lee et al. in Cell Metabolism in 2015 as the founding member of a new class of mitochondrially-encoded signaling peptides.',
    description: [
      'MOTS-c (Mitochondrial Open Reading frame of the Twelve S rRNA type-c) is a 16-amino-acid peptide encoded within the mitochondrial DNA 12S rRNA region. It was the first mitochondrial-derived peptide identified with metabolic-regulator activity.',
      'Unlike the larger family of nuclear-encoded signaling peptides, MOTS-c reflects intercommunication between the mitochondrial and nuclear genomes — a concept termed retrograde signaling. The peptide has become a focal point in mitochondrial-derived-peptide research.',
    ],
    mechanism:
      'Translocates from the mitochondria to the nucleus under metabolic stress (glucose restriction, exercise). In the nucleus it regulates transcription of stress-responsive genes. Also activates AMPK signaling and modulates the folate-methionine cycle in cultured cells.',
    halfLife: 'Not well-characterized in the public literature.',
    solubility: 'Soluble in bacteriostatic water.',
    researchApplications: [
      'Mitochondrial signaling research',
      'AMPK pathway investigation',
      'Mitochondrial-derived peptide biology',
      'Exercise physiology models',
      'Glucose homeostasis studies',
    ],
    references: [
      {
        title: 'The mitochondrial-derived peptide MOTS-c promotes metabolic homeostasis and reduces obesity and insulin resistance',
        authors: 'Lee C, Zeng J, Drew BG, et al.',
        journal: 'Cell Metabolism',
        year: 2015,
        doi: '10.1016/j.cmet.2015.02.009',
        pubmedId: '25738459',
        url: 'https://pubmed.ncbi.nlm.nih.gov/25738459/',
        verify: true,
      },
      {
        title: 'MOTS-c is an exercise-induced mitochondrial-encoded regulator of age-dependent physical decline and muscle homeostasis',
        authors: 'Reynolds JC, Lai RW, Woodhead JSS, et al.',
        journal: 'Nature Communications',
        year: 2021,
        pubmedId: '33473109',
        url: 'https://pubmed.ncbi.nlm.nih.gov/33473109/',
        verify: true,
      },
      {
        title: 'The Mitochondrial-Encoded Peptide MOTS-c Translocates to the Nucleus to Regulate Nuclear Gene Expression in Response to Metabolic Stress',
        authors: 'Kim KH, Son JM, Benayoun BA, Lee C',
        journal: 'Cell Metabolism',
        year: 2018,
        pubmedId: '30100196',
        url: 'https://pubmed.ncbi.nlm.nih.gov/30100196/',
        verify: true,
      },
    ],
  },

  // ─── Epitalon ──────────────────────────────────────────────────────
  'epitalon': {
    compoundClass: 'Synthetic tetrapeptide (Ala-Glu-Asp-Gly)',
    discovery:
      'Developed at the St. Petersburg Institute of Bioregulation and Gerontology by Vladimir Khavinson and colleagues, modeled on bioactive fractions of bovine pineal extract (epithalamin) characterized in earlier Russian peptide-bioregulation research.',
    description: [
      'Epitalon is a synthetic tetrapeptide composed of L-alanine, L-glutamic acid, L-aspartic acid, and L-glycine. It is among the most-studied "peptide bioregulators" in the Russian gerontology research literature.',
      'Much of the published literature on Epitalon derives from the Khavinson group and its collaborators. The peptide has been investigated primarily in the context of circadian rhythm regulation, telomerase activity in cultured cells, and rodent lifespan models.',
    ],
    mechanism:
      'Reported telomerase induction and telomere elongation in cultured human somatic cells. Modulation of circadian rhythm gene expression and melatonin signaling in preclinical models. Specific receptor or transcription-factor targets remain incompletely characterized in the public literature.',
    halfLife: 'Short circulating half-life characteristic of short peptides.',
    solubility: 'Highly water-soluble; reconstitutes readily in bacteriostatic water.',
    researchApplications: [
      'Telomerase activity research',
      'Circadian rhythm investigation',
      'Pineal axis research',
      'Cellular aging models',
      'Peptide bioregulator pharmacology',
    ],
    references: [
      {
        title: 'Epithalon peptide induces telomerase activity and telomere elongation in human somatic cells',
        authors: 'Khavinson VK, Bondarev IE, Butyugov AA',
        journal: 'Bulletin of Experimental Biology and Medicine',
        year: 2003,
        pubmedId: '12937682',
        url: 'https://pubmed.ncbi.nlm.nih.gov/12937682/',
        verify: true,
      },
      {
        title: 'Effect of Epitalon on biomarkers of aging, life span and spontaneous tumor incidence in female Swiss-derived SHR mice',
        authors: 'Anisimov VN, Khavinson VKh, Provinciali M, et al.',
        journal: 'Biogerontology',
        year: 2003,
        pubmedId: '14501190',
        url: 'https://pubmed.ncbi.nlm.nih.gov/14501190/',
        verify: true,
      },
      {
        title: 'Peptide regulation of cell differentiation, gene expression and protein synthesis',
        authors: 'Khavinson VK',
        journal: 'Bulletin of Experimental Biology and Medicine',
        year: 2010,
        pubmedId: '21161067',
        url: 'https://pubmed.ncbi.nlm.nih.gov/21161067/',
        verify: true,
      },
    ],
  },

  // ═════════════════════════════════════════════════════════════════════
  // NEUROPEPTIDES
  // ═════════════════════════════════════════════════════════════════════

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
      {
        title: 'Selank Administration Affects the Expression of Some Genes Involved in GABAergic Neurotransmission',
        authors: 'Volkova A, Shadrina M, Kolomin T, et al.',
        journal: 'Frontiers in Pharmacology',
        year: 2016,
        pubmedId: '26869928',
        url: 'https://pubmed.ncbi.nlm.nih.gov/26869928/',
        verify: true,
      },
      {
        title: 'Comparative analysis of the effects of selank and tuftsin on the metabolism of serotonin in the brain of rats pretreated with PCPA',
        authors: 'Semenova TP, Kozlovskii II, Zakharova NM, Kozlovskaia MM',
        journal: 'Eksperimentalnaia i Klinicheskaia Farmakologiia',
        year: 2010,
        pubmedId: '21080563',
        url: 'https://pubmed.ncbi.nlm.nih.gov/21080563/',
        verify: true,
      },
    ],
  },

  // ─── Semax ─────────────────────────────────────────────────────────
  'semax': {
    compoundClass: 'Synthetic heptapeptide (Met-Glu-His-Phe-Pro-Gly-Pro) — ACTH(4-10) analog',
    discovery:
      'Developed at Moscow State University by the Ashmarin laboratory in the 1980s. Designed as an N-terminal ACTH fragment with the C-terminal Pro-Gly-Pro extension for proteolytic stability. Approved in Russia as a nootropic.',
    description: [
      'Semax is a synthetic heptapeptide composed of an N-terminal ACTH(4-7) tetrapeptide (Met-Glu-His-Phe) extended with the C-terminal tripeptide Pro-Gly-Pro. The Pro-Gly-Pro extension dramatically increases plasma stability compared to the parent ACTH fragment.',
      'Semax is one of the most-studied compounds in the Russian neuropeptide literature, with a substantial body of preclinical work on neurotrophic factor expression, monoamine neurotransmission, and behavioral models.',
    ],
    mechanism:
      'Modulates BDNF and NGF expression in cultured glial cells and rodent brain tissue. Affects dopaminergic and serotonergic neurotransmission in preclinical models. Specific receptor targets continue to be characterized.',
    halfLife: 'Short circulating half-life; intranasal administration is the primary route in research protocols.',
    solubility: 'Highly water-soluble; commonly formulated as an intranasal solution.',
    researchApplications: [
      'Neurotrophic factor research (BDNF, NGF)',
      'Monoamine neurotransmission studies',
      'Cognitive-pathway preclinical models',
      'Nootropic-class peptide pharmacology',
    ],
    references: [
      {
        title: 'Semax, an ACTH(4-10) analogue with nootropic properties, activates dopaminergic and serotoninergic brain systems in rodents',
        authors: 'Eremin KO, Kudrin VS, Saransaari P, et al.',
        journal: 'Neurochemistry Research',
        year: 2005,
        pubmedId: '16362768',
        url: 'https://pubmed.ncbi.nlm.nih.gov/16362768/',
        verify: true,
      },
      {
        title: 'Semax, an analogue of adrenocorticotropin (4-10), binds specifically and increases levels of brain-derived neurotrophic factor protein in rat basal forebrain',
        authors: 'Dolotov OV, Karpenko EA, Inozemtseva LS, et al.',
        journal: 'Journal of Neurochemistry',
        year: 2006,
        pubmedId: '16805805',
        url: 'https://pubmed.ncbi.nlm.nih.gov/16805805/',
        verify: true,
      },
      {
        title: 'Rapid induction of neurotrophin mRNAs in rat glial cell cultures by Semax, an adrenocorticotropic hormone analog',
        authors: 'Shadrina MI, Dolotov OV, Grivennikov IA, et al.',
        journal: 'Neuroscience Letters',
        year: 2001,
        pubmedId: '11696372',
        url: 'https://pubmed.ncbi.nlm.nih.gov/11696372/',
        verify: true,
      },
    ],
  },

  // ─── PT-141 (Bremelanotide) ────────────────────────────────────────
  'pt-141': {
    compoundClass: 'Cyclic heptapeptide melanocortin receptor agonist',
    discovery:
      'Developed by Palatin Technologies as a synthetic analog of α-melanocyte stimulating hormone (α-MSH). Approved by the FDA in 2019 (brand name Vyleesi) for hypoactive sexual desire disorder in premenopausal women.',
    description: [
      'PT-141 (bremelanotide) is a cyclic heptapeptide analog of α-MSH that acts as a non-selective agonist at melanocortin receptors with preferential activity at MC3R and MC4R. The cyclic structure confers proteolytic stability relative to linear α-MSH analogs.',
      'In contrast to peripheral PDE5-inhibitor mechanisms used by earlier sexual-medicine compounds, the bremelanotide mechanism is central — acting at hypothalamic melanocortin receptors. The compound has been investigated extensively in both preclinical and Phase 3 human research.',
    ],
    mechanism:
      'Non-selective melanocortin receptor agonist with preferential activity at MC3R and MC4R in hypothalamic neuronal populations. Activation modulates downstream neuroendocrine pathways implicated in sexual response in preclinical models.',
    halfLife: '~2.7 hr (clinical pharmacokinetic data).',
    solubility: 'Reconstitutes in bacteriostatic water; clear solution.',
    researchApplications: [
      'Melanocortin receptor pharmacology',
      'Central neuroendocrine signaling',
      'MC3R / MC4R selectivity research',
      'Hypothalamic peptide signaling',
    ],
    references: [
      {
        title: 'Selective facilitation of sexual solicitation in the female rat by a melanocortin receptor agonist',
        authors: 'Pfaus JG, Shadiack A, Van Soest T, et al.',
        journal: 'Proceedings of the National Academy of Sciences USA',
        year: 2004,
        pubmedId: '15310842',
        url: 'https://pubmed.ncbi.nlm.nih.gov/15310842/',
        verify: true,
      },
      {
        title: 'An effect on the subjective sexual response in premenopausal women with sexual arousal disorder by bremelanotide (PT-141), a melanocortin receptor agonist',
        authors: 'Diamond LE, Earle DC, Heiman JR, et al.',
        journal: 'Journal of Sexual Medicine',
        year: 2006,
        pubmedId: '16839320',
        url: 'https://pubmed.ncbi.nlm.nih.gov/16839320/',
        verify: true,
      },
      {
        title: 'Bremelanotide for the Treatment of Hypoactive Sexual Desire Disorder: Two Randomized Phase 3 Trials',
        authors: 'Kingsberg SA, Clayton AH, Portman D, et al.',
        journal: 'Obstetrics and Gynecology',
        year: 2019,
        pubmedId: '31599840',
        url: 'https://pubmed.ncbi.nlm.nih.gov/31599840/',
        verify: true,
      },
    ],
  },

  // ─── Melanotan II ──────────────────────────────────────────────────
  'melanotan-ii': {
    compoundClass: 'Cyclic lactam α-MSH analog — non-selective melanocortin receptor agonist',
    discovery:
      'Developed at the University of Arizona by Mac Hadley, Victor Hruby, and colleagues in the late 1980s as a superpotent cyclic analog of α-melanocyte stimulating hormone with extended stability and bioavailability.',
    description: [
      'Melanotan II (MT-II) is a synthetic cyclic lactam heptapeptide derived from α-MSH. The cyclization (between Asp5 and Lys10) plus the substitution of D-Phe at position 7 produced a "superpotent" non-selective melanocortin receptor agonist that became a frequent reference compound in melanocortin pharmacology research.',
      'MT-II binds with high affinity at MC1R, MC3R, MC4R, and MC5R. The receptor-promiscuous profile contrasts with the more MC3R/MC4R-preferential PT-141 (which was, in fact, developed as a metabolite of MT-II).',
    ],
    mechanism:
      'Pan-melanocortin receptor agonist. MC1R activation drives melanogenesis in dermal melanocyte research. MC3R and MC4R activation in hypothalamic populations modulates appetite, energy expenditure, and sexual response in preclinical models.',
    halfLife: '~1 hr (preclinical and early-clinical reports).',
    solubility: 'Reconstitutes in bacteriostatic water.',
    researchApplications: [
      'Melanogenesis research',
      'Melanocortin receptor pharmacology',
      'Comparative MC-receptor selectivity studies',
      'Appetite-regulation preclinical models',
    ],
    references: [
      {
        title: 'Evaluation of melanotan-II, a superpotent cyclic melanotropic peptide in a pilot phase-I clinical study',
        authors: 'Dorr RT, Lines R, Levine N, et al.',
        journal: 'Life Sciences',
        year: 1996,
        pubmedId: '8637402',
        url: 'https://pubmed.ncbi.nlm.nih.gov/8637402/',
        verify: true,
      },
      {
        title: 'Melanocortin peptide therapeutics: historical milestones, clinical studies and commercialization',
        authors: 'Hadley ME, Dorr RT',
        journal: 'Peptides',
        year: 2006,
        pubmedId: '16412534',
        url: 'https://pubmed.ncbi.nlm.nih.gov/16412534/',
        verify: true,
      },
      {
        title: 'Discovery that a melanocortin regulates sexual functions in male and female humans',
        authors: 'Hadley ME',
        journal: 'Peptides',
        year: 2005,
        pubmedId: '16039741',
        url: 'https://pubmed.ncbi.nlm.nih.gov/16039741/',
        verify: true,
      },
    ],
  },

  // KLOW (multi-pathway blend): no per-blend research data — the
  // individual components (BPC-157, KPV, GHK-Cu, TB-500 in some
  // formulations) carry their own literature, but the blend itself is
  // a Merit-specific co-formulation without a separate published record.
  // PDP falls back to the "Research data verification in progress" panel.
};

export function getResearchData(handle: string): ResearchData | null {
  return RESEARCH_DATA[handle] ?? null;
}
