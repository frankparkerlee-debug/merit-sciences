import Link from 'next/link';
import { prisma } from '@/lib/db';
import { hogql, posthogReadConfigured } from '@/lib/posthog-query';

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

export default async function AnalyticsPage() {
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

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
  const [traffic, topPages, sources, funnelRows, adminViewsRows] = posthogReadConfigured
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
      ])
    : [null, null, null, null, null];
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

      {!posthogReadConfigured ? (
        <ConnectCard />
      ) : (
        <div className="space-y-6">
          {/* Traffic trend (customer-facing; /admin excluded) */}
          <Panel title="Traffic · last 14 days" right={`${totalViews.toLocaleString()} views · ${totalVisitors.toLocaleString()} visitors`}>
            {traffic && traffic.length > 0 ? (
              <div className="flex items-end gap-1 h-32 mt-2">
                {traffic.map((r, i) => (
                  // Bar is the direct flex child so its % height resolves
                  // against the h-32 row (a wrapper here collapses to 0).
                  <div
                    key={i}
                    className="flex-1 rounded-t bg-cobalt/80 hover:bg-cobalt transition-all"
                    style={{ height: `${Math.max(2, (Number(r[1]) / maxViews) * 100)}%`, minHeight: '2px' }}
                    title={`${String(r[0]).slice(0, 10)} · ${Number(r[1])} views`}
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
        </div>
      )}
    </main>
  );
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
