'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { track, trackLead } from '@/lib/analytics';

/**
 * Low-friction gate for /access. Entry requires only a 21+/research-use
 * checkbox — email is OPTIONAL (drop it for the 20% code). This keeps the
 * clean-room compliance intact: the "Enter" control is a JS button, not a
 * crawlable link, so a Meta crawler (no JS, no form interaction) never
 * advances and never sees a compound name. It just removes the email WALL,
 * which was bouncing ~73% of cold ad clicks.
 *
 * If an email is provided we still fire the paid-funnel "Lead" signal and
 * capture it into the nurture list + welcome code, exactly as before — we
 * just no longer block entry on it.
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
  const [agreed, setAgreed] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setErr('Please confirm you’re 21+ and researching to continue.');
      setStatus('error');
      return;
    }
    const addr = email.trim().toLowerCase();
    const hasEmail = addr.length > 0;
    if (hasEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) {
      setErr('Enter a valid email, or leave it blank.');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    setErr('');

    // Only when an email is given: capture it + ensure the welcome code, and
    // fire the Lead signal. Never block entry on a slow/failed send.
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
      try {
        if (code) localStorage.setItem('merit_welcome_code', code);
      } catch {
        /* private mode — non-fatal */
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
      {/* Optional email — for the 20% code */}
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

      {/* Required attestation — the actual gate */}
      <label className="mt-3 flex items-start gap-3 cursor-pointer text-left">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => {
            setAgreed(e.target.checked);
            if (e.target.checked) setErr('');
          }}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-2 border-white/40 bg-white/10 accent-cobalt-soft cursor-pointer"
        />
        <span className="text-[13px] leading-snug text-cream/75">
          I confirm I’m 21+ and understand these compounds are for research use only —
          not for human or veterinary use.
        </span>
      </label>

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="group mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cream px-7 py-4 text-base font-bold text-ink shadow-[0_10px_50px_-10px_rgba(0,0,0,0.6)] transition-all hover:bg-white disabled:opacity-70"
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
