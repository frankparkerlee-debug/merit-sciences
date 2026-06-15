import Link from 'next/link';
import { prisma } from '@/lib/db';
import type { OrderStatus } from '@/lib/generated/prisma/index.js';

export const metadata = { title: 'Orders — Merit Admin' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

const STATUS_FILTERS: Array<{ key: string; label: string; status: OrderStatus | null }> = [
  { key: 'all',        label: 'All',                  status: null },
  { key: 'pending',    label: 'Pending payment',      status: 'PENDING_PAYMENT' as OrderStatus },
  { key: 'paid',       label: 'Paid · needs picking', status: 'PAID' as OrderStatus },
  { key: 'processing', label: 'Processing',           status: 'PROCESSING' as OrderStatus },
  { key: 'shipped',    label: 'Shipped',              status: 'SHIPPED' as OrderStatus },
  { key: 'delivered',  label: 'Delivered',            status: 'DELIVERED' as OrderStatus },
  { key: 'canceled',   label: 'Canceled',             status: 'CANCELED' as OrderStatus },
  { key: 'refunded',   label: 'Refunded',             status: 'REFUNDED' as OrderStatus },
];

function fmtMoney(cents: bigint | number): string {
  const n = typeof cents === 'bigint' ? Number(cents) : cents;
  return `$${(n / 100).toFixed(2)}`;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Compute today's KPIs in a single transaction. Returns counts +
 * averages for the dashboard strip at the top of the orders list.
 *
 * "Today" = any timestamp >= startOfDay. Counts use the appropriate
 * timestamp column for each metric (e.g. shippedAt for "Fulfilled today").
 */
async function computeKpis(startOfDay: Date): Promise<{
  ordersToday: number;
  itemsToday: number;
  refundsTodayCents: number;
  fulfilledToday: number;
  deliveredToday: number;
  avgFulfillmentMs: number | null;
}> {
  const [
    ordersToday,
    itemsAgg,
    refundedTodayAgg,
    fulfilledToday,
    deliveredToday,
    fulfilledRange,
  ] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: startOfDay }, status: { not: 'PENDING_PAYMENT' } } }),
    prisma.orderLine.aggregate({
      where: { order: { createdAt: { gte: startOfDay }, status: { not: 'PENDING_PAYMENT' } } },
      _sum: { qty: true },
    }),
    prisma.order.aggregate({
      where: { refundedAt: { gte: startOfDay } },
      _sum: { refundedCents: true },
    }),
    prisma.order.count({ where: { shippedAt: { gte: startOfDay } } }),
    prisma.order.count({ where: { deliveredAt: { gte: startOfDay } } }),
    prisma.order.findMany({
      where: { shippedAt: { gte: startOfDay } },
      select: { paidAt: true, shippedAt: true },
    }),
  ]);

  let avgFulfillmentMs: number | null = null;
  if (fulfilledRange.length > 0) {
    const totals = fulfilledRange.reduce((sum, o) => {
      if (o.paidAt && o.shippedAt) {
        return sum + (o.shippedAt.getTime() - o.paidAt.getTime());
      }
      return sum;
    }, 0);
    avgFulfillmentMs = Math.round(totals / fulfilledRange.length);
  }

  return {
    ordersToday,
    itemsToday: itemsAgg._sum.qty ?? 0,
    refundsTodayCents: Number(refundedTodayAgg._sum.refundedCents ?? 0),
    fulfilledToday,
    deliveredToday,
    avgFulfillmentMs,
  };
}

