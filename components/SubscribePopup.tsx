'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Subscribe / exit-intent popup → email capture → 10%-off-first-order code.
 *
 * Triggers on desktop exit-intent (cursor leaves through the top) OR after a
 * timed delay (covers mobile, where exit-intent doesn't fire). Suppressed for
 * 14 days after a dismiss, a year after a successful subscribe, and never
 * shown on transactional/account flows.
 */

const STORAGE_KEY = 'merit_subscribe_popup_v1';
const SUPPRESS_DAYS_DISMISS = 14;
const SUPPRESS_DAYS_DONE = 365;
const TIMED_DELAY_MS = 25_000;

const HIDDEN_PREFIXES = [
  '/checkout', '/cart', '/admin', '/auth',
  '/affiliate/dashboard', '/affiliate/login',
  '/practitioners/portal', '/practitioners/login',
];

function suppressed(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const { until } = JSON.parse(raw);
    return typeof until === 'number' && Date.now() < until;
  } catch {
    return false;
  }
}

function suppress(days: number) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ until: Date.now() + days * 86_400_000 }));
  } catch {
    /* ignore */
  }
}

export function SubscribePopup() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [code, setCode] = useState('WELCOME10');

  const hidden = HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p));

  useEffect(() => {
    if (hidden || suppressed()) return;
    let shown = false;
    const show = () => {
      if (shown) return;
      shown = true;
      setOpen(true);
      cleanup();
    };
    const onMouseOut = (e: MouseEvent) => {
      if (e.clientY <= 0) show(); // exit-intent: leaving through the top
    };
    const timer = window.setTimeout(show, TIMED_DELAY_MS);
    document.addEventListener('mouseout', onMouseOut);
    function cleanup() {
      window.clearTimeout(timer);
      document.removeEventListener('mouseout', onMouseOut);
    }
    return cleanup;
  }, [hidden, pathname]);

  function dismiss() {
    setOpen(false);
    suppress(SUPPRESS_DAYS_DISMISS);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMsg('Enter a valid email.');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, source: 'popup' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(data.error || 'Something went wrong. Try again.');
        setStatus('error');
        return;
      }
      if (data.code) setCode(data.code);
      setStatus('done');
      suppress(SUPPRESS_DAYS_DONE);
    } catch {
      setErrorMsg('Network error. Try again.');
      setStatus('error');
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Subscribe for 10% off">
      <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={dismiss} />
      <div className="relative w-full max-w-md bg-cream rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-cobalt via-[#5078FF] to-cobalt" />
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/70 hover:bg-white flex items-center justify-center text-ink-soft hover:text-ink transition"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="px-7 py-8">
          {status === 'done' ? (
            <div className="text-center">
              <p className="font-display text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">— You’re in</p>
              <h2 className="font-display text-2xl font-black text-ink tracking-tight mb-3">
                Here’s your 10% off<span className="text-cobalt">.</span>
              </h2>
              <p className="text-sm text-ink-soft mb-4">Use this code at checkout — we also emailed it to you.</p>
              <div className="inline-block font-mono text-lg font-extrabold tracking-[0.1em] text-ink bg-white border border-dashed border-cobalt/40 rounded-lg px-5 py-3 mb-5">
                {code}
              </div>
              <div>
                <a
                  href="/catalog"
                  onClick={() => setOpen(false)}
                  className="inline-block text-white px-6 py-3 rounded-xl text-sm font-bold transition hover:opacity-95"
                  style={{ background: 'linear-gradient(135deg, #2E4DDB 0%, #5078FF 50%, #2E4DDB 100%)' }}
                >
                  Shop the catalog →
                </a>
              </div>
            </div>
          ) : (
            <>
              <p className="font-display text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">— Merit Sciences</p>
              <h2 className="font-display text-2xl sm:text-[26px] font-black text-ink tracking-tight leading-tight mb-2">
                Get 10% off your first order<span className="text-cobalt">.</span>
              </h2>
              <p className="text-sm text-ink-soft mb-5 leading-relaxed">
                Pharmacy-grade research compounds — HPLC-tested to ≥99%, a COA in every box. Join the list for your code plus restock alerts.
              </p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="block w-full rounded-xl border border-cobalt/20 bg-white px-4 py-3 text-base text-ink placeholder:text-ink-soft/50 focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-cobalt/10 transition"
                />
                {status === 'error' && errorMsg && <p className="text-sm text-rose-700">{errorMsg}</p>}
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full text-white py-3 rounded-xl text-sm font-bold transition hover:opacity-95 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #2E4DDB 0%, #5078FF 50%, #2E4DDB 100%)' }}
                >
                  {status === 'submitting' ? 'Sending…' : 'Email me the code'}
                </button>
              </form>
              <button
                type="button"
                onClick={dismiss}
                className="block w-full text-center text-[11px] tracking-[0.16em] uppercase text-ink-muted font-bold mt-3 hover:text-ink transition"
              >
                No thanks
              </button>
              <p className="text-[10px] text-ink-soft/60 text-center mt-3">Research use only. No spam — unsubscribe anytime.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
