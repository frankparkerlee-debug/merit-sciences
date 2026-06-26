'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { track, trackLead } from '@/lib/analytics';

/**
 * Click-to-verify CTA for the /access ad gate (offer + one-click hybrid).
 * The click IS the RUO authorization — no email, minimal friction. It stashes
 * the welcome code so the site can surface/apply it, fires the analytics event
 * (the key paid-funnel step), then routes into the catalog.
 *
 * When the Meta/TikTok pixels land, fire their "Lead"/"ClickButton" events
 * here too so this verify-click is the optimization signal.
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
  const [pending, setPending] = useState(false);

  function enter() {
    setPending(true);
    try {
      localStorage.setItem('merit_access_verified', String(Date.now()));
      if (code) localStorage.setItem('merit_welcome_code', code);
    } catch {
      /* private mode — non-fatal */
    }
    track('access_verify', { source: 'access', ...(code ? { offer: code } : {}) });
    // Top-of-funnel conversion signal for Meta/TikTok ad optimization.
    trackLead({ source: 'access', ...(code ? { offer: code } : {}) });
    router.push(href);
  }

  return (
    <button
      type="button"
      onClick={enter}
      disabled={pending}
      className="group inline-flex items-center gap-3 rounded-2xl bg-cream px-9 py-5 text-lg font-bold text-ink shadow-[0_10px_50px_-10px_rgba(0,0,0,0.6)] transition-all hover:bg-white disabled:opacity-70"
    >
      {pending ? 'Entering…' : label}
      <span
        aria-hidden
        className="transition-transform duration-200 group-hover:translate-x-1"
      >
        →
      </span>
    </button>
  );
}
