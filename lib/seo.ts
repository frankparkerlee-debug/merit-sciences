/**
 * JSON-LD structured data builders.
 *
 * Pure functions that return schema.org objects. Used to emit Product,
 * FAQPage, and BreadcrumbList structured data — which drives Google rich
 * results AND gives AI answer-engines clean, extractable facts to cite.
 *
 * Render the returned objects with <JsonLd data={...} /> (components/JsonLd).
 */

import type { Product } from '@/lib/product-types';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://meritsciences.com').replace(/\/$/, '');

/** Resolve a path to an absolute URL on the canonical origin. */
export function abs(path: string): string {
  if (!path) return SITE;
  if (/^https?:\/\//.test(path)) return path;
  return SITE + (path.startsWith('/') ? path : `/${path}`);
}

type PropVal = { '@type': 'PropertyValue'; name: string; value: string };

/**
 * Product schema for a PDP. Surfaces the chemistry facts (CAS, MW,
 * sequence, purity) as additionalProperty so both Google and AI engines
 * can extract them as structured attributes, plus a public-retail Offer.
 */
export function productJsonLd(opts: {
  product: Product;
  retailCents: number;
  description: string;
  image: string;
  inStock: boolean;
}) {
  const { product: p, retailCents, description, image, inStock } = opts;

  const props: PropVal[] = [];
  const add = (name: string, value?: string | number | null) => {
    if (value != null && String(value).trim() !== '') {
      props.push({ '@type': 'PropertyValue', name, value: String(value) });
    }
  };
  add('Purity', p.lot?.purity || '≥99% (HPLC)');
  add('CAS Number', p.spec?.cas);
  add('Molecular weight', p.spec?.mw);
  add('Molecular formula', p.spec?.formula);
  add('Amino acid sequence', p.spec?.sequence);
  add('Format', p.format === 'lyophilized' ? 'Lyophilized powder' : 'Reconstituted solution');
  add('Vial size', p.vialSize);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${p.title} ${p.vialSize}`.trim(),
    description,
    sku: p.handle,
    ...(p.lot?.id ? { mpn: p.lot.id } : {}),
    category: 'Research compound',
    brand: { '@type': 'Brand', name: 'Merit Sciences' },
    image: image ? [image] : undefined,
    ...(props.length ? { additionalProperty: props } : {}),
    offers: {
      '@type': 'Offer',
      url: abs(`/products/${p.handle}`),
      priceCurrency: 'USD',
      price: (retailCents / 100).toFixed(2),
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: 'Merit Sciences' },
    },
  };
}

/** FAQPage schema — the format AI answer-engines extract most reliably. */
export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({
      '@type': 'Question',
      name: i.q,
      acceptedAnswer: { '@type': 'Answer', text: i.a },
    })),
  };
}

/** BreadcrumbList schema — clarifies site structure for crawlers. */
export function breadcrumbJsonLd(crumbs: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: abs(c.path),
    })),
  };
}
