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
  relatedSlugs?: string[]; // trial deep-dives / evidence summaries
  /** Completes "<Name> is …" in the PDP answer-first summary: what the
   *  compound is and the research context, in neutral terms. No effect,
   *  dosing or human-use language. */
  definition: string;
  /** "What does the published research show?": at most two sentences, every
   *  finding attributed to a named study with its model. */
  researchSummary: string;
  /** Shorter noun phrase for the PDP meta description, when the first clause
   *  of `definition` is too long to fit 160 characters. */
  metaDefinition?: string;
  /** Last material edit to this monograph, when later than the shared
   *  template date (MONOGRAPH_UPDATED). */
  updated?: string;
};

/** Date of the last change to the monograph template that altered every
 *  monograph page (FDA-status and batch-testing FAQs, product sizes,
 *  certificate and Assay links). Pages render it as "Updated" and emit it as
 *  dateModified. */
export const MONOGRAPH_UPDATED = '2026-10-22';

// ── The 28 compounds. ─────────────────────────────────────────────────────
export const COMPOUND_META: CompoundMeta[] = [
  {
    // RT3 and TZ2 are named by product code only, everywhere on the site:
    // no generic name, development code or brand name (Parker, 2026-10-05).
    key: 'tz2', slug: 'tz2', title: 'TZ2',
    aka: ['GIP/GLP-1 receptor agonist', 'dual incretin agonist'],
    tagline: 'The dual GIP/GLP-1 receptor agonist studied in the SURMOUNT and SURPASS programs.',
    definition: 'a synthetic dual GIP and GLP-1 receptor agonist peptide, studied in large randomized research programs on body weight and glycemic control in adults with obesity or type 2 diabetes.',
    researchSummary:
      "In SURMOUNT-1 (NEJM 2022), a 72-week randomized trial in 2,539 adults with obesity, the top treatment arm reported a mean body-weight change of about minus 20.9% versus about minus 3.1% on placebo. In SURPASS-2 (NEJM 2021), all three treatment arms lowered HbA1c more than semaglutide 1 mg in adults with type 2 diabetes.",
    product: { handle: 'tz2-10mg', fromPrice: 75, purity: '≥99%', vialSize: '10 mg' },
    relatedSlugs: ['surmount-1-tz2-obesity-research', 'surpass-2-tz2-vs-semaglutide'],
  },
  {
    key: 'rt3', slug: 'rt3', title: 'RT3',
    aka: ['triple agonist', 'GIP/GLP-1/glucagon agonist'],
    tagline: 'The first triple GIP/GLP-1/glucagon receptor agonist to clear Phase 2 trials.',
    definition: 'a synthetic triple GIP, GLP-1 and glucagon receptor agonist peptide, studied in phase 2 and phase 3 research trials of body weight, glycemic control and liver fat in adults with obesity or type 2 diabetes.',
    researchSummary:
      "In a 48-week phase 2 trial in 338 adults with obesity (NEJM 2023), the top treatment arm reported a mean body-weight change of about minus 24.2% versus about minus 2.1% on placebo. A separate phase 2 trial in adults with type 2 diabetes (Lancet 2023) reported lower HbA1c and body weight than placebo.",
    product: { handle: 'rt3-10mg', fromPrice: 100, purity: '≥99%', vialSize: '10 mg' },
    relatedSlugs: ['rt3-triple-1-research-summary'],
  },
  {
    key: 'semaglutide', slug: 'semaglutide', title: 'Semaglutide',
    aka: ['GLP-1 receptor agonist'],
    tagline: 'The acylated GLP-1 receptor agonist benchmarked against TZ2 in SURPASS-2.',
    definition: 'an acylated GLP-1 receptor agonist peptide, one of the most extensively studied incretin analogs in metabolic research.',
    researchSummary:
      "The STEP 1 trial (Wilding, NEJM 2021) reported a mean body-weight change of minus 14.9% versus minus 2.4% on placebo over 68 weeks in 1,961 adults with overweight or obesity. Reviews of the class (Nauck, Molecular Metabolism 2021) summarize its glycemic results in type 2 diabetes trials.",
    product: { handle: 'semaglutide-10mg', fromPrice: 65, purity: '≥99%', vialSize: '10 mg' },
    relatedSlugs: ['surpass-2-tz2-vs-semaglutide'],
  },
  {
    key: 'th9507', slug: 'tesamorelin', title: 'Tesamorelin',
    aka: ['TH9507', 'stabilized GHRH analog'],
    tagline: 'A stabilized growth-hormone-releasing-hormone analog studied for visceral adiposity.',
    definition: 'a stabilized analog of growth-hormone-releasing hormone (GHRH), studied in research on visceral adipose tissue.',
    researchSummary:
      "In a 26-week randomized trial in 412 adults with HIV and abdominal fat accumulation (Falutz, NEJM 2007), tesamorelin reduced CT-measured visceral adipose tissue by about 15% while placebo did not. A later randomized trial (Stanley, Lancet HIV 2019) studied liver fat in HIV-associated non-alcoholic fatty liver disease.",
    product: { handle: 'th9507', fromPrice: 87, purity: '≥99%', vialSize: '10 mg' },
  },
  {
    key: 'bpc-157-tb-500', slug: 'bpc-157-tb-500', title: 'BPC-157 + TB-500 (Wolverine)',
    aka: ['Wolverine blend', 'BPC-157', 'TB-500', 'Thymosin Beta-4 fragment'],
    tagline: 'A co-formulation of two repair-pathway peptides in a single lyophilized vial.',
    metaDefinition: 'a two-peptide blend of BPC-157 and TB-500 in one vial',
    definition: 'a co-formulation of BPC-157, a gastric pentadecapeptide, and TB-500, a thymosin beta-4 fragment, studied mainly in rodent tissue-repair models.',
    researchSummary:
      "No study of the combination has been published; the literature belongs to each component. BPC-157's record is mostly rat repair studies from the Sikiric group (Current Pharmaceutical Design 2014), and thymosin beta-4's repair biology is reviewed by Goldstein (Expert Opinion on Biological Therapy 2012).",
    product: { handle: 'bpc-10mg-tb-10mg-wolverine-20mg', fromPrice: 100, purity: '≥99%', vialSize: '20 mg' },
    relatedSlugs: ['bpc-157-preclinical-evidence'],
  },
  {
    key: 'thymosin-alpha-1', slug: 'thymosin-alpha-1', title: 'Thymosin Alpha-1',
    aka: ['Tα1', 'Zadaxin', 'thymalfasin'],
    tagline: 'A 28-amino-acid immunomodulatory peptide approved abroad as Zadaxin.',
    definition: 'a 28-amino-acid thymic peptide studied for immune modulation, with a clinical trial record from outside the United States.',
    researchSummary:
      "Reviews by Goldstein (Expert Opinion on Biological Therapy 2009) and Garaci (Annals of the New York Academy of Sciences 2007) summarize clinical studies of thymalfasin, mainly in chronic viral hepatitis and as an immune adjuvant. Most of that clinical record comes from trials run outside the United States.",
    product: { handle: 'thymosin-alpha-1', fromPrice: 132, purity: '≥99%', vialSize: '10 mg' },
  },
  {
    key: 'aod-9604', slug: 'aod-9604', title: 'AOD-9604',
    aka: ['GH fragment 176-191', 'lipolytic fragment'],
    tagline: 'A modified fragment of growth hormone studied for lipolytic activity.',
    definition: 'a modified fragment of human growth hormone (residues 176 to 191), studied for lipolytic activity in obese mouse models and in early human trials that did not lead to approval.',
    researchSummary:
      "In obese mice, chronic AOD-9604 treatment increased fat oxidation and reduced body-weight gain (Heffernan, Endocrinology 2001 and International Journal of Obesity 2001). The compound later entered human obesity trials but was never approved as a therapeutic.",
    product: { handle: 'aod-9604', fromPrice: 86, purity: '≥99%', vialSize: '5 mg' },
  },
  {
    key: 'igf-1-lr3', slug: 'igf-1-lr3', title: 'IGF-1 LR3',
    aka: ['Long R3 IGF-1', 'insulin-like growth factor 1 LR3'],
    tagline: 'A long-acting analog of insulin-like growth factor 1 used in cell-culture research.',
    definition: 'a long-acting analog of insulin-like growth factor 1, used mainly in cell-culture and growth-signaling research.',
    researchSummary:
      "Francis (Journal of Molecular Endocrinology 1992) used IGF-I analogs to study receptor binding in adipocytes, and Tomas (Biochemical Journal 1992) reported that IGF-I variants were anabolic in dexamethasone-treated rats. Its main use today is as a cell-culture reagent.",
    product: { handle: 'igf-1-lr3', fromPrice: 92, purity: '≥99%', vialSize: '1 mg' },
  },
  {
    key: 'sermorelin', slug: 'sermorelin', title: 'Sermorelin',
    aka: ['GHRH(1-29)', 'sermorelin acetate'],
    tagline: 'The 29-amino-acid active fragment of growth-hormone-releasing hormone.',
    definition: 'the 29-amino-acid active fragment of growth-hormone-releasing hormone, studied in growth hormone axis research.',
    researchSummary:
      "Prakash (BioDrugs 1999) and Walker (Clinical Interventions in Aging 2006) review its pharmacology as a GHRH(1-29) analog that stimulates pituitary growth hormone release. Khorram (Journal of Clinical Endocrinology and Metabolism 1997) studied GHRH(1-29) in older adults.",
    product: { handle: 'sermorelin', fromPrice: 69, purity: '≥99%', vialSize: '10 mg' },
  },
  {
    key: 'nad-500mg', slug: 'nad', title: 'NAD+',
    aka: ['nicotinamide adenine dinucleotide', 'NAD'],
    tagline: 'The central redox coenzyme studied across cellular-energy and aging models.',
    definition: 'nicotinamide adenine dinucleotide, the redox coenzyme present in every living cell and a substrate for sirtuins and PARPs, studied in cellular energy metabolism and aging research, mostly in animal models.',
    researchSummary:
      "Reviews by Imai (Trends in Cell Biology 2014) and Verdin (Science 2015) describe NAD+ decline with age in animal models and its role as a substrate for sirtuins and PARPs. Rajman (Cell Metabolism 2018) reviews the in vivo evidence for NAD-boosting molecules, most of it from rodents.",
    product: { handle: 'nad-500mg', fromPrice: 85, purity: '≥99%', vialSize: '500 mg' },
    relatedSlugs: ['nad-cellular-aging-research'],
  },
  {
    key: 'ghk-cu', slug: 'ghk-cu', title: 'GHK-Cu',
    aka: ['copper tripeptide-1', 'copper peptide', 'GHK'],
    tagline: 'A copper-binding tripeptide studied for skin remodeling and repair signaling.',
    definition: 'a copper-binding tripeptide (glycyl-histidyl-lysine) first isolated from human plasma, studied mainly in cell culture and animal wound models of skin remodeling, collagen synthesis and tissue repair signaling.',
    researchSummary:
      "Most of the record comes from cell culture and wound models, much of it from Pickart's group, which reports effects on gene expression and tissue remodeling (International Journal of Molecular Sciences 2018). Pickart (BioMed Research International 2015) reviews the skin regeneration pathways studied.",
    product: { handle: 'ghk-cu', fromPrice: 86, purity: '≥99%', vialSize: '100 mg' },
  },
  {
    key: 'mots-c', slug: 'mots-c', title: 'MOTS-c',
    aka: ['mitochondrial-derived peptide', 'mitochondrial ORF of the 12S rRNA-c'],
    tagline: 'A mitochondrial-derived peptide studied in metabolic-regulation models.',
    definition: 'a 16-amino-acid peptide encoded in mitochondrial DNA, studied in cell and mouse models of metabolic regulation.',
    researchSummary:
      "Lee and colleagues (Cell Metabolism 2015) reported that MOTS-c treatment prevented diet-induced obesity and insulin resistance in mice. Reynolds (Nature Communications 2021) reported that exercise induces it and that treatment improved physical performance in aged mice.",
    product: { handle: 'mots-c', fromPrice: 138, purity: '≥99%', vialSize: '40 mg' },
  },
  {
    key: 'epitalon', slug: 'epitalon', title: 'Epitalon',
    aka: ['Epithalon', 'AEDG peptide'],
    tagline: 'A synthetic tetrapeptide investigated for telomerase and circadian signaling.',
    metaDefinition: 'a synthetic tetrapeptide (Ala-Glu-Asp-Gly) studied for telomerase activity',
    definition: 'a synthetic tetrapeptide (Ala-Glu-Asp-Gly) studied for telomerase and circadian signaling, mostly in cell and animal models.',
    researchSummary:
      "Khavinson (Bulletin of Experimental Biology and Medicine 2003) reported telomerase induction and telomere elongation in cultured human somatic cells, and Anisimov (Biogerontology 2003) reported effects on lifespan and tumor incidence in female mice. Much of the literature comes from the same St. Petersburg research group.",
    product: { handle: 'epitalon', fromPrice: 115, purity: '≥99%', vialSize: '50 mg' },
  },
  {
    key: 'selank', slug: 'selank', title: 'Selank',
    aka: ['TP-7', 'tuftsin analog'],
    tagline: 'A synthetic heptapeptide analog of tuftsin studied in anxiolytic models.',
    definition: 'a synthetic heptapeptide analog of tuftsin, an immune-active tetrapeptide, developed in Russia and studied mainly in rodent research on anxiety-related behavior, gene expression and immune signaling.',
    researchSummary:
      "Russian research groups have studied it mainly in rodents, reporting changes in the expression of inflammation-related genes (Kolomin, Molecular Immunology 2013) and GABAergic genes (Volkova, Frontiers in Pharmacology 2016).",
    product: { handle: 'selank', fromPrice: 56, purity: '≥99%', vialSize: '10 mg' },
  },
  {
    key: 'semax', slug: 'semax', title: 'Semax',
    aka: ['ACTH(4-10) analog', 'Met-Glu-His-Phe-Pro-Gly-Pro'],
    tagline: 'A synthetic ACTH(4-10) analog studied in neuroprotection and BDNF models.',
    definition: 'a synthetic analog of the ACTH(4-10) fragment, studied in neuroprotection and BDNF research models.',
    researchSummary:
      "Rat studies report that semax binds in the basal forebrain and raises BDNF protein there (Dolotov, Journal of Neurochemistry 2006) and induces neurotrophin mRNA in glial cultures (Shadrina, Neuroscience Letters 2001). Most of the literature comes from Russian research groups.",
    product: { handle: 'semax-30mg', fromPrice: 111, purity: '≥99%', vialSize: '30 mg' },
  },
  {
    key: 'pt-141', slug: 'pt-141', title: 'PT-141',
    aka: ['Bremelanotide', 'melanocortin agonist'],
    tagline: 'A cyclic heptapeptide melanocortin-receptor agonist (bremelanotide).',
    definition: 'bremelanotide, a cyclic heptapeptide melanocortin receptor agonist studied in melanocortin pathway research.',
    researchSummary:
      "Pfaus (PNAS 2004) reported increased sexual solicitation in female rats given the compound. Two randomized phase 3 trials of bremelanotide in premenopausal women with hypoactive sexual desire disorder were published by Kingsberg (Obstetrics and Gynecology 2019).",
    product: { handle: 'pt-141', fromPrice: 65, purity: '≥99%', vialSize: '10 mg' },
  },
  {
    key: 'melanotan-ii', slug: 'melanotan-ii', title: 'Melanotan II',
    aka: ['MT-II', 'α-MSH analog'],
    tagline: 'A synthetic analog of α-melanocyte-stimulating hormone studied for melanogenesis.',
    definition: 'a synthetic cyclic analog of alpha-melanocyte-stimulating hormone that binds several melanocortin receptors (MC1R, MC3R, MC4R and MC5R), studied in pigmentation and melanocortin pathway research since the 1990s.',
    researchSummary:
      "A small pilot phase 1 study (Dorr, Life Sciences 1996) reported increased skin pigmentation in volunteers. Hadley (Peptides 2005 and 2006) reviews its melanocortin receptor pharmacology and how its effects on sexual function were discovered.",
    product: { handle: 'melanotan-ii', fromPrice: 58, purity: '≥99%', vialSize: '10 mg' },
  },
  {
    key: '5-amino-1mq', slug: '5-amino-1mq', title: '5-Amino-1MQ',
    aka: ['NNMT inhibitor', '5-amino-1-methylquinolinium'],
    tagline: 'A small-molecule NNMT inhibitor studied in metabolic and adipocyte models.',
    definition: 'a small-molecule inhibitor of nicotinamide N-methyltransferase (NNMT), an enzyme linking NAD+ salvage and methylation, studied in cell and mouse models of obesity and adipocyte metabolism. It is not a peptide.',
    researchSummary:
      "Neelakantan (Biochemical Pharmacology 2018) reported that selective NNMT inhibitors, including 5-amino-1MQ, reduced body weight and white adipose mass in mice with diet-induced obesity. No human trial has been published.",
    product: { handle: '5-amino-1mq-50mg', fromPrice: 65, purity: '≥99%', vialSize: '50 mg' },
  },
  {
    key: 'glow', slug: 'glow-blend', title: 'GLOW Blend (BPC-157 · GHK-Cu · TB-500)',
    aka: ['GLOW', 'skin blend'],
    tagline: 'A three-peptide repair + skin-signaling co-formulation in one vial.',
    definition: 'a co-formulation of BPC-157, GHK-Cu and TB-500 in one vial; each component is studied separately in repair and skin research.',
    researchSummary:
      "GLOW has no published literature of its own; the research belongs to each component. The BPC-157, GHK-Cu and TB-500 monographs set out what each record shows and in which models.",
    product: { handle: 'bpc157-ghk-cu-50-tb500-glow-70mg', fromPrice: 145, purity: '≥99%', vialSize: '70 mg' },
  },
  {
    key: 'klow', slug: 'klow-blend', title: 'KLOW Blend (BPC-157 · GHK-Cu · TB-500 · KPV)',
    aka: ['KLOW', 'four-peptide blend'],
    tagline: 'A four-peptide repair blend adding the KPV tripeptide to the GLOW base.',
    metaDefinition: 'a four-peptide blend of BPC-157, GHK-Cu, TB-500 and KPV',
    definition: 'a co-formulation of BPC-157, GHK-Cu, TB-500 and KPV in one vial; each component is studied separately in repair and inflammation research.',
    researchSummary:
      "KLOW has no published literature of its own; the research belongs to each component. The BPC-157, GHK-Cu, TB-500 and KPV monographs set out what each record shows and in which models.",
    product: { handle: 'bpc157-ghk-cu-50-tb500-kpv-klow-80mg', fromPrice: 175, purity: '≥99%', vialSize: '80 mg' },
  },
  {
    key: 'bpc-157', slug: 'bpc-157', title: 'BPC-157',
    aka: ['PL 14736', 'Body Protection Compound 157', 'stable gastric pentadecapeptide'],
    tagline: 'A synthetic pentadecapeptide from human gastric juice, studied almost entirely in rodent repair models.',
    definition: 'a synthetic 15-amino-acid peptide derived from a human gastric protein, studied almost entirely in rodent repair models.',
    researchSummary:
      "The record is overwhelmingly preclinical, mostly rat studies from the Sikiric and Seiwerth group reporting repair endpoints in tendon, muscle and gut models (Seiwerth, Current Pharmaceutical Design 2018). No completed randomized human trial has been published.",
    product: { handle: 'bpc-157-10mg', fromPrice: 61, purity: '≥99%', vialSize: '10 mg' },
    relatedSlugs: ['bpc-157-preclinical-evidence', 'bpc-157-tb-500', 'why-research-compounds-are-blended'],
  },
  {
    key: 'tb-500', slug: 'tb-500', title: 'TB-500',
    aka: ['thymosin beta-4 fragment', 'Tβ4 actin-binding domain', 'Thymosin β4'],
    tagline: 'A synthetic fragment of the actin-sequestering protein thymosin beta-4, which is not the same molecule.',
    definition: 'a synthetic fragment of the actin-binding protein thymosin beta-4, studied in tissue repair research.',
    researchSummary:
      "Bock-Marquette (Nature 2004) reported that thymosin beta-4 promoted cardiac cell migration, survival and repair in mice. That work studied the full 43-amino-acid protein; TB-500 is a fragment and does not inherit its literature.",
    product: { handle: 'bpc-10mg-tb-10mg-wolverine-20mg', fromPrice: 100, purity: '≥99%', vialSize: '20 mg' },
    relatedSlugs: ['bpc-157-tb-500', 'klow-blend', 'glow-blend'],
  },
  {
    key: 'cjc-1295', slug: 'cjc-1295', title: 'CJC-1295',
    aka: ['modified GRF (1-29)', 'CJC-1295 without DAC', 'GHRH analog', 'DAC:GRF'],
    tagline: 'A GHRH(1-29) analog supplied in two forms whose durations are not comparable.',
    definition: 'a modified analog of GHRH(1-29) studied in growth hormone axis research; this vial pairs it, without DAC, with the secretagogue ipamorelin.',
    researchSummary:
      "Teichman (Journal of Clinical Endocrinology and Metabolism 2006) reported sustained increases in growth hormone and IGF-1 in healthy adults in two placebo-controlled trials of the DAC form. The form without DAC has a much shorter duration, so those results do not transfer to it.",
    product: { handle: 'cjc-1295-w-o-dac-10-ipa-10-20mg', fromPrice: 80, purity: '≥99%', vialSize: '20 mg' },
    relatedSlugs: ['growth-hormone-secretagogue-class-overview', 'sermorelin'],
  },
  {
    key: 'ipamorelin', slug: 'ipamorelin', title: 'Ipamorelin',
    aka: ['GHS-R1a agonist', 'selective growth hormone secretagogue'],
    tagline: 'The pentapeptide secretagogue reported to raise growth hormone without a matching cortisol rise.',
    definition: 'a selective pentapeptide growth hormone secretagogue acting at the ghrelin receptor, studied in pituitary research.',
    researchSummary:
      "Raun (European Journal of Endocrinology 1998) reported that ipamorelin released growth hormone in animal models without significantly raising ACTH or cortisol. Controlled human data are limited.",
    // No product: the standalone ipamorelin SKU is not active (2026-10-22).
    relatedSlugs: ['growth-hormone-secretagogue-class-overview', 'cjc-1295'],
  },
  {
    key: 'kisspeptin-10', slug: 'kisspeptin-10', title: 'Kisspeptin-10',
    aka: ['KP-10', 'metastin 45-54', 'KISS1R agonist', 'GPR54 agonist'],
    tagline: 'The decapeptide fragment of metastin that sits one step upstream of the GnRH pulse generator.',
    definition: 'the 10-amino-acid active fragment of kisspeptin, studied as an upstream regulator of the reproductive hormone axis.',
    researchSummary:
      "Jayasena (Journal of Clinical Endocrinology and Metabolism 2011) reported that kisspeptin-10 stimulated gonadotropin release in healthy men and in women in the preovulatory phase, but not in the follicular phase. Genetic studies (de Roux, PNAS 2003; Seminara, NEJM 2003) placed its receptor upstream of the GnRH neuron.",
    product: { handle: 'kisspeptin-10mg', fromPrice: 70, purity: '≥99%', vialSize: '10 mg' },
  },
  // Added 2026-10-22. References verified against PubMed (see research-data).
  {
    key: 'dsip', slug: 'dsip', title: 'DSIP',
    aka: ['delta sleep-inducing peptide', 'emideltide'],
    tagline: 'A nonapeptide isolated from rabbits in 1977 whose gene and receptor have never been identified.',
    metaDefinition: 'delta sleep-inducing peptide, a nonapeptide first isolated in 1977',
    definition: 'delta sleep-inducing peptide, a nine-amino-acid peptide first isolated from rabbits in 1977 and studied in sleep and EEG research.',
    researchSummary:
      "Schoenenberger and Monnier (PNAS 1977) reported that synthetic DSIP enhanced delta and spindle EEG patterns when infused into the brain ventricles of rabbits. A double-blind study in 16 adults with chronic insomnia (Neuropsychobiology 1992) reported weak effects that its authors judged unlikely to be of major benefit.",
    product: { handle: 'dsip-5mg', fromPrice: 39.99, purity: '≥99%', vialSize: '5 mg' },
  },
  {
    key: 'kpv', slug: 'kpv', title: 'KPV',
    aka: ['Lys-Pro-Val', 'alpha-MSH (11-13)', 'melanocortin-derived tripeptide'],
    tagline: 'The C-terminal tripeptide of alpha-MSH, studied in cell and mouse models of intestinal inflammation.',
    definition: 'the tripeptide Lys-Pro-Val from the end of alpha-melanocyte-stimulating hormone, studied in cell and mouse models of intestinal inflammation.',
    researchSummary:
      "Dalmasso and colleagues (Gastroenterology 2008) reported that KPV entered intestinal cells through the PepT1 transporter and reduced inflammation in cell lines and in two mouse colitis models. No randomized human trial of KPV has been published.",
    // No standalone KPV product: it ships as a component of KLOW
    // (HANDLES_BY_SLUG lists the blend).
  },
  {
    key: 'slu-pp-332', slug: 'slu-pp-332', title: 'SLU-PP-332',
    aka: ['pan-ERR agonist', 'ERRα/β/γ agonist', 'estrogen-related receptor agonist'],
    tagline: 'A synthetic estrogen-related receptor agonist studied in mice as a candidate exercise mimetic.',
    definition: 'a synthetic small-molecule agonist of the estrogen-related receptors, which regulate mitochondrial and oxidative-metabolism genes, studied in mice and cells as a candidate exercise mimetic. No human trial has been published.',
    researchSummary:
      "Billon and colleagues (ACS Chemical Biology 2023) reported more oxidative muscle fibers and longer treadmill endurance in mice given SLU-PP-332, and follow-up mouse studies reported metabolic and cardiac effects (JPET 2024; Circulation 2024). No human trial has been published.",
    product: { handle: 'slu-pp-332-injectable-5mg', fromPrice: 70.86, purity: '≥99%', vialSize: '5 mg' },
    relatedSlugs: ['err-agonists-and-exercise-mimetic-research'],
  },
];

