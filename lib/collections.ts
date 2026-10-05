import 'server-only';

/**
 * Category landing pages at /catalog/<slug>.
 *
 * WHY THESE EXIST. /catalog is one flat grid with one title, one description
 * and a self-referential canonical, so it can rank for exactly one query.
 * A keyword harvest run 2026-10-02 (10,590 autocomplete prefixes, 34,760
 * distinct real queries) found large commercial clusters that /catalog
 * cannot address: "where to buy legit peptides", "nad+ injections cost",
 * "cjc 1295 ipamorelin reviews", "where to buy igf-1 lr3". Each cluster
 * wants a page with its own h1, its own answer and its own canonical.
 *
 * WHY /catalog/<slug> AND NOT /collections/<slug>. next.config.mjs 308s
 * /collections/:slug* to /catalog permanently (a legacy Shopify cleanup),
 * so that namespace is unreachable. /pages/* is burned the same way.
 * /catalog/<slug> is a child of a static segment, so it cannot collide with
 * the affiliate-slug resolver at app/(store)/[slug].
 *
 * COPY RULES BAKED IN HERE. Everything in this file is rendered verbatim.
 *   - No claim that a compound does anything to or for a person. Research
 *     context only, and the RUO line is on every page via the store layout.
 *   - No dosing, reconstitution or administration language, ever.
 *   - "GLP-1" and "NAD+" are on-site safe but NOT ad-safe. No ad may point
 *     at these pages (lib/compound-categories.ts documents the same rule).
 *   - Prices are rendered from the live product rows, never hardcoded.
 */

export type CollectionFaq = { q: string; a: string };

export type Collection = {
  slug: string;
  /** h1 and nav label. */
  name: string;
  /** <title>. The root layout appends " · Merit Sciences". */
  title: string;
  /** Meta description, kept under 155 characters. */
  description: string;
  /** One line under the h1. */
  lede: string;
  /** Body copy. The first paragraph answers the cluster's primary query. */
  intro: string[];
  /** Product handles, in display order. Missing handles are skipped. */
  handles: string[];
  /** /library monograph slugs for the compounds on this page. */
  monographs: string[];
  faqs: CollectionFaq[];
  /** The matching editorial hub on theassay.co, for the outbound read-more. */
  assayTopic?: string;
};

