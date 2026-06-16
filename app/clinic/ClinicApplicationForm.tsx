'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { submitClinicApplication, type SubmitResult } from './actions';

const CREDENTIALS = ['MD', 'DO', 'NP', 'PA', 'DC', 'PharmD', 'ND', 'DMD/DDS', 'Other'];
const VOLUMES = [
  'Under $1,000 / mo',
  '$1,000 – $3,000 / mo',
  '$3,000 – $7,500 / mo',
  '$7,500 – $15,000 / mo',
  '$15,000+ / mo',
];

export function ClinicApplicationForm() {
  const [result, formAction] = useFormState<SubmitResult | null, FormData>(
    submitClinicApplication,
    null,
  );

  if (result?.ok) {
    return (
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-8 text-center">
        <p className="text-[10px] tracking-[0.22em] uppercase font-bold text-emerald-700 mb-3">
          — Application received
        </p>
        <h3 className="font-display font-black text-ink text-2xl mb-3 tracking-[-0.02em]">
          Thanks. You&rsquo;ll hear from us within 1 business day.
        </h3>
        <p className="text-sm text-ink-soft leading-relaxed max-w-md mx-auto">
          {result.message} A confirmation has been sent to your inbox. In the meantime, you can
          browse the public catalog &mdash; clinic pricing applies the moment your account is
          approved.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {result && !result.ok && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {result.error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Practice / clinic name" required>
          <input name="practiceName" type="text" required className={inputCls} />
        </Field>
        <Field label="Your name" required>
          <input name="providerName" type="text" required className={inputCls} />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-4">
        <Field label="Credentials" required>
          <select name="credentials" required className={inputCls} defaultValue="">
            <option value="" disabled>Select…</option>
            {CREDENTIALS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="State" required>
          <input
            name="state"
            type="text"
            required
            maxLength={2}
            placeholder="TX"
            className={`${inputCls} uppercase tracking-[0.1em]`}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="License number" required>
          <input name="licenseNumber" type="text" required className={inputCls} />
        </Field>
        <Field label="NPI" required>
          <input
            name="npi"
            type="text"
            required
            inputMode="numeric"
            pattern="[0-9]{10}"
            maxLength={10}
            placeholder="10-digit NPI"
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Email" required>
          <input name="email" type="email" required className={inputCls} />
        </Field>
        <Field label="Phone" hint="Optional, for faster verification">
          <input name="phone" type="tel" className={inputCls} />
        </Field>
      </div>

      <Field label="Specialty / practice focus" hint="e.g. weight loss, longevity, hormone therapy, recovery, aesthetics">
        <input name="specialty" type="text" className={inputCls} />
      </Field>

      <Field label="Estimated monthly peptide spend">
        <select name="monthlyVolume" className={inputCls} defaultValue="">
          <option value="" disabled>Select…</option>
          {VOLUMES.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </Field>

      <Field label="Anything else we should know?" hint="Compounds you're most interested in, current supplier pain points, etc.">
        <textarea name="notes" rows={3} className={`${inputCls} resize-y`} />
      </Field>

      <SubmitButton />

      <p className="text-[11px] text-ink-soft leading-relaxed">
        We verify license + NPI within 1 business day. Approved accounts get clinic pricing on every
        SKU and access to clinic-only compounds. Information stays internal &mdash; no marketing
        lists, no resale.
      </p>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-cobalt text-white font-bold tracking-[0.16em] uppercase text-sm py-4 rounded-xl hover:bg-ink transition-colors disabled:opacity-60"
    >
      {pending ? 'Submitting…' : 'Apply for clinic pricing →'}
    </button>
  );
}

const inputCls =
  'w-full rounded-lg border border-cobalt/20 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-cobalt/20 transition';

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] tracking-[0.18em] uppercase font-bold text-ink-soft mb-1.5">
        {label}
        {required && <span className="text-cobalt ml-1">*</span>}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-ink-soft mt-1">{hint}</span>}
    </label>
  );
}
