'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { retryPayoutAction, type PayoutRunResult } from './actions';

/**
 * Retry control for a FAILED payout.
 *
 * This matters more than it looks: once a payout row exists, its commissions
 * carry that payoutId, and the next run only claims commissions where
 * payoutId is null. So a FAILED payout does NOT return its money to the
 * pool — retry is the only route back, and without this button the balance
 * was stranded with no UI path to recover it.
 *
 * The retry re-sends through the same idempotency key (the payout id), so if
 * the original transfer actually did land, Stripe returns that transfer
 * instead of paying twice.
 */
export function RetryPayoutButton({ payoutId }: { payoutId: string }) {
  const [result, action] = useFormState<PayoutRunResult | null, FormData>(retryPayoutAction, null);
  return (
    <form action={action} className="mt-1.5">
      <input type="hidden" name="payoutId" value={payoutId} />
      <SubmitButton />
      {result && (
        <span
          className={`block mt-1 text-[11px] font-bold ${result.ok ? 'text-emerald-700' : 'text-rose-700'}`}
        >
          {result.ok ? result.message : result.error}
        </span>
      )}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-[11px] font-bold tracking-[0.1em] uppercase text-cobalt hover:text-ink transition-colors disabled:opacity-50"
    >
      {pending ? 'Retrying…' : 'Retry payout →'}
    </button>
  );
}
