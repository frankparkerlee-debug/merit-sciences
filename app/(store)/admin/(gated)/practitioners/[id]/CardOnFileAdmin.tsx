'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { sendCardLink, type ReviewResult } from '../actions';

type Props = {
  id: string;
  email: string;
  card: { brand: string; last4: string; expMonth: number; expYear: number; addedAt: string | null } | null;
};

/**
 * Admin view of a practice's card on file, plus the one action admin has:
 * email the provider a link to add (or replace) it. Admin never sees or
 * enters card numbers; the provider does that on the checkout domain.
 */
export function CardOnFileAdmin({ id, email, card }: Props) {
  const [result, action] = useFormState<ReviewResult | null, FormData>(sendCardLink, null);

  return (
    <section className="rounded-2xl border border-cobalt/15 bg-white p-6 mt-6">
      <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-4">— Card on file</p>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          {card ? (
            <>
              <p className="font-display text-[18px] font-extrabold text-ink capitalize leading-tight">
                {card.brand} ending {card.last4}
              </p>
              <p className="text-[12px] text-ink-soft mt-1">
                Expires {String(card.expMonth).padStart(2, '0')}/{String(card.expYear).slice(-2)}
                {card.addedAt ? ` · added ${card.addedAt}` : ''}. Orders for this practice can be charged to it from
                New order → Charge card on file, and the provider can pay with it at checkout.
              </p>
            </>
          ) : (
            <>
              <p className="font-display text-[18px] font-extrabold text-ink leading-tight">No card on file</p>
              <p className="text-[12px] text-ink-soft mt-1 leading-relaxed max-w-prose">
                The provider adds it themselves on the secure checkout domain, either from their portal or from the link
                below. Nothing is charged when it is added, and Merit never sees the card number.
              </p>
            </>
          )}
        </div>

        <form action={action} className="shrink-0">
          <input type="hidden" name="id" value={id} />
          <SubmitBtn label={card ? 'Email link to update card' : 'Email card setup link'} />
          <p className="text-[10px] text-ink-muted mt-1">to {email}</p>
        </form>
      </div>

      {result && (
        <div
          className={`mt-4 rounded-lg border px-4 py-3 text-[13px] break-all ${
            result.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          {result.ok ? result.message : result.error}
        </div>
      )}
    </section>
  );
}

function SubmitBtn({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center rounded-lg bg-ink text-white font-bold text-[12px] tracking-[0.06em] uppercase px-4 py-2.5 hover:bg-cobalt transition-colors disabled:opacity-50"
    >
      {pending ? 'Sending…' : label}
    </button>
  );
}
