import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { listProducts } from '@/lib/catalog';
import { STACK_TEMPLATES } from '@/lib/catalog-meta';
import { ARTICLES } from '@/lib/library';
import { MONOGRAPHS } from '@/lib/monographs';

const BASE = 'https://meritsciences.com';

/**
 * Dynamic sitemap. Enumerates the public, indexable surface:
 *   - static marketing/content routes
 *   - every active consumer-channel product PDP (the primary SEO surface —
 *     real molecule names live here)
 *   - stack/bundle pages
 *
 * Gated routes (auth, admin, checkout, cart, orders, practitioner portal)
 * are excluded here and disallowed in robots.ts.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/catalog`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/stacks`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/practitioners`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/coa`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/library`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/shipping`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/returns`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/research-disclosure`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE}/privacy`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ];

  // Product PDPs — active, consumer channel ('rua' includes BOTH). Resilient:
  // listProducts swallows DB errors and returns [], so a blip degrades the
  // sitemap to static + stacks rather than failing the build.
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const products = await listProducts({ status: 'active', channel: 'rua' });
    productRoutes = products.map((p) => ({
      url: `${BASE}/products/${p.handle}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    }));
  } catch {
    /* keep static + stack routes even if product enumeration fails */
  }

  // Per-lot COA pages (/coa/[lot]) — the primary-source surface for
  // "{compound} lot {id} COA" queries and the QR-verify deep links.
  // Resilient: a DB blip just omits them.
  let coaRoutes: MetadataRoute.Sitemap = [];
  try {
    const lots = await prisma.coa.findMany({
      select: { lotId: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const seen = new Set<string>();
    coaRoutes = lots
      .filter((l) => {
        const key = l.lotId.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((l) => ({
        url: `${BASE}/coa/${encodeURIComponent(l.lotId)}`,
        lastModified: l.createdAt,
        changeFrequency: 'yearly' as const,
        priority: 0.5,
      }));
  } catch {
    /* omit lot pages if the DB is unreachable */
  }

  const stackRoutes: MetadataRoute.Sitemap = STACK_TEMPLATES.map((s) => ({
    url: `${BASE}/stacks/${s.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  // Research Library — static article pages (reconstitution protocols, testing
  // guides, trial summaries). Real molecule names live here → strong SEO surface.
  const libraryRoutes: MetadataRoute.Sitemap = ARTICLES.map((a) => ({
    url: `${BASE}/library/${a.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  // Compound monographs — the primary SEO/AEO surface (real molecule names,
  // mechanism + cited research). Higher priority than protocol/guide articles.
  const monographRoutes: MetadataRoute.Sitemap = MONOGRAPHS.map((m) => ({
    url: `${BASE}/library/${m.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes, ...stackRoutes, ...monographRoutes, ...libraryRoutes, ...coaRoutes];
}
