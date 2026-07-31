'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { requestPractitionerMagicLink, type SignInResult } from './action';

export function LoginForm({ initialEmail = '' }: { initialEmail?: string }) {
  const [result, formAction] = useFormState<SignInResult | null, FormData>(
    requestPractitionerMagicLink,
    null,
  );

  if (result?.ok) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900 leading-relaxed">
        <p className="font-bold mb-1">Check your inbox.</p>
        <p>{result.message} The link expires in 60 minutes.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {result && !result.ok && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {result.error}
        </div>
      )}
      <label className="block">
        <span className="block text-[10px] tracking-[0.18em] uppercase font-bold text-ink-soft mb-1.5">
          Email
        </span>
        <input
          name="email"
          type="email"
          required
          autoFocus
          defaultValue={initialEmail}
          placeholder="you@yourpractice.com"
          className="w-full rounded-lg border border-cobalt/20 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-cobalt/20"
        />
      </label>
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-cobalt text-white font-bold tracking-[0.16em] uppercase text-sm py-3.5 rounded-xl hover:bg-ink transition-colors disabled:opacity-60"
    >
      {pending ? 'Sending…' : 'Send sign-in link →'}
    </button>
  );
}
