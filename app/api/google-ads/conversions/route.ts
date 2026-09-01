import { prisma } from '@/lib/db';

/**
 * Google Ads OFFLINE CONVERSION IMPORT feed.
 *
 * Why this exists rather than a purchase tag on the checkout domain:
 *
 * Checkout happens on meritcheckout.com, a deliberately separate origin. The
 * `_gcl_aw` cookie that carries a Google click id is set on meritsciences.com
 * and does NOT travel across origins, so a gtag purchase conversion firing on
 * the checkout domain has no click to attribute itself to. That is exactly
 * what has been happening: 23 orders carry a stored gclid, and Google Ads has
 * recorded zero purchase conversions.
 *
 * The alternatives were worse. A cross-domain linker would tie the two
 * origins together in Google's data, which is the association the split-domain
 * architecture exists to avoid. Putting Google Ads API credentials in the app
 * to push conversions directly adds a credential surface and a moving part.
 *
 * This endpoint instead serves the conversion history as a CSV in Google's
 * offline-import format, and Google Ads pulls it on a schedule. Nothing is
 * added to the checkout domain, no cookie has to cross an origin, and no new
 * credentials exist anywhere. The click id we already capture at landing does
 * all the work.
 *
 * Setup (Google Ads → Tools → Conversions → Uploads → Schedule):
 *   Source:   HTTPS
 *   URL:      https://meritsciences.com/api/google-ads/conversions?token=<GOOGLE_ADS_FEED_TOKEN>
 *   Frequency: daily
 *
 * The token is a query parameter because Google's scheduled fetcher cannot
 * send an Authorization header. It grants read access to conversion rows
 * only — click id, timestamp, value, order id. No customer identifiers.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Google matches rows to this conversion action BY NAME, exactly. */
const CONVERSION_NAME = process.env.GOOGLE_ADS_PURCHASE_CONVERSION_NAME || 'Website Purchase (Merit)';

/** Google Ads requires the timezone the conversion times are expressed in. */
const TIME_ZONE = 'America/Chicago';

/** Google accepts conversions up to 90 days old. */
const LOOKBACK_DAYS = 90;

/** "2026-09-01 14:33:00-05:00" — Google's required format. */
function fmt(d: Date): string {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? '00';
  // Offset for THIS instant, so DST is handled rather than hardcoded.
  const off = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, timeZoneName: 'longOffset' })
    .formatToParts(d).find((x) => x.type === 'timeZoneName')?.value ?? 'GMT-06:00';
  return `${g('year')}-${g('month')}-${g('day')} ${g('hour')}:${g('minute')}:${g('second')}${off.replace('GMT', '')}`;
}

export async function GET(request: Request) {
  const expected = process.env.GOOGLE_ADS_FEED_TOKEN;
  if (!expected) {
    return new Response('GOOGLE_ADS_FEED_TOKEN not configured', { status: 500 });
  }
  const url = new URL(request.url);
  if (url.searchParams.get('token') !== expected) {
    return new Response('unauthorized', { status: 401 });
  }

  const since = new Date(Date.now() - LOOKBACK_DAYS * 864e5);

  /* Only orders that (a) are paid, (b) were not refunded, and (c) carry a
     Google click id. Everything else is invisible to Google Ads anyway. */
  const orders = await prisma.order.findMany({
    where: {
      status: { notIn: ['CANCELED', 'REFUNDED'] },
      paidAt: { gte: since },
    },
    select: { paypalOrderId: true, paidAt: true, totalCents: true, shippingCents: true, refundedCents: true },
    orderBy: { paidAt: 'desc' },
  });

  /* `clickId` is ONE column shared by every network — it holds whichever of
     fbclid / ttclid / gclid / msclkid was on the landing URL, without
     recording which. Today every stored value is a Facebook fbclid, so a feed
     that trusted the column alone would hand Meta's click ids to Google
     labelled as gclids: junk uploads, and Merit's Meta activity disclosed to
     Google for no benefit.

     `source` is the reliable discriminator. buildAttribution() stamps
     source='google' exactly when gclid/gbraid/wbraid was present, so gating on
     it keeps other networks' ids out by construction. */
  const attrs = await prisma.orderAttribution.findMany({
    where: {
      paypalOrderId: { in: orders.map((o) => o.paypalOrderId) },
      source: { equals: 'google', mode: 'insensitive' },
      clickId: { not: null },
    },
    select: { paypalOrderId: true, clickId: true },
  });
  const gclidByOrder = new Map(
    attrs.map((a) => [a.paypalOrderId, a.clickId as string]),
  );

  const rows: string[] = [];
  for (const o of orders) {
    const gclid = gclidByOrder.get(o.paypalOrderId);
    if (!gclid) continue;
    // Report net of refunds — the conversion value Google optimizes toward
    // should be what Merit actually kept.
    const net = (Number(o.totalCents) - Number(o.refundedCents ?? 0)) / 100;
    if (!(net > 0)) continue;
    rows.push(
      [gclid, CONVERSION_NAME, fmt(o.paidAt), net.toFixed(2), 'USD', o.paypalOrderId]
        .map((f) => (String(f).includes(',') ? `"${f}"` : f))
        .join(','),
    );
  }

  const csv = [
    `Parameters:TimeZone=${TIME_ZONE}`,
    'Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency,Order ID',
    ...rows,
  ].join('\n');

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'cache-control': 'no-store',
      // Surfaced so a failed import can be diagnosed without reading the body.
      'x-conversion-rows': String(rows.length),
    },
  });
}
