import Link from 'next/link';
import { prisma } from '@/lib/db';
import type { AffiliateStatus } from '@/lib/generated/prisma/index.js';

export const metadata = { title: 'Affiliates — Merit Admin' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

const STATUS_FILTERS: Array<{ key: string; label: string; status: AffiliateStatus | null }> = [
  { key: 'all',       label: 'All',       status: null },
  { key: 'active',    label: 'Active',    status: 'ACTIVE' as AffiliateStatus },
  { key: 'suspended', label: 'Suspended', status: 'SUSPENDED' as AffiliateStatus },
];

function fmtMoney(cents: bigint | number): string {
  const n = typeof cents === 'bigint' ? Number(cents) : cents;
  return `$${(n / 100).toFixed(2)}`;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function AdminAffiliatesPage({
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
      { email: { contains: q.toLowerCase(), mode: 'insensitive' } },
      { name: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q.toLowerCase(), mode: 'insensitive' } },
      { discountCode: { contains: q.toLowerCase(), mode: 'insensitive' } },
    ];
  }

  const [affiliates, totalCount, statusCounts] = await Promise.all([
    prisma.affiliate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        _count: { select: { orderCommissions: true, customerLinks: true } },
      },
    }),
    prisma.affiliate.count({ where }),
    prisma.affiliate.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  // Commission totals per affiliate — fetch in one query
  const affiliateIds = affiliates.map((a) => a.id);
  const commissionTotals = affiliateIds.length === 0 ? [] : await prisma.orderCommission.groupBy({
    by: ['affiliateId'],
    where: { affiliateId: { in: affiliateIds } },
    _sum: { commissionCents: true },
  });
  const totalsMap = new Map(commissionTotals.map((t) => [t.affiliateId, Number(t._sum.commissionCents ?? 0)]));

  const countMap = new Map(statusCounts.map((s) => [s.status, s._count._all]));
  const totalAll = Array.from(countMap.values()).reduce((a, b) => a + b, 0);
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <main className="max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">— Affiliates</p>
          <h1 className="font-display font-black text-ink tracking-[-0.025em] text-3xl sm:text-4xl">
            {totalCount.toLocaleString()} {filter.status ? filter.label.toLowerCase() : 'affiliates'}
            <span className="text-cobalt">.</span>
          </h1>
        </div>
        <Link
          href="/admin/affiliates/payouts"
          className="flex-none mt-1 inline-flex items-center bg-cobalt text-white font-bold tracking-[0.12em] uppercase text-[11px] px-4 py-2.5 rounded-lg hover:bg-ink transition-colors"
        >
          Payouts →
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-5 border-b border-cobalt/10 pb-4">
        {STATUS_FILTERS.map((f) => {
          const count = f.status ? (countMap.get(f.status) ?? 0) : totalAll;
          const active = f.key === filter.key;
          const href = `/admin/affiliates?status=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
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
          placeholder="Search by email, name, slug, or discount code…"
          className="w-full max-w-md rounded-xl border border-cobalt/20 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
        />
      </form>

      {/* List — div-grid so each row is a Link to the detail page */}
      <div className="rounded-2xl border border-cobalt/15 bg-white overflow-hidden">
        {affiliates.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-ink-soft">
              {q ? 'No affiliates match this search.' : 'No affiliates yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="bg-cobalt/5 text-[10px] tracking-[0.18em] uppercase text-ink-soft font-bold grid grid-cols-[110px_1fr_140px_90px_90px_100px_110px] gap-3 px-5 py-3 min-w-[1000px]">
              <div>Joined</div>
              <div>Name</div>
              <div>Slug / Code</div>
              <div className="text-right">Customers</div>
              <div className="text-right">Commissions</div>
              <div className="text-right">Earned</div>
              <div className="text-right">Status</div>
            </div>
            {affiliates.map((a) => (
              <Link
                key={a.id}
                href={`/admin/affiliates/${a.id}`}
                className="grid grid-cols-[110px_1fr_140px_90px_90px_100px_110px] gap-3 px-5 py-4 border-t border-cobalt/5 hover:bg-cobalt/[0.02] transition items-center text-sm min-w-[1000px]"
              >
                <div className="text-ink-soft tabular-nums">{fmtDate(a.createdAt)}</div>
                <div>
                  <div className="text-ink font-bold truncate">{a.name}</div>
                  <div className="text-[11px] text-ink-soft truncate">{a.email}</div>
                </div>
                <div>
                  <div className="text-[11px] text-ink-soft font-mono truncate">/{a.slug}</div>
                  <div className="text-[11px] text-cobalt font-mono font-bold truncate">{a.discountCode}</div>
                </div>
                <div className="text-right text-ink tabular-nums">{a._count.customerLinks}</div>
                <div className="text-right text-ink tabular-nums">{a._count.orderCommissions}</div>
                <div className="text-right font-bold text-ink tabular-nums">
                  {fmtMoney(totalsMap.get(a.id) ?? 0)}
                </div>
                <div className="text-right">
                  <AffiliateStatusPill status={a.status} />
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
            Page {page} of {totalPages} · {totalCount.toLocaleString()} {totalCount === 1 ? 'affiliate' : 'affiliates'}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/affiliates?status=${filter.key}${q ? `&q=${encodeURIComponent(q)}` : ''}&page=${page - 1}`}
                className="text-xs font-bold tracking-wider uppercase bg-white border border-cobalt/15 text-ink px-4 py-2 rounded-lg hover:border-cobalt/30 transition"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/affiliates?status=${filter.key}${q ? `&q=${encodeURIComponent(q)}` : ''}&page=${page + 1}`}
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

function AffiliateStatusPill({ status }: { status: AffiliateStatus }) {
  const cls = status === 'ACTIVE'
    ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
    : 'bg-rose-50 text-rose-900 border-rose-200';
  return (
    <span className={`inline-block text-[10px] tracking-[0.14em] uppercase font-bold px-2.5 py-1 rounded border ${cls}`}>
      {status}
    </span>
  );
}
