import Link from 'next/link';
import { prisma } from '@/lib/db';

export const metadata = { title: 'Practitioner applications — Merit Admin' };
export const dynamic = 'force-dynamic';

const STATUS_TABS = [
  { key: 'pending',     label: 'Pending',     filter: 'PENDING' },
  { key: 'approved',    label: 'Approved',    filter: 'APPROVED' },
  { key: 'deactivated', label: 'Deactivated', filter: 'DEACTIVATED' },
  { key: 'rejected',    label: 'Rejected',    filter: 'REJECTED' },
  { key: 'all',         label: 'All',         filter: null },
] as const;

type Tab = typeof STATUS_TABS[number]['key'];

export default async function PractitionersAdminPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const requestedTab = (searchParams.status ?? 'pending') as Tab;
  const active = STATUS_TABS.find((t) => t.key === requestedTab) ?? STATUS_TABS[0];

  const where = active.filter ? { status: active.filter } : {};
  const [apps, counts] = await Promise.all([
    prisma.practitionerApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.practitionerApplication.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);
  const countByStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
  const totalCount = counts.reduce((sum, c) => sum + c._count._all, 0);

  return (
    <main className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      <Link
        href="/admin"
        className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3 inline-block hover:underline underline-offset-4"
      >
        ← Admin
      </Link>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-black text-ink tracking-[-0.025em] text-3xl mb-1">
            Practitioner applications<span className="text-cobalt">.</span>
          </h1>
          <p className="text-sm text-ink-soft leading-relaxed max-w-2xl">
            Submissions from <code className="text-xs bg-cobalt/5 px-1 rounded">/practitioners</code>.
            Review, then Approve (sends portal welcome via Resend) or Reject (polite decline).
          </p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-cobalt/10 pb-4">
        {STATUS_TABS.map((t) => {
          const count = t.filter ? (countByStatus[t.filter] ?? 0) : totalCount;
          const isActive = t.key === active.key;
          return (
            <Link
              key={t.key}
              href={`/admin/practitioners?status=${t.key}`}
              className={`text-xs font-bold tracking-wide uppercase px-3 py-1.5 rounded-lg transition ${
                isActive
                  ? 'bg-ink text-white'
                  : 'bg-white border border-cobalt/15 text-ink-soft hover:text-ink hover:border-cobalt/30'
              }`}
            >
              {t.label}
              <span
                className={`ml-2 text-[10px] tabular-nums ${
                  isActive ? 'text-white/70' : 'text-ink-soft/60'
                }`}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-cobalt/15 bg-white overflow-hidden">
        {apps.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-ink-soft">No applications in this view.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="bg-cobalt/[0.04] text-[10px] tracking-[0.18em] uppercase text-ink-soft font-bold grid grid-cols-[1.4fr_1.2fr_140px_120px_110px_100px] gap-3 px-5 py-3 min-w-[1000px]">
              <div>Practice</div>
              <div>Provider</div>
              <div>State / License</div>
              <div>Specialty</div>
              <div>Submitted</div>
              <div className="text-right">Status</div>
            </div>
            {apps.map((a) => (
              <Link
                key={a.id}
                href={`/admin/practitioners/${a.id}`}
                className="grid grid-cols-[1.4fr_1.2fr_140px_120px_110px_100px] gap-3 px-5 py-3 border-t border-cobalt/5 hover:bg-cobalt/[0.02] transition items-center text-sm min-w-[1000px]"
              >
                <div>
                  <div className="text-ink font-bold truncate">{a.practiceName}</div>
                  <div className="text-[10px] text-ink-soft truncate">{a.email}</div>
                </div>
                <div>
                  <div className="text-ink truncate">
                    {a.providerName}, {a.credentials}
                  </div>
                  <div className="text-[10px] text-ink-soft truncate">NPI {a.npi}</div>
                </div>
                <div className="text-[12px] text-ink-soft tabular-nums">
                  {a.state} · {a.licenseNumber}
                </div>
                <div className="text-[12px] text-ink-soft truncate">{a.specialty || '—'}</div>
                <div className="text-[11px] text-ink-soft tabular-nums">
                  {a.createdAt.toISOString().slice(0, 10)}
                </div>
                <div className="text-right">
                  <StatusPill status={a.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles =
    status === 'APPROVED'
      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
      : status === 'REJECTED'
        ? 'bg-rose-50 border-rose-300 text-rose-800'
        : status === 'DEACTIVATED'
          ? 'bg-ink/5 border-ink/20 text-ink-soft'
          : 'bg-amber-50 border-amber-300 text-amber-800';
  return (
    <span
      className={`inline-block text-[10px] tracking-[0.16em] uppercase font-bold px-2 py-0.5 rounded border ${styles}`}
    >
      {status}
    </span>
  );
}
