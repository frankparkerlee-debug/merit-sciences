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
 *
 * Practitioner accounts get two extras, both resolved server-side from the
 * signed practice cookie and never from anything the browser claims:
 *   · a card already on file can pay the order in one tap (charge-saved);
 *   · a new card can be kept for future orders ("save this card"), which
 *     sets setup_future_usage on the intent and must therefore also be
 *     declared on <Elements>, or Stripe refuses the confirm.
 */

export type SavedCard = { brand: string; last4: string; expMonth: number; expYear: number };

type Props = {
  publishableKey: string;
  lines: CartLine[];
  /** Display-only. The charged amount is always re-derived server-side. */
  amountCents: number;
  discountCode: string | null;
  ruoAttested: boolean;
  onError: (msg: string | null) => void;
  /** True when the checkout belongs to an approved practitioner account. */
  isPractitioner?: boolean;
  /** The card that account has on file, display facts only. */
  savedCard?: SavedCard | null;
};

type FormProps = Props & {
  useSaved: boolean;
  setUseSaved: (v: boolean) => void;
  saveCard: boolean;
  setSaveCard: (v: boolean) => void;
};

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function cardLabel(c: SavedCard): string {
  const brand = c.brand ? c.brand.charAt(0).toUpperCase() + c.brand.slice(1) : 'Card';
  return `${brand} ending ${c.last4}`;
}

export function StripeCheckout(props: Props) {
  const stripePromise = useMemo(
    () => (props.publishableKey ? loadStripe(props.publishableKey) : null),
    [props.publishableKey],
  );
  // Default to the card on file when there is one: that is the whole point
  // of having stored it. The buyer can switch to a different card below.
  const [useSaved, setUseSaved] = useState<boolean>(!!props.savedCard);
  const [saveCard, setSaveCard] = useState(false);
  const payingWithSaved = !!props.savedCard && useSaved;

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
        // Must match the intent the server will open: a "save this card"
        // intent carries setup_future_usage, so Elements has to declare it.
        ...(props.isPractitioner && saveCard && !payingWithSaved
          ? { setupFutureUsage: 'off_session' as const }
          : {}),
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
      <StripeForm
        {...props}
        useSaved={payingWithSaved}
        setUseSaved={setUseSaved}
        saveCard={saveCard}
        setSaveCard={setSaveCard}
      />
    </Elements>
  );
}