export const COLLECTIONS: Collection[] = [
  {
    slug: 'metabolic',
    name: 'Metabolic research compounds',
    title: 'Metabolic and incretin research compounds, lab-tested',
    description:
      'Incretin and metabolic research compounds from a licensed US facility. Independent lab report published for every batch before it is listed. Ships in 48 hours.',
    lede: 'The incretin class and the metabolic compounds studied alongside it, each batch tested by a laboratory that does not make the material.',
    intro: [
      'Merit supplies compounds in the incretin and metabolic research class for laboratory use. They are sold as research materials, not as medicines, and nothing here is a substitute for a prescription or for medical care. What we can tell you is exactly what is in the vial: every batch goes to an independent laboratory before it is listed, and the report is published in our certificate library.',
      'The class covers the GLP-1 and dual and triple agonists that the published literature has grown around, plus smaller metabolic research compounds. Price is per vial, the same for every buyer, with no account tier and no minimum order.',
    ],
    handles: [
      'rt3-10mg',
      'rt3',
      'tz2',
      'semaglutide-10mg',
      'semaglutide-20mg',
      '5-amino-1mq-50mg',
      'aod-9604',
      'slu-pp-332-injectable-5mg',
    ],
    monographs: ['rt3', 'tz2', 'semaglutide', 'aod-9604', '5-amino-1mq'],
    faqs: [
      {
        q: 'What does Merit supply in this class?',
        a: 'Lyophilized research compounds in the incretin and metabolic class, sold for laboratory research only. They are not medicines, are not FDA approved for any use, and are not supplied for human or veterinary use.',
      },
      {
        q: 'How much do they cost?',
        a: 'The price on each listing is the price. There is no account tier, no minimum order, and no volume gate. Orders over $300 ship free.',
      },
      {
        q: 'Is there a lab report for what I receive?',
        a: 'Yes. Every batch is tested by an independent laboratory before it is listed, and the report is published in the certificate library. The QR code on the label opens that library.',
      },
      {
        q: 'How fast does it ship?',
        a: 'Orders leave San Antonio within 48 hours on business days with a tracking number. US addresses only.',
      },
    ],
    assayTopic: 'metabolic',
  },
  {
    slug: 'repair',
    name: 'Repair and recovery research compounds',
    title: 'Repair and recovery research compounds, tested per batch',
    description:
      'BPC-157, TB-500 and the repair blends, each batch tested by an independent laboratory with the report published before listing. Ships from Texas in 48 hours.',
    lede: 'The body-protection and tissue-repair compounds, single and blended, with the lab report published before the batch goes on sale.',
    intro: [
      'This is the repair and recovery group: BPC-157, TB-500, KPV and the blends built from them. These are research compounds supplied for laboratory use. We make no claim about what any of them does in a person, and we publish no preparation or administration instructions.',
      'What we do publish is the analysis. Each batch is sent to an independent laboratory before it is listed, and the certificate goes into the public library with the identity and purity result on it. If you want to read one before you buy anything, the library is open with no account and no request form.',
    ],
    handles: [
      'bpc-157-10mg',
      'bpc-10mg-tb-10mg-wolverine-20mg',
      'bpc157-ghk-cu-50-tb500-glow-70mg',
      'bpc157-ghk-cu-50-tb500-kpv-klow-80mg',
    ],
    monographs: ['bpc-157', 'tb-500', 'bpc-157-tb-500', 'glow-blend', 'klow-blend'],
    faqs: [
      {
        q: 'What is the difference between the single compounds and the blends?',
        a: 'A blend is several compounds in one vial at stated amounts. The listing title gives the composition and the total milligrams. Each blend is tested as the blend, and its certificate covers what is actually in that vial.',
      },
      {
        q: 'Are these third-party tested?',
        a: 'Yes. Testing is done by a laboratory that does not make the material and does not sell it. The report is published before the batch is listed.',
      },
      {
        q: 'What arrives?',
        a: 'A sealed vial of lyophilized material. One vial ships the same way a case does, within 48 hours on business days, tracked.',
      },
    ],
    assayTopic: 'repair',
  },
  {
    slug: 'growth-hormone',
    name: 'Growth-hormone axis research compounds',
    title: 'Growth-hormone axis research compounds, independently tested',
    description:
      'CJC-1295, ipamorelin, sermorelin, tesamorelin and IGF-1 LR3 for laboratory research. Independent lab report published per batch. Ships in 48 hours from Texas.',
    lede: 'Secretagogues and the growth-hormone axis compounds, each with a published certificate of analysis.',
    intro: [
      'The growth-hormone axis group covers the secretagogues studied for their effect on endogenous growth-hormone release, plus IGF-1 LR3. Merit supplies them as research compounds for laboratory use only. They are not medicines and are not supplied for human or veterinary use.',
      'Several of these are sold as blends, which is how most of the published work handles them. Every batch, blend or single, is tested by an independent laboratory before it is listed and the certificate is public.',
    ],
    handles: [
      'cjc-1295-w-o-dac-10-ipa-10-20mg',
      'tesamorelin-ipamorelin',
      'sermorelin',
      'th9507',
      'tesamorelin-20mg',
      'igf-1-lr3',
    ],
    monographs: ['cjc-1295', 'ipamorelin', 'sermorelin', 'tesamorelin', 'igf-1-lr3'],
    faqs: [
      {
        q: 'Why are some of these sold as a pair in one vial?',
        a: 'Because the published research commonly studies them together. The listing states the composition and the amount of each component, and the certificate covers the vial as supplied.',
      },
      {
        q: 'Can I see the purity figure before I order?',
        a: 'Yes. The certificate library is public and searchable by compound. Every listed batch has a report in it.',
      },
      {
        q: 'Who can order?',
        a: 'Adults in the United States buying for laboratory research. Licensed practitioners can apply for account pricing through the Practitioner Program.',
      },
    ],
    assayTopic: 'growth-hormone',
  },
  {
    slug: 'longevity',
    name: 'Longevity and cellular research compounds',
    title: 'NAD+, MOTS-c and longevity research compounds, lab-tested',
    description:
      'NAD+, MOTS-c, epitalon and glutathione for laboratory research. Independent certificate of analysis published for every batch. Ships from Texas in 48 hours.',
    lede: 'The cellular and mitochondrial research compounds, priced per vial with the lab report published first.',
    intro: [
      'This group covers the compounds studied in cellular energy, mitochondrial function and biological aging: NAD+, MOTS-c, epitalon and glutathione. They are supplied as research compounds for laboratory use. Merit makes no claim about what any of them does in a person.',
      'Pricing here is per vial and identical for every buyer. NAD+ in particular is often sold by the clinic visit elsewhere; what we sell is the material itself, with its certificate, and nothing about administration.',
    ],
    handles: ['nad-500mg', 'mots-c', 'epitalon', 'glutathione-1500mg'],
    monographs: ['nad', 'mots-c', 'epitalon'],
    faqs: [
      {
        q: 'What does a vial contain?',
        a: 'Lyophilized material at the milligram amount stated on the listing, sealed, with the batch covered by a published certificate of analysis.',
      },
      {
        q: 'Why is the price lower than a clinic?',
        a: 'A clinic price includes a visit and a service. This is the research material on its own, sold at one published price with no account tier.',
      },
      {
        q: 'Is the testing independent?',
        a: 'Yes. The laboratory that runs identity and purity does not make the material and does not sell it, and its report is published before the batch is listed.',
      },
    ],
    assayTopic: 'longevity',
  },
  {
    slug: 'skin',
    name: 'Skin and appearance research compounds',
    title: 'GHK-Cu and skin research compounds, independently tested',
    description:
      'GHK-Cu, the GLOW blend and related research compounds for laboratory use. Independent lab report published per batch. Ships from San Antonio in 48 hours.',
    lede: 'Copper peptides and the appearance-research group, each batch tested before it is listed.',
    intro: [
      'GHK-Cu is the copper peptide most of the published skin literature is built on, and it anchors this group along with the blends that include it. Everything here is supplied as a research compound for laboratory use only, and Merit publishes no claim about cosmetic or physiological effect.',
      'The certificate for each batch states identity and purity as the laboratory measured them. That is the part worth checking, because copper peptides are among the most commonly misrepresented materials in this market.',
    ],
    handles: [
      'ghk-cu',
      'bpc157-ghk-cu-50-tb500-glow-70mg',
      'glutathione-1500mg',
      'melanotan-ii',
    ],
    monographs: ['ghk-cu', 'glow-blend', 'melanotan-ii'],
    faqs: [
      {
        q: 'What is GHK-Cu?',
        a: 'A copper-binding tripeptide that appears throughout the published skin and tissue literature. Merit supplies it as a research compound. See the monograph for the research background and references.',
      },
      {
        q: 'How do I verify what I received?',
        a: 'Scan the QR code on the label or search the compound in the certificate library. The report gives the identity result and the purity figure for the batch.',
      },
      {
        q: 'Is there a minimum order?',
        a: 'No. One vial ships the same way a case does. Orders over $300 ship free.',
      },
    ],
    assayTopic: 'skin',
  },
  {
    slug: 'cognitive',
    name: 'Cognitive and sleep research compounds',
    title: 'Semax, selank and DSIP research compounds, lab-tested',
    description:
      'Semax, selank and DSIP supplied for laboratory research, each batch tested by an independent laboratory with the report published. Ships in 48 hours.',
    lede: 'The neuropeptide research group, with the certificate published before the batch is listed.',
    intro: [
      'Semax, selank and DSIP are the three neuropeptides most asked about in this category. Merit supplies them as research compounds for laboratory use. They are not medicines, they are not approved for any indication, and we publish no claim about mood, sleep or cognition.',
      'Much of the clinical literature behind these compounds was published outside the United States, which is one reason the evidence picture is uneven. Our editorial property covers that honestly. What Merit guarantees is narrower and checkable: the identity and purity of what is in the vial.',
    ],
    handles: ['semax-30mg', 'selank', 'dsip-5mg'],
    monographs: ['semax', 'selank'],
    faqs: [
      {
        q: 'Are these approved for anything?',
        a: 'No. They are research compounds, not approved by the FDA for any indication, supplied for laboratory use only.',
      },
      {
        q: 'What testing is done?',
        a: 'Identity against a reference standard and purity by HPLC, by an independent laboratory, before the batch is listed. The certificate is public.',
      },
    ],
    assayTopic: 'cognitive',
  },
  {
    slug: 'sexual-health',
    name: 'Sexual-health research compounds',
    title: 'PT-141 and kisspeptin research compounds, independently tested',
    description:
      'PT-141 and kisspeptin-10 supplied for laboratory research. Independent certificate of analysis published for every batch. Ships from Texas within 48 hours.',
    lede: 'PT-141 and kisspeptin, supplied as research material with the lab report published first.',
    intro: [
      'PT-141 and kisspeptin-10 are the two compounds this category is built around. Merit supplies both as research compounds for laboratory use only. They are not medicines and we make no claim about what either does in a person.',
      'Both have real published literature behind them, and both are widely counterfeited. The certificate for each batch is the part you can actually check.',
    ],
    handles: ['pt-141', 'kisspeptin-10mg'],
    monographs: ['pt-141', 'kisspeptin-10'],
    faqs: [
      {
        q: 'Is PT-141 the same as bremelanotide?',
        a: 'Bremelanotide is the name used in the published literature for the same compound. The monograph lists the synonyms and the references.',
      },
      {
        q: 'How is purity measured?',
        a: 'By HPLC, reported as the main-peak percentage, by a laboratory independent of the facility that made the batch.',
      },
    ],
    assayTopic: 'sexual-health',
  },
  {
    slug: 'immune',
    name: 'Immune research compounds',
    title: 'Thymosin Alpha-1 research compound, independently tested',
    description:
      'Thymosin Alpha-1 supplied for laboratory research, tested by an independent laboratory with the certificate published before listing. Ships in 48 hours.',
    lede: 'Thymosin Alpha-1, supplied as research material with a published certificate of analysis.',
    intro: [
      'Thymosin Alpha-1 is the compound this category is built around, and it has one of the longer publication histories in the field. Merit supplies it as a research compound for laboratory use only. It is not a medicine and we make no claim about immune function in a person.',
      'As with everything in the catalog, the batch is tested by an independent laboratory before it is listed and the report is published.',
    ],
    handles: ['thymosin-alpha-1'],
    monographs: ['thymosin-alpha-1'],
    faqs: [
      {
        q: 'What is published about Thymosin Alpha-1?',
        a: 'The monograph summarises the research background with peer-reviewed references. Merit does not interpret that literature as a claim about any product.',
      },
      {
        q: 'What does the certificate cover?',
        a: 'Identity against a reference standard and purity by HPLC for the specific batch, as measured by an independent laboratory.',
      },
    ],
    assayTopic: 'immune',
  },
];

export const COLLECTION_SLUGS = COLLECTIONS.map((c) => c.slug);

export function getCollection(slug: string): Collection | null {
  return COLLECTIONS.find((c) => c.slug === slug) ?? null;
}

/** First collection containing this product handle. A handle can appear in
 *  more than one category (glutathione is both longevity and skin); the
 *  authored order above decides which one a PDP links back to. */
export function collectionForHandle(handle: string): Collection | null {
  return COLLECTIONS.find((c) => c.handles.includes(handle)) ?? null;
}
