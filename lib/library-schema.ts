// JSON-LD builders for the library. Structured data is how answer-engines
// (ChatGPT, Perplexity, Google AI Overviews) decide a page is quotable and
// how Google earns rich results. Every monograph emits Article + FAQPage +
// BreadcrumbList, with the real citations attached so the page reads as sourced.
import type { Monograph } from './monographs';

const BASE = 'https://meritsciences.com';
/* Point at the Organization node declared once in app/(store)/layout.tsx
   instead of inlining a second copy. Two Organization objects with the same
   name and no shared @id read as two entities; one @id reference reinforces
   the single site entity on every monograph. */
const ORG = { '@id': `${BASE}/#organization` } as const;
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
    '@id': `${url}#article`,
    headline: `${m.title}: mechanism, research & handling`,
    description: m.tagline,
    /* The canonical node for this substance across the whole estate. The
       category pages at /catalog/<slug> and the topic hubs on theassay.co
       both reference this exact @id, so an answer engine resolves one
       compound entity whether it arrives via the monograph, the shop
       category or the editorial hub. Do not change this id casually. */
    about: {
      '@type': 'ChemicalSubstance',
      '@id': `${url}#substance`,
      name: m.title,
      alternateName: m.aka,
      url,
      ...(m.research.compoundClass ? { description: m.research.compoundClass } : {}),
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
      ...(r.title ? { name: r.title } : {}),
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
