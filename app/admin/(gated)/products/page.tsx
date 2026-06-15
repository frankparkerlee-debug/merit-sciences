import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/db';
import type { ProductStatus, ProductChannel } from '@/lib/generated/prisma/index.js';
import { SeedButton } from './SeedButton';

export const metadata = { title: 'Products — Merit Admin' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

const STATUS_FILTERS: Array<{ key: string; label: string; status: ProductStatus | null }> = [
  { key: 'all',    label: 'All',    status: null },
  { key: 'active', label: 'Active', status: 'ACTIVE' as ProductStatus },
  { key: 'draft',  label: 'Draft',  status: 'DRAFT' as ProductStatus },
];

function fmtMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function channelLabel(c: ProductChannel): string {
  return c === 'BOTH' ? 'Both' : c === 'RUA' ? 'RUA' : 'Clinic';
}

export default async function AdminProductsPage({
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
      { handle: { contains: q.toLowerCase(), mode: 'insensitive' } },
      { title: { contains: q, mode: 'insensitive' } },
      { compound: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [products, totalCount, allCount, statusCounts] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where }),
    prisma.product.count(),
    prisma.product.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  const countMap = new Map(statusCounts.map((s) => [s.status, s._count._all]));
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <main className="max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-baseline justify-between gap-4 mb-6 flex-wrap">
        <div>
          <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">— Products</p>
          <h1 className="font-display font-black text-ink tracking-[-0.025em] text-3xl sm:text-4xl">
            {allCount.toLocaleString()} {allCount === 1 ? 'product' : 'products'}
            <span className="text-cobalt">.</span>
          </h1>
        </div>
        <Link
          href="/admin/products/new"
          className="bg-ink text-white px-5 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase hover:bg-cobalt transition"
        >
          + Add product
        </Link>
      </div>

      {/* Seed banner — only when DB is empty */}
      {allCount === 0 && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-[10px] tracking-[0.18em] uppercase text-amber-900 font-bold mb-2">
            — One-time migration
          </p>
          <p className="text-sm text-amber-900 mb-3 leading-relaxed">
            The Product table is empty. Click the button below to import the 18 products from{' '}
            <code className="text-xs bg-amber-100 px-1 py-0.5 rounded">content/products/*.json</code>{' '}
            into Supabase. This is the source of truth from here on — edits in admin save to the DB.
          </p>
          <SeedButton />
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-5 border-b border-cobalt/10 pb-4">
        {STATUS_FILTERS.map((f) => {
          const count = f.status ? (countMap.get(f.status) ?? 0) : allCount;
          const active = f.key === filter.key;
          const href = `/admin/products?status=${f.key}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
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
          placeholder="Search by handle, title, or compound…"
          className="w-full max-w-md rounded-xl border border-cobalt/20 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
        />
      </form>

      {/* Table */}
      <div className="rounded-2xl border border-cobalt/15 bg-white overflow-hidden">
        {products.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-ink-soft mb-3">
              {q ? 'No products match this search.' : 'No products yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="bg-cobalt/5 text-[10px] tracking-[0.18em] uppercase text-ink-soft font-bold grid grid-cols-[64px_1fr_110px_110px_120px_100px_110px] gap-3 px-5 py-3 min-w-[980px]">
              <div></div>
              <div>Product</div>
              <div>Status</div>
              <div>Channel</div>
              <div>Compound</div>
              <div className="text-right">Price</div>
              <div className="text-right">Segment</div>
            </div>
            {products.map((p) => (
              <Link
                key={p.handle}
                href={`/admin/products/${encodeURIComponent(p.handle)}`}
                className="grid grid-cols-[64px_1fr_110px_110px_120px_100px_110px] gap-3 px-5 py-3 border-t border-cobalt/5 hover:bg-cobalt/[0.02] transition items-center text-sm min-w-[980px]"
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-cream/60 flex items-center justify-center">
                  {p.imageUrl ? (
                    <Image
                      src={p.imageUrl}
                      alt={p.title}
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  ) : (
                    <span className="text-[9px] text-ink-soft">no img</span>
                  )}
                </div>
                <div>
                  <div className="text-ink font-bold truncate">{p.title}</div>
                  <div className="text-[11px] text-ink-soft truncate font-mono">/{p.handle}</div>
                </div>
                <div>
                  <span
                    className={`inline-block text-[10px] tracking-[0.10em] uppercase font-bold px-2 py-1 rounded border ${
                      p.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                <div className="text-ink-soft text-xs">{channelLabel(p.channel)}</div>
                <div className="text-ink-soft truncate text-xs">{p.compound}</div>
                <div className="text-right font-bold text-ink tabular-nums">{fmtMoney(p.priceCents)}</div>
                <div className="text-right text-ink-soft text-xs capitalize">{p.segment.toLowerCase()}</div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between text-sm">
          <p className="text-ink-soft">
            Page {page} of {totalPages} · {totalCount.toLocaleString()} {totalCount === 1 ? 'product' : 'products'}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/products?status=${statusKey}${q ? `&q=${encodeURIComponent(q)}` : ''}&page=${page - 1}`}
                className="text-xs font-bold tracking-wider uppercase bg-white border border-cobalt/15 text-ink px-4 py-2 rounded-lg hover:border-cobalt/30 transition"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/products?status=${statusKey}${q ? `&q=${encodeURIComponent(q)}` : ''}&page=${page + 1}`}
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
