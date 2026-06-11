'use client';

import { useEffect, useMemo, useState } from 'react';
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
} from '@paypal/react-paypal-js';
import { useCart, type CartLine } from '@/lib/cart';

const FREE_SHIPPING_THRESHOLD = 10_000;
const FLAT_SHIPPING = 999;

function fmtMoney(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

type OrderQuote = {
  orderId: string;
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  attributionVia: 'discount_code' | 'cookie' | null;
};

export function CheckoutClient() {
  const router = useRouter();
  const lines = useCart((s) => s.lines);
  const clear = useCart((s) => s.clear);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const [discountCode, setDiscountCode] = useState('');
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeApplying, setCodeApplying] = useState(false);

  const subtotalCents = useMemo(
    () => lines.reduce((sum, l) => sum + l.unitCents * l.qty, 0),
    [lines],
  );
  const localDiscountCents = appliedCode ? Math.floor((subtotalCents * 10) / 100) : 0;
  const localShippingCents =
    subtotalCents - localDiscountCents >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
  const localTotalCents = subtotalCents - localDiscountCents + localShippingCents;

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
      const res = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines, discountCode: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCodeError(data.error || 'Could not apply code.');
        setAppliedCode(null);
        return;
      }
      setAppliedCode(code.toUpperCase());
      setDiscountCode('');
    } catch {
      setCodeError('Network error. Try again.');
    } finally {
      setCodeApplying(false);
    }
  }

  function handleRemoveCode() {
    setAppliedCode(null);
    setCodeError(null);
  }

  // PayPal SDK options.
  //   - enable-funding includes applepay + googlepay so the SDK loads
  //     the wallet integrations. Buttons auto-hide on incompatible
  //     browsers (e.g. Chrome on Mac won't show Apple Pay; Safari
  //     won't show Google Pay).
  //   - disable-funding drops the offerings we don't show.
  const paypalOptions = {
    clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
    currency: 'USD',
    intent: 'capture',
    components: 'buttons,card-fields,applepay,googlepay',
    'enable-funding': 'applepay,googlepay',
    'disable-funding': 'paypal,paylater,credit,venmo',
  };

  async function createOrder(): Promise<string> {
    const res = await fetch('/api/paypal/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lines,
        discountCode: appliedCode ?? undefined,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Could not start payment.');
    }
    const data: OrderQuote = await res.json();
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
    alert('Payment failed. If you were charged, contact support and we’ll verify your order.');
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 lg:gap-12 items-start">
      {/* ── Left column: payment ── */}
      <div className="space-y-5 order-2 lg:order-1">
        {!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <p className="text-sm text-amber-900">
              Payment processor not configured. Set NEXT_PUBLIC_PAYPAL_CLIENT_ID.
            </p>
          </div>
        ) : (
          <PayPalScriptProvider options={paypalOptions} deferLoading={false}>
            {/* ── One-tap wallet buttons ─────────────────────────── */}
            <PaymentSection
              eyebrow="Express checkout"
              title="One-tap pay"
              description="Fastest way to check out — uses the wallet your device already has set up."
            >
              <WalletButtons
                createOrder={createOrder}
                onApprove={onApprove}
                onError={onError}
              />
            </PaymentSection>

            {/* ── Divider ─── */}
            <div className="flex items-center gap-3 my-2">
              <div className="flex-1 h-px bg-cobalt/15" />
              <span className="text-[10px] tracking-[0.22em] uppercase font-bold text-ink-soft">
                or
              </span>
              <div className="flex-1 h-px bg-cobalt/15" />
            </div>

            {/* ── Card form (universal fallback) ───────────────────── */}
            <PaymentSection
              eyebrow="All payment methods"
              title="Pay with card"
              description="Visa, Mastercard, Amex, Discover. Card details never touch our servers — PayPal encrypts them end-to-end."
            >
              <PayPalCardFieldsProvider
                createOrder={createOrder}
                onApprove={onApprove}
                onError={onError}
              >
                <CardFieldsForm />
              </PayPalCardFieldsProvider>
            </PaymentSection>
          </PayPalScriptProvider>
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
          Shipping to US addresses only. Free shipping on orders over $100. Apple Pay / Google Pay / card details are encrypted end-to-end by PayPal — we never see or store them.
        </p>
      </aside>
    </div>
  );
}

