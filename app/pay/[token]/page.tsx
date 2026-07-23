import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { verifyPayToken } from '@/lib/pay-link';
import { PayClient } from './PayClient';

/**
 * Customer pay page for an admin-created order — the self-serve alternative to
 * a manual PayPal invoice. Verifies the signed token, loads the order, and (if
 * it's still awaiting payment) renders the PayPal buttons. Amounts are
 * DB-truth; the client only ever sends the token back.
 */
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Complete your order — Merit Sciences',
  robots: { index: false, follow: false },
};

type Props = { params: { token: string } };

export default async function PayPage({ params }: Props) {
  const orderId = verifyPayToken(params.token?.trim() || '');
  if (!orderId) notFound();

  const order = await prisma.order
    .findUnique({
      where: { id: orderId },
      include: { lines: { select: { title: true, bundleLabel: true, qty: true, unitCents: true } } },
    })
    .catch(() => null);
  if (!order) notFound();

  // PayPal client id — runtime-sourced (same pattern as /checkout) so the
  // button matches the Merchant-of-Record account we capture against.
  const paypalClientId =
    process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';

  const paid = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status);
  const dead = ['CANCELED', 'REFUNDED'].includes(order.status);

  return (
    <main className="bg-cream min-h-screen">
      <section className="max-w-[560px] mx-auto px-5 sm:px-6 pt-12 pb-16">
        <Link href="/" className="inline-block mb-8">
          <span className="font-display font-black text-ink text-lg tracking-[-0.02em]">Merit Sciences</span>
        </Link>

        {paid ? (
          <Done title="This order is paid." body="Thanks — your payment is in and we're on it. A receipt is in your inbox; reply to it any time with questions." />
        ) : dead ? (
          <Done title="This order is closed." body="This order was canceled or refunded, so there's nothing to pay. If that's a surprise, just reply to your last email from us." />
        ) : (
          <>
            <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">— Complete your order</p>
            <h1 className="font-display font-black text-ink tracking-[-0.035em] leading-[0.98] mb-5" style={{ fontSize: 'clamp(28px,4.5vw,40px)' }}>
              Review &amp; pay<span className="text-cobalt">.</span>
            </h1>

            <div className="rounded-2xl border border-cobalt/12 bg-white p-5 mb-5">
              <p className="text-[11px] tracking-[0.18em] uppercase text-ink-muted font-bold mb-3">Order summary</p>
              {order.lines.map((l, i) => (
                <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-cobalt/8 last:border-0">
                  <div className="text-sm text-ink">
                    <span className="font-bold">{l.title}</span>
                    <span className="text-ink-muted"> · {l.bundleLabel}</span>
                    {l.qty > 1 && <span className="text-ink-muted"> × {l.qty}</span>}
                  </div>
                  <div className="text-sm font-bold text-ink tabular-nums whitespace-nowrap">
                    ${((Number(l.unitCents) * l.qty) / 100).toFixed(2)}
                  </div>
                </div>
              ))}
              <Row label="Subtotal" cents={Number(order.subtotalCents)} />
              {Number(order.discountCents) > 0 && <Row label="Discount" cents={-Number(order.discountCents)} accent />}
              <Row label="Shipping" cents={Number(order.shippingCents)} />
              <div className="flex items-center justify-between pt-3 mt-1 border-t border-cobalt/12">
                <span className="font-display font-black text-ink">Total</span>
                <span className="font-display font-black text-ink text-xl tabular-nums">${(Number(order.totalCents) / 100).toFixed(2)}</span>
              </div>
            </div>

            <p className="text-[12px] text-ink-soft leading-relaxed mb-4">
              Ships to <strong className="text-ink">{order.shippingFullName}</strong>, {order.shippingCity} {order.shippingState} {order.shippingZip}.
            </p>

            <PayClient
              token={params.token}
              paypalClientId={paypalClientId}
              totalUsd={(Number(order.totalCents) / 100).toFixed(2)}
            />
          </>
        )}
      </section>
    </main>
  );
}

function Row({ label, cents, accent }: { label: string; cents: number; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between pt-2 text-sm">
      <span className="text-ink-soft">{label}</span>
      <span className={`tabular-nums ${accent ? 'text-emerald-700 font-bold' : 'text-ink'}`}>
        {cents < 0 ? '-' : ''}${Math.abs(cents / 100).toFixed(2)}
      </span>
    </div>
  );
}

function Done({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-cobalt/12 bg-white p-8 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 mb-5">
        <svg className="w-7 h-7 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="font-display font-black text-ink text-2xl tracking-tight mb-3">{title}</h1>
      <p className="text-sm text-ink-soft leading-relaxed">{body}</p>
      <Link href="/catalog" className="inline-block mt-6 text-sm font-bold text-cobalt hover:underline">Browse the catalog →</Link>
    </div>
  );
}
