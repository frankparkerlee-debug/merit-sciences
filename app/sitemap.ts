import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { listProducts } from '@/lib/catalog';
import { STACK_TEMPLATES } from '@/lib/catalog-meta';
import { ARTICLES } from '@/lib/library';
import { MONOGRAPHS } from '@/lib/monographs';
import { COLLECTION_SLUGS } from '@/lib/collections';

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
  // lastModified is only emitted where a real date exists (product updatedAt,
  // lot publication date). Stamping every URL with the request time told
  // crawlers the whole site changed on every fetch, which teaches them to
  // ignore the field.

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/catalog`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/stacks`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE}/affiliate`, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${BASE}/practitioners`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${BASE}/coa`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/library`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${BASE}/shipping`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/returns`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/research-disclosure`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE}/terms`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${BASE}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
    // Category landing pages (lib/collections.ts). Authored, not DB-derived,
    // so they are safe to list unconditionally.
    ...COLLECTION_SLUGS.map((slug) => ({
      url: `${BASE}/catalog/${slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.85,
    })),
  ];

  // Product PDPs — active, consumer channel ('rua' includes BOTH). Resilient:
  // listProducts swallows DB errors and returns [], so a blip degrades the
  // sitemap to static + stacks rather than failing the build.
  let productRoutes: MetadataRoute.Sitemap = [];
  let activeHandles: Set<string> | null = null;
  try {
    const products = await listProducts({ status: 'active', channel: 'rua' });
    activeHandles = new Set(products.map((p) => p.handle));
    // The Product shape carries no timestamp, so read updatedAt directly.
    // A failure here only drops lastModified, never the URLs.
    const updated = new Map<string, Date>();
    try {
      const rows = await prisma.product.findMany({
        where: { handle: { in: Array.from(activeHandles) } },
        select: { handle: true, updatedAt: true },
      });
      for (const r of rows) updated.set(r.handle, r.updatedAt);
    } catch {
      /* omit lastModified rather than fake it */
    }
    productRoutes = products.map((p) => ({
      url: `${BASE}/products/${p.handle}`,
      ...(updated.has(p.handle) ? { lastModified: updated.get(p.handle) } : {}),
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
      // Retired legacy certificates stay reachable but leave the sitemap —
      // superseded testing should not be advertised as current.
      where: { retiredAt: null },
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

  // Stacks are only listed when every member product is actually purchasable.
  // /stacks/[slug] notFound()s if any handle fails to resolve, so a template
  // that outlives one of its SKUs becomes a 404 that the sitemap keeps
  // advertising — which is exactly how /stacks/recovery-stack and
  // /stacks/neuro-pair ended up as dead entries after their BPC and Semax
  // SKUs were moved to DRAFT. Filtering here keeps the sitemap self-healing:
  // draft a product and its stacks drop out on the next request instead of
  // rotting. If product enumeration failed we can't tell, so we emit them all
  // rather than silently shrinking the sitemap on a DB blip.
  const stackRoutes: MetadataRoute.Sitemap = STACK_TEMPLATES.filter(
    (s) => !activeHandles || s.handles.every((h) => activeHandles!.has(h)),
  ).map((s) => ({
    url: `${BASE}/stacks/${s.slug}`,
    changeFrequency: 'monthly',
    priority: 0.7,
  }));

  // Research Library — static article pages (testing
  // guides, trial summaries). Real molecule names live here → strong SEO surface.
  const libraryRoutes: MetadataRoute.Sitemap = ARTICLES.map((a) => ({
    url: `${BASE}/library/${a.slug}`,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));

  // Compound monographs — the primary SEO/AEO surface (real molecule names,
  // mechanism + cited research). Higher priority than guide articles.
  const monographRoutes: MetadataRoute.Sitemap = MONOGRAPHS.map((m) => ({
    url: `${BASE}/library/${m.slug}`,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [...staticRoutes, ...productRoutes, ...stackRoutes, ...monographRoutes, ...libraryRoutes, ...coaRoutes];
}
