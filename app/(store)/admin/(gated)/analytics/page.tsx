import Link from 'next/link';
import { prisma } from '@/lib/db';
import { hogqlCached as hogql, posthogReadConfigured } from '@/lib/posthog-query';
import { recoveryEmailsEnabled } from '@/lib/abandoned-cart';
import { salesReport, type ChannelRow, type NamedRow } from '@/lib/analytics-sales';
import { FilterBar } from './FilterBar';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Analytics · Admin' };

const POSTHOG_APP = 'https://us.posthog.com';

function money(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const FUNNEL_STEPS = [
  { event: 'product_viewed', label: 'Product viewed' },
  { event: 'add_to_cart', label: 'Added to cart' },
  { event: 'begin_checkout', label: 'Began checkout' },
  { event: 'purchase', label: 'Purchased' },
] as const;

/** Fold PostHog's first-touch referrer values into readable channel names.
 *  `$direct` (and empty) means "no referrer" — which includes clicks out of
 *  the ChatGPT/Claude native apps, not just typed URLs, so it is labeled
 *  honestly. Our own domains appearing as first touch are the storefront →
 *  checkout hop, where the true origin is unknowable retroactively. */
function foldFirstTouch(raw: string): string {
  const v = raw.replace(/^www\./, '').toLowerCase();
  if (v === '$direct' || v === '' || v === '(direct)') return 'Direct / app links';
  if (/meritsciences\.com|meritcheckout\.com|onrender\.com|trymerit\.co/.test(v)) return '(cross-domain hop)';
  if (/^google\./.test(v) || /\.google\./.test(v)) return 'Google';
  if (v === 'bing.com') return 'Bing';
  if (v === 'chatgpt.com' || v === 'chat.openai.com') return 'ChatGPT';
  if (v === 'perplexity.ai') return 'Perplexity';
  if (v === 'claude.ai') return 'Claude';
  if (v === 'duckduckgo.com') return 'DuckDuckGo';
  if (/facebook\.com|instagram\.com/.test(v)) return 'Facebook / Instagram';
  if (/reddit\.com/.test(v)) return 'Reddit';
  return v;
}

const RANGES = [
  { key: '7', label: '7 days', days: 7, phDays: 7 },
  { key: '30', label: '30 days', days: 30, phDays: 30 },
  { key: '90', label: '90 days', days: 90, phDays: 90 },
  { key: 'all', label: 'All time', days: null as number | null, phDays: 365 },
] as const;

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams?: { range?: string; channel?: string; from?: string; to?: string };
}) {
  const renderStart = Date.now();
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // ── Filters (URL-driven; FilterBar renders the dropdowns) ──
  const range = RANGES.find((r) => r.key === searchParams?.range) ?? RANGES[1];
  const channelFilter = searchParams?.channel?.trim() || null;
  // Explicit window from a chart-bar drill-down — overrides the range preset.
  const fromMs =
    searchParams?.from && ISO_DAY.test(searchParams.from) ? Date.parse(`${searchParams.from}T00:00:00Z`) : null;
  const toMs =
    searchParams?.to && ISO_DAY.test(searchParams.to) ? Date.parse(`${searchParams.to}T00:00:00Z`) : null;
  const customWindow = fromMs != null && toMs != null && toMs > fromMs ? { fromMs, toMs } : null;
  const windowLabel = customWindow
    ? `${searchParams!.from} → ${searchParams!.to}`
    : range.label.toLowerCase();
  // PostHog interval: cover the custom window's age, else the preset.
  const phDays = customWindow
    ? Math.min(365, Math.max(1, Math.ceil((Date.now() - customWindow.fromMs) / 86400000)))
    : range.phDays;

  // ── Sales attribution (DB truth) — never blocks the rest of the page,
  //    but a failure must be VISIBLE: this section silently vanishing is
  //    indistinguishable from a stale tab, and both waste Parker's time.
  const sales = await salesReport({
    rangeDays: range.days,
    channel: channelFilter,
    fromMs: customWindow?.fromMs ?? null,
    toMs: customWindow?.toMs ?? null,
  }).catch((err) => {
    console.error('[analytics] salesReport failed', err);
    return null;
  });

  // ── Commerce KPIs (DB) — each independently resilient ──
  const [ordersTotal, orders30, revenueAgg, subscribers, activeAffiliates, pendingAgg] = await Promise.all([
    prisma.order.count({ where: { status: { not: 'PENDING_PAYMENT' } } }).catch(() => 0),
    prisma.order.count({ where: { status: { not: 'PENDING_PAYMENT' }, createdAt: { gte: since30 } } }).catch(() => 0),
    prisma.order.aggregate({ _sum: { totalCents: true }, where: { status: { notIn: ['PENDING_PAYMENT', 'REFUNDED'] } } }).catch(() => null),
    prisma.newsletterSubscriber.count({ where: { isSubscribed: true } }).catch(() => 0),
    prisma.affiliate.count({ where: { status: 'ACTIVE' } }).catch(() => 0),
    prisma.orderCommission.aggregate({ _sum: { commissionCents: true }, where: { status: 'PENDING' } }).catch(() => null),
  ]);
  const revenueCents = Number(revenueAgg?._sum?.totalCents ?? 0);
  const pendingCommissionCents = Number(pendingAgg?._sum?.commissionCents ?? 0);

  // ── Abandoned carts (DB) — recoverable leads; always available ──
  const [openAgg, recoveredAgg, recentCarts] = await Promise.all([
    prisma.abandonedCart.aggregate({ _count: true, _sum: { subtotalCents: true }, where: { status: 'OPEN', subtotalCents: { gt: 0 } } }).catch(() => null),
    prisma.abandonedCart.aggregate({ _count: true, _sum: { subtotalCents: true }, where: { status: 'RECOVERED', recoveredAt: { gte: since30 } } }).catch(() => null),
    prisma.abandonedCart.findMany({
      where: { status: 'OPEN', subtotalCents: { gt: 0 } },
      orderBy: { updatedAt: 'desc' },
      take: 8,
      select: { email: true, subtotalCents: true, itemCount: true, updatedAt: true, lastEmailedAt: true },
    }).catch(() => [] as Array<{ email: string; subtotalCents: number; itemCount: number; updatedAt: Date; lastEmailedAt: Date | null }>),
  ]);
  const openCount = Number(openAgg?._count ?? 0);
  const openValueCents = Number(openAgg?._sum?.subtotalCents ?? 0);
  const recoveredCount = Number(recoveredAgg?._count ?? 0);
  const recoveredValueCents = Number(recoveredAgg?._sum?.subtotalCents ?? 0);
  const recoveryRate = openCount + recoveredCount > 0
    ? Math.round((recoveredCount / (openCount + recoveredCount)) * 100)
    : 0;

  const kpis = [
    { label: 'Revenue', value: money(revenueCents), sub: 'paid orders, all-time' },
    { label: 'Orders', value: ordersTotal.toLocaleString(), sub: `${orders30.toLocaleString()} in 30 days` },
    { label: 'Subscribers', value: subscribers.toLocaleString(), sub: 'newsletter list' },
    { label: 'Active affiliates', value: activeAffiliates.toLocaleString(), sub: 'approved' },
    { label: 'Commissions owed', value: money(pendingCommissionCents), sub: 'pending payout' },
  ];

  // ── Native PostHog (Query API) — null when read access isn't configured ──
  // Exclude internal /admin pageviews from the customer-facing charts; count
  // them separately so admin browsing never inflates traffic/top-pages.
  const NOT_ADMIN = `properties.$pathname NOT LIKE '/admin%'`;
  const [traffic, topPages, sources, funnelRows, adminViewsRows, purchaseFirstTouch, campaignTraffic] = posthogReadConfigured
    ? await Promise.all([
        hogql(`SELECT toStartOfDay(timestamp) AS day, count() AS views, uniq(person_id) AS visitors
               FROM events WHERE event = '$pageview' AND ${NOT_ADMIN} AND timestamp >= now() - INTERVAL 14 DAY
               GROUP BY day ORDER BY day`),
        hogql(`SELECT properties.$pathname AS path, count() AS views
               FROM events WHERE event = '$pageview' AND ${NOT_ADMIN} AND timestamp >= now() - INTERVAL 7 DAY
               GROUP BY path ORDER BY views DESC LIMIT 8`),
        hogql(`SELECT coalesce(nullIf(properties.$referring_domain, ''), '(direct)') AS source, count() AS views
               FROM events WHERE event = '$pageview' AND ${NOT_ADMIN} AND timestamp >= now() - INTERVAL 7 DAY
               GROUP BY source ORDER BY views DESC LIMIT 6`),
        hogql(`SELECT event, count() AS n
               FROM events WHERE event IN ('product_viewed','add_to_cart','begin_checkout','purchase')
               AND timestamp >= now() - INTERVAL 14 DAY GROUP BY event`),
        hogql(`SELECT count() AS n FROM events
               WHERE event = '$pageview' AND properties.$pathname LIKE '/admin%'
               AND timestamp >= now() - INTERVAL 14 DAY`),
        // Browser-side purchase attribution: which first-touch source each
        // buyer's tracked person carries. Complements (never replaces) the
        // DB channel split above — this one sees organic arrivals that
        // predate the server-side referrer capture.
        hogql(`SELECT coalesce(nullIf(person.properties.$initial_referring_domain, ''), '$direct') AS src,
                      count() AS purchases
               FROM events WHERE event = 'purchase' AND timestamp >= now() - INTERVAL ${phDays} DAY
               GROUP BY src ORDER BY purchases DESC LIMIT 10`),
        // Campaign traffic: UTM-tagged arrivals PLUS click-id-only arrivals.
        // This exists because paid clicks routinely carry ONLY a click id —
        // the TikTok campaign ran with ttclid and no utm_source, and TikTok's
        // in-app webview sends no referrer, so 1,500+ ad visits were invisible
        // in every referrer-based panel.
        hogql(`SELECT coalesce(
                 nullIf(extractURLParameter(properties.$current_url, 'utm_source'), ''),
                 CASE WHEN properties.$current_url ILIKE '%ttclid=%' THEN 'tiktok (click id)'
                      WHEN properties.$current_url ILIKE '%fbclid=%' THEN 'meta (click id)'
                      WHEN properties.$current_url ILIKE '%gclid=%'  THEN 'google ads (click id)'
                      WHEN properties.$current_url ILIKE '%msclkid=%' THEN 'microsoft (click id)'
                 END) AS src,
               count() AS views, uniq(person_id) AS visitors
               FROM events
               WHERE event = '$pageview' AND ${NOT_ADMIN}
                 AND timestamp >= now() - INTERVAL ${phDays} DAY
                 AND src IS NOT NULL
               GROUP BY src ORDER BY visitors DESC LIMIT 10`),
      ])
    : [null, null, null, null, null, null, null];

  // Fold + re-aggregate the first-touch rows (several raw domains map to one label)
  const firstTouchAgg = new Map<string, number>();
  for (const r of purchaseFirstTouch ?? []) {
    const label = foldFirstTouch(String(r[0]));
    firstTouchAgg.set(label, (firstTouchAgg.get(label) ?? 0) + Number(r[1]));
  }
  const firstTouchRows = [...firstTouchAgg.entries()].sort((a, b) => b[1] - a[1]);
  const adminViews = Number(adminViewsRows?.[0]?.[0] ?? 0);

  const funnelMap = new Map<string, number>((funnelRows ?? []).map((r) => [String(r[0]), Number(r[1])]));
  const funnel = FUNNEL_STEPS.map((s) => ({ ...s, count: funnelMap.get(s.event) ?? 0 }));
  const funnelTop = Math.max(1, funnel[0].count);
  const maxViews = Math.max(1, ...((traffic ?? []).map((r) => Number(r[1]))));
  const totalViews = (traffic ?? []).reduce((n, r) => n + Number(r[1]), 0);
  const totalVisitors = (traffic ?? []).reduce((n, r) => n + Number(r[2]), 0);

  return (
    <main className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      <p className="text-[10px] tracking-[0.28em] uppercase text-cobalt font-bold mb-2">— Overview</p>
      <h1 className="font-display text-3xl font-black text-ink tracking-tight mb-1">Analytics</h1>
      <p className="text-sm text-ink-soft mb-8">Store performance + live traffic, behavior and conversion — all in one place.</p>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-cobalt/10 bg-white p-4">
            <p className="text-[10px] tracking-[0.14em] uppercase font-bold text-ink-soft/60 mb-2">{k.label}</p>
            <p className="font-display text-2xl font-black text-ink tracking-tight leading-none">{k.value}</p>
            <p className="text-[11px] text-ink-soft mt-1.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {!sales && (
        <div className="mb-8 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>The sales-attribution section failed to load.</strong> The rest of the page is
          unaffected; the error is in the server logs. Reload to retry.
        </div>
      )}

      {/* ── Where sales come from — DB truth, orders × attribution ── */}
      {sales && (
        <div className="space-y-6 mb-8">
          {/* Filters — dropdowns with a visible pending state while the
              server renders the new selection */}
          <FilterBar
            range={range.key}
            channel={channelFilter}
            ranges={RANGES.map((r) => ({ key: r.key, label: r.label }))}
            channels={sales.channelNames}
            customLabel={customWindow ? windowLabel : null}
          />

          {channelFilter && (
            <p className="text-[12px] text-ink-soft -mt-2">
              Showing <strong className="text-ink">{channelFilter}</strong> · {windowLabel}:{' '}
              <strong className="text-ink">{money(sales.windowRevenueCents)}</strong> across{' '}
              <strong className="text-ink">{sales.windowOrders}</strong> orders — trend, products, codes and AOV below reflect this selection.
            </p>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            <Panel
              title={`Where sales come from · ${windowLabel}`}
              right={`${sales.channelsWindow.reduce((n, c) => n + c.orders, 0)} orders`}
            >
              <ChannelList rows={sales.channelsWindow} rangeKey={range.key} activeChannel={channelFilter} />
            </Panel>
            <Panel
              title="Where sales come from · all time"
              right={`${sales.channelsAll.reduce((n, c) => n + c.orders, 0)} orders`}
            >
              <ChannelList rows={sales.channelsAll} rangeKey={range.key} activeChannel={channelFilter} />
            </Panel>
          </div>

          {/* Revenue trend — follows the active window + source, and every bar
              is a drill-down: click a week/day to zoom the whole page to it. */}
          <Panel
            title={`Revenue by ${sales.trend.bucket} · ${windowLabel}${channelFilter ? ` · ${channelFilter}` : ''}`}
            right={money(sales.trend.points.reduce((n, w) => n + w.revenueCents, 0))}
          >
            {sales.trend.points.length > 0 ? (
              <div className="flex items-end gap-1 h-32 mt-2">
                {sales.trend.points.map((w) => {
                  const max = Math.max(1, ...sales.trend.points.map((x) => x.revenueCents));
                  return (
                    <Bar
                      key={w.startMs}
                      heightPct={Math.max(2, (w.revenueCents / max) * 100)}
                      tip={`${sales.trend.bucket === 'week' ? 'wk of ' : ''}${w.start.slice(5)} · ${money(w.revenueCents)} · ${w.orders} orders`}
                      href={`/admin/analytics?from=${w.start}&to=${new Date(w.endMs).toISOString().slice(0, 10)}${channelFilter ? `&channel=${encodeURIComponent(channelFilter)}` : ''}`}
                    />
                  );
                })}
              </div>
            ) : <Empty />}
            <p className="text-[10px] text-ink-soft/50 mt-2 tabular-nums">
              {sales.trend.points[0]?.start} → {sales.trend.points[sales.trend.points.length - 1]?.start} · hover for numbers · click a bar to zoom the page to that {sales.trend.bucket}
            </p>
          </Panel>

          {/* Buyer economics */}
          <Panel title="Buyer economics">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
              <Stat label="Buyers" value={sales.buyers.total.toLocaleString()} sub="unique paying customers" />
              <Stat label="Returning" value={`${sales.buyers.repeatRatePct}%`} sub={`${sales.buyers.returning} bought again`} />
              <Stat
                label="Repeat revenue"
                value={sales.buyers.totalRevenueCents ? `${Math.round((sales.buyers.repeatRevenueCents / sales.buyers.totalRevenueCents) * 100)}%` : '—'}
                sub={`${money(sales.buyers.repeatRevenueCents)} from reorders`}
              />
              <Stat label={`AOV · ${customWindow ? 'window' : range.label.toLowerCase()}`} value={money(sales.buyers.aovWindowCents)} sub={channelFilter ? `average · ${channelFilter}` : "average paid order"} />
            </div>
          </Panel>

          <div className="grid lg:grid-cols-2 gap-6">
            <Panel title={`Top products · ${windowLabel}${channelFilter ? ` · ${channelFilter}` : ''}`}>
              {sales.topProducts.length ? (
                <MoneyTable
                  rows={sales.topProducts.map((p) => ({ name: p.title, orders: p.units, revenueCents: p.revenueCents, href: p.href }))}
                  countLabel="units"
                />
              ) : <Empty />}
            </Panel>
            <Panel title="Top affiliates by revenue driven · all time">
              {sales.topAffiliates.length ? (
                <MoneyTable rows={sales.topAffiliates} countLabel="orders" />
              ) : <Empty />}
            </Panel>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Panel title={`Discount codes · ${windowLabel}${channelFilter ? ` · ${channelFilter}` : ''}`}>
              {sales.topCodes.length ? <MoneyTable rows={sales.topCodes} countLabel="orders" /> : <Empty />}
            </Panel>
            <Panel title={`Purchases by first touch · ${phDays >= 365 ? '12 months' : `${phDays}d`}`} right="browser-side (PostHog)">
              {firstTouchRows.length ? (
                <>
                  <List rows={firstTouchRows} />
                  <p className="text-[11px] text-ink-soft/60 mt-3 leading-relaxed">
                    &ldquo;Direct / app links&rdquo; includes clicks out of native apps (ChatGPT,
                    email clients) that send no referrer. Server-side referrer capture went live
                    2026-08-24 — the channel split above sharpens from that date forward.
                  </p>
                </>
              ) : <Empty />}
            </Panel>
          </div>

          {/* Campaign traffic — UTM + click-id arrivals. Referrer-based panels
              miss paid clicks entirely when the ad platform's webview sends no
              referrer (TikTok) and the ads carry only a click id. */}
          <Panel
            title={`Campaign traffic · ${phDays >= 365 ? '12 months' : `${phDays}d`}`}
            right="pageviews with UTM or ad click-id"
          >
            {campaignTraffic && campaignTraffic.length > 0 ? (
              <ul className="space-y-1.5 mt-2">
                {(() => {
                  const max = Math.max(1, ...campaignTraffic.map((r: any[]) => Number(r[2])));
                  return campaignTraffic.map((r: any[], i: number) => (
                    <li key={i} className="relative flex items-center justify-between text-[12px] px-2.5 py-1.5 rounded-lg overflow-hidden">
                      <div className="absolute inset-0 bg-cobalt/[0.06]" style={{ width: `${(Number(r[2]) / max) * 100}%` }} />
                      <span className="relative truncate text-ink font-medium pr-2">{String(r[0])}</span>
                      <span className="relative text-ink-soft tabular-nums whitespace-nowrap">
                        <span className="font-bold text-ink">{Number(r[2]).toLocaleString()}</span> visitors
                        <span className="text-ink-soft/60"> · {Number(r[1]).toLocaleString()} views</span>
                      </span>
                    </li>
                  ));
                })()}
              </ul>
            ) : (
              <p className="text-[12px] text-ink-soft/60 py-3">
                No UTM- or click-id-tagged traffic in this window. Tag every ad and email link
                with utm_source / utm_medium / utm_campaign to populate this panel.
              </p>
            )}
            <p className="text-[11px] text-ink-soft/60 mt-3 leading-relaxed">
              Reach, not revenue — cross-reference the channel split above to see what converted.
              A source that shows big here and $0 there drove clicks that didn&rsquo;t buy.
            </p>
          </Panel>

          <p className="text-[11px] text-ink-soft/70">
            Attribution coverage: <strong>{sales.coverage.withClickAttr}</strong> of{' '}
            <strong>{sales.coverage.paid}</strong> paid orders carry click-level attribution,{' '}
            <strong>{sales.coverage.withReferrer}</strong> carry a first-touch referrer. Orders
            before 2026-08-24 mostly predate capture — their channel falls back to affiliate /
            practitioner / code signals, or &ldquo;Direct / untracked&rdquo;.
          </p>
        </div>
      )}

      {/* Abandoned carts — recoverable leads. DB-backed, so it renders even
          before PostHog read access is connected. */}
      <div className="mb-8">
        <Panel
          title="Abandoned carts · recoverable"
          right={`${openCount.toLocaleString()} open · ${money(openValueCents)} at risk`}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2 mb-4">
            <Stat label="Open carts" value={openCount.toLocaleString()} sub={`${money(openValueCents)} at risk`} />
            <Stat label="Recovered · 30d" value={recoveredCount.toLocaleString()} sub={`${money(recoveredValueCents)} reclaimed`} />
            <Stat label="Recovery rate" value={`${recoveryRate}%`} sub="recovered ÷ all carts" />
            <Stat
              label="Recovery email"
              value={recoveryEmailsEnabled ? 'On' : 'Off'}
              sub={recoveryEmailsEnabled ? 'auto-nudge live' : 'set flag to arm'}
              accent={recoveryEmailsEnabled ? 'emerald' : 'amber'}
            />
          </div>
          {recentCarts.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-cobalt/10">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-cobalt/[0.04] text-ink-soft/70">
                    <th className="text-left font-bold uppercase tracking-wider px-3 py-2 text-[10px]">Email</th>
                    <th className="text-right font-bold uppercase tracking-wider px-3 py-2 text-[10px]">Value</th>
                    <th className="text-right font-bold uppercase tracking-wider px-3 py-2 text-[10px]">Items</th>
                    <th className="text-right font-bold uppercase tracking-wider px-3 py-2 text-[10px]">Idle</th>
                    <th className="text-right font-bold uppercase tracking-wider px-3 py-2 text-[10px]">Nudged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cobalt/5">
                  {recentCarts.map((c, i) => (
                    <tr key={i} className="text-ink">
                      <td className="px-3 py-2 truncate max-w-[220px]">{c.email}</td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums">{money(c.subtotalCents)}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-soft">{c.itemCount}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-ink-soft">{ago(c.updatedAt)}</td>
                      <td className="px-3 py-2 text-right text-ink-soft">{c.lastEmailedAt ? '✓' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[12px] text-ink-soft/60 py-2">
              No abandoned carts captured yet — a cart appears here once a shopper enters their email at checkout without paying.
            </p>
          )}
        </Panel>
      </div>

      {!posthogReadConfigured ? (
        <ConnectCard />
      ) : (
        <div className="space-y-6">
          {/* Traffic trend (customer-facing; /admin excluded) */}
          <Panel title="Traffic · last 14 days" right={`${totalViews.toLocaleString()} views · ${totalVisitors.toLocaleString()} visitors`}>
            {traffic && traffic.length > 0 ? (
              <div className="flex items-end gap-1 h-32 mt-2">
                {traffic.map((r, i) => (
                  <Bar
                    key={i}
                    heightPct={Math.max(2, (Number(r[1]) / maxViews) * 100)}
                    tip={`${String(r[0]).slice(5, 10)} · ${Number(r[1]).toLocaleString()} views · ${Number(r[2]).toLocaleString()} visitors`}
                  />
                ))}
              </div>
            ) : <Empty />}
            {adminViews > 0 && (
              <p className="text-[11px] text-ink-soft/60 mt-3">
                Internal <code className="text-[11px] bg-cream px-1 py-0.5 rounded">/admin</code> views (tracked separately, excluded above):{' '}
                <span className="font-bold text-ink-soft">{adminViews.toLocaleString()}</span>
              </p>
            )}
          </Panel>

          {/* Conversion funnel */}
          <Panel title="Conversion funnel · last 14 days">
            <div className="space-y-2.5 mt-2">
              {funnel.map((s, i) => {
                const pctOfTop = Math.round((s.count / funnelTop) * 100);
                const stepConv = i === 0 ? null : funnel[i - 1].count ? Math.round((s.count / funnel[i - 1].count) * 100) : 0;
                return (
                  <div key={s.event}>
                    <div className="flex items-center justify-between text-[12px] mb-1">
                      <span className="font-bold text-ink">{s.label}</span>
                      <span className="text-ink-soft tabular-nums">
                        {s.count.toLocaleString()}{stepConv !== null && <span className="text-ink-soft/60"> · {stepConv}% from prev</span>}
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-cobalt/10 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-cobalt to-[#5078FF]" style={{ width: `${pctOfTop}%` }} />
                    </div>
                  </div>
                );
              })}
              <p className="text-[11px] text-ink-soft/70 pt-1">Populates as commerce events accumulate (just shipped).</p>
            </div>
          </Panel>

          <div className="grid lg:grid-cols-2 gap-6">
            <Panel title="Top pages · 7 days">
              <List rows={topPages} />
            </Panel>
            <Panel title="Traffic sources · 7 days">
              <List rows={sources} />
            </Panel>
          </div>

          <p className="text-[11px] text-ink-soft/70">
            Full session replays, custom funnels &amp; cohorts:{' '}
            <a href={POSTHOG_APP} target="_blank" rel="noopener noreferrer" className="text-cobalt font-bold hover:underline">open PostHog ↗</a>
          </p>

          {/* Deploy marker — makes a stale tab self-evident. If the build hash
              here doesn't match the latest deploy, the tab predates it. */}
          <p className="text-[10px] text-ink-soft/40 tabular-nums">
            Rendered {new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC in {Date.now() - renderStart}ms · build{' '}
            {(process.env.RENDER_GIT_COMMIT ?? 'dev').slice(0, 7)}
          </p>
        </div>
      )}
    </main>
  );
}

/** Chart bar with an instant CSS tooltip. The old version relied on the
 *  native `title` attribute, which waits ~1s, renders tiny, and never fires
 *  on touch — "when I hover over the graphs no data shows". This one is a
 *  styled label that appears on hover with no delay. */
function Bar({ heightPct, tip, href }: { heightPct: number; tip: string; href?: string }) {
  const inner = (
    <>
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-20 whitespace-nowrap rounded-lg bg-ink text-white text-[10px] font-bold px-2 py-1 shadow-lg">
        {tip}
      </div>
      <div
        className="rounded-t bg-cobalt/80 group-hover:bg-cobalt transition-colors"
        style={{ height: `${heightPct}%`, minHeight: '2px' }}
      />
    </>
  );
  return href ? (
    <Link href={href} className="relative flex-1 h-full flex flex-col justify-end group">
      {inner}
    </Link>
  ) : (
    <div className="relative flex-1 h-full flex flex-col justify-end group">{inner}</div>
  );
}

function Stat({
  label, value, sub, accent,
}: { label: string; value: string; sub: string; accent?: 'emerald' | 'amber' }) {
  const valueCls =
    accent === 'emerald' ? 'text-emerald-700' : accent === 'amber' ? 'text-amber-700' : 'text-ink';
  return (
    <div className="rounded-xl border border-cobalt/10 bg-cobalt/[0.02] p-3">
      <p className="text-[10px] tracking-[0.12em] uppercase font-bold text-ink-soft/60 mb-1.5">{label}</p>
      <p className={`font-display text-xl font-black tracking-tight leading-none ${valueCls}`}>{value}</p>
      <p className="text-[11px] text-ink-soft mt-1">{sub}</p>
    </div>
  );
}

// Compact "time since" for the idle column: 3m / 5h / 2d.
function ago(date: Date): string {
  const ms = Date.now() - new Date(date).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function Panel({ title, right, children }: { title: string; right?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-cobalt/10 bg-white p-5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] tracking-[0.16em] uppercase font-bold text-ink-soft/60">{title}</p>
        {right && <p className="text-[11px] font-bold text-ink-soft tabular-nums">{right}</p>}
      </div>
      {children}
    </div>
  );
}

/** Channel rows: bar length = revenue share; identity lives in the row label
 *  (one hue for magnitude — no color-coding of categories). */
function ChannelList({
  rows,
  rangeKey,
  activeChannel,
}: {
  rows: ChannelRow[];
  rangeKey: string;
  activeChannel: string | null;
}) {
  if (!rows.length) return <Empty />;
  const max = Math.max(1, ...rows.map((r) => r.revenueCents));
  return (
    <ul className="space-y-1.5 mt-2">
      {rows.map((r) => {
        const active = activeChannel === r.channel;
        return (
          <li key={r.channel}>
            {/* A channel row IS the drill-down: clicking applies it as the
                source filter (click again to clear). */}
            <Link
              href={`/admin/analytics?range=${rangeKey}${active ? '' : `&channel=${encodeURIComponent(r.channel)}`}`}
              className={`relative flex items-center justify-between text-[12px] px-2.5 py-1.5 rounded-lg overflow-hidden transition ${
                active ? 'ring-1 ring-cobalt' : 'hover:ring-1 hover:ring-cobalt/30'
              }`}
            >
              <div className="absolute inset-0 bg-cobalt/[0.06]" style={{ width: `${(r.revenueCents / max) * 100}%` }} />
              <span className="relative truncate text-ink font-medium pr-2">{r.channel}</span>
              <span className="relative text-ink-soft tabular-nums whitespace-nowrap">
                <span className="font-bold text-ink">{money(r.revenueCents)}</span>
                <span className="text-ink-soft/60"> · {r.orders}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Name / count / revenue table used for products, affiliates and codes. */
function MoneyTable({ rows, countLabel }: { rows: NamedRow[]; countLabel: string }) {
  return (
    <div className="overflow-x-auto mt-2 rounded-xl border border-cobalt/10">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="bg-cobalt/[0.04] text-ink-soft/70">
            <th className="text-left font-bold uppercase tracking-wider px-3 py-2 text-[10px]">Name</th>
            <th className="text-right font-bold uppercase tracking-wider px-3 py-2 text-[10px]">{countLabel}</th>
            <th className="text-right font-bold uppercase tracking-wider px-3 py-2 text-[10px]">Revenue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-cobalt/5">
          {rows.map((r) => (
            <tr key={r.name} className="text-ink">
              <td className="px-3 py-2 truncate max-w-[240px]">
                {r.href ? (
                  <Link href={r.href} className="text-cobalt font-medium hover:underline underline-offset-2">
                    {r.name}
                  </Link>
                ) : (
                  r.name
                )}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-ink-soft">{r.orders.toLocaleString()}</td>
              <td className="px-3 py-2 text-right font-bold tabular-nums">{money(r.revenueCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function List({ rows }: { rows: any[] | null }) {
  if (!rows || rows.length === 0) return <Empty />;
  const max = Math.max(1, ...rows.map((r) => Number(r[1])));
  return (
    <ul className="space-y-1.5 mt-2">
      {rows.map((r, i) => (
        <li key={i} className="relative flex items-center justify-between text-[12px] px-2.5 py-1.5 rounded-lg overflow-hidden">
          <div className="absolute inset-0 bg-cobalt/[0.06]" style={{ width: `${(Number(r[1]) / max) * 100}%` }} />
          <span className="relative truncate text-ink font-medium pr-2">{String(r[0]) || '—'}</span>
          <span className="relative text-ink-soft tabular-nums font-bold">{Number(r[1]).toLocaleString()}</span>
        </li>
      ))}
    </ul>
  );
}

function Empty() {
  return <p className="text-[12px] text-ink-soft/60 py-3">No data yet — check back once traffic accumulates.</p>;
}

function ConnectCard() {
  return (
    <div className="rounded-2xl border border-amber-300/50 bg-amber-50/60 overflow-hidden">
      <div className="p-6 sm:p-7">
        <p className="text-[10px] tracking-[0.2em] uppercase font-bold text-amber-700 mb-2">— One step left</p>
        <h2 className="font-display text-xl font-black text-ink tracking-tight mb-2">Connect read access to go native</h2>
        <p className="text-sm text-ink-soft leading-relaxed mb-4 max-w-2xl">
          Event capture is live. To render traffic, behavior and the conversion funnel <strong>here</strong> (not on posthog.com), PostHog needs a server-side read key — the public project key can only write.
        </p>
        <ol className="text-sm text-ink-soft space-y-1.5 mb-5 list-decimal pl-5 max-w-2xl">
          <li>PostHog → <strong>Settings → Personal API keys → Create</strong>, scopes <code className="text-[12px] bg-white px-1.5 py-0.5 rounded">query:read</code> + <code className="text-[12px] bg-white px-1.5 py-0.5 rounded">insight:read</code>.</li>
          <li>In Render → Environment, set <code className="text-[12px] bg-white px-1.5 py-0.5 rounded">POSTHOG_PERSONAL_API_KEY</code> and <code className="text-[12px] bg-white px-1.5 py-0.5 rounded">POSTHOG_PROJECT_ID</code> (Settings → Project).</li>
          <li>Redeploy — this page fills in automatically.</li>
        </ol>
        <a href={POSTHOG_APP} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition hover:opacity-95" style={{ background: 'linear-gradient(135deg, #2E4DDB 0%, #5078FF 50%, #2E4DDB 100%)' }}>
          Open PostHog ↗
        </a>
      </div>
    </div>
  );
}
