'use client';

import { useEffect, useState, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createManualOrder, type ManualOrderResult } from './actions';

type ProductOption = {
  handle: string;
  title: string;
  priceCents: number;
};

type CustomerHit = {
  name: string;
  email: string;
  phone: string | null;
  lastShipping: {
    shippingFullName: string;
    shippingLine1: string;
    shippingLine2: string | null;
    shippingCity: string;
    shippingState: string;
    shippingZip: string;
  } | null;
};

type PractitionerHit = {
  applicationId: string;
  practiceName: string;
  providerName: string;
  email: string;
  phone: string | null;
  pricingBasis: string;
  retailDiscountBps: number | null;
  overrides: Record<string, number>;
};

type LineItem = {
  id: string; // local key for React list
  handle: string;
  title: string;
  bundleLabel: string;
  unitCents: number;
  qty: number;
};

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

export function NewOrderForm({ products }: { products: ProductOption[] }) {
  const [lines, setLines] = useState<LineItem[]>([]);
  const [result, formAction] = useFormState<ManualOrderResult | null, FormData>(createManualOrder, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [practitioner, setPractitioner] = useState<PractitionerHit | null>(null);

  /** The price THIS buyer pays for a product — practitioner terms when a
   *  practitioner profile is selected, retail otherwise. Mirrors the
   *  priceFor() waterfall: per-SKU override → % off retail → list. */
  function priceForBuyer(p: ProductOption): number {
    if (!practitioner) return p.priceCents;
    const override = practitioner.overrides[p.handle];
    if (override != null && override > 0) return override;
    if (
      practitioner.pricingBasis === 'RETAIL_PCT' &&
      practitioner.retailDiscountBps != null &&
      practitioner.retailDiscountBps > 0 &&
      practitioner.retailDiscountBps < 10000
    ) {
      return Math.max(1, Math.round((p.priceCents * (10000 - practitioner.retailDiscountBps)) / 10000));
    }
    return p.priceCents;
  }

  function setField(name: string, value: string) {
    const el = formRef.current?.elements.namedItem(name) as
      | HTMLInputElement
      | HTMLSelectElement
      | null;
    if (el) el.value = value;
  }

  function applyCustomer(c: CustomerHit) {
    setPractitioner(null);
    setField('customerName', c.name);
    setField('customerEmail', c.email);
    setField('customerPhone', c.phone ?? '');
    if (c.lastShipping) {
      setField('shippingFullName', c.lastShipping.shippingFullName);
      setField('shippingLine1', c.lastShipping.shippingLine1);
      setField('shippingLine2', c.lastShipping.shippingLine2 ?? '');
      setField('shippingCity', c.lastShipping.shippingCity);
      setField('shippingState', c.lastShipping.shippingState);
      setField('shippingZip', c.lastShipping.shippingZip);
    }
  }

  function applyPractitioner(p: PractitionerHit) {
    setPractitioner(p);
    setField('customerName', p.providerName);
    setField('customerEmail', p.email);
    setField('customerPhone', p.phone ?? '');
    // Reprice any already-added lines onto their terms.
    setLines((prev) =>
      prev.map((l) => {
        const prod = products.find((x) => x.handle === l.handle);
        if (!prod) return l;
        const override = p.overrides[l.handle];
        let cents = prod.priceCents;
        if (override != null && override > 0) cents = override;
        else if (
          p.pricingBasis === 'RETAIL_PCT' &&
          p.retailDiscountBps != null &&
          p.retailDiscountBps > 0 &&
          p.retailDiscountBps < 10000
        ) {
          cents = Math.max(1, Math.round((prod.priceCents * (10000 - p.retailDiscountBps)) / 10000));
        }
        return { ...l, unitCents: cents };
      }),
    );
  }

  function addLine(handle: string) {
    const product = products.find((p) => p.handle === handle);
    if (!product) return;
    setLines((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random()}`,
        handle: product.handle,
        title: product.title,
        bundleLabel: 'Single',
        unitCents: priceForBuyer(product),
        qty: 1,
      },
    ]);
  }

  function updateLine(id: string, patch: Partial<Omit<LineItem, 'id'>>) {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function removeLine(id: string) {
    setLines((prev) => prev.filter((l) => l.id !== id));
  }

  const subtotal = lines.reduce((sum, l) => sum + l.unitCents * l.qty, 0);

  return (
    <form
      ref={formRef}
      action={(fd) => {
        fd.set('lines', JSON.stringify(lines.map(({ id: _id, ...rest }) => rest)));
        formAction(fd);
      }}
      className="space-y-6"
    >
      {/* Customer */}
      <section className="rounded-2xl border border-cobalt/15 bg-white p-6 space-y-4">
        <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold">— Customer</p>

        <ProfilePicker onCustomer={applyCustomer} onPractitioner={applyPractitioner} />

        {practitioner && (
          <div className="flex items-start justify-between gap-3 rounded-xl border border-cobalt/25 bg-cobalt/[0.04] px-4 py-3">
            <p className="text-[12.5px] text-ink leading-relaxed">
              <strong>{practitioner.practiceName}</strong> · practitioner account —{' '}
              {practitioner.pricingBasis === 'RETAIL_PCT' && practitioner.retailDiscountBps
                ? `${(practitioner.retailDiscountBps / 100).toFixed(practitioner.retailDiscountBps % 100 ? 1 : 0)}% off retail`
                : 'retail pricing'}
              {Object.keys(practitioner.overrides).length > 0 &&
                ` + ${Object.keys(practitioner.overrides).length} per-product price${Object.keys(practitioner.overrides).length > 1 ? 's' : ''}`}
              . Products added below use their prices; the order links to this practice (referral
              commission applies).
            </p>
            <button
              type="button"
              onClick={() => setPractitioner(null)}
              className="text-ink-soft hover:text-rose-600 text-sm px-1 shrink-0"
              title="Unlink practitioner"
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold tracking-wider uppercase text-ink-soft mb-1">
              Full name <span className="text-rose-500">*</span>
            </label>
            <input
              name="customerName"
              required
              className="block w-full rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
              placeholder="Jane Smith"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold tracking-wider uppercase text-ink-soft mb-1">
              Email <span className="text-rose-500">*</span>
            </label>
            <input
              name="customerEmail"
              type="email"
              required
              className="block w-full rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
              placeholder="jane@example.com"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold tracking-wider uppercase text-ink-soft mb-1">
              Phone
            </label>
            <input
              name="customerPhone"
              type="tel"
              className="block w-full rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
              placeholder="(555) 000-0000"
            />
          </div>
        </div>
      </section>

      {/* Shipping address */}
      <section className="rounded-2xl border border-cobalt/15 bg-white p-6 space-y-4">
        <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold">— Shipping address</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold tracking-wider uppercase text-ink-soft mb-1">
              Recipient name
            </label>
            <input
              name="shippingFullName"
              className="block w-full rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
              placeholder="Leave blank to use customer name"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold tracking-wider uppercase text-ink-soft mb-1">
              Address line 1 <span className="text-rose-500">*</span>
            </label>
            <input
              name="shippingLine1"
              required
              className="block w-full rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
              placeholder="123 Main St"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold tracking-wider uppercase text-ink-soft mb-1">
              Address line 2
            </label>
            <input
              name="shippingLine2"
              className="block w-full rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
              placeholder="Suite 100 (optional)"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold tracking-wider uppercase text-ink-soft mb-1">
              City <span className="text-rose-500">*</span>
            </label>
            <input
              name="shippingCity"
              required
              className="block w-full rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
              placeholder="Dallas"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold tracking-wider uppercase text-ink-soft mb-1">
                State <span className="text-rose-500">*</span>
              </label>
              <select
                name="shippingState"
                required
                defaultValue=""
                className="block w-full rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:border-cobalt"
              >
                <option value="" disabled>—</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold tracking-wider uppercase text-ink-soft mb-1">
                ZIP <span className="text-rose-500">*</span>
              </label>
              <input
                name="shippingZip"
                required
                className="block w-full rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
                placeholder="75201"
                maxLength={10}
              />
            </div>
          </div>
        </div>
        <input type="hidden" name="shippingCountry" value="US" />
      </section>

      {/* Line items */}
      <section className="rounded-2xl border border-cobalt/15 bg-white p-6 space-y-4">
        <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold">— Line items</p>

        {lines.length === 0 && (
          <p className="text-sm text-ink-soft">No items yet. Add a product below.</p>
        )}

        <div className="space-y-3">
          {lines.map((line) => (
            <div
              key={line.id}
              className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-cobalt/10 bg-cobalt/[0.02]"
            >
              {/* Title */}
              <div className="flex-1 min-w-[140px]">
                <p className="text-sm font-bold text-ink truncate">{line.title}</p>
                <input
                  type="text"
                  value={line.bundleLabel}
                  onChange={(e) => updateLine(line.id, { bundleLabel: e.target.value })}
                  className="mt-0.5 text-[11px] text-ink-soft border-0 p-0 bg-transparent focus:outline-none focus:underline w-full"
                  placeholder="e.g. Single vial"
                />
              </div>
              {/* Qty */}
              <div className="flex items-center gap-1">
                <label className="text-[10px] uppercase tracking-wider text-ink-soft font-bold">Qty</label>
                <input
                  type="number"
                  min={1}
                  value={line.qty}
                  onChange={(e) => updateLine(line.id, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                  className="w-14 text-center rounded-lg border border-cobalt/20 bg-white px-2 py-1.5 text-sm text-ink focus:outline-none focus:border-cobalt"
                />
              </div>
              {/* Unit price */}
              <div className="flex items-center gap-1">
                <label className="text-[10px] uppercase tracking-wider text-ink-soft font-bold">Price</label>
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-ink-soft text-sm">$</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={(line.unitCents / 100).toFixed(2)}
                    onChange={(e) => {
                      const cents = Math.round(parseFloat(e.target.value || '0') * 100);
                      updateLine(line.id, { unitCents: cents });
                    }}
                    className="w-24 rounded-lg border border-cobalt/20 bg-white pl-5 pr-2 py-1.5 text-sm text-ink focus:outline-none focus:border-cobalt"
                  />
                </div>
              </div>
              {/* Line total */}
              <div className="text-sm font-bold text-ink tabular-nums w-16 text-right">
                ${((line.unitCents * line.qty) / 100).toFixed(2)}
              </div>
              {/* Remove */}
              <button
                type="button"
                onClick={() => removeLine(line.id)}
                className="text-rose-500 hover:text-rose-700 text-sm px-1"
                title="Remove line"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Add product */}
        <div className="flex gap-2">
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                addLine(e.target.value);
                e.target.value = '';
              }
            }}
            className="flex-1 rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:border-cobalt"
          >
            <option value="">+ Add product…</option>
            {products.map((p) => (
              <option key={p.handle} value={p.handle}>
                {p.title} — ${(p.priceCents / 100).toFixed(2)}
              </option>
            ))}
          </select>
        </div>

        {/* Subtotal display */}
        {lines.length > 0 && (
          <div className="text-right text-sm text-ink-soft">
            Subtotal: <span className="font-bold text-ink">${(subtotal / 100).toFixed(2)}</span>
          </div>
        )}
      </section>

      {/* Order settings */}
      <section className="rounded-2xl border border-cobalt/15 bg-white p-6 space-y-4">
        <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold">— Order details</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold tracking-wider uppercase text-ink-soft mb-1">
              Discount code
            </label>
            <input
              name="discountCode"
              className="block w-full rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt font-mono uppercase"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold tracking-wider uppercase text-ink-soft mb-1">
              Shipping ($)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft text-sm">$</span>
              <input
                name="shippingCents"
                type="number"
                min={0}
                step={0.01}
                defaultValue="0.00"
                className="block w-full rounded-lg border border-cobalt/20 bg-white pl-6 pr-3 py-2 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
              />
            </div>
            <p className="text-[10px] text-ink-soft mt-1">Enter dollar amount (e.g. 15.00)</p>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-bold tracking-wider uppercase text-ink-soft mb-1">
              Payment
            </label>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <label className="flex items-start gap-2 rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink flex-1 cursor-pointer">
                <input type="radio" name="paymentMode" value="paid" defaultChecked className="mt-0.5 accent-cobalt" />
                <span><strong>Already paid</strong> — record only (money collected elsewhere)</span>
              </label>
              <label className="flex items-start gap-2 rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink flex-1 cursor-pointer">
                <input type="radio" name="paymentMode" value="invoice" className="mt-0.5 accent-cobalt" />
                <span><strong>Send pay link</strong> — email the customer a secure card-payment link</span>
              </label>
            </div>
            <p className="text-[10px] text-ink-soft mt-1">&ldquo;Send pay link&rdquo; creates the order as <em>Awaiting payment</em> and emails the customer; it auto-marks Paid + sends a receipt when they pay. (Status below is ignored in that mode.)</p>
          </div>
          <div>
            <label className="block text-[11px] font-bold tracking-wider uppercase text-ink-soft mb-1">
              Status
            </label>
            <select
              name="status"
              defaultValue="PAID"
              className="block w-full rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:border-cobalt"
            >
              <option value="PAID">Paid</option>
              <option value="PROCESSING">Processing</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELED">Canceled</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-[11px] font-bold tracking-wider uppercase text-ink-soft mb-1">
            Internal notes
          </label>
          <textarea
            name="internalNotes"
            rows={3}
            className="block w-full rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt resize-none"
            placeholder="Reason for manual order, special instructions, etc."
          />
        </div>
      </section>

      {result && !result.ok && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {result.error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <a
          href="/admin/orders"
          className="bg-white border border-cobalt/20 text-ink px-5 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase hover:border-cobalt/40 transition"
        >
          Cancel
        </a>
        <SubmitButton linesCount={lines.length} />
      </div>
    </form>
  );
}

function SubmitButton({ linesCount }: { linesCount: number }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || linesCount === 0}
      className="bg-ink text-white px-6 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase hover:bg-cobalt transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? 'Creating order…' : 'Create order'}
    </button>
  );
}

/**
 * Typeahead over existing buyer profiles — customers AND approved
 * practitioners in one box. Selecting one prefills the form; selecting a
 * practitioner also switches product pricing onto their account terms.
 */
function ProfilePicker({
  onCustomer,
  onPractitioner,
}: {
  onCustomer: (c: CustomerHit) => void;
  onPractitioner: (p: PractitionerHit) => void;
}) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hits, setHits] = useState<{ customers: CustomerHit[]; practitioners: PractitionerHit[] }>({
    customers: [],
    practitioners: [],
  });
  const seqRef = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits({ customers: [], practitioners: [] });
      setBusy(false);
      return;
    }
    setBusy(true);
    const seq = ++seqRef.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/profiles/search?q=${encodeURIComponent(term)}`, {
          cache: 'no-store',
        });
        const data = await res.json().catch(() => null);
        if (seq === seqRef.current && res.ok && data) {
          setHits({ customers: data.customers ?? [], practitioners: data.practitioners ?? [] });
        }
      } finally {
        if (seq === seqRef.current) setBusy(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const total = hits.customers.length + hits.practitioners.length;

  return (
    <div className="relative">
      <input
        type="text"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search existing customers & practitioners by name or email — or fill in a new customer below"
        className="block w-full rounded-lg border border-cobalt/20 bg-cobalt/[0.03] px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft/50 focus:outline-none focus:border-cobalt"
      />
      {open && q.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-cobalt/15 bg-white shadow-lg overflow-hidden">
          {busy && <p className="px-4 py-3 text-xs text-ink-soft">Searching…</p>}
          {!busy && total === 0 && (
            <p className="px-4 py-3 text-xs text-ink-soft">
              No matching profiles — fill in the fields below to create a new customer with this order.
            </p>
          )}
          {hits.practitioners.length > 0 && (
            <div>
              <p className="px-4 pt-2.5 pb-1 text-[10px] tracking-[0.18em] uppercase text-cobalt font-bold">
                Practitioners
              </p>
              {hits.practitioners.map((p) => (
                <button
                  key={p.applicationId}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onPractitioner(p);
                    setQ('');
                    setOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-cobalt/[0.05]"
                >
                  <span className="text-sm font-bold text-ink">{p.practiceName}</span>
                  <span className="text-xs text-ink-soft"> — {p.providerName} · {p.email}</span>
                </button>
              ))}
            </div>
          )}
          {hits.customers.length > 0 && (
            <div>
              <p className="px-4 pt-2.5 pb-1 text-[10px] tracking-[0.18em] uppercase text-ink-muted font-bold">
                Customers
              </p>
              {hits.customers.map((c) => (
                <button
                  key={c.email}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onCustomer(c);
                    setQ('');
                    setOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 hover:bg-cobalt/[0.05]"
                >
                  <span className="text-sm font-bold text-ink">{c.name}</span>
                  <span className="text-xs text-ink-soft"> — {c.email}</span>
                  {c.lastShipping && (
                    <span className="text-[11px] text-ink-muted block">
                      Ships to {c.lastShipping.shippingCity}, {c.lastShipping.shippingState} (prefills)
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
