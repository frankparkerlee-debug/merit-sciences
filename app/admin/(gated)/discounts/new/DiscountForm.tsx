'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { createDiscount, type ActionResult } from '../actions';

export function DiscountForm() {
  const [result, formAction] = useFormState<ActionResult | null, FormData>(createDiscount, null);
  const [type, setType] = useState<'PERCENT' | 'FIXED_AMOUNT' | 'FREE_SHIPPING'>('PERCENT');
  const [method, setMethod] = useState<'CODE' | 'AUTOMATIC'>('CODE');

  function randomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    for (let i = 0; i < 10; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
    const el = document.querySelector<HTMLInputElement>('input[name="code"]');
    if (el) el.value = out;
  }

  return (
    <form action={formAction} className="space-y-5">
      {/* Code + title */}
      <fieldset className="rounded-2xl border border-cobalt/15 bg-white p-6 space-y-4">
        <legend className="text-[10px] tracking-[0.18em] uppercase font-bold text-cobalt">— Code</legend>
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <label htmlFor="code" className="text-xs font-bold tracking-wider uppercase text-ink-soft">
              Discount code
            </label>
            <button
              type="button"
              onClick={randomCode}
              className="text-[11px] font-bold text-cobalt hover:underline"
            >
              Generate random
            </button>
          </div>
          <input
            id="code"
            type="text"
            name="code"
            required
            placeholder="WELCOME10"
            className="block w-full rounded-xl border border-cobalt/20 bg-white px-4 py-2.5 text-sm uppercase font-mono text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
          />
          <p className="text-[11px] text-ink-soft mt-1">
            3–40 chars, letters/numbers/hyphen/underscore. Customers type this at checkout.
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
            placeholder="Summer launch — 25% off"
            className="block w-full rounded-xl border border-cobalt/20 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
          />
          <p className="text-[11px] text-ink-soft mt-1">Shown in admin lists. Customers never see this.</p>
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
                placeholder={type === 'PERCENT' ? '10' : '5.00'}
                className="flex-1 rounded-xl border border-cobalt/20 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
              />
              {type === 'PERCENT' && <span className="text-sm text-ink-soft">%</span>}
            </div>
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
              placeholder="anyone@anyone.com"
              className="block w-full rounded-xl border border-cobalt/20 bg-white px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
            />
          </div>
        </div>
        <label className="flex items-center gap-3 pt-2">
          <input
            type="checkbox"
            name="oncePerCustomer"
            className="w-4 h-4 rounded border-cobalt/30 text-cobalt focus:ring-cobalt"
          />
          <span className="text-sm text-ink">Limit to one use per customer</span>
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
              className="block w-full rounded-xl border border-cobalt/20 bg-white px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-cobalt"
            />
            <p className="text-[11px] text-ink-soft mt-1">Default: now (immediately active)</p>
          </div>
          <div>
            <label htmlFor="endsAt" className="block text-xs font-bold tracking-wider uppercase text-ink-soft mb-2">
              Ends <span className="text-ink-soft/50 normal-case">(optional)</span>
            </label>
            <input
              id="endsAt"
              type="datetime-local"
              name="endsAt"
              className="block w-full rounded-xl border border-cobalt/20 bg-white px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-cobalt"
            />
            <p className="text-[11px] text-ink-soft mt-1">Leave blank for no expiry</p>
          </div>
        </div>
      </fieldset>

      {/* Result + submit */}
      {result && !result.ok && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm text-rose-900 leading-relaxed">{result.error}</p>
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
      {pending ? 'Creating…' : 'Create discount'}
    </button>
  );
}
