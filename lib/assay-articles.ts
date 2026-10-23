/**
 * The Assay (theassay.co) articles about each compound, keyed by monograph
 * slug (lib/monographs.ts).
 *
 * The Assay is Merit's own editorial publication, so every link to it is
 * labeled as such where it renders. Source of truth: the `about:` frontmatter
 * of assay-site/content/*.md (plus kpv-research-review, whose title and body
 * are about KPV but which carries no `about:` field). Verified live (HTTP 200)
 * on 2026-10-22. When a new Assay article ships with an `about:` field, add it
 * here.
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
} satisfies Record<string, AssayArticle>;

export const ASSAY_ARTICLES_BY_SLUG: Record<string, AssayArticle[]> = {
  'bpc-157': [A.bpcTb],
  'tb-500': [A.bpcTb],
  'bpc-157-tb-500': [A.bpcTb],
  epitalon: [A.epitalon],
  'ghk-cu': [A.ghk],
  ipamorelin: [A.gh],
  sermorelin: [A.gh],
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
