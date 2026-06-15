'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { toggleDiscount, deleteDiscount, type ActionResult } from '../actions';

export function DiscountActions({ code, isDisabled }: { code: string; isDisabled: boolean }) {
  return (
    <section className="rounded-2xl border border-cobalt/15 bg-white p-5 space-y-3">
      <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-1">— Actions</p>
      <ToggleForm code={code} isDisabled={isDisabled} />
      <DeleteForm code={code} />
    </section>
  );
}

function ToggleForm({ code, isDisabled }: { code: string; isDisabled: boolean }) {
  const [result, formAction] = useFormState<ActionResult | null, FormData>(toggleDiscount, null);
  return (
    <form action={formAction}>
      <input type="hidden" name="code" value={code} />
      <ToggleButton isDisabled={isDisabled} />
      {result && !result.ok && (
        <p className="mt-2 text-xs text-rose-700">{result.error}</p>
      )}
      {result && result.ok && (
        <p className="mt-2 text-xs text-emerald-700">{result.message}</p>
      )}
    </form>
  );
}

function ToggleButton({ isDisabled }: { isDisabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-white border border-cobalt/20 text-ink px-4 py-2.5 rounded-lg text-xs font-bold tracking-wide uppercase hover:border-cobalt/40 transition disabled:opacity-60"
    >
      {pending ? 'Working…' : isDisabled ? 'Re-enable discount' : 'Disable discount'}
    </button>
  );
}

function DeleteForm({ code }: { code: string }) {
  const [result, formAction] = useFormState<ActionResult | null, FormData>(deleteDiscount, null);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(`Delete discount ${code.toUpperCase()}? This cannot be undone. Past redemptions stay attributed but the code stops working.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="code" value={code} />
      <DeleteButton />
      {result && !result.ok && (
        <p className="mt-2 text-xs text-rose-700">{result.error}</p>
      )}
    </form>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-rose-50 text-rose-900 border border-rose-200 px-4 py-2.5 rounded-lg text-xs font-bold tracking-wide uppercase hover:bg-rose-100 transition disabled:opacity-60"
    >
      {pending ? 'Deleting…' : 'Delete discount'}
    </button>
  );
}
