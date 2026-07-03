// JSON-LD builders for the library. Structured data is how answer-engines
// (ChatGPT, Perplexity, Google AI Overviews) decide a page is quotable and
// how Google earns rich results. Every monograph emits Article + FAQPage +
// BreadcrumbList, with the real citations attached so the page reads as sourced.
import type { Monograph } from './monographs';

const BASE = 'https://meritsciences.com';
const ORG = { '@type': 'Organization', name: 'Merit Sciences', url: BASE } as const;
// Static so module eval stays deterministic (no Date.now at import time).
const PUBLISHED = '2026-07-01';

export function breadcrumbSchema(trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: `${BASE}${t.path}`,
    })),
  };
}

export function faqSchema(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

// Article/ScholarlyArticle with citations attached — the "sourced" signal.
export function monographArticleSchema(m: Monograph, dateModified: string) {
  const url = `${BASE}/library/${m.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: `${m.title}: mechanism, research & handling`,
    description: m.tagline,
    about: {
      '@type': 'ChemicalSubstance',
      name: m.title,
      alternateName: m.aka,
    },
    author: ORG,
    publisher: ORG,
    datePublished: PUBLISHED,
    dateModified,
    mainEntityOfPage: url,
    url,
    inLanguage: 'en-US',
    isAccessibleForFree: true,
    citation: (m.research.references ?? []).map((r) => ({
      '@type': 'ScholarlyArticle',
      name: r.title,
      ...(r.authors ? { author: r.authors } : {}),
      ...(r.journal ? { isPartOf: { '@type': 'Periodical', name: r.journal } } : {}),
      ...(r.year ? { datePublished: String(r.year) } : {}),
      url: r.url,
      ...(r.pubmedId ? { identifier: `PMID:${r.pubmedId}` } : r.doi ? { identifier: `DOI:${r.doi}` } : {}),
    })),
  };
}

// Everything a monograph page needs, as an array of @graph-ready objects.
export function monographSchemas(m: Monograph, dateModified: string) {
  const schemas: object[] = [
    monographArticleSchema(m, dateModified),
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Research Library', path: '/library' },
      { name: m.title, path: `/library/${m.slug}` },
    ]),
  ];
  if (m.faqs.length) schemas.push(faqSchema(m.faqs));
  return schemas;
}
