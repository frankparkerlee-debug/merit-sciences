// Research Library — content migrated from the old Shopify blog, scrubbed to
// RUO ("Not for human or veterinary use", stale 503B/prescription promos
// removed). Body is pre-cleaned HTML; protocols carry a calculator config.
import data from './library-data.json';

export type DoseTier = {
  level: string;
  dose_mg?: number | null;
  dose_ug_per_kg?: number | null;
  volume_ml?: number | null;
  frequency?: string;
  frequency_label?: string;
  citation?: string;
};
export type Component = { name: string; vial_mg: number; research_range?: string };
export type CalcConfig = {
  vials: [string, string][];
  defaultDiluentMl: number;
  human: DoseTier[];
  preclinical: DoseTier[];
  components: Component[];
};
export type Category = 'Protocol' | 'Guide' | 'Research';
export type Article = {
  slug: string;
  title: string;
  category: Category;
  excerpt: string;
  calc: CalcConfig | null;
  body: string;
};

export const ARTICLES = data as Article[];

// Display order + copy per category.
export const CATEGORY_META: Record<Category, { label: string; blurb: string }> = {
  Protocol: { label: 'Reconstitution protocols', blurb: 'Step-by-step handling + storage, with a research calculator for every compound.' },
  Guide: { label: 'Handling & testing', blurb: 'How we test, what a COA means, and how to handle a lyophilized vial.' },
  Research: { label: 'Research summaries', blurb: 'What the published trials actually showed — design, outcomes, and the data.' },
};
export const CATEGORY_ORDER: Category[] = ['Protocol', 'Guide', 'Research'];

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
export function articlesByCategory(cat: Category): Article[] {
  return ARTICLES.filter((a) => a.category === cat);
}
