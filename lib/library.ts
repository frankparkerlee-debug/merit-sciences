// Research Library — content migrated from the old Shopify blog, scrubbed to
// RUO ("Not for human or veterinary use", stale 503B/prescription promos
// removed). Body is pre-cleaned HTML.
//
// REMOVED 2026-07-23 — reconstitution content is no longer published:
//   · the reconstitution calculator (component deleted), and
//   · all 16 Protocol-category articles (step-by-step prep procedures).
// Both sat badly against research-use-only positioning. The records still exist
// in library-data.json (with their old `calc` blocks) but are filtered out at
// this boundary, so nothing downstream — index, static params, sitemap,
// IndexNow, monograph cross-links — can surface them. The dead URLs are 308'd
// to the matching compound monograph in next.config.mjs. Do not re-expose.
//
// REMOVED 2026-10-22: three Guide articles that were preparation content
// (syringe/needle selection, aliquoting, bacteriostatic vs sterile water) are
// filtered here the same way and 308 to /library. Do not re-expose.
import data from './library-data.json';

export type Category = 'Guide' | 'Research';
export type Article = {
  slug: string;
  title: string;
  category: Category;
  excerpt: string;
  body: string;
};

// `as unknown as` — the JSON's literal category union still includes the
// retired 'Protocol', which no longer exists on Category.
const RETIRED_PREP_SLUGS = new Set([
  'choosing-syringe-and-needle',
  'aliquoting-a-peptide-vial-safely',
  'bacteriostatic-water-vs-sterile-water',
]);
export const ARTICLES: Article[] = (data as unknown as Article[]).filter(
  (a) => (a.category as string) !== 'Protocol' && !RETIRED_PREP_SLUGS.has(a.slug),
);

// Display order + copy per category.
export const CATEGORY_META: Record<Category, { label: string; blurb: string }> = {
  Guide: { label: 'Handling & testing', blurb: 'How we test, what a COA means, and how to handle a lyophilized vial.' },
  Research: { label: 'Research summaries', blurb: 'What the published trials actually showed — design, outcomes, and the data.' },
};
export const CATEGORY_ORDER: Category[] = ['Guide', 'Research'];

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
export function articlesByCategory(cat: Category): Article[] {
  return ARTICLES.filter((a) => a.category === cat);
}
