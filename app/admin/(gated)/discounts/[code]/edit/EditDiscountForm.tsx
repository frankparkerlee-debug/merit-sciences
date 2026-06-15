'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { updateDiscount, type ActionResult } from '../../actions';
import type { DiscountType, DiscountMethod } from '@/lib/generated/prisma/index.js';

type EditableDiscount = {
  code: string;
  title: string;
  type: DiscountType;
  method: DiscountMethod;
  valueInput: string;            // pre-converted display value (e.g. "100" for 100%, "5.00" for $5)
  minPurchaseInput: string;
  minQuantity: number | null;
  maxUses: number | null;
  oncePerCustomer: boolean;
  freeShipping: boolean;
  customerEmail: string;
  startsAt: Date;
  endsAt: Date | null;
};

export function EditDiscountForm({ discount }: { discount: EditableDiscount }) {
  const [result, formAction] = useFormState<ActionResult | null, FormData>(updateDiscount, null);
  const [type, setType] = useState<DiscountType>(discount.type);
  const [method, setMethod] = useState<DiscountMethod>(discount.method);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="code" value={discount.code} />

      {/* Title only — code itself is immutable */}
      <fieldset className="rounded-2xl border border-cobalt/15 bg-white p-6 space-y-4">
        <legend className="text-[10px] tracking-[0.18em] uppercase font-bold text-cobalt">— Code</legend>
        <div>
          <label className="text-xs font-bold tracking-wider uppercase text-ink-soft">Code</label>
          <p className="mt-1 font-mono text-base text-ink font-bold uppercase">{discount.code}</p>
          <p className="text-[11px] text-ink-soft mt-1">
            Code string can&rsquo;t change. To rename, delete this discount and create a new one.
          </p>
        </div>
        <div>
          <label htmlFor="title" className="block text-xs font-bold tracking-wider uppercase text-ink-soft mb-2">
            Internal title <span className="text-ink-soft/50 normal-case">(optional)</span>
          </label>
          <input
            id="title"
            type="text"
            name="title"
            defaultValue={discount.title}
            placeholder="Summer launch — 25% off"
            className="block w-full rounded-xl border border-cobalt/20 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
          />
        </div>
      </fieldset>

      {/* Type + value */}
      <fieldset className="rounded-2xl border border-cobalt/15 bg-white p-6 space-y-4">
        <legend className="text-[10px] tracking-[0.18em] uppercase font-bold text-cobalt">— Discount</legend>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {([
            { value: 'PERCENT' as const, label: 'Percentage', sub: '% off' },
            { value: 'FIXED_AMOUNT' as const, label: 'Fixed amount', sub: '$ off' },
            { value: 'FREE_SHIPPING' as const, label: 'Free shipping', sub: 'No shipping cost' },
          ]).map((opt) => (
            <label
              key={opt.value}
              className={`block cursor-pointer rounded-xl border p-3 transition ${
                type === opt.value
                  ? 'border-cobalt bg-cobalt/5 ring-2 ring-cobalt/20'
                  : 'border-cobalt/15 hover:border-cobalt/30'
              }`}
            >
              <input
                type="radio"
                name="type"
                value={opt.value}
                checked={type === opt.value}
                onChange={() => setType(opt.value)}
                className="sr-only"
              />
              <p className="text-sm font-bold text-ink">{opt.label}</p>
              <p className="text-[11px] text-ink-soft">{opt.sub}</p>
            </label>
          ))}
        </div>
        {type !== 'FREE_SHIPPING' && (
          <div>
            <label htmlFor="value" className="block text-xs font-bold tracking-wider uppercase text-ink-soft mb-2">
              {type === 'PERCENT' ? 'Percent off' : 'Dollar amount off'}
            </label>
            <div className="flex gap-2 items-center max-w-[200px]">
              {type === 'FIXED_AMOUNT' && <span className="text-sm text-ink-soft">$</span>}
              <input
                id="value"
                type="text"
                inputMode="decimal"
                name="value"
                required
                defaultValue={discount.valueInput}
                placeholder={type === 'PERCENT' ? '10' : '5.00'}
                className="flex-1 rounded-xl border border-cobalt/20 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
              />
              {type === 'PERCENT' && <span className="text-sm text-ink-soft">%</span>}
            </div>
            <p className="text-[11px] text-ink-soft mt-1">
              {type === 'PERCENT'
                ? 'Type a whole number (10 for 10%, 100 for 100%). Don’t include the % sign.'
                : 'Type the dollar amount off the order subtotal.'}
            </p>
          </div>
        )}
      </fieldset>

      {/* Method */}
      <fieldset className="rounded-2xl border border-cobalt/15 bg-white p-6 space-y-4">
        <legend className="text-[10px] tracking-[0.18em] uppercase font-bold text-cobalt">— Method</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {([
            { value: 'CODE' as const, label: 'Discount code', sub: 'Customer types it at checkout' },
            { value: 'AUTOMATIC' as const, label: 'Automatic discount', sub: 'Applies when conditions match' },
          ]).map((opt) => (
            <label
              key={opt.value}
              className={`block cursor-pointer rounded-xl border p-3 transition ${
                method === opt.value
                  ? 'border-cobalt bg-cobalt/5 ring-2 ring-cobalt/20'
                  : 'border-cobalt/15 hover:border-cobalt/30'
              }`}
            >
              <input
                type="radio"
                name="method"
                value={opt.value}
                checked={method === opt.value}
                onChange={() => setMethod(opt.value)}
                className="sr-only"
              />
              <p className="text-sm font-bold text-ink">{opt.label}</p>
              <p className="text-[11px] text-ink-soft">{opt.sub}</p>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Limits */}
      <fieldset className="rounded-2xl border border-cobalt/15 bg-white p-6 space-y-4">
        <legend className="text-[10px] tracking-[0.18em] uppercase font-bold text-cobalt">— Limits (optional)</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="minPurchase" className="block text-xs font-bold tracking-wider uppercase text-ink-soft mb-2">
              Min purchase amount
            </label>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-ink-soft">$</span>
              <input
                id="minPurchase"
                type="text"
                inputMode="decimal"
                name="minPurchase"
                defaultValue={discount.minPurchaseInput}
                placeholder="50.00"
                className="flex-1 rounded-xl border border-cobalt/20 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
              />
            </div>
          </div>
          <div>
            <label htmlFor="minQuantity" className="block text-xs font-bold tracking-wider uppercase text-ink-soft mb-2">
              Min items
            </label>
            <input
              id="minQuantity"
              type="number"
              min={1}
              name="minQuantity"
              defaultValue={discount.minQuantity ?? ''}
              placeholder="3"
              className="block w-full rounded-xl border border-cobalt/20 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
            />
          </div>
          <div>
            <label htmlFor="maxUses" className="block text-xs font-bold tracking-wider uppercase text-ink-soft mb-2">
              Total uses
            </label>
            <input
              id="maxUses"
              type="number"
              min={1}
              name="maxUses"
              defaultValue={discount.maxUses ?? ''}
              placeholder="Unlimited"
              className="block w-full rounded-xl border border-cobalt/20 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
            />
          </div>
          <div>
            <label htmlFor="customerEmail" className="block text-xs font-bold tracking-wider uppercase text-ink-soft mb-2">
              Restrict to customer email
            </label>
            <input
              id="customerEmail"
              type="email"
              name="customerEmail"
              defaultValue={discount.customerEmail}
              placeholder="anyone@anyone.com"
              className="block w-full rounded-xl border border-cobalt/20 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
            />
          </div>
        </div>
        <label className="flex items-center gap-3 pt-2">
          <input
            type="checkbox"
            name="oncePerCustomer"
            defaultChecked={discount.oncePerCustomer}
            className="w-4 h-4 rounded border-cobalt/30 text-cobalt focus:ring-cobalt"
          />
          <span className="text-sm text-ink">Limit to one use per customer</span>
        </label>
      </fieldset>

      {/* Stackable bonus — free shipping on top of any discount type */}
      <fieldset className="rounded-2xl border border-cobalt/15 bg-white p-6 space-y-2">
        <legend className="text-[10px] tracking-[0.18em] uppercase font-bold text-cobalt">— Stackable bonuses</legend>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="freeShipping"
            defaultChecked={discount.freeShipping}
            className="w-4 h-4 mt-0.5 rounded border-cobalt/30 text-cobalt focus:ring-cobalt"
          />
          <div>
            <p className="text-sm font-bold text-ink">Also free shipping</p>
            <p className="text-[11px] text-ink-soft">
              Stacks on top of the discount above. E.g., a 20% off code with this
              checked gives 20% off the subtotal AND zero shipping.
            </p>
          </div>
        </label>
      </fieldset>

      {/* Dates */}
      <fieldset className="rounded-2xl border border-cobalt/15 bg-white p-6 space-y-4">
        <legend className="text-[10px] tracking-[0.18em] uppercase font-bold text-cobalt">— Active dates</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startsAt" className="block text-xs font-bold tracking-wider uppercase text-ink-soft mb-2">
              Starts
            </label>
            <input
              id="startsAt"
              type="datetime-local"
              name="startsAt"
              defaultValue={toLocalInputValue(discount.startsAt)}
              className="block w-full rounded-xl border border-cobalt/20 bg-white px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-cobalt"
            />
          </div>
          <div>
            <label htmlFor="endsAt" className="block text-xs font-bold tracking-wider uppercase text-ink-soft mb-2">
              Ends <span className="text-ink-soft/50 normal-case">(optional)</span>
            </label>
            <input
              id="endsAt"
              type="datetime-local"
              name="endsAt"
              defaultValue={discount.endsAt ? toLocalInputValue(discount.endsAt) : ''}
              className="block w-full rounded-xl border border-cobalt/20 bg-white px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-cobalt"
            />
            <p className="text-[11px] text-ink-soft mt-1">Leave blank for no expiry</p>
          </div>
        </div>
      </fieldset>

      {/* Result + submit */}
      {result && (
        <div
          className={`rounded-xl border p-4 ${
            result.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          <p className="text-sm leading-relaxed">
            {result.ok ? result.message : result.error}
          </p>
        </div>
      )}
      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-ink text-white px-6 py-3 rounded-xl text-xs font-bold tracking-wider uppercase hover:bg-cobalt transition disabled:opacity-60"
    >
      {pending ? 'Saving…' : 'Save changes'}
    </button>
  );
}

/**
 * Render a Date as a value suitable for <input type="datetime-local">.
 * The native input expects "YYYY-MM-DDTHH:MM" in the user's local time,
 * not ISO with timezone — so we format manually.
 */
function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
