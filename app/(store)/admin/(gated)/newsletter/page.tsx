import Link from 'next/link';
import { prisma } from '@/lib/db';

export const metadata = { title: 'Newsletter — Merit Admin' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

const STATUS_FILTERS: Array<{ key: string; label: string }> = [
  { key: 'all',           label: 'All' },
  { key: 'subscribed',    label: 'Subscribed' },
  { key: 'unsubscribed',  label: 'Unsubscribed' },
];

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function AdminNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; source?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const statusKey = sp.status || 'all';
  const sourceKey = sp.source || 'all';
  const q = (sp.q || '').trim();
  const page = Math.max(1, parseInt(sp.page || '1', 10) || 1);

  const where: any = {};
  if (statusKey === 'subscribed') where.isSubscribed = true;
  if (statusKey === 'unsubscribed') where.isSubscribed = false;
  if (sourceKey !== 'all') where.source = sourceKey;
  if (q) {
    where.OR = [
      { email: { contains: q.toLowerCase(), mode: 'insensitive' } },
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [subscribers, totalCount, sourceGroups, statusCounts] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.newsletterSubscriber.count({ where }),
    prisma.newsletterSubscriber.groupBy({
      by: ['source'],
      _count: { _all: true },
    }),
    prisma.newsletterSubscriber.groupBy({
      by: ['isSubscribed'],
      _count: { _all: true },
    }),
  ]);

  const sourceCountMap = new Map(sourceGroups.map((s) => [s.source, s._count._all]));
  const allSources = Array.from(sourceCountMap.keys()).sort();
  const subscribedCount = statusCounts.find((s) => s.isSubscribed)?._count._all ?? 0;
  const unsubscribedCount = statusCounts.find((s) => !s.isSubscribed)?._count._all ?? 0;
  const totalAll = subscribedCount + unsubscribedCount;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  return (
    <main className="max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      <div className="flex items-baseline justify-between gap-4 mb-8 flex-wrap">
        <div>
          <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">— Newsletter</p>
          <h1 className="font-display font-black text-ink tracking-[-0.025em] text-3xl sm:text-4xl">
            {totalAll.toLocaleString()} {totalAll === 1 ? 'subscriber' : 'subscribers'}
            <span className="text-cobalt">.</span>
          </h1>
          <p className="text-xs text-ink-soft mt-1">
            {subscribedCount} active · {unsubscribedCount} unsubscribed
          </p>
        </div>
        <Link
          href="/admin/import/customers"
          className="bg-white border border-cobalt/20 text-ink px-4 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase hover:border-cobalt/40 transition"
        >
          Import CSV
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2 mb-3 border-b border-cobalt/10 pb-3">
        {STATUS_FILTERS.map((f) => {
          const count = f.key === 'all' ? totalAll : f.key === 'subscribed' ? subscribedCount : unsubscribedCount;
          const active = f.key === statusKey;
          const href = `/admin/newsletter?status=${f.key}${sourceKey !== 'all' ? `&source=${sourceKey}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`;
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

      {/* Source filter */}
      {allSources.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <Link
            href={`/admin/newsletter?status=${statusKey}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
            className={`text-[10px] font-bold tracking-wide uppercase px-2.5 py-1 rounded transition ${
              sourceKey === 'all'
                ? 'bg-cobalt text-white'
                : 'bg-cobalt/5 text-ink-soft hover:bg-cobalt/10'
            }`}
          >
            All sources
          </Link>
          {allSources.map((src) => {
            const count = sourceCountMap.get(src) ?? 0;
            const active = sourceKey === src;
            return (
              <Link
                key={src}
                href={`/admin/newsletter?status=${statusKey}&source=${src}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
                className={`text-[10px] font-bold tracking-wide uppercase px-2.5 py-1 rounded transition ${
                  active
                    ? 'bg-cobalt text-white'
                    : 'bg-cobalt/5 text-ink-soft hover:bg-cobalt/10'
                }`}
              >
                {src} <span className="opacity-60">{count}</span>
              </Link>
            );
          })}
        </div>
      )}

      <form className="mb-5" method="GET">
        <input type="hidden" name="status" value={statusKey} />
        {sourceKey !== 'all' && <input type="hidden" name="source" value={sourceKey} />}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by email or name…"
          className="w-full max-w-md rounded-xl border border-cobalt/20 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
        />
      </form>

      <div className="rounded-2xl border border-cobalt/15 bg-white overflow-hidden">
        {subscribers.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-ink-soft">
              {q ? 'No subscribers match this search.' : 'No newsletter subscribers yet. Import via /admin/import/customers.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="bg-cobalt/5 text-[10px] tracking-[0.18em] uppercase text-ink-soft font-bold grid grid-cols-[110px_1fr_120px_140px_100px] gap-3 px-5 py-3 min-w-[820px]">
              <div>Joined</div>
              <div>Email</div>
              <div>Name</div>
              <div>Source</div>
              <div className="text-right">Status</div>
            </div>
            {subscribers.map((s) => (
              <div
                key={s.id}
                className="grid grid-cols-[110px_1fr_120px_140px_100px] gap-3 px-5 py-3 border-t border-cobalt/5 hover:bg-cobalt/[0.02] transition items-center text-sm min-w-[820px]"
              >
                <div className="text-ink-soft tabular-nums text-xs">{fmtDate(s.createdAt)}</div>
                <div className="text-ink truncate">{s.email}</div>
                <div className="text-ink-soft text-xs truncate">
                  {[s.firstName, s.lastName].filter(Boolean).join(' ') || '—'}
                </div>
                <div className="text-[10px] tracking-wider uppercase font-bold text-cobalt">{s.source}</div>
                <div className="text-right">
                  <span
                    className={`inline-block text-[10px] tracking-[0.10em] uppercase font-bold px-2 py-0.5 rounded border ${
                      s.isSubscribed
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        : 'bg-rose-50 text-rose-900 border-rose-200'
                    }`}
                  >
                    {s.isSubscribed ? 'Active' : 'Unsubscribed'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-between text-sm">
          <p className="text-ink-soft">
            Page {page} of {totalPages} · {totalCount.toLocaleString()} matching
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/newsletter?status=${statusKey}${sourceKey !== 'all' ? `&source=${sourceKey}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}&page=${page - 1}`}
                className="text-xs font-bold tracking-wider uppercase bg-white border border-cobalt/15 text-ink px-4 py-2 rounded-lg hover:border-cobalt/30 transition"
              >
                ← Prev
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/newsletter?status=${statusKey}${sourceKey !== 'all' ? `&source=${sourceKey}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}&page=${page + 1}`}
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
