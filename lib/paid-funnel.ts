import 'server-only';
import { prisma } from './db';
import { hogqlCached } from './posthog-query';

/* ─────────────────────────────────────────────────────────────────────────
   PAID-TRAFFIC FUNNEL — how far ad visitors get, per campaign and per
   traffic source, from Merit's own data.

   Why this exists: the isolated Google Ads account (699-437-8305) carries no
   conversion tag by design, so its UI can never show what a click did after
   it landed. The vendor-run account (618-453-1815) hides purchases from its
   Conversions column. Neither surface answers "how far are visitors
   getting", so the answer is assembled here from PostHog sessions on
   meritsciences.com plus Merit's order attribution.

   A "landing" is a visitor's first pageview in the window whose URL carries
   a campaign marker: utm_campaign, or a click id (gclid / gbraid / wbraid /
   gad_campaignid / fbclid / ttclid). The campaign label is the utm_campaign
   when present; click-id-only landings fall into "<network> (no utm)".
   Source is the referring domain, folded into the names a human would use:
   syndicatedsearch.goog is Google's search-partner network, google.* is
   Google search proper, everything else is shown as the domain so Display
   placements are visible by name.
   ───────────────────────────────────────────────────────────────────────── */

export type FunnelRow = {
  campaign: string;
  source: string;
  landed: number;
  /** Left the landing page after 10 seconds or more (read it, did not bounce). */
  stayed: number;
  /** Reached /catalog. */
  catalog: number;
  /** Clicked anything on /catalog other than the subscribe popup. */
  engaged: number;
  /** Opened a product page. */
  product: number;
  addToCart: number;
  /** Started checkout (begin_checkout or handoff event). */
  checkout: number;
};

export type CampaignOrders = { orders: number; revenueCents: number };

const REVENUE_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'PARTIALLY_REFUNDED'];

export const FUNNEL_RANGES = [7, 14, 30] as const;

export function clampDays(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return (FUNNEL_RANGES as readonly number[]).includes(n) ? n : 14;
}

const MARKER_CLAUSE = `(properties.$current_url LIKE '%utm_campaign=%'
      OR properties.$current_url LIKE '%gclid=%' OR properties.$current_url LIKE '%gad_campaignid=%'
      OR properties.$current_url LIKE '%gbraid=%' OR properties.$current_url LIKE '%wbraid=%'
      OR properties.$current_url LIKE '%fbclid=%' OR properties.$current_url LIKE '%ttclid=%')`;

function funnelQuery(days: number): string {
  return `
WITH land AS (
  SELECT distinct_id,
    argMin(properties.$current_url, timestamp) AS url,
    argMin(properties.$pathname, timestamp) AS path,
    argMin(coalesce(nullIf(properties.$referring_domain, ''), '(direct)'), timestamp) AS ref,
    min(timestamp) AS t0
  FROM events
  WHERE event = '$pageview' AND timestamp > now() - INTERVAL ${days} DAY
    AND ${MARKER_CLAUSE}
  GROUP BY distinct_id
)
SELECT
  multiIf(extract(url, 'utm_campaign=([^&]+)') != '', extract(url, 'utm_campaign=([^&]+)'),
          url LIKE '%gclid=%' OR url LIKE '%gad_campaignid=%' OR url LIKE '%gbraid=%' OR url LIKE '%wbraid=%', 'google ads (no utm)',
          url LIKE '%fbclid=%', 'meta (no utm)',
          url LIKE '%ttclid=%', 'tiktok (no utm)', 'other') AS campaign,
  multiIf(ref = 'syndicatedsearch.goog', 'Search partners',
          ref LIKE '%google.%', 'Google search',
          ref LIKE '%youtube%', 'YouTube',
          ref LIKE '%facebook%' OR ref LIKE '%instagram%', 'Meta',
          ref = '(direct)' OR ref = '$direct', 'No referrer (app / in-app browser)',
          ref) AS source,
  count() AS landed,
  countIf(stayed > 0) AS stayed,
  countIf(catalog > 0) AS catalog,
  countIf(engaged > 0) AS engaged,
  countIf(product > 0) AS product,
  countIf(atc > 0) AS add_to_cart,
  countIf(checkout > 0) AS checkout
FROM (
  SELECT l.distinct_id AS distinct_id, l.url AS url, l.ref AS ref,
    countIf(e.event = '$pageleave' AND e.properties.$prev_pageview_pathname = l.path
            AND toFloatOrZero(toString(e.properties.$prev_pageview_duration)) >= 10) AS stayed,
    countIf(e.event = '$pageview' AND e.properties.$pathname LIKE '/catalog%') AS catalog,
    countIf(e.event = '$autocapture' AND e.properties.$pathname LIKE '/catalog%'
            AND e.elements_chain NOT LIKE '%Subscribe for 15%') AS engaged,
    countIf(e.event = 'product_viewed' OR (e.event = '$pageview' AND e.properties.$pathname LIKE '/products/%')) AS product,
    countIf(e.event = 'add_to_cart') AS atc,
    countIf(e.event = 'begin_checkout' OR e.event = 'checkout_handoff') AS checkout
  FROM land l
  LEFT JOIN events e ON e.distinct_id = l.distinct_id AND e.timestamp >= l.t0
    AND e.timestamp > now() - INTERVAL ${days} DAY
  GROUP BY l.distinct_id, l.url, l.ref, l.path
)
GROUP BY campaign, source
ORDER BY landed DESC
LIMIT 200`;
}

