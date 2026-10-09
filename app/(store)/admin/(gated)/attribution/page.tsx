import Link from 'next/link';
import { prisma } from '@/lib/db';
import { classifyOrders } from '@/lib/order-channel';
import { posthogReadConfigured } from '@/lib/posthog-query';
import {
  FUNNEL_RANGES,
  clampDays,
  collapseTail,
  paidFunnel,
  paidOrdersByCampaign,
  type FunnelRow,
} from '@/lib/paid-funnel';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Attribution / ROAS — Admin' };

// Orders that count as revenue (exclude pending/cancelled/fully-refunded).
const REVENUE_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'PARTIALLY_REFUNDED'];

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type Agg = { orders: number; revenue: number };

export default async function AttributionPage({
  searchParams,
}: {
  searchParams?: { days?: string | string[] };
}) {
  const days = clampDays(searchParams?.days);
  const since = new Date(Date.now() - days * 86_400_000);
  const [orders, funnelRows, funnelOrders] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: REVENUE_STATUSES as any } },
      select: {
        paypalOrderId: true,
        totalCents: true,
        createdAt: true,
        customerEmail: true,
        affiliateId: true,
        discountCode: true,
        practitionerApplicationId: true,
      },
    }),
    posthogReadConfigured ? paidFunnel(days) : Promise.resolve(null),
    paidOrdersByCampaign(days),
  ]);

  // Resilient: if the order_attributions table isn't created yet, treat all
  // orders as untagged rather than 500.
  let attrs: {
    paypalOrderId: string;
    source: string | null;
    medium: string | null;
    campaign: string | null;
    clickId: string | null;
    referrer: string | null;
    heardFrom: string | null;
  }[] = [];
  try {
    attrs = await prisma.orderAttribution.findMany({
      select: { paypalOrderId: true, source: true, medium: true, campaign: true, clickId: true, referrer: true, heardFrom: true },
    });
  } catch {
    attrs = [];
  }
  const attrMap = new Map(attrs.map((a) => [a.paypalOrderId, a]));

  // Classify across the full history so returning customers inherit the
  // channel of their first order, then keep only the window.
  const withAttr = orders.map((o) => ({ ...o, attr: attrMap.get(o.paypalOrderId) ?? null }));
  const channels = classifyOrders(withAttr);
  const inWindow = withAttr.filter((o) => o.createdAt >= since);

  const byChannel = new Map<string, Agg>();
  const byCampaign = new Map<string, { source: string; orders: number; revenue: number }>();
  let unknownOrders = 0;
  let totalRevenue = 0;

  for (const o of inWindow) {
    const cents = Number(o.totalCents);
    totalRevenue += cents;
    const channel = channels.get(o) ?? 'Unknown';
    if (channel === 'Unknown' || channel === 'Returning: Unknown') unknownOrders++;
    const c = byChannel.get(channel) ?? { orders: 0, revenue: 0 };
    c.orders++;
    c.revenue += cents;
    byChannel.set(channel, c);
    const a = o.attr;
    if (a?.campaign) {
      const k = byCampaign.get(a.campaign) ?? { source: a.source ?? '—', orders: 0, revenue: 0 };
      k.orders++;
      k.revenue += cents;
      byCampaign.set(a.campaign, k);
    }
  }

  const channelRows = [...byChannel.entries()]
    .map(([channel, v]) => ({ channel, ...v }))
    .sort((x, y) => y.revenue - x.revenue);
  const campaignRows = [...byCampaign.entries()]
    .map(([campaign, v]) => ({ campaign, ...v }))
    .sort((x, y) => y.revenue - x.revenue);

  const knownPct = inWindow.length ? Math.round(((inWindow.length - unknownOrders) / inWindow.length) * 100) : 0;

  return (
    <main className="px-5 sm:px-6 lg:px-8 py-8 max-w-[1100px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-black tracking-tight text-ink">Attribution &amp; ROAS</h1>
        <div className="flex items-center gap-2 text-xs">
          {FUNNEL_RANGES.map((d) => (
            <Link
              key={d}
              prefetch={false}
              href={`/admin/attribution?days=${d}`}
              className={`px-2.5 py-1 rounded-full border ${
                d === days ? 'bg-ink text-white border-ink' : 'border-cobalt/15 text-ink-soft hover:border-cobalt/40'
              }`}
            >
              {d} days
            </Link>
          ))}
        </div>
      </div>

      {/* KPI band */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Kpi label="Revenue" value={money(totalRevenue)} />
        <Kpi label="Orders" value={String(inWindow.length)} />
        <Kpi label="Channel known" value={`${knownPct}%`} sub={`${inWindow.length - unknownOrders} orders`} />
        <Kpi label="Unknown" value={String(unknownOrders)} sub="no affiliate, code, click or referrer" />
      </div>

      <Section title={`By channel · last ${days} days`}>
        <Table head={['Channel', 'Orders', 'Revenue', 'Avg order']}>
          {channelRows.length === 0 ? (
            <EmptyRow cols={4} />
          ) : (
            channelRows.map((r) => (
              <tr key={r.channel} className="border-t border-cobalt/8">
                <td className="px-4 py-2.5 font-semibold text-ink">{r.channel}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">{r.orders}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-bold text-ink">{money(r.revenue)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">{money(Math.round(r.revenue / r.orders))}</td>
              </tr>
            ))
          )}
        </Table>
        <details className="mt-2 text-[11px] text-ink-muted leading-relaxed">
          <summary className="cursor-pointer">How to read this</summary>
          <p className="mt-1">
            Each order gets one channel, strongest signal first: affiliate credited, BHS vendor click, ad click
            (Google, Meta, Reddit…), private discount code, practitioner account, then The Assay, email, ChatGPT and
            other AI assistants, organic search, social (including Instagram and TikTok in-app browsers), and other
            referring sites. Rows marked <em>(said)</em> are the buyer&rsquo;s own answer on the confirmation page, used
            only when nothing else identifies the source. An order with none of these takes the channel of the
            customer&rsquo;s first order (<em>Returning</em>). <em>Unknown</em> is a first order with no signal and no answer. Revenue is gross, before refunds.
          </p>
        </details>
      </Section>

      {/* Paid traffic funnel: how far ad visitors get, from Merit's own data.
          The isolated Google Ads account carries no conversion tag by design,
          so this table is the only place these steps exist. */}
      <Section title={`Paid traffic funnel · last ${days} days`}>
        <p className="text-xs text-ink-muted mb-3">Visitors whose first page carried a utm_campaign or an ad click id.</p>
        {funnelRows === null ? (
          <div className="rounded-xl border border-cobalt/12 bg-white px-4 py-8 text-center text-sm text-ink-muted">
            {posthogReadConfigured
              ? 'PostHog did not answer. Reload in a minute.'
              : 'PostHog read access is not configured (POSTHOG_PERSONAL_API_KEY + POSTHOG_PROJECT_ID).'}
          </div>
        ) : (
          <FunnelTable rows={collapseTail(funnelRows)} orders={funnelOrders} />
        )}
        <p className="text-[11px] text-ink-muted mt-2 leading-relaxed">
          Steps are PostHog sessions on meritsciences.com, counted once per visitor: <em>Stayed</em> = left the landing page after 10 s or more;
          <em> Engaged</em> = clicked anything on the catalog other than the subscribe popup. Orders and revenue come from Merit&rsquo;s order
          attribution, not from the ad platform. <em>Search partners</em> is Google&rsquo;s syndicated network (parked domains, in-app search),
          not google.com results.
        </p>
      </Section>

      {/* By campaign */}
      <Section title="By campaign">
        <Table head={['Campaign', 'Source', 'Orders', 'Revenue']}>
          {campaignRows.length === 0 ? (
            <EmptyRow cols={4} />
          ) : (
            campaignRows.map((r) => (
              <tr key={r.campaign} className="border-t border-cobalt/8">
                <td className="px-4 py-2.5 font-semibold text-ink">{r.campaign}</td>
                <td className="px-4 py-2.5 text-ink-soft">{r.source}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">{r.orders}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-bold text-ink">{money(r.revenue)}</td>
              </tr>
            ))
          )}
        </Table>
      </Section>

    </main>
  );
}

const FUNNEL_HEAD = ['Campaign', 'Source', 'Landed', 'Stayed', 'Catalog', 'Engaged', 'Product', 'Cart', 'Checkout', 'Orders', 'Revenue'];

function FunnelTable({ rows, orders }: { rows: FunnelRow[]; orders: Map<string, { orders: number; revenueCents: number }> }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-cobalt/12 bg-white px-4 py-8 text-center text-sm text-ink-muted">
        No paid landings in this window.
      </div>
    );
  }
  // Orders are known per campaign, not per source; show them on the
  // campaign's first row so the column sums correctly.
  const seen = new Set<string>();
  return (
    <div className="overflow-x-auto rounded-xl border border-cobalt/12 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-cobalt/5 text-[10px] tracking-[0.14em] uppercase text-ink-soft font-bold">
          <tr>
            {FUNNEL_HEAD.map((h, i) => (
              <th key={h} className={`px-3 py-2.5 whitespace-nowrap ${i < 2 ? 'text-left' : 'text-right'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const first = !seen.has(r.campaign);
            seen.add(r.campaign);
            const o = first ? orders.get(r.campaign) : undefined;
            const cell = (n: number, strong = false) => (
              <td className={`px-3 py-2 text-right tabular-nums ${n === 0 ? 'text-ink-muted' : strong ? 'font-bold text-ink' : 'text-ink-soft'}`}>
                {n}
              </td>
            );
            return (
              <tr key={`${r.campaign}|${r.source}|${i}`} className={`border-t ${first ? 'border-cobalt/15' : 'border-cobalt/8'}`}>
                <td className="px-3 py-2 font-semibold text-ink whitespace-nowrap">{first ? r.campaign : ''}</td>
                <td className="px-3 py-2 text-ink-soft whitespace-nowrap max-w-[220px] truncate" title={r.source}>{r.source}</td>
                {cell(r.landed, true)}
                {cell(r.stayed)}
                {cell(r.catalog)}
                {cell(r.engaged)}
                {cell(r.product)}
                {cell(r.addToCart)}
                {cell(r.checkout)}
                <td className={`px-3 py-2 text-right tabular-nums ${o?.orders ? 'font-bold text-ink' : 'text-ink-muted'}`}>
                  {first ? (o?.orders ?? 0) : ''}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums ${o?.revenueCents ? 'font-bold text-ink' : 'text-ink-muted'}`}>
                  {first ? money(o?.revenueCents ?? 0) : ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-cobalt/12 bg-white p-4">
      <p className="text-[10px] tracking-[0.16em] uppercase text-ink-soft font-bold">{label}</p>
      <p className="text-2xl font-black text-ink mt-1 tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-ink-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-[11px] tracking-[0.18em] uppercase text-cobalt font-bold mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-cobalt/12 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-cobalt/5 text-[10px] tracking-[0.14em] uppercase text-ink-soft font-bold">
          <tr>
            {head.map((h, i) => (
              <th key={h} className={`px-4 py-2.5 ${i === 0 ? 'text-left' : i === 1 && head.length === 4 && h === 'Source' ? 'text-left' : 'text-right'}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function EmptyRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="px-4 py-8 text-center text-sm text-ink-muted">
        No tagged orders yet. Tag your ad links with <code>?utm_source=meta&amp;utm_campaign=…</code> and orders will appear here.
      </td>
    </tr>
  );
}
