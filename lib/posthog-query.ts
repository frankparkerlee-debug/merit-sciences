import 'server-only';

// Server-side READ access to PostHog (the Query API / HogQL). Uses a PRIVATE
// personal API key — never the public phc_ project key, and never exposed to
// the browser. Powers the native analytics inside /admin/analytics.
const KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const PROJECT = process.env.POSTHOG_PROJECT_ID;
// The Query API lives on the APP host (us/eu.posthog.com), NOT the ingestion
// host (us.i.posthog.com). EU projects: set POSTHOG_API_HOST=https://eu.posthog.com
const API_HOST = (process.env.POSTHOG_API_HOST || 'https://us.posthog.com').replace(/\/$/, '');

export const posthogReadConfigured = Boolean(KEY && PROJECT);

/**
 * Run a HogQL query against the PostHog Query API. Returns the result rows
 * (each an array of column values) or null on any failure / when read access
 * isn't configured. Never throws — the admin page degrades gracefully.
 */
export async function hogql(query: string, opts?: { forCache?: boolean }): Promise<any[] | null> {
  if (!KEY || !PROJECT) return null;
  try {
    const res = await fetch(`${API_HOST}/api/projects/${PROJECT}/query/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
      // `no-store` inside unstable_cache OPTS THE WHOLE ENTRY OUT of the
      // data cache — the "cached" wrapper below was re-querying ClickHouse
      // on every request, which is exactly the slowness it existed to fix.
      // Callers going through hogqlCached pass forCache; direct callers
      // keep no-store semantics.
      ...(opts?.forCache ? {} : { cache: 'no-store' as const }),
    });
    if (!res.ok) {
      console.error('[posthog] query failed', res.status, await res.text().catch(() => ''));
      return null;
    }
    const data = await res.json();
    return Array.isArray(data?.results) ? data.results : null;
  } catch (err) {
    console.error('[posthog] query threw', err);
    return null;
  }
}

import { unstable_cache } from 'next/cache';

/**
 * hogql with a 5-minute server cache. The Query API round-trips ClickHouse
 * and routinely takes 1–3s per query; the analytics page runs seven. Live
 * freshness buys nothing on traffic panels, and uncached it made every
 * filter click feel broken. The query text is part of the cache key, so
 * range-dependent queries cache per range.
 */
export const hogqlCached = unstable_cache(
  async (query: string) => hogql(query, { forCache: true }),
  ['hogql'],
  { revalidate: 300 },
);
