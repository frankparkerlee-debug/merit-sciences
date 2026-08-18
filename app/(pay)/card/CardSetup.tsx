'use client';

import { useEffect, useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

/**
 * Collects a card and stores it against the practice for later use.
 *
 * A SetupIntent, not a payment — nothing is charged here, and the copy says so
 * plainly, because a card form that does not explain itself reads as a charge.
 */
export function CardSetup({ token }: { token: string }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [practiceName, setPracticeName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setError('This link is missing its access code. Open it again from your portal.'); return; }
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/practitioner/card/setup-intent', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const d = await r.json();
        if (cancelled) return;
        if (!r.ok) { setError(d?.error || 'Could not start card setup.'); return; }
        setClientSecret(d.clientSecret);
        setPublishableKey(d.publishableKey);
        setPracticeName(d.practiceName);
      } catch {
        if (!cancelled) setError('Could not reach the payment service. Try again.');
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  );

  return (
    <main className="bg-cream min-h-screen">
      <div className="max-w-[520px] mx-auto px-5 sm:px-6 pt-12 pb-20">
        <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
          — Practitioner account
        </p>
        <h1
          className="font-display font-black text-ink tracking-[-0.03em] leading-[0.98] mb-3"
          style={{ fontSize: 'clamp(28px, 5vw, 42px)' }}
        >
          Save a card<span className="text-cobalt">.</span>
        </h1>
        {practiceName && (
          <p className="text-[14px] text-ink-soft mb-1">
            For <strong className="text-ink">{practiceName}</strong>.
          </p>
        )}
        <p className="text-[13px] text-ink-soft leading-relaxed mb-7">
          Nothing is charged now. The card is stored so future orders can be paid
          without re-entering it. You can remove it from your portal at any time.
        </p>

        {error && (
          <div className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-[13px] font-bold text-rose-800">
            {error}
          </div>
        )}

        {!error && !clientSecret && (
          <p className="text-[13px] text-ink-muted">Loading secure card form…</p>
        )}

        {clientSecret && stripePromise && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: { theme: 'flat', variables: { colorPrimary: '#2E4DDB', borderRadius: '10px' } },
            }}
          >
            <CardForm token={token} />
          </Elements>
        )}
      </div>
    </main>
  );
}

function CardForm({ token }: { token: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ brand: string; last4: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || busy) return;
    setBusy(true); setErr(null);

    const { error, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: 'if_required',
    });
    if (error) { setErr(error.message || 'That card could not be saved.'); setBusy(false); return; }
    if (!setupIntent?.id) { setErr('That card could not be saved.'); setBusy(false); return; }

    // Confirmed at Stripe; now record it against the practice. The server
    // re-reads the intent and checks it belongs to this account.
    try {
      const r = await fetch('/api/practitioner/card/save', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, setupIntentId: setupIntent.id }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d?.error || 'That card could not be saved.'); setBusy(false); return; }
      setSaved({ brand: d.brand, last4: d.last4 });
    } catch {
      setErr('Card confirmed but not recorded. Contact us before trying again.');
    }
    setBusy(false);
  }

  if (saved) {
    return (
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-5 py-5">
        <p className="font-display font-extrabold text-emerald-900 text-[17px] mb-1">
          Card saved.
        </p>
        <p className="text-[13px] text-emerald-800 capitalize">
          {saved.brand} ending {saved.last4}. You can close this window.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit}>
      <PaymentElement options={{ layout: 'tabs' }} />
      {err && (
        <p className="mt-3 text-[13px] font-bold text-rose-700">{err}</p>
      )}
      <button
        type="submit"
        disabled={!stripe || busy}
        className="mt-5 w-full rounded-xl bg-ink text-white font-display font-extrabold tracking-[-0.01em] text-[15px] py-3.5 hover:bg-cobalt transition-colors disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Save card'}
      </button>
      <p className="mt-3 text-[11px] text-ink-muted leading-relaxed">
        Card details are encrypted end-to-end by Stripe. Merit never sees or
        stores your card number.
      </p>
    </form>
  );
}
