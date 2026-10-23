/**
 * The Assay (theassay.co) articles about each compound, keyed by monograph
 * slug (lib/monographs.ts).
 *
 * The Assay is Merit's own editorial publication, so every link to it is
 * labeled as such where it renders. Source of truth: the `about:` frontmatter
 * of assay-site/content/*.md (plus kpv-research-review, whose title and body
 * are about KPV but which carries no `about:` field). Verified live (HTTP 200)
 * on 2026-10-22. When a new Assay article ships with an `about:` field, add it
 * here. Never add articles that name the generic RT3/TZ2 molecules
 * (peptide-fda-status-by-compound, is-retatrutide-fda-approved).
 *
 * RT3 and TZ2 have no entry on purpose: The Assay discusses those compounds
 * by name, and nothing on meritsciences.com links a page that names them.
 */

export type AssayArticle = { slug: string; title: string };

const A = {
  bpcTb: { slug: 'bpc-157-vs-tb-500', title: 'BPC-157 vs TB-500: What the Published Research Actually Compares' },
  epitalon: { slug: 'epitalon-research-review', title: 'Epitalon: What the Published Research Actually Shows' },
  ghk: { slug: 'ghk-cu-research-review', title: 'GHK-Cu: What the Published Research Actually Shows' },
  gh: { slug: 'ipamorelin-vs-sermorelin-vs-cjc-1295', title: 'Ipamorelin vs Sermorelin vs CJC-1295: What the Published Research Compares' },
  kpv: { slug: 'kpv-research-review', title: 'KPV: What the Research Shows on the Anti-Inflammatory Tripeptide' },
  motsNad: { slug: 'mots-c-vs-nad', title: 'MOTS-c vs NAD+: What the Published Research Compares' },
  semaxSelank: { slug: 'semax-vs-selank', title: 'Semax vs Selank: What the Published Research Compares' },
  ta1: { slug: 'thymosin-alpha-1-research-review', title: 'Thymosin Alpha-1: Approved Abroad, Unapproved in the US' },
  tb500: { slug: 'tb-500-research-review', title: 'TB-500 vs Thymosin Beta-4: What the Research Covers' },
  bpcLegal: { slug: 'is-bpc-157-legal', title: 'Is BPC-157 Legal? What US Law and WADA Say in 2026' },
  pt141Mt2: { slug: 'pt-141-vs-melanotan-ii', title: 'PT-141 vs Melanotan II: What the Research Compares' },
  tesaSerm: { slug: 'tesamorelin-vs-sermorelin', title: 'Tesamorelin vs Sermorelin: One Approved, One Discontinued' },
  aod: { slug: 'aod-9604-research-review', title: 'AOD-9604: What the Obesity Trials Showed' },
  igf: { slug: 'igf-1-lr3-research-review', title: 'IGF-1 LR3: What the Published Research Shows' },
  dsip: { slug: 'dsip-research-review', title: 'DSIP: What the Delta Sleep-Inducing Peptide Research Shows' },
} satisfies Record<string, AssayArticle>;

export const ASSAY_ARTICLES_BY_SLUG: Record<string, AssayArticle[]> = {
  'bpc-157': [A.bpcTb, A.bpcLegal],
  'tb-500': [A.tb500, A.bpcTb],
  'bpc-157-tb-500': [A.bpcTb, A.tb500],
  epitalon: [A.epitalon],
  'ghk-cu': [A.ghk],
  ipamorelin: [A.gh],
  sermorelin: [A.tesaSerm, A.gh],
  tesamorelin: [A.tesaSerm],
  'pt-141': [A.pt141Mt2],
  'melanotan-ii': [A.pt141Mt2],
  'aod-9604': [A.aod],
  'igf-1-lr3': [A.igf],
  dsip: [A.dsip],
  'cjc-1295': [A.gh],
  kpv: [A.kpv],
  'mots-c': [A.motsNad],
  nad: [A.motsNad],
  semax: [A.semaxSelank],
  selank: [A.semaxSelank],
  'thymosin-alpha-1': [A.ta1],
};

export function assayArticlesFor(slug: string | undefined): AssayArticle[] {
  return slug ? ASSAY_ARTICLES_BY_SLUG[slug] ?? [] : [];
}

/** Outbound URL with the referral tags The Assay's analytics expects. */
export function assayUrl(articleSlug: string, campaign: 'pdp' | 'monograph'): string {
  return `https://theassay.co/articles/${articleSlug}?utm_source=meritsciences&utm_medium=referral&utm_campaign=${campaign}`;
}
