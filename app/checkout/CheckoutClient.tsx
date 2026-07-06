'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { productImage } from '@/lib/product-types';
import {
  PayPalScriptProvider,
  PayPalButtons,
  PayPalCardFieldsProvider,
  PayPalNumberField,
  PayPalExpiryField,
  PayPalCVVField,
  usePayPalCardFields,
  usePayPalScriptReducer,
} from '@paypal/react-paypal-js';
import { useCart, type CartLine } from '@/lib/cart';
import { track, identify, trackPurchase, trackInitiateCheckout } from '@/lib/analytics';
import { US_STATES } from './us-states';

const FLAT_SHIPPING = 999;

const RUO_TEXT =
  'By placing your order, you confirm you’re a qualified researcher purchasing for research use only — not for human or veterinary use — and agree to our Terms.';

function fmtMoney(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

type AddressState = {
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
};

const blankAddress: AddressState = {
  fullName: '', line1: '', line2: '', city: '', state: '', zip: '',
};

type CheckoutFormState = {
  ruoAttested: boolean;
  email: string;
  phone: string;
  shipping: AddressState;
  shipSameAsBilling: boolean;
  billing: AddressState;
};

export function CheckoutClient({
  autoReferralCode = null,
  bacWaterProduct = null,
  freeShippingThresholdCents = 35_000,
  paypalClientId = '',
}: {
  autoReferralCode?: string | null;
  bacWaterProduct?: { handle: string; title: string; unitCents: number; imageUrl?: string } | null;
  freeShippingThresholdCents?: number;
  /**
   * PayPal client id for the browser SDK/button. Sourced from the SERVER env
   * (PAYPAL_CLIENT_ID) at request time by the checkout page, so the button's
   * account can never drift from the credentials we capture against. Falls
   * back to the build-time NEXT_PUBLIC_PAYPAL_CLIENT_ID when not supplied.
   */
  paypalClientId?: string;
}) {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const clear = useCart((s) => s.clear);
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);

  // Reconstitution nudge: most compounds need bacteriostatic water. True when
  // the cart already has a standalone bac-water line.
  const hasBacWater = lines.some((l) => /bacteriostatic|bac-water/i.test(l.handle));

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  // Fire InitiateCheckout once, when the cart hydrates with items — the
  // buyer-intent signal Meta/TikTok optimize toward (value + currency only).
  const icFiredRef = useRef(false);
  useEffect(() => {
    if (icFiredRef.current || !hydrated || lines.length === 0) return;
    icFiredRef.current = true;
    trackInitiateCheckout({
      value: subtotalCents / 100,
      item_count: lines.reduce((n, l) => n + l.qty, 0),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, lines.length]);

  const [discountCode, setDiscountCode] = useState('');
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  // Server-authoritative discount + shipping + total amounts. Set when a
  // code is applied via /api/paypal/create-order. Kept here so the cart
  // summary shows what the SERVER calculated (could be FIXED_AMOUNT,
  // PERCENT, FREE_SHIPPING, affiliate %, etc) — NOT a client-side guess.
  const [appliedAmounts, setAppliedAmounts] = useState<{
    discountCents: number;
    shippingCents: number;
    totalCents: number;
  } | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeApplying, setCodeApplying] = useState(false);

  const [form, setForm] = useState<CheckoutFormState>({
    // Attestation is now a passive notice at the pay action (clickwrap-by-button),
    // not a blocking checkbox — so it starts satisfied. The RUO_NOT_ATTESTED gates
    // below stay as a harmless backstop.
    ruoAttested: true,
    email: '',
    phone: '',
    shipping: { ...blankAddress },
    shipSameAsBilling: true,
    billing: { ...blankAddress },
  });
  const [formError, setFormError] = useState<string | null>(null);
  const ruoRef = useRef<HTMLDivElement>(null);

  // Keep latest form state in a ref so the callbacks PayPal SDK closes
  // over don't capture a stale snapshot.
  const formRef = useRef(form);
  useEffect(() => { formRef.current = form; }, [form]);
  const appliedCodeRef = useRef(appliedCode);
  useEffect(() => { appliedCodeRef.current = appliedCode; }, [appliedCode]);

  const subtotalCents = useMemo(
    () => lines.reduce((sum, l) => sum + l.unitCents * l.qty, 0),
    [lines],
  );
  // When a code is applied, use the SERVER's authoritative math (which
  // honors the discount's actual type + value: FIXED_AMOUNT, PERCENT,
  // FREE_SHIPPING). Fall back to local subtotal-only when no code
  // is applied.
  const localDiscountCents = appliedAmounts?.discountCents ?? 0;
  const localShippingCents =
    appliedAmounts?.shippingCents
    ?? (subtotalCents - localDiscountCents >= freeShippingThresholdCents ? 0 : FLAT_SHIPPING);
  const localTotalCents =
    appliedAmounts?.totalCents
    ?? (subtotalCents - localDiscountCents + localShippingCents);

  // NOTE: the empty-cart early return lives at the BOTTOM of this component,
  // after every hook. It used to sit here — before five useEffects — which
  // violated the Rules of Hooks: the first client render (hydrated=false) ran
  // all hooks, then hydration flipped and an empty cart skipped the later
  // ones → React #300 → the entire checkout route crashed to an error screen.
  // Worse, clear()-ing the cart after a successful capture re-rendered this
  // component into that same crash — buyers who had JUST PAID saw a bare
  // "Application error", assumed failure, and paid again.

  // Apply a discount/affiliate code. `silent` suppresses errors for the
  // auto-applied referral code (the buyer didn't type it, so a failure
  // shouldn't surface as an error).
  async function applyCode(rawCode: string, opts?: { silent?: boolean }) {
    const code = rawCode.trim();
    if (!code) return;
    if (!opts?.silent) setCodeError(null);
    setCodeApplying(true);
    try {
      // Use a lightweight discount-only validation flow: call create-order
      // with ruoAttested=true (we don't actually use the order, we
      // just want the server to validate the code and report back).
      const res = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines, discountCode: code, ruoAttested: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (!opts?.silent) setCodeError(data.error || 'Could not apply code.');
        setAppliedCode(null);
        setAppliedAmounts(null);
        return;
      }
      setAppliedCode(code.toUpperCase());
      // Capture the server-authoritative pricing. The cart summary uses
      // these so what the buyer sees matches what PayPal will charge.
      setAppliedAmounts({
        discountCents: Number(data.discountCents ?? 0),
        shippingCents: Number(data.shippingCents ?? 0),
        totalCents: Number(data.totalCents ?? 0),
      });
      setDiscountCode('');
    } catch {
      if (!opts?.silent) setCodeError('Network error. Try again.');
    } finally {
      setCodeApplying(false);
    }
  }

  function handleApplyCode(e: React.FormEvent) {
    e.preventDefault();
    applyCode(discountCode);
  }

  // Auto-apply the referring affiliate's code (from the ?ref= cookie,
  // resolved server-side). Fires once the cart has hydrated, only if the
  // buyer hasn't already applied a code. Populates the discount box so the
  // 10% shows AND the code is visible — the buyer can still remove it.
  const autoAppliedRef = useRef(false);

  // Auto-apply the WELCOME20 first-order code stashed by the /access gate.
  // Runs BEFORE the referral auto-apply and shares autoAppliedRef, so the
  // ad-funnel code wins (matches the server: ad-funnel codes override ?ref).
  // Without this, the gate promised "20% off" but the buyer hit full price.
  useEffect(() => {
    if (autoAppliedRef.current) return;
    if (!hydrated || lines.length === 0 || appliedCode) return;
    let welcome: string | null = null;
    try { welcome = localStorage.getItem('merit_welcome_code'); } catch { /* private mode */ }
    if (!welcome) return;
    autoAppliedRef.current = true;
    applyCode(welcome, { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, lines.length, appliedCode]);

  useEffect(() => {
    if (autoAppliedRef.current) return;
    if (!autoReferralCode || !hydrated || lines.length === 0 || appliedCode) return;
    autoAppliedRef.current = true;
    applyCode(autoReferralCode, { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoReferralCode, hydrated, lines.length, appliedCode]);

  // Re-validate an applied code whenever the cart subtotal changes (qty edit
  // or remove at checkout) so the shown discount + total stay accurate. The
  // ref guards re-firing on an unchanged subtotal; applyCode mutates none of
  // these deps, so there's no loop.
  const lastPricedSubtotalRef = useRef(subtotalCents);
  useEffect(() => {
    if (!appliedCode || lines.length === 0) {
      lastPricedSubtotalRef.current = subtotalCents;
      return;
    }
    if (subtotalCents === lastPricedSubtotalRef.current) return;
    lastPricedSubtotalRef.current = subtotalCents;
    applyCode(appliedCode, { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotalCents, appliedCode, lines.length]);

  // Funnel: begin checkout. Fires once when the cart has hydrated with items.
  const beganCheckoutRef = useRef(false);
  useEffect(() => {
    if (beganCheckoutRef.current || !hydrated || lines.length === 0) return;
    beganCheckoutRef.current = true;
    track('begin_checkout', {
      value_usd: subtotalCents / 100,
      item_count: lines.reduce((n, l) => n + l.qty, 0),
    });
  }, [hydrated, lines.length, subtotalCents]);

  // Abandoned-cart capture. The moment a valid email is entered — BEFORE
  // payment — persist the cart server-side so the lead + contents are never
  // lost if the buyer bails. Debounced; re-posts when the cart changes; a
  // signature guard avoids duplicate writes. keepalive lets the request
  // survive the navigation away. Failures are swallowed — never block pay.
  const lastCapturedRef = useRef('');
  useEffect(() => {
    const email = form.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || lines.length === 0) return;
    const itemCount = lines.reduce((n, l) => n + l.qty, 0);
    const signature = `${email}|${subtotalCents}|${itemCount}`;
    if (signature === lastCapturedRef.current) return;
    const t = setTimeout(() => {
      lastCapturedRef.current = signature;
      identify(email);
      track('checkout_email_captured', { value_usd: subtotalCents / 100, item_count: itemCount });
      fetch('/api/abandoned-cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, lines, source: 'checkout' }),
        keepalive: true,
      }).catch(() => {});
    }, 1200);
    return () => clearTimeout(t);
  }, [form.email, lines, subtotalCents]);

  function handleRemoveCode() {
    setAppliedCode(null);
    setAppliedAmounts(null);
    setCodeError(null);
  }

  // Apple Pay requires PayPal domain verification.
  // ✓ meritsciences.com DNS cut over from Shopify to Render
  // ✓ apple-developer-merchantid-domain-association file hosted at /.well-known/
  // ✓ PayPal "Verify Domain" succeeded on 2026-06-15
  const APPLE_PAY_ENABLED = true;

  // PayPal SDK options.
  //
  // IMPORTANT — applepay + googlepay belong in `components`, NOT in
  // `enable-funding`. PayPal returns
  //   "Invalid query value for enable-funding: googlepay"
  // if you put them in enable-funding. We learned this the hard way.
  //
  // `disable-funding` opts OUT of funding sources we don't want to show
  // (Pay-Later messaging, PayPal Credit, Venmo). PayPal button comes
  // from the default 'paypal' funding source — implicit.
  const components = APPLE_PAY_ENABLED
    ? 'buttons,card-fields,applepay,googlepay'
    : 'buttons,card-fields,googlepay';

  // Prefer the server-sourced client id (runtime PAYPAL_CLIENT_ID, passed as a
  // prop) so the button always matches the account we capture against. Fall
  // back to the build-time public var if the prop wasn't supplied.
  const resolvedPaypalClientId =
    paypalClientId || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';

  const paypalOptions = {
    clientId: resolvedPaypalClientId,
    currency: 'USD',
    intent: 'capture',
    components,
    'disable-funding': 'paylater,credit,venmo',
  };

  // ── Wallet flow createOrder: no shipping address; wallet supplies it
  async function createOrderForWallet(): Promise<string> {
    if (!formRef.current.ruoAttested) {
      throw new Error('RUO_NOT_ATTESTED');
    }
    const res = await fetch('/api/paypal/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lines,
        discountCode: appliedCodeRef.current ?? undefined,
        ruoAttested: true,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Could not start payment.');
    }
    const data = await res.json();
    return data.orderId;
  }

  // ── Card flow createOrder: includes full buyer + shipping info
  async function createOrderForCard(): Promise<string> {
    if (!formRef.current.ruoAttested) {
      throw new Error('RUO_NOT_ATTESTED');
    }
    const f = formRef.current;
    const res = await fetch('/api/paypal/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lines,
        discountCode: appliedCodeRef.current ?? undefined,
        ruoAttested: true,
        buyer: {
          email: f.email,
          phone: f.phone,
          shipping: f.shipping,
        },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Could not start payment.');
    }
    const data = await res.json();
    return data.orderId;
  }

  // ── Post-payment handoff ──────────────────────────────────────────
  // Everything from here to the thank-you page must be crash-proof: the
  // buyer's card has ALREADY been charged. Any error shown after capture
  // reads as "payment failed" and makes people pay again (we've refunded
  // real double-charges caused by exactly that).

  /**
   * DB-truth probe: did this PayPal order actually get captured? Used when
   * the /api/paypal/capture response is lost (proxy timeout, mid-deploy
   * restart, flaky mobile network) — the money may have moved even though
   * the browser never heard back. Fulfillment usually lands within ~2s of
   * capture, so a few short polls settle it.
   */
  async function orderIsPaid(orderId: string): Promise<boolean> {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const res = await fetch(
          `/api/paypal/order-status?orderId=${encodeURIComponent(orderId)}`,
          { cache: 'no-store' },
        );
        if (res.ok) {
          const j = await res.json().catch(() => null);
          if (j?.paid) return true;
        }
      } catch { /* keep polling */ }
      await new Promise((r) => setTimeout(r, 2000));
    }
    return false;
  }

  /** Confirmed paid → fire best-effort analytics, clear cart, HARD-navigate. */
  function goToSuccess(orderId: string, captured?: any) {
    // Analytics + cart-clear must never block the handoff. The server-side
    // CAPI Purchase (deduped by order id) covers us if the pixel drops here.
    try {
      const buyerEmail = (captured?.payerEmail || formRef.current.email || '').toLowerCase();
      if (buyerEmail) identify(buyerEmail);
      const capturedValue = Number(captured?.amount?.value) || localTotalCents / 100;
      trackPurchase({
        orderId,
        value: capturedValue,
        currency: captured?.amount?.currency_code || 'USD',
        item_count: lines.reduce((n, l) => n + l.qty, 0),
        discount_usd: localDiscountCents / 100,
        code: appliedCode ?? undefined,
      });
      clear();
    } catch (e) {
      console.error('[checkout] post-capture side-effect failed (non-fatal)', e);
    }
    // HARD navigation, deliberately not router.push(). A soft navigation
    // fetches RSC payloads/JS chunks and throws to Next's bare "Application
    // error" screen when that fetch hiccups (mid-deploy chunk swap, flaky
    // network) — which is how paid customers ended up back on checkout
    // paying again. The browser owns this navigation; React can't crash it.
    window.location.assign(`/checkout/success?order_id=${encodeURIComponent(orderId)}`);
  }

  /** Show a blocking checkout error and scroll it into view. */
  function failCheckout(msg: string) {
    setFormError(msg);
    setTimeout(() => {
      document.getElementById('checkout-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  }

  async function onApprove(data: { orderID: string }) {
    let outcome: 'paid' | 'declined' | 'unknown' = 'unknown';
    let captured: any = null;

    try {
      const res = await fetch('/api/paypal/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Pass the typed email so the server can mark this shopper's saved
        // cart recovered (the card flow has it; wallet flow relies on payer email).
        body: JSON.stringify({ orderId: data.orderID, email: formRef.current.email || undefined }),
      });
      if (res.status === 402) {
        // Server confirmed the capture did NOT complete (decline/3DS fail).
        // Retrying is safe and correct here — no money moved.
        outcome = 'declined';
      } else if (res.ok) {
        captured = await res.json().catch(() => null);
        outcome = captured?.ok ? 'paid' : 'unknown';
      }
      // 5xx / gateway errors stay 'unknown' — the capture may have succeeded.
    } catch {
      outcome = 'unknown';
    }

    // Ambiguous outcome → ask the server what actually happened before we
    // show the buyer anything that could prompt a second payment.
    if (outcome === 'unknown' && (await orderIsPaid(data.orderID))) {
      outcome = 'paid';
    }

    if (outcome === 'paid') {
      goToSuccess(data.orderID, captured);
      return;
    }
    if (outcome === 'declined') {
      failCheckout(
        'Your payment didn’t go through and you were not charged for this attempt. You can try again or use a different payment method.',
      );
      return;
    }
    failCheckout(
      'We couldn’t confirm whether your payment completed. Please don’t pay again yet — check your inbox for a Merit receipt first. If nothing arrives within a few minutes, try again or email rx@meritsciences.com and we’ll verify instantly.',
    );
  }

  function onError(err: any) {
    console.error('[paypal] payment error:', err);
    const msg = String(err?.message ?? '');
    if (msg === 'RUO_NOT_ATTESTED') {
      ruoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setFormError('Please confirm the research-use-only attestation before paying.');
      return;
    }
    // Server-side duplicate-payment guard tripped — relay its message verbatim
    // (it tells the buyer their earlier payment already went through).
    if (/already went through/i.test(msg)) {
      failCheckout(msg);
      return;
    }
    failCheckout(
      'Something interrupted the payment window. If you completed payment, don’t pay again — check your inbox for a Merit receipt, or email rx@meritsciences.com and we’ll verify. Otherwise, you can simply try again.',
    );
  }

  // Intercept wallet button clicks before they call createOrder
  function onWalletClick(_data: any, actions: any) {
    if (!formRef.current.ruoAttested) {
      ruoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setFormError('Please confirm the research-use-only attestation before paying.');
      return actions.reject();
    }
    setFormError(null);
    return actions.resolve();
  }

  // Empty-cart state — deliberately AFTER every hook above (Rules of Hooks;
  // see the note where this block used to live). Also renders for the brief
  // moment after a successful payment clears the cart while the hard
  // navigation to /checkout/success is in flight.
  if (hydrated && lines.length === 0) {
    return (
      <div className="rounded-2xl border border-cobalt/15 bg-white p-10 text-center">
        <p className="text-base text-ink-soft mb-6">Your cart is empty.</p>
        <button
          type="button"
          onClick={() => router.push('/catalog')}
          className="bg-ink text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-cobalt transition"
        >
          Browse the catalog
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 lg:gap-12 items-start">
      {/* ── Left column: payment surface ── */}
      <div className="space-y-5 order-2 lg:order-1">

        {/* RUO notice — passive; agreement is implied by placing the order below. */}
        <div ref={ruoRef}>
          <RUOAttestation />
        </div>

        {!resolvedPaypalClientId ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <p className="text-sm text-amber-900">
              Payment processor not configured. Set PAYPAL_CLIENT_ID (server) or NEXT_PUBLIC_PAYPAL_CLIENT_ID.
            </p>
          </div>
        ) : (
          <PayPalScriptProvider options={paypalOptions} deferLoading={false}>
            {/* ── Express checkout: Apple Pay + Google Pay + PayPal ── */}
            <PaymentSection
              eyebrow="Express checkout"
              title="One-tap pay"
              description="Fastest way to check out — uses the wallet your device already has. Shipping and contact info pulled from your wallet."
            >
              <WalletTriad
                createOrder={createOrderForWallet}
                onApprove={onApprove}
                onError={onError}
                onClick={onWalletClick}
                applePayEnabled={APPLE_PAY_ENABLED}
              />
            </PaymentSection>

            {/* ── Divider ── */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-cobalt/15" />
              <span className="text-[10px] tracking-[0.22em] uppercase font-bold text-ink-soft">
                or
              </span>
              <div className="flex-1 h-px bg-cobalt/15" />
            </div>

            {/* ── Manual card entry with full buyer info ── */}
            <PaymentSection
              eyebrow="Pay with card"
              title="Card payment"
              description="Visa, Mastercard, Amex, Discover. We collect shipping + contact info here, then PayPal handles the card encryption."
            >
              <PayPalCardFieldsProvider
                createOrder={createOrderForCard}
                onApprove={onApprove}
                onError={onError}
              >
                <FullCardForm
                  form={form}
                  setForm={setForm}
                  ruoRef={ruoRef}
                  onValidationError={setFormError}
                />
              </PayPalCardFieldsProvider>
            </PaymentSection>
          </PayPalScriptProvider>
        )}

        {/* Form-level error display below the form */}
        {formError && (
          <div id="checkout-error" className="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm text-rose-900 leading-relaxed">{formError}</p>
          </div>
        )}
      </div>

      {/* ── Right column: order summary ── */}
      <aside className="order-1 lg:order-2 lg:sticky lg:top-6">
        <div className="rounded-2xl border border-cobalt/15 bg-white overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-cobalt/10">
            <p className="text-[10px] tracking-[0.22em] uppercase font-bold text-cobalt">
              — Order summary
            </p>
          </div>

          <ul className="divide-y divide-cobalt/5">
            {lines.map((l) => (
              <CartRow
                key={`${l.handle}__${l.bundleLabel}`}
                line={l}
                onSetQty={(q) => setQty(l.handle, l.bundleLabel, q)}
                onRemove={() => remove(l.handle, l.bundleLabel)}
              />
            ))}
          </ul>

          {/* Reconstitution nudge — most compounds need bacteriostatic water.
              Shows only when the cart has none; one tap adds it and the
              nudge disappears. */}
          {bacWaterProduct && !hasBacWater && (
            <div className="px-5 sm:px-6 py-3.5 border-t border-amber-300/50 bg-amber-50/70">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={() =>
                    add(
                      {
                        handle: bacWaterProduct.handle,
                        title: bacWaterProduct.title,
                        bundleLabel: 'Single',
                        unitCents: bacWaterProduct.unitCents,
                        imageUrl: bacWaterProduct.imageUrl,
                      },
                      1,
                    )
                  }
                  className="mt-0.5 w-4 h-4 accent-cobalt cursor-pointer flex-shrink-0"
                />
                <span className="text-[13px] leading-snug text-ink">
                  <strong className="font-bold">Add Bacteriostatic Water — {fmtMoney(bacWaterProduct.unitCents)}.</strong>{' '}
                  <span className="text-ink-soft">Most research compounds require reconstitution, and your cart doesn&rsquo;t include any.</span>
                </span>
              </label>
            </div>
          )}

          <div className="px-5 sm:px-6 py-4 border-t border-cobalt/10 bg-cobalt/5">
            {appliedCode ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-ink">
                  Code <strong className="font-mono">{appliedCode}</strong> applied
                </span>
                <button
                  type="button"
                  onClick={handleRemoveCode}
                  className="text-xs font-bold tracking-wider uppercase text-ink-soft hover:text-rose-700 transition"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCode} className="flex gap-2">
                <input
                  type="text"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  placeholder="Discount code"
                  className="flex-1 rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:border-cobalt"
                />
                <button
                  type="submit"
                  disabled={codeApplying || !discountCode.trim()}
                  className="bg-ink text-white px-4 py-2 rounded-lg text-xs font-bold tracking-wide hover:bg-cobalt transition disabled:opacity-50"
                >
                  {codeApplying ? '…' : 'Apply'}
                </button>
              </form>
            )}
            {codeError && <p className="text-xs text-rose-700 mt-2">{codeError}</p>}
          </div>

          <div className="px-5 sm:px-6 py-5 space-y-2 text-sm">
            <Row label="Subtotal" value={fmtMoney(subtotalCents)} />
            {localDiscountCents > 0 && (
              <Row label="Discount" value={fmtMoney(-localDiscountCents)} accent />
            )}
            <Row
              label="Shipping"
              value={localShippingCents === 0 ? 'Free' : fmtMoney(localShippingCents)}
            />
            <div className="border-t border-cobalt/10 pt-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-ink">Total</span>
                <span className="font-display font-black text-2xl text-ink tracking-tight">
                  {fmtMoney(localTotalCents)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-ink-soft/70 mt-4 leading-relaxed">
          US shipping only. Free over $350. Card details encrypted end-to-end by PayPal — we never see or store them. Wallet payments pull shipping from your device&rsquo;s saved address.
        </p>
      </aside>
    </div>
  );
}

/* ─── RUO Attestation ─── */

/** Passive research-use notice. Agreement is implied by placing the order
 *  (clickwrap-by-button) — no blocking checkbox. Kept calm + compact so it
 *  reassures rather than scares at the moment of payment. */
function RUOAttestation() {
  return (
    <div className="rounded-xl border border-cobalt/12 bg-cobalt/[0.03] px-4 py-3">
      <p className="text-[12px] leading-relaxed text-ink-soft">
        <span className="font-bold text-ink">Research use only.</span> {RUO_TEXT}
      </p>
    </div>
  );
}

/* ─── Wallet triad: AP + GP side-by-side, PayPal full-width below ─── */

type WalletHandlers = {
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string }) => Promise<void>;
  onError: (err: any) => void;
  onClick: (data: any, actions: any) => any;
  applePayEnabled: boolean;
};

function WalletTriad({
  createOrder, onApprove, onError, onClick, applePayEnabled,
}: WalletHandlers) {
  const [{ isResolved }] = usePayPalScriptReducer();
  // Eligibility flags computed once the SDK script resolves.
  // PayPal's SDK silently hides wallet buttons when the buyer's
  // browser/device isn't eligible — we surface that as visible status
  // so it's clear the integration is wired, just not usable here.
  const [eligibility, setEligibility] = useState<{
    applepay: boolean | null;
    googlepay: boolean | null;
    paypal: boolean | null;
  }>({ applepay: null, googlepay: null, paypal: null });

  useEffect(() => {
    if (!isResolved) return;
    // window.paypal is exposed by the loaded SDK script
    const pp = (window as any).paypal;
    if (!pp?.Buttons) return;
    try {
      setEligibility({
        applepay: applePayEnabled
          ? !!pp.Buttons({ fundingSource: 'applepay' }).isEligible?.()
          : false,
        googlepay: !!pp.Buttons({ fundingSource: 'googlepay' }).isEligible?.(),
        paypal: !!pp.Buttons({ fundingSource: 'paypal' }).isEligible?.(),
      });
    } catch (err) {
      console.error('[paypal] eligibility check failed', err);
    }
  }, [isResolved, applePayEnabled]);

  const anyWalletAvailable =
    eligibility.applepay === true || eligibility.googlepay === true || eligibility.paypal === true;

  return (
    <div className="space-y-3">
      {/* Always render the wallet buttons. PayPal's SDK has its own
          internal eligibility gate — if the browser/device can't actually
          process Apple Pay or Google Pay, PayPal returns nothing from
          the render and the slot stays empty. Our state-based isEligible()
          check was double-gating and could leave both buttons hidden
          even on supported devices when the script-resolved race
          condition went wrong. */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        {applePayEnabled && (
          <div>
            <PayPalButtons
              fundingSource={'applepay' as any}
              style={{ layout: 'horizontal', height: 48, color: 'black', shape: 'rect' }}
              createOrder={createOrder}
              onApprove={onApprove}
              onError={onError}
              onClick={onClick}
            />
          </div>
        )}
        <div>
          <PayPalButtons
            fundingSource={'googlepay' as any}
            style={{ layout: 'horizontal', height: 48, color: 'black', shape: 'rect' }}
            createOrder={createOrder}
            onApprove={onApprove}
            onError={onError}
            onClick={onClick}
          />
        </div>
      </div>

      {/* PayPal always renders if eligible (basically always) */}
      {eligibility.paypal !== false && (
        <div>
          <PayPalButtons
            fundingSource="paypal"
            style={{ layout: 'horizontal', height: 48, color: 'gold', shape: 'rect', label: 'paypal' }}
            createOrder={createOrder}
            onApprove={onApprove}
            onError={onError}
            onClick={onClick}
          />
        </div>
      )}

      {/* Status indicators — show which wallets are/aren't available on this device */}
      {isResolved && (
        <div className="border-t border-cobalt/10 pt-3 mt-3 space-y-1.5">
          <EligibilityLine
            label="Apple Pay"
            state={
              !applePayEnabled
                ? 'pending'
                : eligibility.applepay
                ? 'available'
                : 'unavailable'
            }
            unavailableReason="Requires Safari on iOS/iPadOS/macOS"
            pendingReason="Activates after meritsciences.com cuts over from Shopify to Render"
          />
          <EligibilityLine
            label="Google Pay"
            state={eligibility.googlepay ? 'available' : 'unavailable'}
            unavailableReason="Requires Chrome with a saved card in Google Pay"
          />
          <EligibilityLine
            label="PayPal"
            state={eligibility.paypal === false ? 'unavailable' : 'available'}
          />
        </div>
      )}

      {!anyWalletAvailable && isResolved && (
        <p className="text-xs text-ink-soft pt-2 leading-relaxed">
          No express checkout options available on this browser — use <strong className="text-ink">Pay with card</strong> below.
        </p>
      )}
    </div>
  );
}

function EligibilityLine({
  label,
  state,
  unavailableReason,
  pendingReason,
}: {
  label: string;
  state: 'available' | 'unavailable' | 'pending';
  unavailableReason?: string;
  pendingReason?: string;
}) {
  const icon =
    state === 'available' ? '✓' : state === 'unavailable' ? '–' : '○';
  const cls =
    state === 'available'
      ? 'text-emerald-700'
      : state === 'unavailable'
      ? 'text-ink-soft/60'
      : 'text-amber-700';
  const reason =
    state === 'unavailable' ? unavailableReason : state === 'pending' ? pendingReason : null;
  return (
    <div className="flex items-baseline gap-2 text-[11px]">
      <span className={`font-bold tabular-nums ${cls}`}>{icon}</span>
      <span className={`font-bold ${cls}`}>{label}</span>
      {reason && <span className="text-ink-soft/70">— {reason}</span>}
    </div>
  );
}

/* ─── Full card form (shipping + billing + contact + card fields) ─── */

function FullCardForm({
  form, setForm, ruoRef, onValidationError,
}: {
  form: CheckoutFormState;
  setForm: (f: CheckoutFormState) => void;
  ruoRef: React.RefObject<HTMLDivElement>;
  onValidationError: (msg: string | null) => void;
}) {
  const { cardFieldsForm } = usePayPalCardFields();
  const [submitting, setSubmitting] = useState(false);

  function updateShipping(patch: Partial<AddressState>) {
    setForm({ ...form, shipping: { ...form.shipping, ...patch } });
  }
  function updateBilling(patch: Partial<AddressState>) {
    setForm({ ...form, billing: { ...form.billing, ...patch } });
  }

  function validate(): string | null {
    if (!form.ruoAttested) {
      ruoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return 'Please confirm the research-use-only attestation before paying.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Valid email required.';
    if (form.phone.replace(/\D/g, '').length < 7) return 'Valid phone number required.';
    const s = form.shipping;
    if (s.fullName.trim().length < 2) return 'Full name required.';
    if (!s.line1.trim()) return 'Shipping address required.';
    if (!s.city.trim()) return 'Shipping city required.';
    if (!s.state) return 'Shipping state required.';
    if (!/^\d{5}(-\d{4})?$/.test(s.zip)) return 'Valid shipping ZIP required.';
    if (!form.shipSameAsBilling) {
      const b = form.billing;
      if (!b.line1.trim()) return 'Billing address required.';
      if (!b.city.trim()) return 'Billing city required.';
      if (!b.state) return 'Billing state required.';
      if (!/^\d{5}(-\d{4})?$/.test(b.zip)) return 'Valid billing ZIP required.';
    }
    return null;
  }

  async function handleSubmit() {
    onValidationError(null);
    const err = validate();
    if (err) { onValidationError(err); return; }
    if (!cardFieldsForm) return;
    setSubmitting(true);
    try {
      const state = await cardFieldsForm.getState();
      if (!state.isFormValid) {
        setSubmitting(false);
        onValidationError('Please check your card details and try again.');
        return;
      }
      const billing = form.shipSameAsBilling ? form.shipping : form.billing;
      await cardFieldsForm.submit({
        billingAddress: {
          addressLine1: billing.line1,
          addressLine2: billing.line2 || undefined,
          adminArea2:   billing.city,
          adminArea1:   billing.state,
          postalCode:   billing.zip,
          countryCode:  'US',
        },
      } as any);
      // onApprove fires via the provider after this
    } catch (err: any) {
      console.error('[paypal/card-fields] submit failed:', err);
      onValidationError('Card submission failed. Double-check your details and try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Contact */}
      <FieldGroup title="Contact" eyebrow="1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field
            label="Email" type="email" inputMode="email" autoComplete="email"
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
            placeholder="you@example.com"
          />
          <Field
            label="Phone" type="tel" inputMode="tel" autoComplete="tel"
            value={form.phone}
            onChange={(v) => setForm({ ...form, phone: v })}
            placeholder="(555) 123-4567"
          />
        </div>
      </FieldGroup>

      {/* Shipping address */}
      <FieldGroup title="Ship to" eyebrow="2">
        <Field
          label="Full name" autoComplete="name"
          value={form.shipping.fullName}
          onChange={(v) => updateShipping({ fullName: v })}
          placeholder="First Last"
        />
        <Field
          label="Street address" autoComplete="address-line1"
          value={form.shipping.line1}
          onChange={(v) => updateShipping({ line1: v })}
          placeholder="123 Main Street"
        />
        <Field
          label="Apt, suite, etc. (optional)" autoComplete="address-line2"
          value={form.shipping.line2}
          onChange={(v) => updateShipping({ line2: v })}
          placeholder="Suite 200"
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Field
            label="City" autoComplete="address-level2"
            value={form.shipping.city}
            onChange={(v) => updateShipping({ city: v })}
          />
          <SelectField
            label="State"
            value={form.shipping.state}
            onChange={(v) => updateShipping({ state: v })}
            options={US_STATES}
          />
          <Field
            label="ZIP" inputMode="numeric" autoComplete="postal-code"
            value={form.shipping.zip}
            onChange={(v) => updateShipping({ zip: v.replace(/[^\d-]/g, '').slice(0, 10) })}
            placeholder="12345"
          />
        </div>
      </FieldGroup>

      {/* Card */}
      <FieldGroup title="Card details" eyebrow="3">
        <FieldShell label="Card number">
          <PayPalNumberField />
        </FieldShell>
        <div className="grid grid-cols-2 gap-3">
          <FieldShell label="Expiry">
            <PayPalExpiryField placeholder="MM / YY" />
          </FieldShell>
          <FieldShell label="CVC">
            <PayPalCVVField placeholder="•••" />
          </FieldShell>
        </div>
      </FieldGroup>

      {/* Billing address (collapsible) */}
      <FieldGroup title="Billing address" eyebrow="4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.shipSameAsBilling}
            onChange={(e) => setForm({ ...form, shipSameAsBilling: e.target.checked })}
            className="w-4 h-4 rounded border-ink/30 text-cobalt focus:ring-2 focus:ring-cobalt/20 cursor-pointer"
          />
          <span className="text-sm text-ink">Same as shipping address</span>
        </label>
        {!form.shipSameAsBilling && (
          <div className="space-y-3 pt-3">
            <Field
              label="Street address" autoComplete="billing address-line1"
              value={form.billing.line1}
              onChange={(v) => updateBilling({ line1: v })}
            />
            <Field
              label="Apt, suite, etc. (optional)" autoComplete="billing address-line2"
              value={form.billing.line2}
              onChange={(v) => updateBilling({ line2: v })}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Field
                label="City" autoComplete="billing address-level2"
                value={form.billing.city}
                onChange={(v) => updateBilling({ city: v })}
              />
              <SelectField
                label="State"
                value={form.billing.state}
                onChange={(v) => updateBilling({ state: v })}
                options={US_STATES}
              />
              <Field
                label="ZIP" inputMode="numeric" autoComplete="billing postal-code"
                value={form.billing.zip}
                onChange={(v) => updateBilling({ zip: v.replace(/[^\d-]/g, '').slice(0, 10) })}
              />
            </div>
          </div>
        )}
      </FieldGroup>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full bg-ink text-white px-6 py-4 rounded-xl text-sm font-bold tracking-wide hover:bg-cobalt transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? 'Processing…' : 'Pay with card'}
      </button>
    </div>
  );
}

/* ─── Small UI primitives ─── */

function PaymentSection({
  eyebrow, title, description, children,
}: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-cobalt/15 bg-white p-5 sm:p-6">
      <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">
        — {eyebrow}
      </p>
      <h2 className="font-display font-black text-ink tracking-tight text-lg sm:text-xl mb-1.5">
        {title}
      </h2>
      <p className="text-xs sm:text-sm text-ink-soft leading-relaxed mb-5">{description}</p>
      {children}
    </div>
  );
}

function FieldGroup({
  title, eyebrow, children,
}: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="font-display font-black text-cobalt text-sm tabular-nums">
          {eyebrow}
        </span>
        <h3 className="font-display font-black text-ink tracking-tight text-sm uppercase tracking-[0.08em]">
          {title}
        </h3>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label, type = 'text', value, onChange, placeholder, autoComplete, inputMode,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'numeric' | 'tel' | 'email' | 'url';
}) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-[0.14em] uppercase text-ink-soft font-bold">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className="mt-1.5 block w-full rounded-xl border border-cobalt/20 bg-white px-4 py-3 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-cobalt/10 transition"
      />
    </label>
  );
}

function SelectField({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: ReadonlyArray<{ code: string; name: string }>;
}) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-[0.14em] uppercase text-ink-soft font-bold">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 block w-full rounded-xl border border-cobalt/20 bg-white px-3 py-3 text-sm text-ink focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-cobalt/10 transition"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.code} value={o.code}>{o.code}</option>
        ))}
      </select>
    </label>
  );
}

function FieldShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-[0.14em] uppercase text-ink-soft font-bold">
        {label}
      </span>
      <div className="mt-1.5 rounded-xl border border-cobalt/20 bg-white px-4 py-3 hover:border-cobalt/40 focus-within:border-cobalt focus-within:ring-2 focus-within:ring-cobalt/10 transition">
        {children}
      </div>
    </label>
  );
}

function CartRow({
  line,
  onSetQty,
  onRemove,
}: {
  line: CartLine;
  onSetQty: (qty: number) => void;
  onRemove: () => void;
}) {
  return (
    <li className="flex gap-3 px-5 sm:px-6 py-3.5 items-start">
      <div className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-cobalt/5">
        <Image src={productImage(line.imageUrl)} alt="" fill className="object-contain p-1" sizes="48px" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-ink truncate">{line.title}</p>
        <p className="text-[11px] text-ink-soft truncate mb-1.5">{line.bundleLabel}</p>
        {/* Qty stepper + remove — editable at checkout. Stepping below 1
            removes the line (store.setQty treats qty<=0 as a remove). */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center border border-cobalt/15 rounded-full overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => onSetQty(line.qty - 1)}
              className="w-6 h-6 flex items-center justify-center text-ink hover:bg-cream transition"
              aria-label="Decrease quantity"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </button>
            <span className="w-6 text-center text-[11px] font-bold text-ink tabular-nums">{line.qty}</span>
            <button
              type="button"
              onClick={() => onSetQty(line.qty + 1)}
              className="w-6 h-6 flex items-center justify-center text-ink hover:bg-cream transition"
              aria-label="Increase quantity"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            </button>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="text-[11px] text-ink-muted hover:text-rose-700 underline-offset-2 hover:underline transition"
          >
            Remove
          </button>
        </div>
      </div>
      <p className="text-sm text-ink font-bold tabular-nums">
        {fmtMoney(line.unitCents * line.qty)}
      </p>
    </li>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={accent ? 'text-emerald-700 font-bold' : 'text-ink-soft'}>{label}</span>
      <span className={`tabular-nums ${accent ? 'text-emerald-700 font-bold' : 'text-ink'}`}>
        {value}
      </span>
    </div>
  );
}
