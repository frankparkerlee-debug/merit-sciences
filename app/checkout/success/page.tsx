import Link from 'next/link';
import { prisma } from '@/lib/db';
import { money } from '@/lib/catalog';
import { ClearCartOnMount } from './ClearCartOnMount';

export const metadata = {
  title: 'Order confirmed',
  description: 'Your Merit Sciences order has been received.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

type OrderSummary = {
  status: string;
  customerEmail: string | null;
  subtotalCents: bigint;
  shippingCents: bigint;
  discountCents: bigint;
  totalCents: bigint;
  lines: Array<{ title: string; bundleLabel: string; qty: number; unitCents: bigint }>;
};

/**
 * Look up the buyer's order by PayPal order id so the thank-you page shows
 * their actual items + totals + "processing" state, grounded in DB truth.
 * Resilient by design: any DB problem falls back to the generic confirmation
 * — this page renders moments after money moved and must NEVER error.
 */
async function getOrder(ref: string | undefined): Promise<OrderSummary | null> {
  if (!ref) return null;
  try {
    return await prisma.order.findUnique({
      where: { paypalOrderId: ref },
      select: {
        status: true,
        customerEmail: true,
        subtotalCents: true,
        shippingCents: true,
        discountCents: true,
        totalCents: true,
        lines: { select: { title: true, bundleLabel: true, qty: true, unitCents: true } },
      },
    });
  } catch {
    return null;
  }
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string; order_id?: string };
}) {
  // Accept both order_id (PayPal — current) and session_id (Stripe — legacy)
  const orderRef = searchParams.order_id ?? searchParams.session_id;
  const order = await getOrder(orderRef);

  // Fulfillment promotes PENDING_PAYMENT → PAID within ~2s of capture (it
  // runs detached from the capture response). If the buyer beats it here,
  // don't assert payment yet — "finalizing" is accurate and refresh-safe.
  // It also keeps someone who abandoned PayPal and hand-loaded this URL from
  // reading a paid confirmation for an unpaid order.
  const paid = !!order && order.status !== 'PENDING_PAYMENT' && order.status !== 'CANCELED';

  return (
    <main className="bg-cream min-h-screen">
      {/* Client-only effect — clears the persisted Zustand cart on mount */}
      <ClearCartOnMount />

      <section className="bg-white border-b border-cobalt/10">
        <div className="h-1 bg-gradient-to-r from-cobalt via-[#5078FF] to-cobalt" />
        <div className="max-w-[640px] mx-auto px-5 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cobalt text-white mb-6 shadow-md">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
            — {paid || !order ? 'Order confirmed' : 'Order received'}
          </p>
          <h1
            className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95] mb-4"
            style={{ fontSize: 'clamp(32px, 5vw, 56px)' }}
          >
            You&apos;re all set<span className="text-cobalt">.</span>
          </h1>
          {order && !paid ? (
            <p className="text-base sm:text-lg text-ink-soft leading-relaxed mb-2">
              We&apos;re finalizing your payment confirmation — your receipt will arrive
              {order.customerEmail ? (
                <> at <strong className="text-ink">{order.customerEmail}</strong></>
              ) : (
                ' by email'
              )}{' '}
              within a few minutes.
            </p>
          ) : (
            <p className="text-base sm:text-lg text-ink-soft leading-relaxed mb-2">
              {order?.customerEmail ? (
                <>Your receipt is on its way to <strong className="text-ink">{order.customerEmail}</strong>.</>
              ) : (
                'Confirmation is on the way to your inbox.'
              )}
            </p>
          )}
          <p className="text-sm text-ink-soft leading-relaxed mb-8">
            Your order is processing and ships within 48 hours from our facility in
            Dallas. You&apos;ll receive a tracking number as soon as it leaves.
          </p>
          {orderRef && (
            <p className="text-[11px] text-ink-muted font-mono">
              Order reference: <span className="break-all">{orderRef}</span>
            </p>
          )}
        </div>
      </section>

      <section className="max-w-[640px] mx-auto px-5 sm:px-6 lg:px-8 py-12">
        {order && order.lines.length > 0 && (
          <div className="bg-white border border-cobalt/10 rounded-2xl p-6 lg:p-8 mb-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold">
                — Your order
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cobalt/10 text-cobalt px-3 py-1 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-cobalt animate-pulse" />
                Processing
              </span>
            </div>
            <ul className="divide-y divide-cobalt/8">
              {order.lines.map((l, i) => (
                <li key={i} className="py-3 flex items-baseline justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[14px] font-bold text-ink leading-tight">
                      {l.qty > 1 ? `${l.qty} × ` : ''}{l.title}
                    </p>
                    <p className="text-[12px] text-ink-muted">{l.bundleLabel}</p>
                  </div>
                  <p className="text-[14px] font-bold text-ink tabular-nums flex-none">
                    {money(Number(l.unitCents) * l.qty)}
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t border-cobalt/10 space-y-1.5 text-[13px]">
              <div className="flex justify-between text-ink-soft">
                <span>Subtotal</span>
                <span className="tabular-nums">{money(Number(order.subtotalCents))}</span>
              </div>
              {Number(order.discountCents) > 0 && (
                <div className="flex justify-between text-ink-soft">
                  <span>Discount</span>
                  <span className="tabular-nums">−{money(Number(order.discountCents))}</span>
                </div>
              )}
              <div className="flex justify-between text-ink-soft">
                <span>Shipping</span>
                <span className="tabular-nums">
                  {Number(order.shippingCents) === 0 ? 'Free' : money(Number(order.shippingCents))}
                </span>
              </div>
              <div className="flex justify-between font-display font-extrabold text-ink text-[15px] pt-1">
                <span>Total</span>
                <span className="tabular-nums">{money(Number(order.totalCents))}</span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border border-cobalt/10 rounded-2xl p-6 lg:p-8 mb-6">
          <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">
            — What ships
          </p>
          <h2 className="font-display text-xl font-extrabold text-ink leading-tight mb-2">
            48hr dispatch from Dallas<span className="text-cobalt">.</span>
          </h2>
          <p className="text-[13px] text-ink-soft leading-relaxed">
            Lyophilized vial, sealed, labeled with lot ID. UPS Ground
            tracked + insured. Released only after our US-licensed
            pharmacist signs off on the batch.
          </p>
        </div>

        <Link
          href="/catalog"
          className="block text-center text-white py-3.5 rounded-xl text-base font-bold shadow-md hover:opacity-95 transition"
          style={{
            background:
              'linear-gradient(135deg, #2E4DDB 0%, #5078FF 50%, #2E4DDB 100%)',
          }}
        >
          Continue shopping
        </Link>

        <p className="text-center text-[12px] text-ink-muted mt-6">
          Questions? Email{' '}
          <a href="mailto:rx@meritsciences.com" className="text-cobalt font-bold underline-offset-2 hover:underline">
            rx@meritsciences.com
          </a>
        </p>
      </section>
    </main>
  );
}
