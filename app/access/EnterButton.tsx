'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { track } from '@/lib/analytics';

/**
 * Click-to-verify CTA for the /access ad gate. The click IS the RUO
 * authorization — sets a local flag, fires the analytics event (the key
 * paid-funnel step), then routes into the site. No email, minimal friction:
 * cold Meta/TikTok traffic converts on a single tap, not a form.
 *
 * When the Meta/TikTok pixels land, fire their "Lead"/"ClickButton" events
 * here too so this verify-click is the optimization signal.
 */
export function EnterButton({ href = '/' }: { href?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  function enter() {
    setPending(true);
    try {
      localStorage.setItem('merit_access_verified', String(Date.now()));
    } catch {
      /* private mode — non-fatal */
    }
    track('access_verify', { source: 'access' });
    router.push(href);
  }

  return (
    <button
      type="button"
      onClick={enter}
      disabled={pending}
      className="group inline-flex items-center gap-3 rounded-2xl bg-cobalt px-9 py-5 text-lg font-bold text-white shadow-[0_8px_40px_-8px_rgba(46,77,219,0.7)] transition-all hover:bg-cobalt-soft hover:shadow-[0_12px_50px_-8px_rgba(107,138,255,0.8)] disabled:opacity-70"
    >
      {pending ? 'Entering…' : 'Enter the catalog'}
      <span
        aria-hidden
        className="transition-transform duration-200 group-hover:translate-x-1"
      >
        →
      </span>
    </button>
  );
}