/** Null when PostHog read access is not configured or the query failed. */
export async function paidFunnel(days: number): Promise<FunnelRow[] | null> {
  const rows = await hogqlCached(funnelQuery(days));
  if (!rows) return null;
  return rows.map((r: any[]) => ({
    campaign: String(r[0]),
    source: String(r[1]),
    landed: Number(r[2]) || 0,
    stayed: Number(r[3]) || 0,
    catalog: Number(r[4]) || 0,
    engaged: Number(r[5]) || 0,
    product: Number(r[6]) || 0,
    addToCart: Number(r[7]) || 0,
    checkout: Number(r[8]) || 0,
  }));
}

/* Collapse the long tail of one-visit Display placements into a single
   "other placements" row per campaign, so the table stays readable while the
   named rows still show where the money actually went. */
export function collapseTail(rows: FunnelRow[], minLanded = 3): FunnelRow[] {
  const out: FunnelRow[] = [];
  const tails = new Map<string, FunnelRow & { sites: number }>();
  for (const r of rows) {
    if (r.landed >= minLanded) { out.push(r); continue; }
    const t = tails.get(r.campaign) ?? { ...r, source: '', sites: 0, landed: 0, stayed: 0, catalog: 0, engaged: 0, product: 0, addToCart: 0, checkout: 0 };
    t.sites++;
    t.landed += r.landed; t.stayed += r.stayed; t.catalog += r.catalog; t.engaged += r.engaged;
    t.product += r.product; t.addToCart += r.addToCart; t.checkout += r.checkout;
    tails.set(r.campaign, t);
  }
  for (const t of tails.values()) {
    const { sites, ...row } = t;
    out.push({ ...row, source: `other placements (${sites} sites)` });
  }
  return out.sort((a, b) => a.campaign.localeCompare(b.campaign) || b.landed - a.landed);
}

/** Orders and revenue in the window, keyed by the same campaign labels the
 *  funnel uses, from Merit's own order attribution. */
export async function paidOrdersByCampaign(days: number): Promise<Map<string, CampaignOrders>> {
  const since = new Date(Date.now() - days * 86_400_000);
  const out = new Map<string, CampaignOrders>();
  let attrs: { paypalOrderId: string; source: string | null; campaign: string | null }[] = [];
  try {
    attrs = await prisma.orderAttribution.findMany({
      where: { createdAt: { gte: since } },
      select: { paypalOrderId: true, source: true, campaign: true },
    });
  } catch {
    return out;
  }
  if (attrs.length === 0) return out;
  const orders = await prisma.order.findMany({
    where: { paypalOrderId: { in: attrs.map((a) => a.paypalOrderId) }, status: { in: REVENUE_STATUSES as any } },
    select: { paypalOrderId: true, totalCents: true },
  });
  const totals = new Map(orders.map((o) => [o.paypalOrderId, Number(o.totalCents)]));
  for (const a of attrs) {
    const cents = totals.get(a.paypalOrderId);
    if (cents == null) continue;
    // lib/attribution.ts infers source from the click id when utm_source is
    // absent (gclid → google, fbclid → meta, ttclid → tiktok), so source is
    // the right key here; clickId is the raw token and carries no prefix.
    const label =
      a.campaign?.trim() ||
      (a.source === 'google' ? 'google ads (no utm)'
        : a.source === 'meta' ? 'meta (no utm)'
        : a.source === 'tiktok' ? 'tiktok (no utm)'
        : null);
    if (!label) continue;
    const cur = out.get(label) ?? { orders: 0, revenueCents: 0 };
    cur.orders++;
    cur.revenueCents += cents;
    out.set(label, cur);
  }
  return out;
}
