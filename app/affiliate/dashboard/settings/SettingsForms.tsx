'use client';

import { useFormState, useFormStatus } from 'react-dom';
import {
  updateProfile,
  updateSlug,
  updateDiscountCode,
  updatePaypalEmail,
  requestEmailChange,
  type ActionResult,
} from './actions';
import type { CurrentAffiliate } from '@/lib/affiliate-session';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://merit-sciences.onrender.com';

export function SettingsForms({ affiliate }: { affiliate: CurrentAffiliate }) {
  return (
    <div className="space-y-6">
      <ProfileSection affiliate={affiliate} />
      <SlugSection affiliate={affiliate} />
      <DiscountCodeSection affiliate={affiliate} />
      <PayoutSection affiliate={affiliate} />
      <EmailSection affiliate={affiliate} />
    </div>
  );
}

/* ─── Section primitive ─── */

function SectionCard({
  eyebrow,
  title,
  description,
  result,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  result: ActionResult | null;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-cobalt/15 bg-white overflow-hidden">
      <div className="px-6 sm:px-8 pt-6 sm:pt-7 pb-4">
        <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">
          — {eyebrow}
        </p>
        <h2 className="font-display font-black text-ink tracking-tight text-xl sm:text-2xl mb-2">
          {title}
        </h2>
        <p className="text-sm text-ink-soft leading-relaxed">{description}</p>
      </div>
      <div className="px-6 sm:px-8 pb-6 sm:pb-7">{children}</div>
      {result && (
        <div
          className={
            result.ok
              ? 'border-t border-emerald-200 bg-emerald-50 px-6 sm:px-8 py-3'
              : 'border-t border-rose-200 bg-rose-50 px-6 sm:px-8 py-3'
          }
        >
          <p className={`text-sm ${result.ok ? 'text-emerald-900' : 'text-rose-900'}`}>
            {result.ok ? result.message : result.error}
          </p>
        </div>
      )}
    </section>
  );
}

function Field({
  label, name, type = 'text', defaultValue = '', placeholder, hint, prefix,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number;
  placeholder?: string;
  hint?: string;
  prefix?: string;
}) {
  return (
    <label className="block mb-4 last:mb-0">
      <span className="text-[11px] tracking-[0.14em] uppercase text-ink-soft font-bold">
        {label}
      </span>
      <div className="relative mt-2">
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-ink-soft/70 font-mono">
            {prefix}
          </span>
        )}
        <input
          type={type}
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          className={`block w-full rounded-xl border border-cobalt/20 bg-white py-3 text-base text-ink placeholder:text-ink-soft/40 focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-cobalt/10 transition ${prefix ? 'pl-[3.75rem]' : 'pl-4'} pr-4`}
        />
      </div>
      {hint && <p className="text-xs text-ink-soft/80 mt-2 leading-relaxed">{hint}</p>}
    </label>
  );
}

function SubmitButton({ children }: { children: string }) {
  // React 18: pending state lives in a useFormStatus call from a child
  // of the form (NOT the form itself), and only updates while a server
  // action is in flight.
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-ink text-white px-6 py-3 rounded-xl text-sm font-bold tracking-wide hover:bg-cobalt transition disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? 'Saving…' : children}
    </button>
  );
}

/* ─── 1. Profile ─── */

function ProfileSection({ affiliate }: { affiliate: CurrentAffiliate }) {
  const [result, action] = useFormState<ActionResult | null, FormData>(
    updateProfile, null,
  );
  return (
    <SectionCard
      eyebrow="Profile"
      title="Display name & audience"
      description="What we show on your dashboard and use for fraud-review context. Not shown to your customers."
      result={result}
    >
      <form action={action}>
        <Field label="Name" name="name" defaultValue={affiliate.name} />
        <Field
          label="Primary social URL"
          name="socialUrl"
          defaultValue={affiliate.socialUrl ?? ''}
          placeholder="https://instagram.com/yourhandle"
          hint="Optional. Where your audience finds you."
        />
        <Field
          label="Audience size"
          name="audienceSize"
          defaultValue={affiliate.audienceSize ?? ''}
          placeholder="50000"
          hint="Optional. Self-reported follower count."
        />
        <SubmitButton>Save profile</SubmitButton>
      </form>
    </SectionCard>
  );
}

/* ─── 2. Slug ─── */

function SlugSection({ affiliate }: { affiliate: CurrentAffiliate }) {
  const [result, action] = useFormState<ActionResult | null, FormData>(
    updateSlug, null,
  );
  return (
    <SectionCard
      eyebrow="Referral link"
      title="Your handle"
      description={`Your full link is ${SITE_URL}/?ref=YOUR_HANDLE. Customers who hit it get a 30-day cookie that attributes their first purchase to you — permanently.`}
      result={result}
    >
      <form action={action}>
        <Field
          label="Handle"
          name="slug"
          defaultValue={affiliate.slug}
          prefix="?ref="
          hint="Lowercase letters, numbers, hyphens. 3-30 chars. Must be different from your discount code."
        />
        <SubmitButton>Update handle</SubmitButton>
      </form>
    </SectionCard>
  );
}

/* ─── 3. Discount code ─── */

function DiscountCodeSection({ affiliate }: { affiliate: CurrentAffiliate }) {
  const [result, action] = useFormState<ActionResult | null, FormData>(
    updateDiscountCode, null,
  );
  return (
    <SectionCard
      eyebrow="Discount code"
      title="What your audience types at checkout"
      description="When customers type this at checkout, they save 10% and we credit you with the commission. Changing it takes effect immediately — the old code stops working the moment you save."
      result={result}
    >
      <form action={action}>
        <Field
          label="Discount code"
          name="discountCode"
          defaultValue={affiliate.discountCode.toUpperCase()}
          hint="Lowercase letters, numbers, hyphens. We uppercase it for customers. Must be different from your handle."
        />
        <SubmitButton>Update code</SubmitButton>
      </form>
    </SectionCard>
  );
}

/* ─── 4. Payout (PayPal) ─── */

function PayoutSection({ affiliate }: { affiliate: CurrentAffiliate }) {
  const [result, action] = useFormState<ActionResult | null, FormData>(
    updatePaypalEmail, null,
  );
  return (
    <SectionCard
      eyebrow="Payouts"
      title="Where your commissions are paid"
      description="Commissions are paid by PayPal once your cleared balance reaches $50. Enter the PayPal email that should receive your payouts — it can be different from your sign-in email."
      result={result}
    >
      <form action={action}>
        <Field
          label="PayPal email"
          name="paypalEmail"
          type="email"
          defaultValue={affiliate.paypalEmail ?? ''}
          placeholder="you@paypal.com"
          hint="Must match a PayPal account that can receive payments. Without it, we can't pay you."
        />
        <SubmitButton>Save payout email</SubmitButton>
      </form>
    </SectionCard>
  );
}

/* ─── 5. Email ─── */

function EmailSection({ affiliate }: { affiliate: CurrentAffiliate }) {
  const [result, action] = useFormState<ActionResult | null, FormData>(
    requestEmailChange, null,
  );
  return (
    <SectionCard
      eyebrow="Sign-in email"
      title="Your account email"
      description={`Currently signed in as ${affiliate.email}. Change it by entering a new address below — we'll send a confirmation link to the new address. The change completes when you click that link.`}
      result={result}
    >
      <form action={action}>
        <Field
          label="New email"
          name="email"
          type="email"
          placeholder="you@example.com"
          hint="Confirmation will go to this address."
        />
        <SubmitButton>Send confirmation</SubmitButton>
      </form>
    </SectionCard>
  );
}
