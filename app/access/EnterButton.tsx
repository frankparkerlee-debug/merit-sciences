'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { track, trackLead } from '@/lib/analytics';

/**
 * Email-GATED entry for the /access ad gate — the clean-room lock.
 *
 * The ONLY way past /access is to submit an email. A crawler or ad reviewer
 * that doesn't submit a real address never advances and never sees a single
 * compound name — there is no on-page link to the storefront, just this gate.
 * (Meta rejected the one-click version: a reviewer could click straight
 * through to the compound-named catalog.)
 *
 * The submit also fires the paid-funnel "Lead" signal and captures the address
 * into the nurture list + ensures the welcome code exists server-side.
 */
export function EnterButton({
  href = '/',
  label = 'Unlock 20% & enter',
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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) {
      setErr('Enter a valid email to continue.');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    setErr('');

    // Capture the email + ensure the welcome code server-side. Never block
    // entry on a slow/failed send — the gate is the point, not the email.
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
      localStorage.setItem('merit_access_verified', String(Date.now()));
      if (code) localStorage.setItem('merit_welcome_code', code);
    } catch {
      /* private mode — non-fatal */
    }

    track('access_verify', { source: 'access', ...(code ? { offer: code } : {}) });
    // Top-of-funnel conversion signal for Meta/TikTok ad optimization.
    trackLead({ source: 'access', email: addr, ...(code ? { offer: code } : {}) });
    router.push(href);
  }

  return (
    <form onSubmit={submit} className="w-full max-w-md mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          aria-label="Email address"
          className="flex-1 rounded-2xl bg-white/10 border border-white/20 px-5 py-4 text-base text-cream placeholder:text-cream/40 focus:outline-none focus:border-cobalt-soft focus:ring-2 focus:ring-cobalt-soft/25 transition"
        />
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-cream px-7 py-4 text-base font-bold text-ink shadow-[0_10px_50px_-10px_rgba(0,0,0,0.6)] transition-all hover:bg-white disabled:opacity-70 whitespace-nowrap"
        >
          {status === 'submitting' ? 'Unlocking…' : label}
          <span aria-hidden className="transition-transform duration-200 group-hover:translate-x-1">
            →
          </span>
        </button>
      </div>
      {status === 'error' && err && (
        <p className="mt-2 text-left text-sm text-rose-300">{err}</p>
      )}
    </form>
  );
}
