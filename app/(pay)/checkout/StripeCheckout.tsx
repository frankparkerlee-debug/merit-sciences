'use client';

import { useMemo, useRef, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  AddressElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import type { CartLine } from '@/lib/cart';

/**
 * Stripe card checkout, embedded on the payment domain.
 *
 * Uses Stripe's DEFERRED-INTENT flow: <Elements> is mounted with a mode+amount
 * rather than a clientSecret, so the address and card fields render before any
 * PaymentIntent exists. The intent is created on submit — which is what lets
 * the server price the cart and persist the order from the buyer's real
 * address, exactly as the PayPal card flow did, instead of trusting an amount
 * the client picked.
 *
 * Deliberately Payment Element and NOT Stripe Checkout: the hosted version
 * redirects to checkout.stripe.com, which would take the buyer off
 * meritcheckout.com and undo the domain separation.
 */

type Props = {
  publishableKey: string;
  lines: CartLine[];
  /** Display-only. The charged amount is always re-derived server-side. */
  amountCents: number;
  discountCode: string | null;
  ruoAttested: boolean;
  onError: (msg: string | null) => void;
};

export function StripeCheckout(props: Props) {
  const stripePromise = useMemo(
    () => (props.publishableKey ? loadStripe(props.publishableKey) : null),
    [props.publishableKey],
  );

  if (!stripePromise) {
    return (
      <p className="text-sm text-ink-soft">
        Card payments are not available right now. Please try again shortly.
      </p>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        mode: 'payment',
        amount: Math.max(50, props.amountCents), // Stripe minimum is $0.50
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
      <StripeForm {...props} />
    </Elements>
  );
}

function StripeForm({ lines, amountCents, discountCode, ruoAttested, onError }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const submittingRef = useRef(false);
  // Per-checkout nonce backing the server's Stripe idempotency key. Minted
  // once per mount so a retry of the same submit reuses the intent, while a
  // fresh checkout always gets a new one. crypto.randomUUID needs a secure
  // context; the fallback keeps older/insecure contexts working.
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
    if (!ruoAttested) {
      onError('Please confirm the research-use-only attestation before paying.');
      return;
    }
    // Mirror the server's minimum so a deep-discount cart fails here, before
    // the buyer fills in card details. The server re-checks — this is only to
    // avoid a pointless round trip. Kept as a literal because lib/stripe.ts is
    // server-only and cannot be imported into a client component.
    if (amountCents < 50) {
      onError(
        `Order total is $${(amountCents / 100).toFixed(2)}, below the $0.50 card minimum. ` +
          `Add an item, or use a smaller discount.`,
      );
      return;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      onError('Enter a valid email address so we can send your receipt.');
      return;
    }

    submittingRef.current = true;
    setBusy(true);

    try {
      // 1. Validate the mounted elements and surface any field-level errors.
      const { error: submitError } = await elements.submit();
      if (submitError) {
        onError(submitError.message ?? 'Please check your card details.');
        return;
      }

      // 2. Read the shipping address the buyer entered.
      const addressEl = elements.getElement(AddressElement);
      const addr = await addressEl?.getValue();
      const v = addr?.value;
      if (!v?.address) {
        onError('Please complete your shipping address.');
        return;
      }

      // 3. Server prices the cart, persists the order, and opens the intent.
      const res = await fetch('/api/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin', // carries merit_ref for affiliate credit
        body: JSON.stringify({
          lines,
          discountCode,
          ruoAttested: true,
          attemptId: attemptIdRef.current,
          buyer: {
            email: email.trim(),
            phone: phone.trim(),
            fullName: v.name ?? '',
            line1: v.address.line1 ?? '',
            line2: v.address.line2 ?? '',
            city: v.address.city ?? '',
            state: v.address.state ?? '',
            zip: v.address.postal_code ?? '',
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.clientSecret) {
        onError(data?.error ?? 'Could not start checkout. Please try again.');
        return;
      }

      // 4. Confirm. On success Stripe returns the buyer to the success page;
      //    fulfilment itself is driven by the webhook, so the order is booked
      //    even if the buyer closes the tab here.
      const { error } = await stripe.confirmPayment({
        elements,
        clientSecret: data.clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/checkout/success?order_id=${encodeURIComponent(data.orderId)}`,
        },
      });

      // confirmPayment only returns on failure; success redirects.
      if (error) {
        onError(
          error.type === 'card_error' || error.type === 'validation_error'
            ? error.message ?? 'Your card was declined.'
            : 'Something went wrong completing your payment. You have not been charged twice — check your email before retrying.',
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
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-[11px] uppercase tracking-wider font-bold text-ink-soft mb-1.5">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="w-full rounded-lg border border-cobalt/20 px-3 py-2.5 text-[15px] text-ink focus:border-cobalt focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-ink-muted">Your receipt and tracking go here.</p>
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-wider font-bold text-ink-soft mb-1.5">
          Phone (optional)
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          autoComplete="tel"
          className="w-full rounded-lg border border-cobalt/20 px-3 py-2.5 text-[15px] text-ink focus:border-cobalt focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-wider font-bold text-ink-soft mb-1.5">
          Ship to
        </label>
        <AddressElement
          options={{
            mode: 'shipping',
            allowedCountries: ['US'],
            fields: { phone: 'never' },
          }}
        />
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-wider font-bold text-ink-soft mb-1.5">
          Card details
        </label>
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      <button
        type="submit"
        disabled={busy || !stripe}
        className="w-full rounded-xl bg-ink py-3.5 text-base font-bold text-white shadow-md transition hover:opacity-95 disabled:opacity-50"
      >
        {busy ? 'Processing…' : 'Pay now'}
      </button>
    </form>
  );
}