/* ─── One-tap wallet buttons (Apple Pay + Google Pay) ─────────────── */

type CommonHandlers = {
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string }) => Promise<void>;
  onError: (err: any) => void;
};

function WalletButtons({ createOrder, onApprove, onError }: CommonHandlers) {
  // Track which (if any) wallet button actually rendered so we can show
  // a helpful "no wallets available — use card below" message if neither
  // fired. (PayPal's Smart Buttons silently render-or-hide based on
  // browser capability; this just makes the empty state intentional.)
  const [appleRendered, setAppleRendered] = useState<boolean | null>(null);
  const [googleRendered, setGoogleRendered] = useState<boolean | null>(null);

  return (
    <div className="space-y-3">
      {/* Apple Pay — only renders on Safari/iOS/macOS where Apple Pay session is available */}
      <div className="min-h-[0]">
        <PayPalButtons
          fundingSource={"applepay" as any}
          style={{ layout: 'horizontal', height: 48, color: 'black', shape: 'rect' }}
          createOrder={createOrder}
          onApprove={onApprove}
          onError={onError}
          onInit={() => setAppleRendered(true)}
        />
      </div>

      {/* Google Pay — renders on Chrome + Android-backed browsers */}
      <div className="min-h-[0]">
        <PayPalButtons
          fundingSource={"googlepay" as any}
          style={{ layout: 'horizontal', height: 48, color: 'black', shape: 'rect' }}
          createOrder={createOrder}
          onApprove={onApprove}
          onError={onError}
          onInit={() => setGoogleRendered(true)}
        />
      </div>

      {appleRendered === false && googleRendered === false && (
        <p className="text-xs text-ink-soft text-center pt-2">
          Apple Pay and Google Pay aren’t available on this device. Pay with card below — it works on every browser.
        </p>
      )}
    </div>
  );
}

/* ─── Sub-components ─── */

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

function CardFieldsForm() {
  const { cardFieldsForm } = usePayPalCardFields();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!cardFieldsForm) return;
    setSubmitting(true);
    try {
      const state = await cardFieldsForm.getState();
      if (!state.isFormValid) {
        setSubmitting(false);
        alert('Please check your card details and try again.');
        return;
      }
      await cardFieldsForm.submit();
    } catch (err: any) {
      console.error('[paypal/card-fields] submit failed:', err);
      alert('Card submission failed. Double-check your details and try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-[11px] tracking-[0.14em] uppercase text-ink-soft font-bold">
          Card number
        </span>
        <div className="mt-1.5 rounded-xl border border-cobalt/20 bg-white px-4 py-3 hover:border-cobalt/40 focus-within:border-cobalt focus-within:ring-2 focus-within:ring-cobalt/10 transition">
          <PayPalNumberField placeholder="" />
        </div>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[11px] tracking-[0.14em] uppercase text-ink-soft font-bold">
            Expiry
          </span>
          <div className="mt-1.5 rounded-xl border border-cobalt/20 bg-white px-4 py-3 hover:border-cobalt/40 focus-within:border-cobalt focus-within:ring-2 focus-within:ring-cobalt/10 transition">
            <PayPalExpiryField placeholder="MM / YY" />
          </div>
        </label>
        <label className="block">
          <span className="text-[11px] tracking-[0.14em] uppercase text-ink-soft font-bold">
            CVC
          </span>
          <div className="mt-1.5 rounded-xl border border-cobalt/20 bg-white px-4 py-3 hover:border-cobalt/40 focus-within:border-cobalt focus-within:ring-2 focus-within:ring-cobalt/10 transition">
            <PayPalCVVField placeholder="•••" />
          </div>
        </label>
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full bg-ink text-white px-6 py-4 rounded-xl text-sm font-bold tracking-wide hover:bg-cobalt transition disabled:opacity-60 disabled:cursor-not-allowed mt-2"
      >
        {submitting ? 'Processing…' : 'Pay now'}
      </button>
    </div>
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
