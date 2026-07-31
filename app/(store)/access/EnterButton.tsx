'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { track, trackLead } from '@/lib/analytics';

/**
 * Low-friction pass-through for /access. Entry is a single tap — email is
 * OPTIONAL (only for the 20% code). There is NO attestation checkbox here
 * anymore; it was intimidating friction, not a compliance requirement.
 *
 * Clean-room compliance is unaffected, because it never depended on this page's
 * content: (1) middleware blocks paid-ad crawlers by User-Agent, and (2) "Enter"
 * is a JS button, not a crawlable link — a Meta crawler (no JS, no form submit)
 * never advances past this page and never sees a compound name. The research-
 * use-only attestation is still enforced at CHECKOUT (the legally meaningful
 * point — every order carries ruoAttested), so dropping it here removes friction,
 * not the RUO gate.
 *
 * If an email is provided we still fire the paid-funnel "Lead" signal and capture
 * it into the nurture list. The welcome code is stashed either way so the offer
 * always applies.
 */
export function EnterButton({
  href = '/',
  label = 'Enter the catalog',
  code,
}: {
  href?: string;
  label?: string;
  code?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const addr = email.trim().toLowerCase();
    const hasEmail = addr.length > 0;
    if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) {
      setErr('Enter a valid email, or leave it blank.');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    setErr('');

    // Stash the welcome code regardless of email — the offer is why they clicked,
    // so it should apply whether or not they hand over an address.
    try {
      if (code) localStorage.setItem('merit_welcome_code', code);
    } catch {
      /* private mode — non-fatal */
    }

    // Only when an email is given: capture it + fire the Lead signal. Never block
    // entry on a slow/failed send.
    if (hasEmail) {
      try {
        await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: addr, source: 'access' }),
        });
      } catch {
        /* non-fatal */
      }
      trackLead({ source: 'access', email: addr, ...(code ? { offer: code } : {}) });
    }

    try {
      localStorage.setItem('merit_access_verified', String(Date.now()));
    } catch {
      /* private mode — non-fatal */
    }
    track('access_verify', { source: 'access', gave_email: hasEmail, ...(code ? { offer: code } : {}) });
    router.push(href);
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md mx-auto">
      {/* Optional email — only for the 20% code, never a wall */}
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email for 20% off (optional)"
        aria-label="Email address (optional)"
        className="w-full rounded-2xl bg-white/10 border border-white/20 px-5 py-4 text-base text-cream placeholder:text-cream/40 focus:outline-none focus:border-cobalt-soft focus:ring-2 focus:ring-cobalt-soft/25 transition"
      />

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="group mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cream px-7 py-4 text-base font-bold text-ink shadow-[0_10px_50px_-10px_rgba(0,0,0,0.6)] transition-all hover:bg-white disabled:opacity-70"
      >
        {status === 'submitting' ? 'Entering…' : label}
        <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">
          →
        </span>
      </button>

      {status === 'error' && err && (
        <p className="mt-2 text-left text-sm text-rose-300">{err}</p>
      )}
    </form>
  );
}
