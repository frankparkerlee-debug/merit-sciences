'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
import { US_STATES } from './us-states';

const FREE_SHIPPING_THRESHOLD = 10_000;
const FLAT_SHIPPING = 999;

const RUO_TEXT =
  'I attest that I am purchasing this product for research use only (RUO). It is not for human or veterinary consumption, diagnosis, treatment, or prevention of disease. I understand that I assume all responsibility for proper handling, storage, and disposal under federal and state law.';

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

export function CheckoutClient() {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const clear = useCart((s) => s.clear);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

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
    ruoAttested: false,
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
    ?? (subtotalCents - localDiscountCents >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING);
  const localTotalCents =
    appliedAmounts?.totalCents
    ?? (subtotalCents - localDiscountCents + localShippingCents);

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

  async function handleApplyCode(e: React.FormEvent) {
    e.preventDefault();
    setCodeError(null);
    const code = discountCode.trim();
    if (!code) return;
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
        setCodeError(data.error || 'Could not apply code.');
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
      setCodeError('Network error. Try again.');
    } finally {
      setCodeApplying(false);
    }
  }

  function handleRemoveCode() {
    setAppliedCode(null);
    setAppliedAmounts(null);
    setCodeError(null);
  }

  // Apple Pay requires PayPal domain verification (the
  // apple-developer-merchantid-domain-association file at /.well-known/
  // must be reachable from the verified domain). Flip to `true` once:
  //   1. meritsciences.com DNS has cut over from Shopify to Render
  //   2. PayPal Verify Domain has succeeded
  // Then redeploy. (Single-line code change, no env-var dance.)
  const APPLE_PAY_ENABLED = false;

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

  const paypalOptions = {
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
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

  async function onApprove(data: { orderID: string }) {
    const res = await fetch('/api/paypal/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: data.orderID }),
    });
    const captured = await res.json();
    if (!captured.ok) {
      throw new Error(captured.error || 'Payment did not complete.');
    }
    clear();
    router.push(`/checkout/success?order_id=${data.orderID}`);
  }

  function onError(err: any) {
    console.error('[paypal] payment error:', err);
    if (err?.message === 'RUO_NOT_ATTESTED') {
      ruoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setFormError('Please confirm the research-use-only attestation before paying.');
      return;
    }
    alert('Payment failed. If you were charged, contact support and we’ll verify your order.');
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 lg:gap-12 items-start">
      {/* ── Left column: payment surface ── */}
      <div className="space-y-5 order-2 lg:order-1">

        {/* RUO Attestation — gates everything */}
        <div ref={ruoRef}>
          <RUOAttestation
            checked={form.ruoAttested}
            onChange={(v) => { setForm({ ...form, ruoAttested: v }); if (v) setFormError(null); }}
            error={formError}
          />
        </div>

        {!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <p className="text-sm text-amber-900">
              Payment processor not configured. Set NEXT_PUBLIC_PAYPAL_CLIENT_ID.
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
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
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
              <CartRow key={`${l.handle}__${l.bundleLabel}`} line={l} />
            ))}
          </ul>

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
          US shipping only. Free over $100. Card details encrypted end-to-end by PayPal — we never see or store them. Wallet payments pull shipping from your device&rsquo;s saved address.
        </p>
      </aside>
    </div>
  );
}

/* ─── RUO Attestation ─── */

function RUOAttestation({
  checked, onChange, error,
}: { checked: boolean; onChange: (v: boolean) => void; error: string | null }) {
  return (
    <div className={`rounded-2xl border p-5 sm:p-6 transition ${checked
      ? 'border-emerald-200 bg-emerald-50/50'
      : error ? 'border-rose-300 bg-rose-50' : 'border-amber-300 bg-amber-50/60'}`}>
      <div className="flex gap-4 items-start">
        <input
          id="ruo"
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 w-5 h-5 rounded border-2 border-ink/40 text-cobalt focus:ring-2 focus:ring-cobalt/20 cursor-pointer shrink-0"
        />
        <label htmlFor="ruo" className="flex-1 cursor-pointer">
          <p className="text-[10px] tracking-[0.22em] uppercase text-ink-soft font-bold mb-1">
            — Required: Research Use Only Attestation
          </p>
          <p className="text-sm text-ink leading-relaxed">
            {RUO_TEXT}
          </p>
        </label>
      </div>
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
      {/* When AP is enabled: render Apple Pay; when GP is eligible: render Google Pay.
          Layout is 2-col when BOTH are present, 1-col otherwise. */}
      <div className={`grid gap-3 ${applePayEnabled && eligibility.applepay && eligibility.googlepay ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
        {applePayEnabled && eligibility.applepay && (
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
        {eligibility.googlepay && (
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
        )}
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

function CartRow({ line }: { line: CartLine }) {
  return (
    <li className="flex gap-3 px-5 sm:px-6 py-3.5 items-center">
      {line.imageUrl ? (
        <div className="relative w-12 h-12 shrink-0 rounded-lg overflow-hidden bg-cobalt/5">
          <Image src={line.imageUrl} alt="" fill className="object-cover" sizes="48px" />
        </div>
      ) : (
        <div className="w-12 h-12 shrink-0 rounded-lg bg-cobalt/10" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-ink truncate">{line.title}</p>
        <p className="text-[11px] text-ink-soft truncate">
          {line.bundleLabel} · Qty {line.qty}
        </p>
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