// ── Hand-written depth for the flagship compounds (grounded, RUO-framed). ──
// Everything else falls back to auto-generated FAQs (see autoFaqs). Add entries
// here to deepen a page; keyFindings power the "What the research shows" block.
export const MONOGRAPH_EXTRAS: Record<string, { keyFindings?: string[]; faqs?: Faq[] }> = {
  tz2: {
    keyFindings: [
      'In SURMOUNT-1 (NEJM 2022), a 72-week randomized trial in 2,539 adults with obesity, participants in the highest-dose arm saw a mean body-weight reduction of roughly 20.9% from baseline versus about 3.1% on placebo, the largest effect reported for an incretin agent at the time of publication.',
      'In SURPASS-2 (NEJM 2021), TZ2 was compared head-to-head against semaglutide 1 mg in type-2-diabetes research; all three TZ2 doses produced greater reductions in HbA1c and body weight than semaglutide in the study population.',
      'The dual mechanism, simultaneous agonism at the GIP and GLP-1 receptors, is the design feature most cited in the literature as the basis for its effect size relative to single-incretin GLP-1 agonists.',
      'Gastrointestinal effects (nausea, diarrhea) were the most frequently reported adverse events across the trial program, generally mild to moderate and most common during dose escalation.',
    ],
    faqs: [
      { q: 'What is TZ2?', a: 'TZ2 is a synthetic dual agonist that activates both the GIP and GLP-1 receptors. It is the compound studied in the SURMOUNT (obesity) and SURPASS (type-2-diabetes) clinical-trial programs. Merit supplies it as a lyophilized research compound for research use only, not for human or veterinary use.' },
      { q: 'How does TZ2 work?', a: 'It is a "dual incretin": a single peptide engineered to activate two gut-hormone receptors at once (GIP and GLP-1). Published trials attribute its effect size relative to single-receptor GLP-1 agonists to this combined mechanism. Mechanistic descriptions here summarize published findings and are not clinical claims.' },
      { q: 'What did the TZ2 trials show?', a: 'In SURMOUNT-1, the highest-dose arm showed a mean body-weight reduction of about 20.9% over 72 weeks versus about 3.1% on placebo. In SURPASS-2, it produced greater HbA1c and weight reductions than semaglutide 1 mg. See the linked SURMOUNT-1 and SURPASS-2 summaries for trial design and full outcomes.' },
      { q: 'Is Merit TZ2 for human use?', a: 'No. It is sold strictly for research use only: not for human or veterinary use, and not for diagnostic or therapeutic use. Every batch is tested before it is listed, and its certificate of analysis documenting ≥99% HPLC purity is published in the COA library.' },
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
    a: `${lead} Merit supplies it as a lyophilized research compound for research use only, not for human or veterinary use.`,
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
  // NOTE: no "how is it reconstituted" FAQ. Preparation procedures are not
  // published (see lib/library.ts) — and this text feeds FAQPage JSON-LD, so
  // anything here is a public claim Google and AI engines read directly.
  faqs.push({
    q: `Is Merit ${m.title} for human use?`,
    a: `No. It is sold strictly for research use only: not for human or veterinary use, and not for diagnostic or therapeutic use.`,
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

/**
 * Every product handle (any size, any status) whose compound a monograph
 * covers. The PDP uses it to find its monograph; the monograph filters it
 * to ACTIVE products at render time to list every size on sale. Blends are
 * listed under their own blend monograph, and under a single-compound
 * monograph only where no standalone product exists (TB-500, KPV).
 * Handles not listed fall back to the monograph's own `product.handle`.
 */
const HANDLES_BY_SLUG: Record<string, string[]> = {
  tz2: ['tz2-10mg', 'tz2', 'tz2-60mg', 'tz2-100mg'],
  rt3: ['rt3-10mg', 'rt3-20mg', 'rt3', 'rt3-60mg'],
  semaglutide: ['semaglutide-5mg', 'semaglutide-10mg', 'semaglutide-20mg'],
  tesamorelin: ['th9507', 'tesamorelin-20mg'],
  'bpc-157-tb-500': ['bpc-10mg-tb-10mg-wolverine-20mg', 'bpc-157-tb-500'],
  'thymosin-alpha-1': ['thymosin-alpha-1'],
  'aod-9604': ['aod-9604', 'aod-9604-10mg'],
  'igf-1-lr3': ['igf-1-lr3'],
  sermorelin: ['sermorelin'],
  nad: ['nad-500mg'],
  'ghk-cu': ['ghk-cu'],
  'mots-c': ['mots-c'],
  epitalon: ['epitalon-20mg', 'epitalon'],
  selank: ['selank', 'selank-amidate-30mg'],
  semax: ['semax', 'semax-30mg'],
  'pt-141': ['pt-141'],
  'melanotan-ii': ['melanotan-ii'],
  '5-amino-1mq': ['5-amino-1mq-50mg'],
  'glow-blend': ['bpc157-ghk-cu-50-tb500-glow-70mg'],
  'klow-blend': ['bpc157-ghk-cu-50-tb500-kpv-klow-80mg', 'klow'],
  'bpc-157': ['bpc-157-10mg'],
  'tb-500': ['bpc-10mg-tb-10mg-wolverine-20mg'],
  'cjc-1295': [
    'cjc-1295-w-o-dac-10-ipa-10-20mg',
    'cjc-1295-w-o-dac-5-ipa-5-10mg',
    'cjc-1295-without-dac-5mg',
    'cjc-1295-without-dac-10mg',
    'cjc-1295-with-dac-5mg',
  ],
  ipamorelin: ['ipamorelin-10mg'],
  'kisspeptin-10': ['kisspeptin-10mg'],
  dsip: ['dsip-5mg'],
  kpv: ['bpc157-ghk-cu-50-tb500-kpv-klow-80mg'],
  'slu-pp-332': ['slu-pp-332-injectable-5mg'],
};

/** Product handles for a monograph, in display order. */
export function handlesForMonograph(slug: string): string[] {
  const m = BY_SLUG.get(slug);
  const list = HANDLES_BY_SLUG[slug] ?? [];
  const own = m?.product?.handle;
  return own && !list.includes(own) ? [own, ...list] : list;
}

/**
 * Reverse lookup: product handle to its monograph. Added 2026-10-02 because
 * the PDP had no link to its own monograph while the monograph linked to the
 * PDP. Since 2026-10-22 it covers every size (it used to map one handle per
 * compound, so TZ2 30 mg, RT3 30 mg, Semaglutide 20 mg and Tesamorelin 20 mg
 * had no monograph link). The first monograph to claim a handle wins, so a
 * blend maps to its blend monograph rather than to a component's.
 */
const MONOGRAPH_BY_HANDLE: Record<string, Monograph> = {};
for (const m of MONOGRAPHS) {
  for (const h of handlesForMonograph(m.slug)) {
    if (!MONOGRAPH_BY_HANDLE[h]) MONOGRAPH_BY_HANDLE[h] = m;
  }
}

export function getMonographForHandle(handle: string): Monograph | undefined {
  return MONOGRAPH_BY_HANDLE[handle];
}

export function getMonograph(slug: string): Monograph | undefined {
  return BY_SLUG.get(slug);
}
export const MONOGRAPH_SLUGS: string[] = MONOGRAPHS.map((m) => m.slug);
