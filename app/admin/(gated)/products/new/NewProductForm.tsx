'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { createProduct, type ActionResult } from '../actions';

export function NewProductForm() {
  const [result, formAction] = useFormState<ActionResult | null, FormData>(createProduct, null);

  return (
    <form action={formAction} className="rounded-2xl border border-cobalt/15 bg-white p-6 space-y-4">
      <div>
        <label htmlFor="handle" className="block text-[11px] font-bold tracking-wider uppercase text-ink-soft mb-1">
          Handle <span className="text-rose-700">*</span>
        </label>
        <input
          id="handle"
          type="text"
          name="handle"
          required
          placeholder="bpc-157"
          className="block w-full rounded-xl border border-cobalt/20 bg-white px-3 py-2 text-sm font-mono text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
        />
        <p className="text-[10px] text-ink-soft/70 mt-1">
          2–60 chars, lowercase letters/numbers/hyphens. Becomes the URL slug: <code>/products/&lt;handle&gt;</code>
        </p>
      </div>
      <div>
        <label htmlFor="title" className="block text-[11px] font-bold tracking-wider uppercase text-ink-soft mb-1">
          Title
        </label>
        <input
          id="title"
          type="text"
          name="title"
          placeholder="BPC-157"
          className="block w-full rounded-xl border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
        />
      </div>
      <div>
        <label htmlFor="compound" className="block text-[11px] font-bold tracking-wider uppercase text-ink-soft mb-1">
          Compound
        </label>
        <input
          id="compound"
          type="text"
          name="compound"
          placeholder="BPC-157"
          className="block w-full rounded-xl border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
        />
      </div>
      <div>
        <label htmlFor="vialSize" className="block text-[11px] font-bold tracking-wider uppercase text-ink-soft mb-1">
          Vial size
        </label>
        <input
          id="vialSize"
          type="text"
          name="vialSize"
          placeholder="5 mg"
          className="block w-full rounded-xl border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
        />
      </div>
      <div>
        <label htmlFor="eyebrow" className="block text-[11px] font-bold tracking-wider uppercase text-ink-soft mb-1">
          Eyebrow tagline
        </label>
        <input
          id="eyebrow"
          type="text"
          name="eyebrow"
          placeholder="GASTROINTESTINAL · TISSUE REPAIR RESEARCH"
          className="block w-full rounded-xl border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt"
        />
      </div>
      {result && !result.ok && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <p className="text-sm text-rose-900">{result.error}</p>
        </div>
      )}
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
      className="w-full bg-ink text-white px-5 py-3 rounded-xl text-xs font-bold tracking-wider uppercase hover:bg-cobalt transition disabled:opacity-60"
    >
      {pending ? 'Creating…' : 'Create product (draft)'}
    </button>
  );
}
