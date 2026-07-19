/**
 * Submits every indexable URL to IndexNow (Bing/Yandex → ChatGPT/Copilot).
 * Hit it after a content deploy for near-instant re-indexing:
 *   GET /api/cron/indexnow   Authorization: Bearer ${CRON_SECRET}
 * Safe to run on a schedule (e.g. daily) or manually. Static + library URLs
 * always submit; product URLs are added when the DB is reachable.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { submitToIndexNow } from '@/lib/indexnow';
import { MONOGRAPHS } from '@/lib/monographs';
import { ARTICLES } from '@/lib/library';
import { listProducts } from '@/lib/catalog';
import { STACK_TEMPLATES } from '@/lib/catalog-meta';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const BASE = 'https://meritsciences.com';

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET not configured on server' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const urls: string[] = [
    `${BASE}/`,
    `${BASE}/library`,
    `${BASE}/catalog`,
    `${BASE}/coa`,
    `${BASE}/stacks`,
    `${BASE}/practitioners`,
    ...MONOGRAPHS.map((m) => `${BASE}/library/${m.slug}`),
    ...ARTICLES.map((a) => `${BASE}/library/${a.slug}`),
    ...STACK_TEMPLATES.map((s) => `${BASE}/stacks/${s.slug}`),
  ];

  try {
    const products = await listProducts({ status: 'active', channel: 'rua' });
    urls.push(...products.map((p) => `${BASE}/products/${p.handle}`));
  } catch {
    /* submit the static + library set even if product enumeration fails */
  }

  // Per-lot COA pages — freshest-changing surface (new lots post regularly).
  try {
    const lots = await prisma.coa.findMany({ select: { lotId: true }, take: 500 });
    const seen = new Set<string>();
    for (const l of lots) {
      const key = l.lotId.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      urls.push(`${BASE}/coa/${encodeURIComponent(l.lotId)}`);
    }
  } catch {
    /* omit lot pages if the DB is unreachable */
  }

  try {
    const result = await submitToIndexNow(urls);
    return NextResponse.json({ ...result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'submit failed', attempted: urls.length },
      { status: 502 },
    );
  }
}
