import Link from 'next/link';
import { prisma } from '@/lib/db';
import type { DiscountStatus, DiscountType, DiscountMethod } from '@/lib/generated/prisma/index.js';

export const metadata = { title: 'Discounts — Merit Admin' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

const STATUS_FILTERS: Array<{ key: string; label: string }> = [
  { key: 'all',      label: 'All' },
  { key: 'active',   label: 'Active' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'expired',  label: 'Expired' },
  { key: 'disabled', label: 'Disabled' },
];

function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtValue(type: DiscountType, value: number): string {
  switch (type) {
    case 'PERCENT':
      return `${(value / 100).toFixed(value % 100 === 0 ? 0 : 1)}% off`;
    case 'FIXED_AMOUNT':
      return `$${(value / 100).toFixed(2)} off`;
    case 'FREE_SHIPPING':
      return 'Free shipping';
  }
}

function derivedStatus(d: { status: DiscountStatus; startsAt: Date; endsAt: Date | null }): {
  label: string;
  cls: string;
} {
  const now = new Date();
  if (d.status === 'DISABLED') return { label: 'Disabled', cls: 'bg-gray-50 text-gray-700 border-gray-200' };
  if (d.endsAt && d.endsAt < now) return { label: 'Expired', cls: 'bg-rose-50 text-rose-900 border-rose-200' };
  if (d.startsAt > now) return { label: 'Scheduled', cls: 'bg-amber-50 text-amber-900 border-amber-200' };
  return { label: 'Active', cls: 'bg-emerald-50 text-emerald-900 border-emerald-200' };
}

export default async function AdminDiscountsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const statusKey = sp.status || 'all';
  const q = (sp.q || '').trim();
  const page = Math.max(1, parseInt(sp.page || '1', 10) || 1);
  const now = new Date();

  // We compute "active/scheduled/expired" from dates rather than a stored
  // value, so the WHERE clause is built per filter rather than a simple
  // status: filter.
  let where: any = {};
  if (statusKey === 'active') {
    where = { status: 'ACTIVE', startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] };
  } else if (statusKey === 'scheduled') {
    where = { status: 'ACTIVE', startsAt: { gt: now } };
  } else if (statusKey === 'expired') {
    where = { status: 'ACTIVE', endsAt: { lt: now } };
  } else if (statusKey === 'disabled') {
    where = { status: 'DISABLED' };
  }
  if (q) {
    where.OR = [
      ...(where.OR ?? []),
      { code: { contains: q.toLowerCase(), mode: 'insensitive' } },
      { title: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [discounts, totalCount, allCount] = await Promise.all([
    prisma.discount.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.discount.count({ where }),
    prisma.discount.count(),
  ]);

  // Authoritative usage count — sum of Order rows that applied this code.
  // The denormalized usedCount on Discount can drift; this query is the
  // source of truth.
  const codes = discounts.map((d) => d.code);
  const usageMap = new Map<string, { count: number; revenueCents: number }>();
  if (codes.length > 0) {
    const usage = await prisma.order.groupBy({
      by: ['discountCode'],
      where: { discountCode: { in: codes }, status: { not: 'PENDING_PAYMENT' } },
      _count: { _all: true },
      _sum: { totalCents: true },
    });
    for (const u of usage) {
      if (u.discountCode) {
        usageMap.set(u.discountCode.toLowerCase(), {
          count: u._count._all,
          revenueCents: Number(u._sum.totalCents ?? 0),
        });
      }
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <main className="max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-baseline justify-between gap-4 mb-6 flex-wrap">
        <div>
          <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">— Discounts</p>
          <h1 className="font-display font-black text-ink tracking-[-0.025em] text-3xl sm:text-4xl">
            {allCount.toLocaleString()} {allCount === 1 ? 'discount' : 'discounts'}
            <span className="text-cobalt">.</span>
          </h1>
        </div>
        <Link
          href="/admin/discounts/new"
          className="bg-ink text-white px-5 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase hover:bg-cobalt transition"
        >
          + Create discount
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-5 border-b border-cobalt/10 pb-4">
        {STATUS_FILTERS.map((f) => {
          const active = f.key === statusKey;
          const href = `/admin/discounts?status=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
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
            </Link>
          );
        })}
      </div>

      {/* Search */}
      <form className="mb-5" method="GET">
        <input type="hidden" name="status" value={statusKey} />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by code or title…"
          className="w-full max-w-md rounded-xl border border-cobalt/20 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
        />
      </form>

      {/* Table */}
      <div className="rounded-2xl border border-cobalt/15 bg-white overflow-hidden">
        {discounts.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-ink-soft mb-3">
              {q ? 'No discounts match this search.' : 'No discounts yet.'}
            </p>
            {!q && (
              <Link href="/admin/discounts/new" className="text-sm font-bold text-cobalt hover:underline">
                Create your first discount →
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="bg-cobalt/5 text-[10px] tracking-[0.18em] uppercase text-ink-soft font-bold grid grid-cols-[1fr_120px_120px_110px_110px_110px] gap-3 px-5 py-3 min-w-[900px]">
              <div>Code / title</div>
              <div>Type</div>
              <div>Method</div>
              <div className="text-right">Used</div>
              <div className="text-right">Revenue</div>
              <div className="text-right">Status</div>
            </div>
            {discounts.map((d) => {
              const status = derivedStatus(d);
              const usage = usageMap.get(d.code.toLowerCase()) ?? { count: 0, revenueCents: 0 };
              return (
                <Link
                  key={d.id}
                  href={`/admin/discounts/${encodeURIComponent(d.code)}`}
                  className="grid grid-cols-[1fr_120px_120px_110px_110px_110px] gap-3 px-5 py-4 border-t border-cobalt/5 hover:bg-cobalt/[0.02] transition items-center text-sm min-w-[900px]"
                >
                  <div>
                    <div className="font-mono text-cobalt font-bold uppercase">{d.code}</div>
                    <div className="text-[11px] text-ink-soft truncate">
                      {d.title || fmtValue(d.type, d.value)}
                      {d.endsAt && <> · ends {fmtDate(d.endsAt)}</>}
                    </div>
                  </div>
                  <div className="text-ink-soft text-xs">{fmtValue(d.type, d.value)}</div>
                  <div className="text-ink-soft text-xs">{methodLabel(d.method)}</div>
                  <div className="text-right text-ink tabular-nums">{usage.count}</div>
                  <div className="text-right font-bold text-ink tabular-nums">
                    ${(usage.revenueCents / 100).toFixed(2)}
                  </div>
                  <div className="text-right">
                    <span className={`inline-block text-[10px] tracking-[0.10em] uppercase font-bold px-2 py-1 rounded border ${status.cls}`}>
                      {status.label}
                    </span>
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
            Page {page} of {totalPages} · {totalCount.toLocaleString()} {totalCount === 1 ? 'discount' : 'discounts'}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/discounts?status=${statusKey}${q ? `&q=${encodeURIComponent(q)}` : ''}&page=${page - 1}`}
                className="text-xs font-bold tracking-wider uppercase bg-white border border-cobalt/15 text-ink px-4 py-2 rounded-lg hover:border-cobalt/30 transition"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/discounts?status=${statusKey}${q ? `&q=${encodeURIComponent(q)}` : ''}&page=${page + 1}`}
                className="text-xs font-bold tracking-wider uppercase bg-white border border-cobalt/15 text-ink px-4 py-2 rounded-lg hover:border-cobalt/30 transition"
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

function methodLabel(m: DiscountMethod): string {
  return m === 'AUTOMATIC' ? 'Automatic' : 'Code';
}
