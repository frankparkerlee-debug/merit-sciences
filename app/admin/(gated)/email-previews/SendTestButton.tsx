'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { sendTestEmail, type ActionResult } from './actions';
import type { TemplateKey } from './sample-data';

export function SendTestButton({ templateKey }: { templateKey: TemplateKey }) {
  const [result, formAction] = useFormState<ActionResult | null, FormData>(sendTestEmail, null);

  return (
    <div className="text-right flex-shrink-0">
      <form action={formAction}>
        <input type="hidden" name="template" value={templateKey} />
        <Button />
      </form>
      {result && (
        <p
          className={`mt-1 text-[10px] ${
            result.ok ? 'text-emerald-700' : 'text-rose-700'
          } max-w-[200px] text-right leading-tight`}
        >
          {result.ok ? result.message : result.error}
        </p>
      )}
    </div>
  );
}

function Button() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-[10px] font-bold tracking-wider uppercase bg-ink text-white px-3 py-1.5 rounded hover:bg-cobalt transition disabled:opacity-60 whitespace-nowrap"
    >
      {pending ? 'Sending…' : 'Send test to me'}
    </button>
  );
}
