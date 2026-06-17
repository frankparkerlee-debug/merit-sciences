import Link from 'next/link';
import { prisma } from '@/lib/db';

export const metadata = { title: 'Customers — Merit Admin' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

function fmtMoney(cents: bigint | number): string {
  const n = typeof cents === 'bigint' ? Number(cents) : cents;
  return `$${(n / 100).toFixed(2)}`;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q || '').trim();
  const page = Math.max(1, parseInt(sp.page || '1', 10) || 1);

  const where: any = {};
  if (q) {
    where.OR = [
      { email: { contains: q.toLowerCase(), mode: 'insensitive' } },
      { name: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [customers, totalCount] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        orders: {
          select: { totalCents: true, status: true },
        },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  // Aggregate per-customer stats in-memory (cheap for 50 rows)
  const rows = customers.map((c) => {
    const validOrders = c.orders.filter((o) => o.status !== 'CANCELED' && o.status !== 'PENDING_PAYMENT');
    const totalSpent = validOrders.reduce((sum, o) => sum + Number(o.totalCents), 0);
    return {
      id: c.id,
      email: c.email,
      name: c.name,
      phone: c.phone,
      createdAt: c.createdAt,
      orderCount: validOrders.length,
      totalSpent,
    };
  });

  return (
    <main className="max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-baseline justify-between gap-4 mb-8 flex-wrap">
        <div>
          <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">— Customers</p>
          <h1 className="font-display font-black text-ink tracking-[-0.025em] text-3xl sm:text-4xl">
            {totalCount.toLocaleString()} {totalCount === 1 ? 'customer' : 'customers'}
            <span className="text-cobalt">.</span>
          </h1>
        </div>
        <Link
          href="/admin/import/customers"
          className="bg-white border border-cobalt/20 text-ink px-4 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase hover:border-cobalt/40 transition"
        >
          Import CSV
        </Link>
      </div>

      {/* Search */}
      <form className="mb-5" method="GET">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by email or name…"
          className="w-full max-w-md rounded-xl border border-cobalt/20 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
        />
      </form>

      {/* Table */}
      <div className="rounded-2xl border border-cobalt/15 bg-white overflow-hidden">
        {rows.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-ink-soft">
              {q ? 'No customers match this search.' : 'No customers yet. The first paid order will create one.'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-cobalt/5 text-[10px] tracking-[0.18em] uppercase text-ink-soft font-bold">
              <tr>
                <th className="px-5 py-3 text-left">First seen</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Phone</th>
                <th className="px-5 py-3 text-right">Orders</th>
                <th className="px-5 py-3 text-right">Total spent</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-cobalt/5 hover:bg-cobalt/[0.02] transition">
                  <td className="px-5 py-4 text-ink-soft tabular-nums">{fmtDate(c.createdAt)}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/orders?q=${encodeURIComponent(c.email)}`}
                        className="text-cobalt font-bold hover:underline underline-offset-4"
                      >
                        {c.email}
                      </Link>
                      <a
                        href={`mailto:${c.email}`}
                        title="Email this customer"
                        aria-label="Email this customer"
                        className="inline-flex items-center justify-center w-6 h-6 rounded text-ink-soft hover:text-cobalt hover:bg-cobalt/5 transition"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <rect x="3" y="5" width="18" height="14" rx="2" />
                          <polyline points="3 7 12 13 21 7" />
                        </svg>
                      </a>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-ink">{c.name}</td>
                  <td className="px-5 py-4 text-ink-soft tabular-nums">{c.phone || '—'}</td>
                  <td className="px-5 py-4 text-right text-ink tabular-nums">{c.orderCount}</td>
                  <td className="px-5 py-4 text-right font-bold text-ink tabular-nums">{fmtMoney(c.totalSpent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between text-sm">
          <p className="text-ink-soft">
            Page {page} of {totalPages} · {totalCount.toLocaleString()} {totalCount === 1 ? 'customer' : 'customers'}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/customers?${q ? `q=${encodeURIComponent(q)}&` : ''}page=${page - 1}`}
                className="text-xs font-bold tracking-wider uppercase bg-white border border-cobalt/15 text-ink px-4 py-2 rounded-lg hover:border-cobalt/30 transition"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/customers?${q ? `q=${encodeURIComponent(q)}&` : ''}page=${page + 1}`}
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
