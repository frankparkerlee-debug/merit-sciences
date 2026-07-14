'use client';

import { useEffect, useState } from 'react';

const DISMISS_KEY = 'merit_welcome_bar_dismissed';

/**
 * Thin promo bar that keeps the gate's "20% off" promise visible the entire
 * time the buyer is shopping. Reads the WELCOME code the /access gate stashed
 * in localStorage; renders nothing if there's no code (organic visitors) or it
 * was dismissed. The discount actually applies via the checkout auto-apply —
 * this is the reassurance that the promise is still live.
 *
 * Sits inside ChromeGate in the layout, so it's auto-stripped on the clean ad
 * gates (/access, /lp) where no code is set yet anyway.
 */
export function WelcomeOfferBar() {
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
      // First-order offer only — once the buyer has checked out, retire it.
      if (localStorage.getItem('merit_welcome_used')) return;
      const c = localStorage.getItem('merit_welcome_code');
      if (c) setCode(c.toUpperCase());
    } catch {
      /* private mode — just don't show it */
    }
  }, []);

  if (!code) return null;

  return (
    <div className="bg-cobalt text-white">
      <div className="relative mx-auto flex max-w-[1300px] items-center justify-center gap-2 px-9 py-2 text-center text-[12.5px] font-bold tracking-tight">
        <span aria-hidden>🎉</span>
        <span>
          20% off your first order is active — applied automatically at checkout
          <span className="ml-1.5 hidden font-mono opacity-75 sm:inline">· {code}</span>
        </span>
        <button
          type="button"
          aria-label="Dismiss offer"
          onClick={() => {
            try {
              localStorage.setItem(DISMISS_KEY, '1');
            } catch {
              /* ignore */
            }
            setCode(null);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-base leading-none opacity-70 transition hover:opacity-100"
        >
          ×
        </button>
      </div>
    </div>
  );
}
