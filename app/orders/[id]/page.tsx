import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';

export const metadata = { title: 'Your order — Merit Sciences' };
export const dynamic = 'force-dynamic';

function fmtMoney(cents: bigint | number): string {
  const n = typeof cents === 'bigint' ? Number(cents) : cents;
  return `$${(n / 100).toFixed(2)}`;
}
function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default async function CustomerOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;
  if (!token) {
    return <TokenError />;
  }

  // Verify token — must match order, not expired, not already used
  const tokenRow = await prisma.orderLookupToken.findUnique({
    where: { token },
    include: {
      order: {
        include: { lines: true },
      },
    },
  });
  if (!tokenRow || tokenRow.orderId !== id || tokenRow.expiresAt < new Date()) {
    return <TokenError expired={tokenRow ? tokenRow.expiresAt < new Date() : false} />;
  }

  // Mark used (single-use is friendlier as "first-tap timestamps it";
  // we allow re-views within the 24h window so customers don't get
  // stuck if they close the tab)
  if (!tokenRow.usedAt) {
    await prisma.orderLookupToken.update({
      where: { id: tokenRow.id },
      data: { usedAt: new Date() },
    });
  }

  const order = tokenRow.order;

  return (
    <main className="bg-cream min-h-screen pb-24">
      {/* Header */}
      <div className="border-b border-cobalt/10 bg-white">
        <div className="max-w-[720px] mx-auto px-5 sm:px-6 lg:px-8 py-5">
          <Link href="/" className="font-display font-black text-ink text-base tracking-[-0.02em]">
            Merit Sciences
          </Link>
        </div>
      </div>

      <section className="max-w-[720px] mx-auto px-5 sm:px-6 lg:px-8 pt-10">
        <p className="text-[10px] tracking-[0.28em] uppercase text-cobalt font-bold mb-3">— Your order</p>
        <h1
          className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95] mb-3"
          style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}
        >
          {order.status === 'DELIVERED' ? 'Delivered' : order.status === 'SHIPPED' ? 'On the way' : order.status === 'REFUNDED' ? 'Refunded' : 'Order received'}<span className="text-cobalt">.</span>
        </h1>
        <p className="text-sm text-ink-soft mb-2">
          Order <span className="font-mono text-ink">{order.paypalOrderId}</span>
        </p>
        <p className="text-sm text-ink-soft">{fmtDate(order.createdAt)}</p>

        {/* Status timeline */}
        <div className="mt-8 rounded-2xl border border-cobalt/15 bg-white p-6">
          <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-4">— Status</p>
          <ol className="space-y-3">
            <TimelineStep label="Order received" date={order.paidAt} active />
            <TimelineStep label="Processing" date={order.processingAt} active={!!order.processingAt} />
            <TimelineStep label="Shipped from Dallas" date={order.shippedAt} active={!!order.shippedAt} />
            <TimelineStep label="Delivered" date={order.deliveredAt} active={!!order.deliveredAt} />
            {order.refundedAt && <TimelineStep label="Refunded" date={order.refundedAt} active />}
          </ol>

          {order.trackingNumber && order.shippingCarrier && (
            <div className="mt-6 pt-5 border-t border-cobalt/10">
              <p className="text-[10px] tracking-[0.22em] uppercase text-ink-soft font-bold mb-2">— Tracking</p>
              <p className="text-sm text-ink mb-1">
                <strong>{order.shippingCarrier.toUpperCase()}</strong> · <span className="font-mono">{order.trackingNumber}</span>
              </p>
              {order.trackingUrl && (
                <a
                  href={order.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-cobalt font-bold hover:underline"
                >
                  Track package on {order.shippingCarrier.toUpperCase()} ↗
                </a>
              )}
            </div>
          )}
        </div>

        {/* What ships */}
        <div className="mt-6 rounded-2xl border border-cobalt/15 bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-cobalt/10">
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold">— What ships</p>
          </div>
          <ul className="divide-y divide-cobalt/5">
            {order.lines.map((l) => (
              <li key={l.id} className="px-6 py-4 flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-ink">{l.title}</p>
                  <p className="text-[11px] text-ink-soft">{l.bundleLabel} · Qty {l.qty}</p>
                </div>
                <p className="text-sm text-ink font-bold tabular-nums whitespace-nowrap">{fmtMoney(Number(l.unitCents) * l.qty)}</p>
              </li>
            ))}
          </ul>
          <div className="px-6 py-4 border-t border-cobalt/10 bg-cobalt/[0.02] space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-ink-soft">Subtotal</span><span className="tabular-nums">{fmtMoney(order.subtotalCents)}</span></div>
            {Number(order.discountCents) > 0 && (
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Discount{order.discountCode ? ` (${order.discountCode})` : ''}</span>
                <span className="tabular-nums">-{fmtMoney(order.discountCents)}</span>
              </div>
            )}
            <div className="flex justify-between"><span className="text-ink-soft">Shipping</span><span className="tabular-nums">{Number(order.shippingCents) === 0 ? 'Free' : fmtMoney(order.shippingCents)}</span></div>
            <div className="flex justify-between font-bold pt-2 border-t border-cobalt/10 mt-2">
              <span>Total</span>
              <span className="tabular-nums font-display text-lg">{fmtMoney(order.totalCents)}</span>
            </div>
          </div>
        </div>

        {/* Ship to */}
        <div className="mt-6 rounded-2xl border border-cobalt/15 bg-white p-6">
          <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">— Ships to</p>
          <p className="text-sm text-ink">
            <strong>{order.shippingFullName}</strong>
            <br />
            {order.shippingLine1}
            {order.shippingLine2 ? <><br />{order.shippingLine2}</> : null}
            <br />
            {order.shippingCity}, {order.shippingState} {order.shippingZip}
          </p>
        </div>

        {/* Help */}
        <p className="text-center text-[12px] text-ink-soft mt-10">
          Questions? Email{' '}
          <a href="mailto:support@meritsciences.com" className="text-cobalt font-bold">
            support@meritsciences.com
          </a>
        </p>
      </section>
    </main>
  );
}

