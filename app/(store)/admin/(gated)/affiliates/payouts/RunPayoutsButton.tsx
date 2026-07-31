'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { runPayoutsAction, type PayoutRunResult } from './actions';

export function RunPayoutsButton({ eligibleCount }: { eligibleCount: number }) {
  const [result, action] = useFormState<PayoutRunResult | null, FormData>(runPayoutsAction, null);
  return (
    <form action={action} className="flex flex-col items-start gap-3">
      <SubmitButton eligibleCount={eligibleCount} />
      {result && (
        <p
          className={`text-sm font-bold ${
            result.ok ? 'text-emerald-700' : 'text-rose-700'
          }`}
        >
          {result.ok ? result.message : result.error}
        </p>
      )}
    </form>
  );
}

function SubmitButton({ eligibleCount }: { eligibleCount: number }) {
  const { pending } = useFormStatus();
  const disabled = pending || eligibleCount === 0;
  return (
    <button
      type="submit"
      disabled={disabled}
      className="bg-cobalt text-white font-bold tracking-[0.12em] uppercase text-xs px-6 py-3 rounded-lg hover:bg-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending
        ? 'Sending payouts…'
        : eligibleCount === 0
          ? 'No payouts due'
          : `Run payouts (${eligibleCount}) →`}
    </button>
  );
}
