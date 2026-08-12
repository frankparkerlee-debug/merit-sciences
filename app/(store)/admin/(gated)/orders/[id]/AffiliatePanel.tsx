'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { assignAffiliate, type ActionResult } from './actions';

/**
 * Affiliate attribution card on the admin order detail page.
 *
 * Shows where this order's credit stands — attributed + commissioned,
 * attributed but UNCREDITED (the gap that eats affiliate earnings), or
 * unattributed — and carries the assign form for orders Parker knows came
 * from an affiliate. Accepts slug, email, or the affiliate's discount code.
 */
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-cobalt text-white text-xs font-bold tracking-[0.1em] uppercase px-4 rounded-lg hover:bg-ink transition-colors disabled:opacity-50"
    >
      {pending ? 'Booking…' : 'Assign + record'}
    </button>
  );
}

export function AffiliatePanel({
  orderId,
  affiliateSlug,
  commission,
}: {
  orderId: string;
  affiliateSlug: string | null;
  commission: { cents: number; rateBp: number; status: string } | null;
}) {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(assignAffiliate, null);

  return (
    <section className="rounded-2xl border border-cobalt/15 bg-white p-6">
      <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">— Affiliate</p>

      {affiliateSlug ? (
        <div className="mb-4">
          <p className="text-sm text-ink">
            Attributed to <b className="font-mono">{affiliateSlug}</b>
          </p>
          {commission ? (
            <p className="text-sm text-ink-soft mt-1">
              Commission <b className="text-ink">${(commission.cents / 100).toFixed(2)}</b>
              {' '}at {(commission.rateBp / 100).toFixed(0)}% ·{' '}
              <span className="font-mono text-[11px] uppercase">{commission.status}</span>
            </p>
          ) : (
            <p className="text-sm font-semibold text-amber-700 mt-1">
              ⚠ Attributed but no commission recorded — assign below to book it, or run the
              backfill.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-ink-soft mb-4">No affiliate attribution on this order.</p>
      )}

      {!commission && (
        <form action={formAction} className="space-y-2">
          <input type="hidden" name="orderId" value={orderId} />
          <label htmlFor="affiliate-ident" className="sr-only">
            Affiliate slug, email, or code
          </label>
          <div className="flex gap-2">
            <input
              id="affiliate-ident"
              name="affiliate"
              placeholder="slug, email, or code"
              defaultValue={affiliateSlug ?? ''}
              className="flex-1 min-h-[40px] border border-ink/20 rounded-lg px-3 text-sm focus:outline-none focus:border-cobalt"
            />
            <SubmitButton />
          </div>
          {state && (
            <p className={`text-xs ${state.ok ? 'text-green-700' : 'text-red-600'}`}>
              {state.ok ? state.message : state.error}
            </p>
          )}
          <p className="text-[11px] text-ink-soft leading-relaxed">
            Books the commission with the same tier, evergreen-link, and self-purchase rules as a
            live sale. Idempotent — it will refuse if a commission already exists.
          </p>
        </form>
      )}
    </section>
  );
}