function fmtDuration(ms: number | null): string {
  if (ms === null) return '—';
  const hours = ms / (1000 * 60 * 60);
  if (hours < 1) return `${Math.round(ms / (1000 * 60))}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const statusKey = sp.status || 'all';
  const q = (sp.q || '').trim();
  const page = Math.max(1, parseInt(sp.page || '1', 10) || 1);
  const filter = STATUS_FILTERS.find((f) => f.key === statusKey) ?? STATUS_FILTERS[0];

  const where: any = {};
  if (filter.status) where.status = filter.status;
  if (q) {
    where.OR = [
      { customerEmail: { contains: q.toLowerCase(), mode: 'insensitive' } },
      { paypalOrderId: { contains: q, mode: 'insensitive' } },
      { customerName: { contains: q, mode: 'insensitive' } },
    ];
  }

  // KPI strip — "today" = start of local server day. Render runs UTC,
  // so this is effectively UTC today. Good enough for a small ops team
  // until we hook up timezone preferences.
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [orders, totalCount, statusCounts, todayKpis] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { lines: { take: 1 }, _count: { select: { lines: true } } },
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    computeKpis(startOfDay),
  ]);

  const countMap = new Map(statusCounts.map((s) => [s.status, s._count._all]));
  const totalAll = Array.from(countMap.values()).reduce((a, b) => a + b, 0);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <main className="max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-baseline justify-between gap-4 mb-6 flex-wrap">
        <div>
          <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">— Orders</p>
          <h1 className="font-display font-black text-ink tracking-[-0.025em] text-3xl sm:text-4xl">
            {totalCount.toLocaleString()} {filter.status ? filter.label.toLowerCase() : 'orders'}
            <span className="text-cobalt">.</span>
          </h1>
        </div>
        <Link
          href="/admin/import/orders"
          className="bg-white border border-cobalt/20 text-ink px-4 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase hover:border-cobalt/40 transition"
        >
          Import CSV
        </Link>
      </div>

      {/* KPI strip — today's metrics */}
      <div className="mb-6 rounded-2xl border border-cobalt/15 bg-white overflow-hidden">
        <div className="px-5 py-2 bg-cobalt/5 border-b border-cobalt/10 text-[10px] tracking-[0.18em] uppercase text-ink-soft font-bold flex items-center gap-2">
          <span>📅</span> Today
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-cobalt/10">
          <Kpi label="Orders" value={todayKpis.ordersToday.toLocaleString()} />
          <Kpi label="Items ordered" value={todayKpis.itemsToday.toLocaleString()} />
          <Kpi label="Returns" value={`$${(todayKpis.refundsTodayCents / 100).toFixed(2)}`} />
          <Kpi label="Orders fulfilled" value={todayKpis.fulfilledToday.toLocaleString()} />
          <Kpi label="Orders delivered" value={todayKpis.deliveredToday.toLocaleString()} />
          <Kpi label="Order → fulfillment" value={fmtDuration(todayKpis.avgFulfillmentMs)} />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-5 border-b border-cobalt/10 pb-4">
        {STATUS_FILTERS.map((f) => {
          const count = f.status ? (countMap.get(f.status) ?? 0) : totalAll;
          const active = f.key === filter.key;
          const href = `/admin/orders?status=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
          return (
            <Link
              key={f.key}
              href={href}
              className={`text-xs font-bold tracking-wide uppercase px-3 py-1.5 rounded-lg transition ${
                active
                  ? 'bg-ink text-white'
                  : 'bg-white border border-cobalt/15 text-ink-soft hover:text-ink hover:border-cobalt/30'
              }`}
            >
              {f.label}
              <span className={`ml-2 text-[10px] tabular-nums ${active ? 'text-white/70' : 'text-ink-soft/60'}`}>
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Search */}
      <form className="mb-5" method="GET">
        <input type="hidden" name="status" value={filter.key} />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by email, name, or PayPal order ID…"
          className="w-full max-w-md rounded-xl border border-cobalt/20 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
        />
      </form>

      {/* Order list — div-based grid so each row is a single semantic Link */}
      <div className="rounded-2xl border border-cobalt/15 bg-white overflow-hidden">
        {orders.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-ink-soft">No orders match this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Header row */}
            <div className="bg-cobalt/5 text-[10px] tracking-[0.18em] uppercase text-ink-soft font-bold grid grid-cols-[110px_130px_1fr_100px_110px_125px_125px] gap-3 px-5 py-3 min-w-[1100px]">
              <div>Date</div>
              <div>Order</div>
              <div>Customer</div>
              <div className="text-right">Total</div>
              <div>Payment</div>
              <div>Fulfillment</div>
              <div className="text-right">Items</div>
            </div>
            {/* Rows — each entire row is a Link */}
            {orders.map((o) => {
              const pay = paymentLabel(o.status);
              const ful = fulfillmentLabel(o.status);
              return (
                <Link
                  key={o.id}
                  href={`/admin/orders/${o.id}`}
                  className="grid grid-cols-[110px_130px_1fr_100px_110px_125px_125px] gap-3 px-5 py-4 border-t border-cobalt/5 hover:bg-cobalt/[0.02] transition items-center text-sm min-w-[1100px]"
                >
                  <div className="text-ink-soft tabular-nums">{fmtDate(o.createdAt)}</div>
                  <div className="font-mono text-xs text-cobalt font-bold truncate">
                    {o.paypalOrderId.slice(0, 12)}…
                  </div>
                  <div>
                    <div className="text-ink font-bold truncate">{o.customerName}</div>
                    <div className="text-[11px] text-ink-soft truncate">{o.customerEmail}</div>
                  </div>
                  <div className="text-right font-bold text-ink tabular-nums">{fmtMoney(o.totalCents)}</div>
                  <div>
                    <span className={`inline-block text-[10px] tracking-[0.10em] uppercase font-bold px-2 py-1 rounded border ${pay.cls}`}>
                      ● {pay.label}
                    </span>
                  </div>
                  <div>
                    <span className={`inline-block text-[10px] tracking-[0.10em] uppercase font-bold px-2 py-1 rounded border ${ful.cls}`}>
                      ● {ful.label}
                    </span>
                  </div>
                  <div className="text-right text-ink-soft tabular-nums">
                    {o._count.lines} {o._count.lines === 1 ? 'item' : 'items'}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between text-sm">
          <p className="text-ink-soft">
            Page {page} of {totalPages} · {totalCount.toLocaleString()} {totalCount === 1 ? 'order' : 'orders'}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/orders?status=${filter.key}${q ? `&q=${encodeURIComponent(q)}` : ''}&page=${page - 1}`}
                className="text-xs font-bold tracking-wider uppercase bg-white border border-cobalt/15 text-ink px-4 py-2 rounded-lg hover:border-cobalt/30 transition"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/orders?status=${filter.key}${q ? `&q=${encodeURIComponent(q)}` : ''}&page=${page + 1}`}
                className="text-xs font-bold tracking-wider uppercase bg-ink text-white px-4 py-2 rounded-lg hover:bg-cobalt transition"
              >
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3">
      <p className="text-[10px] tracking-[0.16em] uppercase text-ink-soft font-bold mb-1">{label}</p>
      <p className="font-display font-black text-ink tabular-nums text-xl tracking-tight">{value}</p>
    </div>
  );
}

/* Derived sub-statuses for the table — Shopify-style payment + fulfillment pills. */
function paymentLabel(status: OrderStatus): { label: string; cls: string } {
  switch (status) {
    case 'PENDING_PAYMENT':
      return { label: 'Pending', cls: 'bg-yellow-50 text-yellow-900 border-yellow-200' };
    case 'REFUNDED':
      return { label: 'Refunded', cls: 'bg-rose-50 text-rose-900 border-rose-200' };
    case 'PARTIALLY_REFUNDED':
      return { label: 'Part. refunded', cls: 'bg-rose-50 text-rose-900 border-rose-200' };
    case 'CANCELED':
      return { label: 'Canceled', cls: 'bg-gray-50 text-gray-700 border-gray-200' };
    default:
      return { label: 'Paid', cls: 'bg-emerald-50 text-emerald-900 border-emerald-200' };
  }
}

function fulfillmentLabel(status: OrderStatus): { label: string; cls: string } {
  switch (status) {
    case 'PROCESSING':
      return { label: 'Processing', cls: 'bg-cobalt/10 text-cobalt border-cobalt/20' };
    case 'SHIPPED':
      return { label: 'Fulfilled', cls: 'bg-blue-50 text-blue-900 border-blue-200' };
    case 'DELIVERED':
      return { label: 'Delivered', cls: 'bg-emerald-50 text-emerald-900 border-emerald-200' };
    case 'CANCELED':
    case 'REFUNDED':
      return { label: '—', cls: 'bg-gray-50 text-gray-500 border-gray-200' };
    default:
      return { label: 'Unfulfilled', cls: 'bg-yellow-50 text-yellow-900 border-yellow-200' };
  }
}

function StatusPill({ status }: { status: OrderStatus }) {
  const style: Record<string, string> = {
    PENDING_PAYMENT: 'bg-yellow-50 text-yellow-900 border-yellow-200',
    PAID: 'bg-amber-50 text-amber-900 border-amber-200',
    PROCESSING: 'bg-cobalt/10 text-cobalt border-cobalt/20',
    SHIPPED: 'bg-blue-50 text-blue-900 border-blue-200',
    DELIVERED: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    CANCELED: 'bg-gray-50 text-gray-700 border-gray-200',
    REFUNDED: 'bg-rose-50 text-rose-900 border-rose-200',
    PARTIALLY_REFUNDED: 'bg-rose-50 text-rose-900 border-rose-200',
  };
  return (
    <span className={`inline-block text-[10px] tracking-[0.12em] uppercase font-bold px-2 py-1 rounded border ${style[status] ?? 'bg-gray-50 text-gray-700 border-gray-200'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
