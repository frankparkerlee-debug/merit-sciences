import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { AffiliateActions } from './AffiliateActions';

export const metadata = { title: 'Affiliate — Merit Admin' };
export const dynamic = 'force-dynamic';

function fmtMoney(cents: bigint | number): string {
  const n = typeof cents === 'bigint' ? Number(cents) : cents;
  return `$${(n / 100).toFixed(2)}`;
}

function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

export default async function AffiliateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const affiliate = await prisma.affiliate.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          orderCommissions: true,
          customerLinks: true,
          payouts: true,
          clicks: true,
        },
      },
    },
  });
  if (!affiliate) notFound();

  // Performance: total commissions earned + recent commissions
  const [commissionTotal, recentCommissions] = await Promise.all([
    prisma.orderCommission.aggregate({
      where: { affiliateId: id },
      _sum: { commissionCents: true },
    }),
    prisma.orderCommission.findMany({
      where: { affiliateId: id },
      orderBy: { occurredAt: 'desc' },
      take: 20,
      include: {
        customerLink: {
          select: { customerEmail: true },
        },
      },
    }),
  ]);

  const totalEarned = Number(commissionTotal._sum.commissionCents ?? 0);
  const isSuspended = affiliate.status === 'SUSPENDED';
  const canDelete =
    affiliate._count.orderCommissions === 0 &&
    affiliate._count.customerLinks === 0 &&
    affiliate._count.payouts === 0;

  return (
    <main className="max-w-[1080px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      <Link
        href="/admin/affiliates"
        className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3 inline-block hover:underline underline-offset-4"
      >
        ← All affiliates
      </Link>

      <div className="flex items-baseline justify-between gap-4 mb-6 flex-wrap">
        <div>
          <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">— Affiliate</p>
          <h1 className="font-display font-black text-ink tracking-[-0.025em] text-3xl sm:text-4xl">
            {affiliate.name}
          </h1>
          <p className="text-sm text-ink-soft mt-1">{affiliate.email}</p>
        </div>
        <span
          className={`inline-block text-[10px] tracking-[0.14em] uppercase font-bold px-3 py-1.5 rounded-lg border ${
            isSuspended
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
          }`}
        >
          {affiliate.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* LEFT — details + recent commissions */}
        <div className="space-y-5">
          <section className="rounded-2xl border border-cobalt/15 bg-white p-6">
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">— Details</p>
            <dl className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
              <dt className="text-ink-soft">Referral slug</dt>
              <dd className="text-ink font-mono">/{affiliate.slug}</dd>
              <dt className="text-ink-soft">Discount code</dt>
              <dd className="text-cobalt font-mono font-bold uppercase">{affiliate.discountCode}</dd>
              <dt className="text-ink-soft">Joined</dt>
              <dd className="text-ink">{fmtDate(affiliate.createdAt)}</dd>
              {affiliate.suspendedAt && (
                <>
                  <dt className="text-ink-soft">Suspended at</dt>
                  <dd className="text-ink">{fmtDate(affiliate.suspendedAt)}</dd>
                </>
              )}
              {affiliate.suspendReason && (
                <>
                  <dt className="text-ink-soft">Suspend reason</dt>
                  <dd className="text-ink">{affiliate.suspendReason}</dd>
                </>
              )}
              {affiliate.socialUrl && (
                <>
                  <dt className="text-ink-soft">Social URL</dt>
                  <dd>
                    <a
                      href={affiliate.socialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cobalt hover:underline break-all"
                    >
                      {affiliate.socialUrl}
                    </a>
                  </dd>
                </>
              )}
              {affiliate.audienceSize !== null && (
                <>
                  <dt className="text-ink-soft">Audience size</dt>
                  <dd className="text-ink tabular-nums">{affiliate.audienceSize.toLocaleString()}</dd>
                </>
              )}
              {affiliate.pitch && (
                <>
                  <dt className="text-ink-soft col-span-2 mt-2">Pitch</dt>
                  <dd className="text-ink text-sm col-span-2 whitespace-pre-wrap">{affiliate.pitch}</dd>
                </>
              )}
            </dl>
          </section>

          {/* Recent commissions */}
          <section className="rounded-2xl border border-cobalt/15 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-cobalt/10">
              <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold">
                — Recent commissions ({affiliate._count.orderCommissions})
              </p>
            </div>
            {recentCommissions.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-ink-soft">No commissions yet.</div>
            ) : (
              <div>
                {recentCommissions.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-4 px-6 py-3 border-t border-cobalt/5 first:border-t-0 text-sm"
                  >
                    <div className="text-ink-soft tabular-nums text-xs w-24">
                      {c.occurredAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex-1 text-ink-soft truncate text-[11px]">
                      {c.customerLink.customerEmail}
                    </div>
                    <div className="text-right">
                      <div className="text-ink font-bold tabular-nums">
                        {fmtMoney(c.commissionCents)}
                      </div>
                      {c.status === 'CLAWED_BACK' && (
                        <div className="text-[10px] text-rose-700 font-bold uppercase tracking-wider">Clawed back</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT — performance + actions */}
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <section className="rounded-2xl border border-cobalt/15 bg-white p-5">
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">— Performance</p>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] tracking-wider uppercase text-ink-soft font-bold">Total earned</p>
                <p className="font-display font-black text-ink text-2xl tabular-nums">{fmtMoney(totalEarned)}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-wider uppercase text-ink-soft font-bold">Commissions</p>
                <p className="font-display font-black text-ink text-xl tabular-nums">{affiliate._count.orderCommissions}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-wider uppercase text-ink-soft font-bold">Locked customers</p>
                <p className="font-display font-black text-ink text-xl tabular-nums">{affiliate._count.customerLinks}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-wider uppercase text-ink-soft font-bold">Clicks</p>
                <p className="font-display font-black text-ink text-xl tabular-nums">{affiliate._count.clicks}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-wider uppercase text-ink-soft font-bold">Payouts</p>
                <p className="font-display font-black text-ink text-xl tabular-nums">{affiliate._count.payouts}</p>
              </div>
            </div>
          </section>

          <AffiliateActions id={affiliate.id} isSuspended={isSuspended} canDelete={canDelete} />
        </aside>
      </div>
    </main>
  );
}
