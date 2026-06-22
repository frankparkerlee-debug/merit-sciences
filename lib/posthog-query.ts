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
export async function hogql(query: string): Promise<any[] | null> {
  if (!KEY || !PROJECT) return null;
  try {
    const res = await fetch(`${API_HOST}/api/projects/${PROJECT}/query/`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
      cache: 'no-store',
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
