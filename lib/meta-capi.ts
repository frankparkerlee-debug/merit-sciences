import crypto from 'crypto';

/**
 * Meta Conversions API (server-side) — the durable half of Purchase tracking.
 *
 * The browser pixel (components/MarketingPixels + lib/analytics.trackPurchase)
 * is easily lost to ad-blockers, ITP, and crashed redirects. This fires the
 * SAME Purchase event server-side from the PayPal webhook — the durable source
 * of truth — so Meta always learns about a sale even when the browser event
 * never arrives.
 *
 * Deduplication: both legs use the PayPal order id as the event id, so Meta
 * collapses the pair into one conversion instead of double-counting.
 *
 * Fully env-gated: a complete no-op until META_CAPI_ACCESS_TOKEN is set in
 * Render, so shipping this changes nothing until the operator provisions a
 * token in Events Manager → Settings → Conversions API.
 *
 *   META_CAPI_ACCESS_TOKEN      — system-user token from Events Manager (server-only)
 *   NEXT_PUBLIC_META_PIXEL_ID   — pixel/dataset id (shared with the browser pixel)
 *   META_CAPI_TEST_EVENT_CODE   — optional; routes events to the Test Events tab
 *
 * Compliance: custom_data carries ONLY value + currency — never product or
 * compound names — to keep the dataset clean on a flagged health domain.
 */

const GRAPH_VERSION = 'v19.0';
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1012608588376068';
const TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const TEST_CODE = process.env.META_CAPI_TEST_EVENT_CODE;
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://meritsciences.com').replace(/\/$/, '');

/** SHA-256 of a normalized (trimmed, lowercased) identifier, as Meta requires. */
function hash(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

export async function sendMetaPurchase(args: {
  /** PayPal order id — MUST match the browser pixel's eventID for dedup. */
  eventId: string;
  /** Order value in currency units (e.g. dollars), not cents. */
  value: number;
  currency?: string;
  /** Buyer email — hashed before send; improves match quality/optimization. */
  email?: string | null;
}): Promise<void> {
  if (!TOKEN) return; // env-gated no-op until a token is provisioned
  if (!args.eventId || !(args.value > 0)) return;

  const email = args.email?.trim();
  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: args.eventId,
        action_source: 'website',
        event_source_url: `${SITE_URL}/checkout/success`,
        user_data: email ? { em: [hash(email)] } : {},
        custom_data: { value: args.value, currency: args.currency || 'USD' },
      },
    ],
    ...(TEST_CODE ? { test_event_code: TEST_CODE } : {}),
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) {
      console.error('[meta-capi] purchase failed', res.status, await res.text().catch(() => ''));
    }
  } catch (err) {
    console.error('[meta-capi] purchase error', err);
  }
}
