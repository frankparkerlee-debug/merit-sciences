'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { deleteDiscount, type ActionResult } from './actions';

/**
 * Tiny inline delete button for the discounts list. Uses
 * stopPropagation so clicking the X doesn't also follow the
 * row's link to the detail page. Confirms before submitting.
 */
export function QuickDelete({ code }: { code: string }) {
  const [, formAction] = useFormState<ActionResult | null, FormData>(deleteDiscount, null);
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        e.stopPropagation();
        if (!window.confirm(`Delete discount ${code.toUpperCase()}? Cannot be undone. Past redemptions stay attributed; the code just stops working.`)) {
          e.preventDefault();
        }
      }}
      onClick={(e) => e.stopPropagation()}
      className="inline-block"
    >
      <input type="hidden" name="code" value={code} />
      <DeleteX />
    </form>
  );
}

function DeleteX() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      title="Delete discount"
      className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-white border border-cobalt/15 text-ink-soft hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition disabled:opacity-50"
      aria-label="Delete"
    >
      {pending ? (
        <span className="text-[10px]">…</span>
      ) : (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 3L11 11M11 3L3 11" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
