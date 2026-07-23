import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { StatusPanel, NotesForm } from './OrderDetailClient';
import { Timeline } from './Timeline';
import { CommentForm } from './CommentForm';
import { PayLinkPanel } from './PayLinkPanel';
import { payUrlFor } from '@/lib/pay-link';

export const metadata = { title: 'Order detail — Merit Admin' };
export const dynamic = 'force-dynamic';

function fmtMoney(cents: bigint | number): string {
  const n = typeof cents === 'bigint' ? Number(cents) : cents;
  return `$${(n / 100).toFixed(2)}`;
}

function fmtDate(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
}

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      lines: true,
      customer: true,
    },
  });
  if (!order) notFound();

  // Activity timeline — load events newest-first
  const events = await prisma.orderEvent.findMany({
    where: { orderId: order.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="max-w-[1280px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      <Link href="/admin/orders" className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2 inline-block hover:underline underline-offset-4">
        ← All orders
      </Link>
      <div className="flex items-baseline justify-between mb-1 gap-4 flex-wrap">
        <h1 className="font-display font-black text-ink tracking-[-0.025em] text-2xl sm:text-3xl">
          Order <span className="font-mono text-xl text-cobalt">{order.paypalOrderId}</span>
        </h1>
        <span className="text-sm text-ink-soft tabular-nums">{fmtDate(order.createdAt)}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 mt-6">

        {/* LEFT — Customer + Line items + Address + Notes */}
        <div className="space-y-5">
          {/* Customer */}
          <section className="rounded-2xl border border-cobalt/15 bg-white p-6">
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">— Customer</p>
            <p className="text-lg font-bold text-ink">{order.customerName}</p>
            <p className="text-sm text-ink-soft">{order.customerEmail}</p>
            {order.shippingPhone && <p className="text-sm text-ink-soft">{order.shippingPhone}</p>}
          </section>

          {/* Line items */}
          <section className="rounded-2xl border border-cobalt/15 bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-cobalt/10">
              <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold">— Line items ({order.lines.length})</p>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {order.lines.map((l) => (
                  <tr key={l.id} className="border-t border-cobalt/5 first:border-t-0">
                    <td className="px-6 py-3 text-ink">
                      <div className="font-bold">{l.title}</div>
                      <div className="text-[11px] text-ink-soft">
                        {l.bundleLabel}
                        {l.handle && <span className="ml-2 font-mono">[{l.handle}]</span>}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right text-ink-soft tabular-nums">Qty {l.qty}</td>
                    <td className="px-6 py-3 text-right text-ink font-bold tabular-nums whitespace-nowrap">
                      {fmtMoney(Number(l.unitCents) * l.qty)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                <span>Total charged</span>
                <span className="tabular-nums font-display text-lg">{fmtMoney(order.totalCents)}</span>
              </div>
              {Number(order.refundedCents) > 0 && (
                <>
                  <div className="flex justify-between text-rose-800 font-bold">
                    <span>Refunded</span>
                    <span className="tabular-nums">-{fmtMoney(order.refundedCents)}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-2 border-t border-cobalt/10 mt-2">
                    <span>Net paid</span>
                    <span className="tabular-nums font-display text-lg">
                      {fmtMoney(Number(order.totalCents) - Number(order.refundedCents))}
                    </span>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Shipping address */}
          <section className="rounded-2xl border border-cobalt/15 bg-white p-6">
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">— Ship to</p>
            <p className="text-base font-bold text-ink">{order.shippingFullName}</p>
            <p className="text-sm text-ink">
              {order.shippingLine1}
              {order.shippingLine2 ? <><br />{order.shippingLine2}</> : null}
              <br />
              {order.shippingCity}, {order.shippingState} {order.shippingZip}
              <br />
              {order.shippingCountry}
            </p>
          </section>

          {/* Internal notes */}
          <NotesForm orderId={order.id} initialNote={order.internalNotes ?? ''} />

          {/* Activity timeline — chain of custody */}
          <CommentForm orderId={order.id} />
          <Timeline events={events} />
        </div>

        {/* RIGHT — Status + actions */}
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <StatusPanel
            orderId={order.id}
            status={order.status}
            paidAt={order.paidAt}
            processingAt={order.processingAt}
            shippedAt={order.shippedAt}
            deliveredAt={order.deliveredAt}
            refundedAt={order.refundedAt}
            shippingCarrier={order.shippingCarrier}
            trackingNumber={order.trackingNumber}
            trackingUrl={order.trackingUrl}
            totalCents={Number(order.totalCents)}
            refundedCents={Number(order.refundedCents)}
            paypalOrderId={order.paypalOrderId}
          />

          {order.status === 'PENDING_PAYMENT' && (
            <PayLinkPanel orderId={order.id} payUrl={payUrlFor(order.id)} />
          )}

          {/* PayPal refs */}
          <section className="rounded-2xl border border-cobalt/15 bg-white p-5 text-sm">
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">— PayPal references</p>
            <div className="space-y-2">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-ink-soft font-bold">Order ID</p>
                <p className="font-mono text-xs text-ink break-all">{order.paypalOrderId}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-ink-soft font-bold">Capture ID</p>
                <p className="font-mono text-xs text-ink break-all">{order.paypalCaptureId ?? <span className="text-ink-soft/50">— pending —</span>}</p>
              </div>
              {order.paypalPayerId && (
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-ink-soft font-bold">Payer ID</p>
                  <p className="font-mono text-xs text-ink break-all">{order.paypalPayerId}</p>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
