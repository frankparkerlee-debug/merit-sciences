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

  const [orders, totalCount, statusCounts] = await Promise.all([
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
  ]);

  const countMap = new Map(statusCounts.map((s) => [s.status, s._count._all]));
  const totalAll = Array.from(countMap.values()).reduce((a, b) => a + b, 0);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <main className="max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">— Orders</p>
        <h1 className="font-display font-black text-ink tracking-[-0.025em] text-3xl sm:text-4xl">
          {totalCount.toLocaleString()} {filter.status ? filter.label.toLowerCase() : 'orders'}
          <span className="text-cobalt">.</span>
        </h1>
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
          <div>
            {/* Header row */}
            <div className="bg-cobalt/5 text-[10px] tracking-[0.18em] uppercase text-ink-soft font-bold grid grid-cols-[120px_140px_1fr_90px_110px_130px] gap-4 px-5 py-3">
              <div>Date</div>
              <div>Order</div>
              <div>Customer</div>
              <div>Items</div>
              <div className="text-right">Total</div>
              <div className="text-right">Status</div>
            </div>
            {/* Rows — each entire row is a Link */}
            {orders.map((o) => (
              <Link
                key={o.id}
                href={`/admin/orders/${o.id}`}
                className="grid grid-cols-[120px_140px_1fr_90px_110px_130px] gap-4 px-5 py-4 border-t border-cobalt/5 hover:bg-cobalt/[0.02] transition items-center text-sm"
              >
                <div className="text-ink-soft tabular-nums">{fmtDate(o.createdAt)}</div>
                <div className="font-mono text-xs text-cobalt font-bold truncate">
                  {o.paypalOrderId.slice(0, 12)}…
                </div>
                <div>
                  <div className="text-ink font-bold truncate">{o.customerName}</div>
                  <div className="text-[11px] text-ink-soft truncate">{o.customerEmail}</div>
                </div>
                <div className="text-ink-soft">
                  {o._count.lines} {o._count.lines === 1 ? 'item' : 'items'}
                </div>
                <div className="text-right font-bold text-ink tabular-nums">{fmtMoney(o.totalCents)}</div>
                <div className="text-right">
                  <StatusPill status={o.status} />
                </div>
              </Link>
            ))}
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
