'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { captureLead, type LeadResult } from './lead-action';

export function LeadCaptureForm() {
  const [result, formAction] = useFormState<LeadResult | null, FormData>(captureLead, null);

  if (result?.ok) {
    return (
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-sm text-emerald-900">
        {result.message}
      </div>
    );
  }

  return (
    <form action={formAction} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
      <input
        name="firstName"
        type="text"
        placeholder="First name"
        className="rounded-lg border border-cobalt/20 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-cobalt"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="Email"
        className="rounded-lg border border-cobalt/20 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-cobalt"
      />
      <SubmitButton />
      {result && !result.ok && (
        <p className="sm:col-span-3 text-[12px] text-rose-700">{result.error}</p>
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
      className="bg-ink text-white px-5 py-2.5 rounded-lg text-[11px] tracking-[0.16em] uppercase font-bold hover:bg-cobalt transition-colors disabled:opacity-60 whitespace-nowrap"
    >
      {pending ? 'Sending…' : 'Get the brief'}
    </button>
  );
}