function TimelineStep({ label, date, active }: { label: string; date: Date | null; active: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${active ? 'bg-cobalt' : 'bg-ink/15'}`} />
      <div className="flex-1 flex items-baseline justify-between gap-2">
        <span className={active ? 'text-ink font-bold' : 'text-ink-soft/60'}>{label}</span>
        <span className="text-xs text-ink-soft tabular-nums">{fmtDate(date)}</span>
      </div>
    </li>
  );
}

function TokenError({ expired }: { expired?: boolean }) {
  return (
    <main className="bg-cream min-h-screen">
      <section className="max-w-[540px] mx-auto px-5 sm:px-6 lg:px-8 pt-20 pb-16">
        <Link href="/" className="font-display font-black text-ink text-lg tracking-[-0.02em] inline-block mb-12">
          Merit Sciences
        </Link>
        <p className="text-[10px] tracking-[0.28em] uppercase text-rose-700 font-bold mb-3">— {expired ? 'Link expired' : 'Invalid link'}</p>
        <h1
          className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95] mb-4"
          style={{ fontSize: 'clamp(28px, 4.5vw, 44px)' }}
        >
          {expired ? "This link's no longer active" : "We couldn't load that order"}
          <span className="text-cobalt">.</span>
        </h1>
        <p className="text-sm sm:text-base text-ink-soft leading-relaxed mb-6">
          Order-view links expire 24 hours after they&rsquo;re sent. Request a new one and we&rsquo;ll email it to you.
        </p>
        <Link href="/orders/lookup" className="inline-block bg-ink text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-cobalt transition">
          Request a new link
        </Link>
      </section>
    </main>
  );
}
