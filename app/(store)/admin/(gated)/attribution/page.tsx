import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Attribution / ROAS — Admin' };

// Orders that count as revenue (exclude pending/cancelled/fully-refunded).
const REVENUE_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'PARTIALLY_REFUNDED'];

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type Agg = { orders: number; revenue: number };

export default async function AttributionPage() {
  const orders = await prisma.order.findMany({
    where: { status: { in: REVENUE_STATUSES as any } },
    select: { paypalOrderId: true, totalCents: true },
  });

  // Resilient: if the order_attributions table isn't created yet, treat all
  // orders as untagged rather than 500.
  let attrs: { paypalOrderId: string; source: string | null; campaign: string | null }[] = [];
  try {
    attrs = await prisma.orderAttribution.findMany({
      select: { paypalOrderId: true, source: true, campaign: true },
    });
  } catch {
    attrs = [];
  }
  const attrMap = new Map(attrs.map((a) => [a.paypalOrderId, a]));

  const bySource = new Map<string, Agg>();
  const byCampaign = new Map<string, { source: string; orders: number; revenue: number }>();
  let attributedOrders = 0;
  let totalRevenue = 0;

  for (const o of orders) {
    const cents = Number(o.totalCents);
    totalRevenue += cents;
    const a = o.paypalOrderId ? attrMap.get(o.paypalOrderId) : undefined;
    const tagged = !!(a && a.source);
    const src = tagged ? a!.source!.trim() : 'direct / organic';
    const s = bySource.get(src) ?? { orders: 0, revenue: 0 };
    s.orders++;
    s.revenue += cents;
    bySource.set(src, s);
    if (tagged) attributedOrders++;
    if (a?.campaign) {
      const c = byCampaign.get(a.campaign) ?? { source: a.source ?? '—', orders: 0, revenue: 0 };
      c.orders++;
      c.revenue += cents;
      byCampaign.set(a.campaign, c);
    }
  }

  const sourceRows = [...bySource.entries()]
    .map(([source, v]) => ({ source, ...v }))
    .sort((x, y) => y.revenue - x.revenue);
  const campaignRows = [...byCampaign.entries()]
    .map(([campaign, v]) => ({ campaign, ...v }))
    .sort((x, y) => y.revenue - x.revenue);

  const attributedPct = orders.length ? Math.round((attributedOrders / orders.length) * 100) : 0;

  return (
    <main className="px-5 sm:px-6 lg:px-8 py-8 max-w-[1100px] mx-auto">
      <h1 className="text-2xl font-black tracking-tight text-ink mb-1">Attribution &amp; ROAS</h1>
      <p className="text-sm text-ink-soft mb-6 max-w-2xl">
        Revenue grouped by the source that <strong>acquired</strong> each customer (first-touch).
        Pair each row&rsquo;s revenue with your ad spend on that channel to get ROAS.
        {attrs.length === 0 && (
          <span className="text-amber-700"> &nbsp;Tracking starts once the <code>order_attributions</code> table is created — see setup below.</span>
        )}
      </p>

      {/* KPI band */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Kpi label="Total revenue" value={money(totalRevenue)} />
        <Kpi label="Orders" value={String(orders.length)} />
        <Kpi label="Tagged to a source" value={`${attributedPct}%`} sub={`${attributedOrders} orders`} />
        <Kpi label="Sources" value={String(sourceRows.filter((r) => r.source !== 'direct / organic').length)} />
      </div>

      {/* By source */}
      <Section title="By source">
        <Table head={['Source', 'Orders', 'Revenue', 'Avg order']}>
          {sourceRows.length === 0 ? (
            <EmptyRow cols={4} />
          ) : (
            sourceRows.map((r) => (
              <tr key={r.source} className="border-t border-cobalt/8">
                <td className="px-4 py-2.5 font-semibold text-ink">{r.source}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">{r.orders}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-bold text-ink">{money(r.revenue)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-ink-soft">{money(Math.round(r.revenue / r.orders))}</td>
              </tr>
            ))
          )}
        </Table>
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

      <p className="text-[11px] text-ink-muted mt-6 leading-relaxed">
        First-touch attribution: the ad/source that first brought the visitor in (UTMs or fbclid/ttclid/gclid),
        carried through the email gate to purchase. Revenue is gross (before refunds). All-time.
      </p>
    </main>
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
