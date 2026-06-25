import Link from 'next/link';
import { prisma } from '@/lib/db';
import type { DiscountType, DiscountMethod } from '@/lib/generated/prisma/index.js';
import { QuickDelete } from './QuickDelete';

export const metadata = { title: 'Discounts — Merit Admin' };
export const dynamic = 'force-dynamic';

const STATUS_FILTERS: Array<{ key: string; label: string }> = [
  { key: 'all',       label: 'All' },
  { key: 'active',    label: 'Active' },
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'expired',   label: 'Expired' },
  { key: 'disabled',  label: 'Disabled' },
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

function methodLabel(m: DiscountMethod): string {
  return m === 'AUTOMATIC' ? 'Automatic' : 'Code';
}

type Row = {
  source: 'manual' | 'affiliate';
  code: string;
  title: string;
  typeLabel: string;
  methodLabel: string;
  status: 'active' | 'scheduled' | 'expired' | 'disabled';
  endsAt: Date | null;
  // Route the row click. For affiliates, jump to affiliate detail page.
  href: string;
  // Manual discount id (or null for affiliate) — controls whether quick-delete is shown
  manualCode: string | null;
};

export default async function AdminDiscountsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const statusKey = sp.status || 'all';
  const q = (sp.q || '').trim();
  const now = new Date();

  // Pull manual discounts + affiliates in parallel
  const [discounts, affiliates] = await Promise.all([
    prisma.discount.findMany({
      orderBy: { createdAt: 'desc' },
    }),
    prisma.affiliate.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        discountCode: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  // Normalize both into a unified Row array
  const allRows: Row[] = [
    ...discounts.map<Row>((d) => {
      const isExpired = d.endsAt && d.endsAt < now;
      const isScheduled = d.startsAt > now;
      const status: Row['status'] =
        d.status === 'DISABLED'
          ? 'disabled'
          : isExpired
          ? 'expired'
          : isScheduled
          ? 'scheduled'
          : 'active';
      return {
        source: 'manual',
        code: d.code.toUpperCase(),
        title: d.title || fmtValue(d.type, d.value),
        typeLabel: fmtValue(d.type, d.value),
        methodLabel: methodLabel(d.method),
        status,
        endsAt: d.endsAt,
        href: `/admin/discounts/${encodeURIComponent(d.code)}`,
        manualCode: d.code,
      };
    }),
    ...affiliates
      .filter((a) => a.discountCode)
      .map<Row>((a) => ({
        source: 'affiliate',
        code: a.discountCode.toUpperCase(),
        title: `${a.name} · affiliate`,
        typeLabel: '10% off',
        methodLabel: 'Code',
        status: a.status === 'SUSPENDED' ? 'disabled' : 'active',
        endsAt: null,
        href: `/admin/affiliates/${a.id}`,
        manualCode: null,
      })),
  ];

  // Apply filter + search
  let rows = allRows;
  if (statusKey !== 'all') rows = rows.filter((r) => r.status === statusKey);
  if (q) {
    const needle = q.toLowerCase();
    rows = rows.filter((r) => r.code.toLowerCase().includes(needle) || r.title.toLowerCase().includes(needle));
  }

  // Authoritative usage (across both sources) — one groupBy on Order.
  // Orders persist discountCode UPPERCASED (see create-order route +
  // webhook), so we MUST query + key by uppercase or every count is 0.
  // r.code is already uppercased when the rows are built above.
  const codesUpper = allRows.map((r) => r.code);
  const usageMap = new Map<string, { count: number; revenueCents: number }>();
  if (codesUpper.length > 0) {
    const usage = await prisma.order.groupBy({
      by: ['discountCode'],
      where: { discountCode: { in: codesUpper }, status: { not: 'PENDING_PAYMENT' } },
      _count: { _all: true },
      _sum: { totalCents: true },
    });
    for (const u of usage) {
      if (u.discountCode) {
        usageMap.set(u.discountCode.toUpperCase(), {
          count: u._count._all,
          revenueCents: Number(u._sum.totalCents ?? 0),
        });
      }
    }
  }

  // Tab counts (unfiltered by search; filtered by status only when not "all")
  const counts = {
    all: allRows.length,
    active: allRows.filter((r) => r.status === 'active').length,
    scheduled: allRows.filter((r) => r.status === 'scheduled').length,
    expired: allRows.filter((r) => r.status === 'expired').length,
    disabled: allRows.filter((r) => r.status === 'disabled').length,
  };

  return (
    <main className="max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-baseline justify-between gap-4 mb-6 flex-wrap">
        <div>
          <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">— Discounts</p>
          <h1 className="font-display font-black text-ink tracking-[-0.025em] text-3xl sm:text-4xl">
            {allRows.length.toLocaleString()} {allRows.length === 1 ? 'discount' : 'discounts'}
            <span className="text-cobalt">.</span>
          </h1>
          <p className="text-xs text-ink-soft mt-1">
            {discounts.length} manual · {allRows.length - discounts.length} from affiliates
          </p>
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
          const count = (counts as any)[f.key] ?? 0;
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
        {rows.length === 0 ? (
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
            <div className="bg-cobalt/5 text-[10px] tracking-[0.18em] uppercase text-ink-soft font-bold grid grid-cols-[1fr_110px_110px_100px_100px_100px_60px] gap-3 px-5 py-3 min-w-[920px]">
              <div>Code / title</div>
              <div>Type</div>
              <div>Source</div>
              <div className="text-right">Used</div>
              <div className="text-right">Revenue</div>
              <div className="text-right">Status</div>
              <div></div>
            </div>
            {rows.map((r) => {
              const usage = usageMap.get(r.code) ?? { count: 0, revenueCents: 0 };
              const statusCls = statusPill(r.status);
              return (
                <div
                  key={r.source + ':' + r.code}
                  className="relative grid grid-cols-[1fr_110px_110px_100px_100px_100px_60px] gap-3 px-5 py-4 border-t border-cobalt/5 hover:bg-cobalt/[0.02] transition items-center text-sm min-w-[920px]"
                >
                  {/* Whole row click target except the delete button */}
                  <Link
                    href={r.href}
                    className="absolute inset-0 z-0"
                    aria-label={r.title}
                  />
                  <div className="relative z-10 pointer-events-none">
                    <div className="font-mono text-cobalt font-bold uppercase">{r.code}</div>
                    <div className="text-[11px] text-ink-soft truncate">
                      {r.title}
                      {r.endsAt && <> · ends {fmtDate(r.endsAt)}</>}
                    </div>
                  </div>
                  <div className="relative z-10 pointer-events-none text-ink-soft text-xs">{r.typeLabel}</div>
                  <div className="relative z-10 pointer-events-none">
                    <span
                      className={`inline-block text-[10px] tracking-[0.10em] uppercase font-bold px-2 py-0.5 rounded border ${
                        r.source === 'affiliate'
                          ? 'bg-cobalt/10 text-cobalt border-cobalt/20'
                          : 'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      {r.source === 'affiliate' ? 'Affiliate' : 'Manual'}
                    </span>
                  </div>
                  <div className="relative z-10 pointer-events-none text-right text-ink tabular-nums">{usage.count}</div>
                  <div className="relative z-10 pointer-events-none text-right font-bold text-ink tabular-nums">
                    ${(usage.revenueCents / 100).toFixed(2)}
                  </div>
                  <div className="relative z-10 pointer-events-none text-right">
                    <span className={`inline-block text-[10px] tracking-[0.10em] uppercase font-bold px-2 py-1 rounded border ${statusCls}`}>
                      {labelFor(r.status)}
                    </span>
                  </div>
                  {/* Quick-delete only for manual discounts */}
                  <div className="relative z-10 text-right">
                    {r.manualCode ? <QuickDelete code={r.manualCode} /> : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function statusPill(s: Row['status']): string {
  switch (s) {
    case 'active':
      return 'bg-emerald-50 text-emerald-900 border-emerald-200';
    case 'scheduled':
      return 'bg-amber-50 text-amber-900 border-amber-200';
    case 'expired':
      return 'bg-rose-50 text-rose-900 border-rose-200';
    case 'disabled':
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

function labelFor(s: Row['status']): string {
  return s === 'active' ? 'Active' : s === 'scheduled' ? 'Scheduled' : s === 'expired' ? 'Expired' : 'Disabled';
}
