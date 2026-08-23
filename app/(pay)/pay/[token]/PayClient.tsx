'use client';

import { useMemo, useRef, useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

/**
 * Payment step for the pay-link flow. Stripe Payment Element is the live
 * processor (PAYMENTS_PROVIDER=stripe); the PayPal branch is kept intact for
 * rollback, exactly like /checkout.
 *
 * Stripe path mirrors the storefront checkout's deferred-intent flow:
 *   mount    → <Elements> with mode+amount only (no intent yet)
 *   submit   → POST /api/stripe/pay-link/create { token } — the server builds
 *              the PaymentIntent from DB-truth amounts and points the order's
 *              processor id at it
 *   confirm  → stripe.confirmPayment; success redirects back to this /pay URL
 *              with redirect_status=succeeded while the webhook promotes the
 *              order to PAID (email, commission, ShipStation)
 *
 * The RUO checkbox gates payment — a research-use-only sale needs the buyer's
 * attestation, same as the main checkout.
 */
export function PayClient({
  token,
  provider,
  paypalClientId,
  stripePublishableKey,
  totalCents,
  justPaid,
}: {
  token: string;
  provider: 'stripe' | 'paypal';
  paypalClientId: string;
  stripePublishableKey: string;
  totalCents: number;
  /** True when Stripe just redirected back with redirect_status=succeeded. */
  justPaid: boolean;
}) {
  const [ruo, setRuo] = useState(false);
  const ruoRef = useRef(false);
  ruoRef.current = ruo;
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(justPaid);
  const totalUsd = (totalCents / 100).toFixed(2);

  const stripePromise = useMemo(
    () =>
      provider === 'stripe' && stripePublishableKey ? loadStripe(stripePublishableKey) : null,
    [provider, stripePublishableKey],
  );

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="font-display font-black text-ink text-lg mb-1">Payment received 🎉</p>
        <p className="text-sm text-ink-soft">
          Thanks — you&rsquo;re all set. A receipt is on its way to your inbox.
        </p>
      </div>
    );
  }

  const misconfigured =
    provider === 'stripe' ? !stripePublishableKey : !paypalClientId;
  if (misconfigured) {
    return (
      <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
        Payment isn&rsquo;t configured on the server. Please contact us and we&rsquo;ll sort it out.
      </p>
    );
  }

  return (
    <div>
      <label className="flex items-start gap-3 rounded-xl border border-cobalt/15 bg-white p-4 mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={ruo}
          onChange={(e) => setRuo(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-cobalt"
        />
        <span className="text-[12.5px] leading-relaxed text-ink-soft">
          I confirm I&rsquo;m purchasing these research compounds{' '}
          <strong className="text-ink">for laboratory research use only</strong> — not for human or
          veterinary use.
        </span>
      </label>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 mb-4 text-sm text-rose-900 leading-relaxed">
          {error}
        </div>
      )}

      {provider === 'stripe' && stripePromise ? (
        <>
          <Elements
            stripe={stripePromise}
            options={{
              mode: 'payment',
              amount: Math.max(50, totalCents),
              currency: 'usd',
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#2E4DDB',
                  borderRadius: '10px',
                  fontFamily: 'var(--font-inter), system-ui, sans-serif',
                },
              },
            }}
          >
            <StripePayForm token={token} ruo={ruo} onError={setError} />
          </Elements>
          <p className="text-[11px] text-ink-muted text-center mt-4">
            Secure card payment for <strong>${totalUsd}</strong>. We never see your card details.
          </p>
        </>
      ) : (
        <PayPalBranch
          token={token}
          paypalClientId={paypalClientId}
          totalUsd={totalUsd}
          ruo={ruo}
          ruoRef={ruoRef}
          setError={setError}
          setDone={setDone}
        />
      )}
    </div>
  );
}