function StripeForm({
  lines,
  amountCents,
  discountCode,
  ruoAttested,
  onError,
  isPractitioner,
  savedCard,
  useSaved,
  setUseSaved,
  saveCard,
  setSaveCard,
}: FormProps) {
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

  function preflight(): boolean {
    onError(null);
    if (!ruoAttested) {
      onError('Please confirm the research-use-only attestation before paying.');
      return false;
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
      return false;
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      onError('Enter a valid email address so we can send your receipt.');
      return false;
    }
    return true;
  }

  async function readAddress() {
    const addressEl = elements?.getElement(AddressElement);
    const addr = await addressEl?.getValue();
    const v = addr?.value;
    if (!v?.address || !addr?.complete) return null;
    return {
      fullName: v.name ?? '',
      line1: v.address.line1 ?? '',
      line2: v.address.line2 ?? '',
      city: v.address.city ?? '',
      state: v.address.state ?? '',
      zip: v.address.postal_code ?? '',
    };
  }

  function goToSuccess(ref: string) {
    // Hard navigation, same as every other paid path: the browser owns it,
    // so a chunk swap mid-deploy cannot strand a paying customer.
    window.location.assign(`/checkout/success?order_id=${encodeURIComponent(ref)}&redirect_status=succeeded`);
  }

  /** Card on file: the server charges the stored instrument directly. */
  async function paySaved() {
    if (!stripe || !elements) return;
    const address = await readAddress();
    if (!address) {
      onError('Please complete your shipping address.');
      return;
    }
    const res = await fetch('/api/stripe/charge-saved', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        lines,
        discountCode,
        ruoAttested: true,
        attemptId: attemptIdRef.current,
        buyer: { email: email.trim(), phone: phone.trim(), ...address },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      if (data?.code === 'no-card') setUseSaved(false);
      onError(
        data?.code === 'declined'
          ? `${data.error ?? 'The card on file was declined.'} You can pay with a different card below.`
          : data?.error ?? 'Could not complete the payment. Please try again.',
      );
      if (data?.code === 'declined') setUseSaved(false);
      return;
    }
    if (data.status === 'succeeded') {
      goToSuccess(data.processorId ?? data.orderId);
      return;
    }
    if (data.status === 'requires_action' && data.clientSecret) {
      // The bank wants the cardholder to authenticate. Stripe.js runs the
      // challenge in place; the order is already open and the webhook books
      // it the moment the intent succeeds.
      const { error, paymentIntent } = await stripe.handleNextAction({ clientSecret: data.clientSecret });
      if (error) {
        onError(error.message ?? 'Authentication was not completed. You can pay with a different card below.');
        setUseSaved(false);
        return;
      }
      if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
        goToSuccess(paymentIntent.id);
        return;
      }
      onError('The payment was not completed. You can pay with a different card below.');
      setUseSaved(false);
      return;
    }
    onError('Could not complete the payment. Please try again.');
  }

  /** New card through the Payment Element, optionally kept on file. */
  async function payNew() {
    if (!stripe || !elements) return;

    // 1. Validate the mounted elements and surface any field-level errors.
    const { error: submitError } = await elements.submit();
    if (submitError) {
      onError(submitError.message ?? 'Please check your card details.');
      return;
    }

    // 2. Read the shipping address the buyer entered.
    const address = await readAddress();
    if (!address) {
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
        saveCard: !!isPractitioner && saveCard,
        buyer: { email: email.trim(), phone: phone.trim(), ...address },
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
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || submittingRef.current) return;
    if (!preflight()) return;

    submittingRef.current = true;
    setBusy(true);
    try {
      if (useSaved && savedCard) await paySaved();
      else await payNew();
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

      {/* Card on file: offered only when the server found one for this practice. */}
      {savedCard && (
        <div>
          <label className="block text-[11px] uppercase tracking-wider font-bold text-ink-soft mb-1.5">
            Payment method
          </label>
          <div className="rounded-xl border border-cobalt/20 divide-y divide-cobalt/10 overflow-hidden">
            <label className="flex items-start gap-3 px-4 py-3 cursor-pointer bg-white">
              <input
                type="radio"
                name="payWith"
                checked={useSaved}
                onChange={() => setUseSaved(true)}
                className="mt-1 accent-cobalt"
              />
              <span className="text-[14px] text-ink">
                <strong>Card on file</strong> · {cardLabel(savedCard)}, expires{' '}
                {String(savedCard.expMonth).padStart(2, '0')}/{String(savedCard.expYear).slice(-2)}
                <span className="block text-[12px] text-ink-muted mt-0.5">Saved to your practitioner account.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 px-4 py-3 cursor-pointer bg-white">
              <input
                type="radio"
                name="payWith"
                checked={!useSaved}
                onChange={() => setUseSaved(false)}
                className="mt-1 accent-cobalt"
              />
              <span className="text-[14px] text-ink">Use a different card</span>
            </label>
          </div>
        </div>
      )}

      {!useSaved && (
        <div>
          <label className="block text-[11px] uppercase tracking-wider font-bold text-ink-soft mb-1.5">
            Card details
          </label>
          <PaymentElement options={{ layout: 'tabs' }} />
          {isPractitioner && (
            <label className="mt-3 flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={saveCard}
                onChange={(e) => setSaveCard(e.target.checked)}
                className="mt-0.5 accent-cobalt"
              />
              <span className="text-[13px] text-ink leading-snug">
                {savedCard ? 'Replace the card on file with this one' : 'Keep this card on file for future orders'}
                <span className="block text-[11px] text-ink-muted mt-0.5">
                  Stored by Stripe, never by Merit. Remove it from your portal at any time.
                </span>
              </span>
            </label>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={busy || !stripe}
        className="w-full rounded-xl bg-ink py-3.5 text-base font-bold text-white shadow-md transition hover:opacity-95 disabled:opacity-50"
      >
        {busy
          ? 'Processing…'
          : useSaved && savedCard
            ? `Pay ${fmt(amountCents)} with ${cardLabel(savedCard)}`
            : 'Pay now'}
      </button>
    </form>
  );
}
