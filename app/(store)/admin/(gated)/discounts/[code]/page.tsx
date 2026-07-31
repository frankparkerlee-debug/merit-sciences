import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import type { DiscountType, DiscountMethod } from '@/lib/generated/prisma/index.js';
import { DiscountActions } from './DiscountActions';

export const metadata = { title: 'Discount detail — Merit Admin' };
export const dynamic = 'force-dynamic';

function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
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

export default async function DiscountDetailPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: codeParam } = await params;
  const code = decodeURIComponent(codeParam).toLowerCase();

  const discount = await prisma.discount.findUnique({ where: { code } });
  if (!discount) notFound();

  // Orders store discountCode UPPERCASED (create-order route + webhook both
  // call .toUpperCase() before persisting). Must match case or count = 0.
  const codeUpper = code.toUpperCase();
  // Pull usage + recent orders that used this code
  const [usage, recentOrders] = await Promise.all([
    prisma.order.aggregate({
      where: { discountCode: codeUpper, status: { not: 'PENDING_PAYMENT' } },
      _count: { _all: true },
      _sum: { totalCents: true, discountCents: true },
    }),
    prisma.order.findMany({
      where: { discountCode: codeUpper, status: { not: 'PENDING_PAYMENT' } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        createdAt: true,
        paypalOrderId: true,
        customerName: true,
        customerEmail: true,
        totalCents: true,
        discountCents: true,
        status: true,
      },
    }),
  ]);

  const usedCount = usage._count._all;
  const revenueCents = Number(usage._sum.totalCents ?? 0);
  const totalSavedCents = Number(usage._sum.discountCents ?? 0);

  const now = new Date();
  const isDisabled = discount.status === 'DISABLED';
  const isExpired = !!discount.endsAt && discount.endsAt < now;
  const isScheduled = discount.startsAt > now;
  const isActive = !isDisabled && !isExpired && !isScheduled;

  return (
    <main className="max-w-[1080px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      <Link
        href="/admin/discounts"
        className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3 inline-block hover:underline underline-offset-4"
      >
        ← All discounts
      </Link>

      <div className="flex items-baseline justify-between mb-6 gap-4 flex-wrap">
        <div>
          <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">— Discount</p>
          <h1 className="font-display font-black text-ink tracking-[-0.025em] text-3xl sm:text-4xl font-mono uppercase">
            {discount.code}
          </h1>
          {discount.title && <p className="text-base text-ink-soft mt-2">{discount.title}</p>}
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-block text-[10px] tracking-[0.14em] uppercase font-bold px-3 py-1.5 rounded-lg border ${
              isDisabled
                ? 'bg-gray-50 text-gray-700 border-gray-200'
                : isExpired
                ? 'bg-rose-50 text-rose-900 border-rose-200'
                : isScheduled
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200'
            }`}
          >
            {isDisabled ? 'Disabled' : isExpired ? 'Expired' : isScheduled ? 'Scheduled' : 'Active'}
          </span>
          <Link
            href={`/admin/discounts/${encodeURIComponent(discount.code)}/edit`}
            className="bg-ink text-white px-4 py-2 rounded-lg text-xs font-bold tracking-wider uppercase hover:bg-cobalt transition"
          >
            Edit
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* LEFT: details + recent orders */}
        <div className="space-y-5">
          <section className="rounded-2xl border border-cobalt/15 bg-white p-6">
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">— Details</p>
            <dl className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
              <dt className="text-ink-soft">Type</dt>
              <dd className="text-ink font-bold">
                {fmtValue(discount.type, discount.value)}
                {discount.freeShipping && discount.type !== 'FREE_SHIPPING' && (
                  <span className="ml-2 text-[10px] tracking-[0.10em] uppercase font-bold px-2 py-0.5 rounded border bg-emerald-50 text-emerald-900 border-emerald-200">
                    + free shipping
                  </span>
                )}
              </dd>
              <dt className="text-ink-soft">Method</dt>
              <dd className="text-ink">{methodLabel(discount.method)}</dd>
              <dt className="text-ink-soft">Minimum purchase</dt>
              <dd className="text-ink">{discount.minPurchaseCents ? `$${(Number(discount.minPurchaseCents) / 100).toFixed(2)}` : 'None'}</dd>
              <dt className="text-ink-soft">Minimum quantity</dt>
              <dd className="text-ink">{discount.minQuantity ?? 'None'}</dd>
              <dt className="text-ink-soft">Max uses</dt>
              <dd className="text-ink">{discount.maxUses ?? 'Unlimited'}</dd>
              <dt className="text-ink-soft">One per customer</dt>
              <dd className="text-ink">{discount.oncePerCustomer ? 'Yes' : 'No'}</dd>
              {discount.customerEmail && (
                <>
                  <dt className="text-ink-soft">Restricted to</dt>
                  <dd className="text-ink font-mono text-xs">{discount.customerEmail}</dd>
                </>
              )}
              <dt className="text-ink-soft">Active from</dt>
              <dd className="text-ink">{fmtDate(discount.startsAt)}</dd>
              <dt className="text-ink-soft">Ends</dt>
              <dd className="text-ink">{discount.endsAt ? fmtDate(discount.endsAt) : 'No expiry'}</dd>
              <dt className="text-ink-soft">Created by</dt>
              <dd className="text-ink text-xs">{discount.createdByEmail ?? 'System'}</dd>
            </dl>
          </section>

          {/* Recent orders */}
          <section className="rounded-2xl border border-cobalt/15 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-cobalt/10">
              <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold">
                — Recent redemptions ({usedCount})
              </p>
            </div>
            {recentOrders.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-ink-soft">
                No redemptions yet.
              </div>
            ) : (
              <div>
                {recentOrders.map((o) => (
                  <Link
                    key={o.id}
                    href={`/admin/orders/${o.id}`}
                    className="flex items-center gap-4 px-6 py-3 border-t border-cobalt/5 first:border-t-0 hover:bg-cobalt/[0.02] transition text-sm"
                  >
                    <div className="text-ink-soft tabular-nums text-xs w-24">
                      {o.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex-1">
                      <div className="text-ink font-bold truncate">{o.customerName}</div>
                      <div className="text-[11px] text-ink-soft truncate">{o.customerEmail}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-ink font-bold tabular-nums">
                        ${(Number(o.totalCents) / 100).toFixed(2)}
                      </div>
                      <div className="text-[11px] text-emerald-700 tabular-nums">
                        -${(Number(o.discountCents) / 100).toFixed(2)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT: KPIs + actions */}
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <section className="rounded-2xl border border-cobalt/15 bg-white p-5">
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
              — Performance
            </p>
            <div className="space-y-3">
              <div>
                <p className="text-[10px] tracking-wider uppercase text-ink-soft font-bold">Redemptions</p>
                <p className="font-display font-black text-ink text-2xl tabular-nums">{usedCount}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-wider uppercase text-ink-soft font-bold">Revenue</p>
                <p className="font-display font-black text-ink text-2xl tabular-nums">
                  ${(revenueCents / 100).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[10px] tracking-wider uppercase text-ink-soft font-bold">Customer savings</p>
                <p className="font-display font-black text-rose-700 text-2xl tabular-nums">
                  -${(totalSavedCents / 100).toFixed(2)}
                </p>
              </div>
            </div>
          </section>

          <DiscountActions code={discount.code} isDisabled={isDisabled} />
        </aside>
      </div>
    </main>
  );
}
