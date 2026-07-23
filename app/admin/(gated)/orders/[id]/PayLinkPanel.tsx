'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { resendPaymentRequest, type ActionResult } from './actions';

/**
 * Awaiting-payment panel — shown on invoice orders. Lets the admin copy the
 * customer's signed pay link or resend the pay-link email. The link was
 * already emailed on order creation; this is for copy/paste and resends.
 */
export function PayLinkPanel({ orderId, payUrl }: { orderId: string; payUrl: string }) {
  const [copied, setCopied] = useState(false);
  const [state, action] = useFormState<ActionResult | null, FormData>(resendPaymentRequest, null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(payUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the field is selectable as a fallback */
    }
  }

  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
      <p className="text-[10px] tracking-[0.22em] uppercase text-amber-700 font-bold mb-2">— Awaiting payment</p>
      <p className="text-[12.5px] text-ink-soft leading-relaxed mb-3">
        The customer was emailed a secure pay link. When they pay, this order flips to <strong>Paid</strong> automatically and a receipt is sent.
      </p>

      <label className="block text-[10px] uppercase tracking-wider text-ink-soft font-bold mb-1">Pay link</label>
      <div className="flex gap-2 mb-3">
        <input
          readOnly
          value={payUrl}
          onFocus={(e) => e.currentTarget.select()}
          className="flex-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-[11px] font-mono text-ink"
        />
        <button
          type="button"
          onClick={copy}
          className="flex-none rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-white hover:opacity-90"
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>

      <form action={action}>
        <input type="hidden" name="orderId" value={orderId} />
        <ResendButton />
      </form>
      {state && (
        <p className={`mt-2 text-xs ${state.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
          {state.ok ? state.message : state.error}
        </p>
      )}
    </section>
  );
}

function ResendButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg border border-amber-400 bg-white px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
    >
      {pending ? 'Sending…' : 'Resend pay link email'}
    </button>
  );
}
