'use client';

import { useState } from 'react';
import {
  normalizeIdentifier,
  suggestSlug,
  AFFILIATE_PROGRAM,
} from '@/lib/affiliate';

type SuccessResult = {
  affiliate: {
    name: string;
    slug: string;
    discountCode: string;
    email: string;
  };
};

export function AffiliateSignupForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [socialUrl, setSocialUrl] = useState('');
  const [audienceSize, setAudienceSize] = useState('');
  const [pitch, setPitch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessResult | null>(null);

  // Auto-suggest slug from name unless the user has typed in the field
  const effectiveSlug = slugTouched ? slug : suggestSlug(name);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrorField(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/affiliate/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          slug: effectiveSlug,
          discountCode,
          socialUrl: socialUrl || undefined,
          audienceSize: audienceSize ? Number(audienceSize) : undefined,
          pitch: pitch || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Sign-up failed. Try again.');
        setErrorField(data.field || null);
        return;
      }
      setSuccess(data as SuccessResult);
    } catch (err) {
      setError('Network error — please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return <SuccessState data={success} />;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {/* Name */}
      <Field label="Your name" required error={errorField === 'name' ? error : undefined}>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Frank Parker Lee"
          className={inputClass(errorField === 'name')}
          autoComplete="name"
        />
      </Field>

      {/* Email */}
      <Field label="Email" required error={errorField === 'email' ? error : undefined}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={inputClass(errorField === 'email')}
          autoComplete="email"
        />
      </Field>

      {/* Slug */}
      <Field
        label="Referral handle"
        required
        hint="The end of your referral URL: meritsciences.com/?ref=YOUR-HANDLE"
        error={errorField === 'slug' ? error : undefined}
      >
        <input
          type="text"
          required
          value={effectiveSlug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(normalizeIdentifier(e.target.value));
          }}
          placeholder="frank-parker-lee"
          className={inputClass(errorField === 'slug')}
        />
      </Field>

      {/* Discount code */}
      <Field
        label="Your discount code"
        required
        hint={`What your audience types at checkout — gives them ${AFFILIATE_PROGRAM.buyerDiscountPct}% off. Letters, numbers, hyphens only.`}
        error={errorField === 'discountCode' ? error : undefined}
      >
        <input
          type="text"
          required
          value={discountCode}
          onChange={(e) => setDiscountCode(normalizeIdentifier(e.target.value))}
          placeholder="parkerlee10"
          className={inputClass(errorField === 'discountCode')}
        />
      </Field>

      {/* Optional fields */}
      <details className="border border-cobalt/10 rounded-xl">
        <summary className="cursor-pointer px-4 py-3 text-[12px] font-bold text-ink-soft tracking-[0.08em] uppercase select-none">
          Optional · Tell us about your audience
        </summary>
        <div className="px-4 pb-5 pt-2 space-y-4">
          <Field
            label="Primary social URL"
            hint="Instagram, TikTok, YouTube, X — your main channel"
          >
            <input
              type="url"
              value={socialUrl}
              onChange={(e) => setSocialUrl(e.target.value)}
              placeholder="https://instagram.com/yourhandle"
              className={inputClass(false)}
              autoComplete="url"
            />
          </Field>
          <Field label="Audience size" hint="Combined followers across platforms (estimate)">
            <input
              type="number"
              value={audienceSize}
              onChange={(e) => setAudienceSize(e.target.value)}
              placeholder="50000"
              min={0}
              className={inputClass(false)}
            />
          </Field>
          <Field label="Anything we should know?" hint="Optional context — your research focus, audience niche, etc.">
            <textarea
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder="I write about research-grade peptides and cover lab quality in detail..."
              rows={3}
              className={inputClass(false) + ' min-h-[80px] resize-y'}
            />
          </Field>
        </div>
      </details>

      {/* Generic error */}
      {error && !errorField && (
        <div className="p-3 bg-red-500/8 border border-red-500/30 rounded-lg text-[13px] text-red-700">
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full text-white py-4 rounded-xl text-base font-bold shadow-md hover:opacity-95 transition disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background:
            'linear-gradient(135deg, #2E4DDB 0%, #5078FF 50%, #2E4DDB 100%)',
        }}
      >
        {submitting ? 'Creating your account…' : 'Sign me up →'}
      </button>
    </form>
  );
}

// ─── Sub-components ───────────────────────────────────────────────

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[12px] font-bold tracking-[0.08em] uppercase text-ink mb-1.5">
        {label}{' '}
        {required && <span className="text-cobalt">*</span>}
      </span>
      {children}
      {hint && !error && <p className="mt-1.5 text-[11px] text-ink-muted leading-snug">{hint}</p>}
      {error && <p className="mt-1.5 text-[12px] text-red-600 font-semibold leading-snug">{error}</p>}
    </label>
  );
}

function inputClass(hasError: boolean): string {
  return `w-full px-4 py-3 bg-white border rounded-lg text-sm text-ink placeholder:text-ink-muted/60 focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-cobalt/15 transition ${
    hasError ? 'border-red-400' : 'border-cobalt/20 hover:border-cobalt/40'
  }`;
}

function SuccessState({ data }: { data: SuccessResult }) {
  const { name, slug, discountCode } = data.affiliate;
  const referralUrl = `https://meritsciences.com/?ref=${slug}`;
  return (
    <div className="bg-white border border-cobalt/15 rounded-2xl overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-cobalt via-[#5078FF] to-cobalt" />
      <div className="p-6 lg:p-8">
        <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
          ✓ You&apos;re in
        </p>
        <h3
          className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95] mb-2"
          style={{ fontSize: 'clamp(24px, 3.5vw, 36px)' }}
        >
          Welcome, {name.split(' ')[0]}<span className="text-cobalt">.</span>
        </h3>
        <p className="text-[13px] text-ink-soft leading-relaxed mb-6">
          Your link and code are live. Share either — both credit you when a
          new customer orders. Save these somewhere you&apos;ll remember.
        </p>

        {/* Referral URL */}
        <div className="bg-cream/50 border border-cobalt/10 rounded-xl p-4 mb-3">
          <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">
            Your referral link
          </p>
          <code className="block text-[13px] font-mono text-ink break-all leading-relaxed">
            {referralUrl}
          </code>
        </div>

        {/* Discount code */}
        <div className="bg-cream/50 border border-cobalt/10 rounded-xl p-4 mb-6">
          <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">
            Your discount code — {AFFILIATE_PROGRAM.buyerDiscountPct}% off for buyers
          </p>
          <code className="block text-base font-mono font-bold text-ink tracking-wide">
            {discountCode}
          </code>
        </div>

        <p className="text-[11px] text-ink-muted leading-relaxed">
          Set your PayPal payout email in your dashboard settings so we can
          pay you. Commissions clear a 30-day refund window, then pay out by
          PayPal once you reach the ${'$'}50 minimum.
        </p>
      </div>
    </div>
  );
}
