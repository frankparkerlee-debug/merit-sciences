import type { MetadataRoute } from 'next';

// Canonical production origin. meritsciences.com (apex → Render) is the
// indexable home; the merit-sciences.onrender.com temp URL must NOT be
// treated as canonical (it would split authority / create duplicates).
const BASE = 'https://meritsciences.com';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Transactional, account, and API surfaces — no SEO value, and
        // several expose gated/practitioner-only content we don't want crawled.
        disallow: [
          '/api/',
          '/admin',
          '/auth/',
          '/cart',
          '/checkout',
          '/orders',
          '/affiliate/dashboard',
          '/affiliate/login',
          '/practitioners/portal',
          '/practitioners/login',
          '/practitioners/unsubscribe',
        ],
      },
      {
        // Paid-platform crawlers: keep them off the catalog entirely. They may
        // still fetch the clean ad gates (/access, /lp) to validate an ad's
        // destination. Advisory layer — the hard block lives in middleware.ts.
        userAgent: ['facebookexternalhit', 'meta-externalagent', 'FacebookBot', 'facebookcatalog', 'Facebot', 'Bytespider'],
        allow: ['/access', '/lp'],
        disallow: '/',
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
