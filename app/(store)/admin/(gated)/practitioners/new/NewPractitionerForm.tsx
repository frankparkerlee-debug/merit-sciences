'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFormState, useFormStatus } from 'react-dom';
import { createPractitionerProfile, type ReviewResult } from '../actions';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
];

const CREDENTIALS = ['MD', 'DO', 'NP', 'PA', 'DC', 'PharmD', 'ND', 'DMD/DDS', 'Other'];

const inputCls =
  'block w-full rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt';
const labelCls = 'block text-[11px] font-bold tracking-wider uppercase text-ink-soft mb-1';

export function NewPractitionerForm() {
  const router = useRouter();
  const [result, formAction] = useFormState<ReviewResult | null, FormData>(
    createPractitionerProfile,
    null,
  );

  // On success the action returns the new application id — go straight to the
  // profile page so pricing + referring affiliate can be assigned.
  useEffect(() => {
    if (result?.ok) router.push(`/admin/practitioners/${result.message}`);
  }, [result, router]);

  return (
    <form action={formAction} className="space-y-6">
      <section className="rounded-2xl border border-cobalt/15 bg-white p-6 space-y-4">
        <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold">— Practice</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Practice name <span className="text-rose-500">*</span></label>
            <input name="practiceName" required className={inputCls} placeholder="Victory Health &amp; Wellness" />
          </div>
          <div>
            <label className={labelCls}>Provider name <span className="text-rose-500">*</span></label>
            <input name="providerName" required className={inputCls} placeholder="Dr. Jane Smith" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Credentials</label>
              <select name="credentials" defaultValue="MD" className={inputCls}>
                {CREDENTIALS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>State <span className="text-rose-500">*</span></label>
              <select name="state" required defaultValue="" className={inputCls}>
                <option value="" disabled>—</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Email <span className="text-rose-500">*</span></label>
            <input name="email" type="email" required className={inputCls} placeholder="dr@practice.com" />
            <p className="text-[10px] text-ink-soft mt-1">Their portal sign-in — orders under this email get their pricing.</p>
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input name="phone" type="tel" className={inputCls} placeholder="(555) 000-0000" />
          </div>
          <div>
            <label className={labelCls}>License #</label>
            <input name="licenseNumber" className={inputCls} placeholder="Optional — fill in later" />
          </div>
          <div>
            <label className={labelCls}>NPI</label>
            <input name="npi" className={inputCls} placeholder="Optional — fill in later" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Specialty</label>
            <input name="specialty" className={inputCls} placeholder="Optional" />
          </div>
        </div>
      </section>

      <label className="flex items-start gap-3 rounded-2xl border border-cobalt/15 bg-white p-5 cursor-pointer">
        <input type="checkbox" name="sendWelcome" defaultChecked className="mt-0.5 h-4 w-4 accent-cobalt" />
        <span className="text-sm text-ink-soft leading-relaxed">
          <strong className="text-ink">Send the portal welcome email now</strong> — includes their
          one-click sign-in link and starts the onboarding sequence. Leave unchecked to set up
          pricing quietly first (you can re-send from the profile).
        </span>
      </label>

      {result && !result.ok && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {result.error}
        </div>
      )}

      <div className="flex justify-end gap-3">
        <a
          href="/admin/practitioners"
          className="bg-white border border-cobalt/20 text-ink px-5 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase hover:border-cobalt/40 transition"
        >
          Cancel
        </a>
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-ink text-white px-6 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase hover:bg-cobalt transition disabled:opacity-50"
    >
      {pending ? 'Creating…' : 'Create profile'}
    </button>
  );
}
