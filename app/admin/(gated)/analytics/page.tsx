import Link from 'next/link';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Analytics · Admin' };

// PostHog cloud app (US). EU users: https://eu.posthog.com
const POSTHOG_APP = 'https://us.posthog.com';

function money(cents: number) {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function AnalyticsPage() {
  const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Each query is independently resilient — a DB blip degrades to 0, never a
  // 500 (matches the rest of the admin).
  const [ordersTotal, orders30, revenueAgg, subscribers, activeAffiliates, pendingAgg] = await Promise.all([
    prisma.order.count({ where: { status: { not: 'PENDING_PAYMENT' } } }).catch(() => 0),
    prisma.order.count({ where: { status: { not: 'PENDING_PAYMENT' }, createdAt: { gte: since30 } } }).catch(() => 0),
    prisma.order.aggregate({ _sum: { totalCents: true }, where: { status: { notIn: ['PENDING_PAYMENT', 'REFUNDED'] } } }).catch(() => null),
    prisma.newsletterSubscriber.count({ where: { isSubscribed: true } }).catch(() => 0),
    prisma.affiliate.count({ where: { status: 'ACTIVE' } }).catch(() => 0),
    prisma.orderCommission.aggregate({ _sum: { commissionCents: true }, where: { status: 'PENDING' } }).catch(() => null),
  ]);

  const revenueCents = Number(revenueAgg?._sum?.totalCents ?? 0);
  const pendingCommissionCents = Number(pendingAgg?._sum?.commissionCents ?? 0);

  const kpis = [
    { label: 'Revenue', value: money(revenueCents), sub: 'paid orders, all-time' },
    { label: 'Orders', value: ordersTotal.toLocaleString(), sub: `${orders30.toLocaleString()} in last 30 days` },
    { label: 'Subscribers', value: subscribers.toLocaleString(), sub: 'newsletter list' },
    { label: 'Active affiliates', value: activeAffiliates.toLocaleString(), sub: 'approved' },
    { label: 'Commissions owed', value: money(pendingCommissionCents), sub: 'pending payout' },
  ];

  return (
    <main className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      <p className="text-[10px] tracking-[0.28em] uppercase text-cobalt font-bold mb-2">— Overview</p>
      <h1 className="font-display text-3xl font-black text-ink tracking-tight mb-1">Analytics</h1>
      <p className="text-sm text-ink-soft mb-8">Commerce snapshot from your store data. Traffic, behavior &amp; funnels live in PostHog.</p>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-cobalt/10 bg-white p-4">
            <p className="text-[10px] tracking-[0.14em] uppercase font-bold text-ink-soft/60 mb-2">{k.label}</p>
            <p className="font-display text-2xl font-black text-ink tracking-tight leading-none">{k.value}</p>
            <p className="text-[11px] text-ink-soft mt-1.5">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-cobalt/15 bg-white overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-cobalt via-[#5078FF] to-cobalt" />
        <div className="p-6 sm:p-7">
          <p className="text-[10px] tracking-[0.2em] uppercase font-bold text-cobalt mb-2">— Traffic &amp; behavior</p>
          <h2 className="font-display text-xl font-black text-ink tracking-tight mb-2">Powered by PostHog</h2>
          <p className="text-sm text-ink-soft leading-relaxed mb-5 max-w-2xl">
            Pageviews, traffic sources, conversion funnels, session recordings and click behavior are captured site-wide and live in your PostHog project. Set{' '}
            <code className="text-[12px] bg-cream px-1.5 py-0.5 rounded">NEXT_PUBLIC_POSTHOG_KEY</code> in Render to start the flow.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={POSTHOG_APP}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition hover:opacity-95"
              style={{ background: 'linear-gradient(135deg, #2E4DDB 0%, #5078FF 50%, #2E4DDB 100%)' }}
            >
              Open PostHog dashboard ↗
            </a>
            <Link href="/admin/orders" className="inline-flex items-center px-5 py-2.5 rounded-xl text-sm font-bold text-cobalt border border-cobalt/25 hover:bg-cobalt/[0.04] transition">
              View orders
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
