'use client';

import { useState, useRef } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { createManualOrder, type ManualOrderResult } from './actions';

type ProductOption = {
  handle: string;
  title: string;
  priceCents: number;
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
        unitCents: product.priceCents,
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
                <span><strong>Send pay link</strong> — email the customer a secure PayPal link to pay</span>
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
