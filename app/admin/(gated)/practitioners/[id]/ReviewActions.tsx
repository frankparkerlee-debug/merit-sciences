'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { approveApplication, rejectApplication, type ReviewResult } from '../actions';

export function ReviewActions({
  id,
  providerFirst,
  practiceName,
}: {
  id: string;
  providerFirst: string;
  practiceName: string;
}) {
  const [mode, setMode] = useState<'approve' | 'reject' | null>(null);
  const [approveResult, approveAction] = useFormState<ReviewResult | null, FormData>(
    approveApplication,
    null,
  );
  const [rejectResult, rejectAction] = useFormState<ReviewResult | null, FormData>(
    rejectApplication,
    null,
  );

  const result = mode === 'approve' ? approveResult : mode === 'reject' ? rejectResult : null;

  if (result?.ok) {
    return (
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6">
        <p className="text-[10px] tracking-[0.22em] uppercase font-bold text-emerald-700 mb-2">
          — Done
        </p>
        <p className="text-sm text-emerald-900">{result.message}</p>
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-cobalt/15 bg-white p-6">
      <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-4">
        — Review
      </p>

      {result && !result.ok && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 mb-4">
          {result.error}
        </div>
      )}

      {mode === null && (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setMode('approve')}
            className="bg-cobalt text-white font-bold tracking-[0.16em] uppercase text-xs px-5 py-3 rounded-lg hover:bg-ink transition-colors"
          >
            Approve →
          </button>
          <button
            type="button"
            onClick={() => setMode('reject')}
            className="bg-white border border-rose-300 text-rose-800 font-bold tracking-[0.16em] uppercase text-xs px-5 py-3 rounded-lg hover:bg-rose-50 transition-colors"
          >
            Reject
          </button>
        </div>
      )}

      {mode === 'approve' && (
        <form action={approveAction} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <p className="text-sm text-ink leading-relaxed">
            Approving will flip the status, set you as the reviewer, and send <strong>{providerFirst}</strong>
            {' '}the approval email with portal sign-in instructions.
          </p>
          <label className="block">
            <span className="block text-[10px] tracking-[0.18em] uppercase font-bold text-ink-soft mb-1.5">
              Internal note (optional, not emailed)
            </span>
            <textarea
              name="note"
              rows={2}
              placeholder="Pricing tier, special notes for the team…"
              className="w-full rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-sm focus:outline-none focus:border-cobalt resize-y"
            />
          </label>
          <div className="flex gap-3">
            <ApproveSubmit />
            <button
              type="button"
              onClick={() => setMode(null)}
              className="text-ink-soft font-bold tracking-[0.16em] uppercase text-xs px-4 py-3 hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {mode === 'reject' && (
        <form action={rejectAction} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <p className="text-sm text-ink leading-relaxed">
            Rejecting sends <strong>{providerFirst}</strong> a polite decline. If you add a note,
            it&rsquo;s included verbatim in the email body.
          </p>
          <label className="block">
            <span className="block text-[10px] tracking-[0.18em] uppercase font-bold text-ink-soft mb-1.5">
              Reason (optional, included in email)
            </span>
            <textarea
              name="note"
              rows={3}
              placeholder="We couldn't verify your NPI; please re-apply with the correct number."
              className="w-full rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-sm focus:outline-none focus:border-cobalt resize-y"
            />
          </label>
          <div className="flex gap-3">
            <RejectSubmit />
            <button
              type="button"
              onClick={() => setMode(null)}
              className="text-ink-soft font-bold tracking-[0.16em] uppercase text-xs px-4 py-3 hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function ApproveSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-cobalt text-white font-bold tracking-[0.16em] uppercase text-xs px-5 py-3 rounded-lg hover:bg-ink transition-colors disabled:opacity-60"
    >
      {pending ? 'Approving…' : 'Confirm approval'}
    </button>
  );
}

function RejectSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-rose-700 text-white font-bold tracking-[0.16em] uppercase text-xs px-5 py-3 rounded-lg hover:bg-rose-900 transition-colors disabled:opacity-60"
    >
      {pending ? 'Sending…' : 'Send rejection'}
    </button>
  );
}