function StripePayForm({
  token,
  ruo,
  onError,
}: {
  token: string;
  ruo: boolean;
  onError: (msg: string | null) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const submittingRef = useRef(false);
  // Per-mount nonce backing the server's Stripe idempotency key: a retry of
  // the same submit reuses the intent; a fresh page load opens a new one.
  const attemptIdRef = useRef<string>('');
  if (!attemptIdRef.current) {
    attemptIdRef.current =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || submittingRef.current) return;
    onError(null);
    if (!ruo) {
      onError('Please confirm the research-use-only attestation before paying.');
      return;
    }
    submittingRef.current = true;
    setBusy(true);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        onError(submitError.message ?? 'Please check your card details.');
        return;
      }

      const res = await fetch('/api/stripe/pay-link/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, attemptId: attemptIdRef.current }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.clientSecret) {
        onError(data?.error ?? 'Could not start payment. Please try again.');
        return;
      }

      // Success redirects back to this pay URL with redirect_status=succeeded;
      // the webhook books the order even if the buyer closes the tab.
      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret: data.clientSecret,
        confirmParams: { return_url: window.location.href.split('?')[0] },
      });
      if (error) {
        onError(
          error.type === 'card_error' || error.type === 'validation_error'
            ? error.message ?? 'Your card was declined.'
            : 'Something went wrong completing your payment. If you were charged, don’t pay again — reply to your email and we’ll verify it.',
        );
      }
    } catch {
      onError('Network problem completing payment. Please try again.');
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div style={{ opacity: ruo ? 1 : 0.55, pointerEvents: ruo ? 'auto' : 'none' }}>
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>
      {!ruo && (
        <p className="text-[11px] text-ink-muted text-center">Tick the box above to enable payment.</p>
      )}
      <button
        type="submit"
        disabled={busy || !stripe || !ruo}
        className="w-full rounded-xl bg-ink py-3.5 text-base font-bold text-white shadow-md transition hover:opacity-95 disabled:opacity-50"
      >
        {busy ? 'Processing…' : 'Pay now'}
      </button>
    </form>
  );
}

/** Legacy PayPal branch — untouched behavior, kept for rollback. */
function PayPalBranch({
  token,
  paypalClientId,
  totalUsd,
  ruo,
  ruoRef,
  setError,
  setDone,
}: {
  token: string;
  paypalClientId: string;
  totalUsd: string;
  ruo: boolean;
  ruoRef: React.MutableRefObject<boolean>;
  setError: (msg: string | null) => void;
  setDone: (v: boolean) => void;
}) {
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

  async function orderIsPaid(orderId: string): Promise<boolean> {
    for (let i = 0; i < 4; i++) {
      try {
        const r = await fetch(`/api/paypal/order-status?orderId=${encodeURIComponent(orderId)}`, {
          cache: 'no-store',
        });
        if (r.ok) {
          const j = await r.json().catch(() => null);
          if (j?.paid) return true;
        }
      } catch {
        /* keep polling */
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
    return false;
  }

  async function onApprove(data: { orderID: string }) {
    try {
      const res = await fetch('/api/paypal/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: data.orderID }),
      });
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
      setError(
        'We couldn’t confirm the payment. If you were charged, don’t pay again — reply to your email and we’ll verify it.',
      );
    } catch {
      if (await orderIsPaid(data.orderID)) {
        setDone(true);
        return;
      }
      setError(
        'Something went wrong finishing the payment. If you were charged, don’t pay again — just reply to your email.',
      );
    }
  }

  return (
    <>
      <div style={{ opacity: ruo ? 1 : 0.5, pointerEvents: ruo ? 'auto' : 'none' }}>
        <PayPalScriptProvider
          options={{
            clientId: paypalClientId,
            currency: 'USD',
            intent: 'capture',
            components: 'buttons',
            'disable-funding': 'paylater,credit',
          }}
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
      {!ruo && (
        <p className="text-[11px] text-ink-muted text-center mt-2">Tick the box above to enable payment.</p>
      )}
      <p className="text-[11px] text-ink-muted text-center mt-4">
        Secure payment for <strong>${totalUsd}</strong> via PayPal. We never see your card details.
      </p>
    </>
  );
}
