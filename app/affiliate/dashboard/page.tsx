import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentAffiliate } from '@/lib/affiliate-session';
import { prisma } from '@/lib/db';
import { tierForOrderCount, AFFILIATE_PROGRAM } from '@/lib/affiliate';

export const metadata = {
  title: 'Dashboard — Merit Sciences Affiliate',
};

export const dynamic = 'force-dynamic';

function fmtMoney(cents: bigint | number): string {
  const c = typeof cents === 'bigint' ? Number(cents) : cents;
  return `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(bp: number): string {
  return `${(bp / 100).toFixed(0)}%`;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function AffiliateDashboardPage() {
  const affiliate = await getCurrentAffiliate();
  if (!affiliate) redirect('/affiliate/login?next=/affiliate/dashboard');

  // ── Pull the data we need for the dashboard ──────────────────────
  const [
    clickCount,
    customerCount,
    lifetimeCommissions,
    last30Commissions,
    recentCommissions,
  ] = await Promise.all([
    prisma.click.count({ where: { affiliateId: affiliate.id } }),
    prisma.customerAffiliateLink.count({ where: { affiliateId: affiliate.id } }),
    prisma.orderCommission.findMany({
      where: { affiliateId: affiliate.id, status: { not: 'CLAWED_BACK' } },
      select: { commissionCents: true, status: true },
    }),
    prisma.orderCommission.findMany({
      where: {
        affiliateId: affiliate.id,
        status: { not: 'CLAWED_BACK' },
        occurredAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: { commissionCents: true, orderTotalCents: true },
    }),
    prisma.orderCommission.findMany({
      where: { affiliateId: affiliate.id },
      orderBy: { occurredAt: 'desc' },
      take: 10,
      select: {
        id: true,
        occurredAt: true,
        orderTotalCents: true,
        commissionCents: true,
        commissionRateBp: true,
        status: true,
      },
    }),
  ]);

  // Aggregate calculations
  const lifetimeEarnings = lifetimeCommissions.reduce(
    (sum, c) => sum + Number(c.commissionCents),
    0,
  );
  const lifetimePending = lifetimeCommissions
    .filter((c) => c.status === 'PENDING')
    .reduce((sum, c) => sum + Number(c.commissionCents), 0);
  const lifetimePayable = lifetimeCommissions
    .filter((c) => c.status === 'PAYABLE')
    .reduce((sum, c) => sum + Number(c.commissionCents), 0);
  const lifetimePaid = lifetimeCommissions
    .filter((c) => c.status === 'PAID')
    .reduce((sum, c) => sum + Number(c.commissionCents), 0);
  const last30OrderCount = last30Commissions.length;
  const last30Revenue = last30Commissions.reduce(
    (s, c) => s + Number(c.orderTotalCents),
    0,
  );
  const last30Earnings = last30Commissions.reduce(
    (s, c) => s + Number(c.commissionCents),
    0,
  );

  // Current tier — based on trailing-30-day order count
  const { tierName, rateBp } = tierForOrderCount(last30OrderCount);
  const nextTier = AFFILIATE_PROGRAM.tiers.find((t) => t.minOrders > last30OrderCount);
  const ordersToNextTier = nextTier ? nextTier.minOrders - last30OrderCount : 0;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://merit-sciences.onrender.com';
  const referralUrl = `${siteUrl}/?ref=${affiliate.slug}`;
  const discountCodePublic = affiliate.discountCode.toUpperCase();

  // ── UI ────────────────────────────────────────────────────────────
  return (
    <main className="bg-cream min-h-screen pb-24">
      {/* Header */}
      <div className="border-b border-cobalt/10 bg-white">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-1">
              — Affiliate portal
            </p>
            <h1 className="font-display font-black text-ink tracking-[-0.025em] text-2xl sm:text-3xl">
              Welcome, {affiliate.name.split(' ')[0]}<span className="text-cobalt">.</span>
            </h1>
          </div>
          <div className="flex items-center gap-5">
            <Link
              href="/affiliate/dashboard/settings"
              className="text-xs font-bold tracking-wider uppercase text-ink-soft hover:text-ink transition"
            >
              Settings
            </Link>
            <form action="/auth/logout" method="POST">
              <button
                type="submit"
                className="text-xs font-bold tracking-wider uppercase text-ink-soft hover:text-ink transition"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>

      {affiliate.status === 'SUSPENDED' && (
        <div className="bg-rose-50 border-b border-rose-200">
          <div className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-8 py-4">
            <p className="text-sm text-rose-900">
              <strong>Your account is suspended.</strong> You can still view your stats but won&rsquo;t earn commission on new orders. Contact support if you think this is a mistake.
            </p>
          </div>
        </div>
      )}

      <section className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-8 pt-10">
        {/* Tier banner */}
        <div className="rounded-3xl bg-gradient-to-br from-ink to-cobalt p-6 sm:p-8 text-white mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="md:col-span-2">
              <p className="text-[10px] tracking-[0.22em] uppercase opacity-70 font-bold mb-2">
                — Current tier
              </p>
              <h2 className="font-display font-black tracking-[-0.025em] text-4xl sm:text-5xl mb-3">
                {tierName} <span className="opacity-50 font-normal">·</span> {fmtPct(rateBp)}
              </h2>
              <p className="text-sm opacity-80 leading-relaxed">
                {nextTier
                  ? `${ordersToNextTier} more order${ordersToNextTier === 1 ? '' : 's'} in the next 30 days to reach ${nextTier.name} (${nextTier.commissionPct}%).`
                  : `Top tier. You're earning the maximum ${fmtPct(rateBp)} on every commissionable order.`}
              </p>
            </div>
            <div className="text-right md:text-right">
              <p className="text-[10px] tracking-[0.22em] uppercase opacity-70 font-bold mb-2">
                — Last 30 days
              </p>
              <p className="font-display text-3xl sm:text-4xl font-black tracking-tight">
                {last30OrderCount}
              </p>
              <p className="text-xs opacity-70 mt-1">commissionable orders</p>
            </div>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <StatTile label="Lifetime earnings" value={fmtMoney(lifetimeEarnings)} sublabel="all-time, gross" />
          <StatTile label="Pending" value={fmtMoney(lifetimePending)} sublabel="refund window open" />
          <StatTile label="Payable" value={fmtMoney(lifetimePayable)} sublabel="ready for next payout" />
          <StatTile label="Paid out" value={fmtMoney(lifetimePaid)} sublabel="completed transfers" />
        </div>

        {/* Engagement grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-10">
          <StatTile label="Clicks" value={String(clickCount)} sublabel="lifetime ref-link hits" />
          <StatTile label="Locked customers" value={String(customerCount)} sublabel="evergreen attribution" />
          <StatTile label="30-day revenue driven" value={fmtMoney(last30Revenue)} sublabel="commissionable base" />
        </div>

        {/* Share tools */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <ShareCard
            label="Your referral link"
            value={referralUrl}
            hint="Click goes to merit-sciences.onrender.com and sets a 30-day cookie. First-time purchase locks the customer to you forever."
          />
          <ShareCard
            label="Your discount code"
            value={discountCodePublic}
            hint="Your audience types this at checkout — they save 10%, you earn commission. Works alongside or instead of the link."
            mono
          />
        </div>

        {/* Recent activity */}
        <div className="rounded-2xl border border-cobalt/15 bg-white overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-cobalt/10 flex items-center justify-between">
            <h3 className="font-display font-black text-ink tracking-tight text-lg">
              Recent commissions
            </h3>
            <p className="text-xs text-ink-soft">
              {recentCommissions.length === 0 ? '0' : `${recentCommissions.length} most recent`}
            </p>
          </div>
          {recentCommissions.length === 0 ? (
            <div className="px-5 sm:px-6 py-10 text-center">
              <p className="text-sm text-ink-soft">
                No commissions yet. Share your link or code &mdash; the moment someone buys, it shows up here.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-cobalt/5 text-[10px] tracking-[0.18em] uppercase text-ink-soft font-bold">
                <tr>
                  <th className="px-5 sm:px-6 py-3 text-left">Date</th>
                  <th className="px-5 sm:px-6 py-3 text-right">Order</th>
                  <th className="px-5 sm:px-6 py-3 text-right">Rate</th>
                  <th className="px-5 sm:px-6 py-3 text-right">You earned</th>
                  <th className="px-5 sm:px-6 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentCommissions.map((c) => (
                  <tr key={c.id} className="border-t border-cobalt/5">
                    <td className="px-5 sm:px-6 py-3 text-ink-soft">{fmtDate(c.occurredAt)}</td>
                    <td className="px-5 sm:px-6 py-3 text-right text-ink">{fmtMoney(c.orderTotalCents)}</td>
                    <td className="px-5 sm:px-6 py-3 text-right text-ink-soft">{fmtPct(c.commissionRateBp)}</td>
                    <td className="px-5 sm:px-6 py-3 text-right font-bold text-ink">{fmtMoney(c.commissionCents)}</td>
                    <td className="px-5 sm:px-6 py-3 text-right">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Helpful nav */}
        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link href="/catalog" className="text-cobalt font-bold hover:underline">
            Browse the catalog &rarr;
          </Link>
          <Link href="/affiliate" className="text-ink-soft font-bold hover:text-ink hover:underline">
            Program details
          </Link>
        </div>
      </section>
    </main>
  );
}

function StatTile({
  label, value, sublabel,
}: { label: string; value: string; sublabel: string }) {
  return (
    <div className="rounded-2xl border border-cobalt/15 bg-white p-5">
      <p className="text-[10px] tracking-[0.18em] uppercase text-ink-soft font-bold mb-2">
        {label}
      </p>
      <p className="font-display font-black text-ink tracking-tight text-2xl sm:text-3xl">
        {value}
      </p>
      <p className="text-[11px] text-ink-soft mt-1.5 leading-tight">{sublabel}</p>
    </div>
  );
}

function ShareCard({
  label, value, hint, mono = false,
}: { label: string; value: string; hint: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-cobalt/15 bg-white p-6">
      <p className="text-[10px] tracking-[0.18em] uppercase text-ink-soft font-bold mb-3">
        {label}
      </p>
      <div className="rounded-xl bg-cobalt/5 border border-cobalt/15 px-4 py-3.5 mb-3 overflow-x-auto">
        <code className={`${mono ? 'text-xl' : 'text-sm'} text-ink font-bold tracking-tight whitespace-nowrap`}>
          {value}
        </code>
      </div>
      <p className="text-xs text-ink-soft leading-relaxed">{hint}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-900 border-amber-200',
    PAYABLE: 'bg-cobalt/10 text-cobalt border-cobalt/20',
    PAID: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    CLAWED_BACK: 'bg-rose-50 text-rose-900 border-rose-200',
  };
  return (
    <span className={`inline-block text-[10px] tracking-[0.12em] uppercase font-bold px-2 py-1 rounded border ${style[status] ?? 'bg-gray-50 text-gray-700 border-gray-200'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
