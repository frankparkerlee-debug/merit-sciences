'use client';

import { useState, useRef } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

/**
 * PayPal buttons for the pay-link flow. Mirrors the storefront checkout's
 * integration but drives the pay-link endpoints:
 *   createOrder → POST /api/paypal/pay-link/create { token }  (server builds
 *                 the PayPal order from DB-truth amounts)
 *   onApprove   → POST /api/paypal/capture { orderId }        (the SAME shared
 *                 capture + fulfillment path the storefront uses → order flips
 *                 to PAID, confirmation email fires)
 *
 * The RUO checkbox gates the buttons — a research-use-only sale needs the
 * buyer's attestation, same as the main checkout.
 */
export function PayClient({
  token,
  paypalClientId,
  totalUsd,
}: {
  token: string;
  paypalClientId: string;
  totalUsd: string;
}) {
  const [ruo, setRuo] = useState(false);
  const ruoRef = useRef(false);
  ruoRef.current = ruo;
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (!paypalClientId) {
    return (
      <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
        Payment isn&rsquo;t configured on the server (PAYPAL_CLIENT_ID). Please contact us and we&rsquo;ll sort it out.
      </p>
    );
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="font-display font-black text-ink text-lg mb-1">Payment received 🎉</p>
        <p className="text-sm text-ink-soft">Thanks — you&rsquo;re all set. A receipt is on its way to your inbox.</p>
      </div>
    );
  }

  async function createOrder(): Promise<string> {
    if (!ruoRef.current) throw new Error('RUO_NOT_ATTESTED');
    setError(null);
    const res = await fetch('/api/paypal/pay-link/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Could not start payment.');
    return data.orderId;
  }

  async function onApprove(data: { orderID: string }) {
    try {
      const res = await fetch('/api/paypal/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: data.orderID }),
      });
      // Confirmed decline (402) → surface. Anything else, verify via status
      // poll before showing an error (the charge may have gone through).
      if (res.status === 402) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || 'Payment did not complete. Please try again.');
        return;
      }
      const j = await res.json().catch(() => null);
      if (j?.ok || (await orderIsPaid(data.orderID))) {
        setDone(true);
        return;
      }
      setError('We couldn’t confirm the payment. If you were charged, don’t pay again — reply to your email and we’ll verify it.');
    } catch {
      if (await orderIsPaid(data.orderID)) { setDone(true); return; }
      setError('Something went wrong finishing the payment. If you were charged, don’t pay again — just reply to your email.');
    }
  }

  async function orderIsPaid(orderId: string): Promise<boolean> {
    for (let i = 0; i < 4; i++) {
      try {
        const r = await fetch(`/api/paypal/order-status?orderId=${encodeURIComponent(orderId)}`, { cache: 'no-store' });
        if (r.ok) { const j = await r.json().catch(() => null); if (j?.paid) return true; }
      } catch { /* keep polling */ }
      await new Promise((r) => setTimeout(r, 2000));
    }
    return false;
  }

  return (
    <div>
      <label className="flex items-start gap-3 rounded-xl border border-cobalt/15 bg-white p-4 mb-4 cursor-pointer">
        <input type="checkbox" checked={ruo} onChange={(e) => setRuo(e.target.checked)} className="mt-0.5 h-4 w-4 accent-cobalt" />
        <span className="text-[12.5px] leading-relaxed text-ink-soft">
          I confirm I&rsquo;m purchasing these research compounds <strong className="text-ink">for laboratory research use only</strong> — not for human or veterinary use.
        </span>
      </label>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 mb-4 text-sm text-rose-900 leading-relaxed">{error}</div>
      )}

      <div style={{ opacity: ruo ? 1 : 0.5, pointerEvents: ruo ? 'auto' : 'none' }}>
        <PayPalScriptProvider
          options={{ clientId: paypalClientId, currency: 'USD', intent: 'capture', components: 'buttons', 'disable-funding': 'paylater,credit' }}
        >
          <PayPalButtons
            style={{ layout: 'vertical', shape: 'rect', label: 'pay' }}
            disabled={!ruo}
            createOrder={createOrder}
            onApprove={onApprove}
            onError={() => setError('PayPal hit a snag. Please try again.')}
          />
        </PayPalScriptProvider>
      </div>
      {!ruo && <p className="text-[11px] text-ink-muted text-center mt-2">Tick the box above to enable payment.</p>}
      <p className="text-[11px] text-ink-muted text-center mt-4">Secure payment for <strong>${totalUsd}</strong> via PayPal — card, Apple Pay &amp; Google Pay accepted. We never see your card details.</p>
    </div>
  );
}
