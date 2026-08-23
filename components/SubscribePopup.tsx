'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { track, identify } from '@/lib/analytics';

/**
 * Subscribe / exit-intent popup → email capture → 20%-off-first-order code.
 *
 * Styled in the homepage's dark object-cinema language ("Same stack. Better
 * source."): the defocused vial wall as ground, ink scrims, poster-black
 * uppercase type with the outline-stroke second line, mono eyebrows, and the
 * white→lime square CTA. One quiet lime accent — no gradients, no floaters.
 *
 * Triggers on desktop exit-intent (cursor leaves through the top) OR after a
 * timed delay (covers mobile, where exit-intent doesn't fire). Suppressed for
 * 14 days after a dismiss, a year after a successful subscribe, and never
 * shown on transactional/account flows.
 */

const LIME = '#B9FF66';

const STORAGE_KEY = 'merit_subscribe_popup_v1';
const SUPPRESS_DAYS_DISMISS = 14;
const SUPPRESS_DAYS_DONE = 365;
const TIMED_DELAY_MS = 25_000;
/** Fraction of the page scrolled that counts as intent on touch, where
 *  exit-intent has no equivalent and the timer often never fires. */
const SCROLL_TRIGGER = 0.55;

const HIDDEN_PREFIXES = [
  '/checkout', '/cart', '/admin', '/auth',
  '/affiliate/dashboard', '/affiliate/login',
  '/practitioners/portal', '/practitioners/login',
  // Reading certificates IS the action this popup asks for — interrupting
  // that with an offer to send certificates is nonsense.
  '/coa',
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
  const [code, setCode] = useState('WELCOME20');

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
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      if (max > 0 && window.scrollY / max >= SCROLL_TRIGGER) show();
    };
    const timer = window.setTimeout(show, TIMED_DELAY_MS);
    document.addEventListener('mouseout', onMouseOut);
    window.addEventListener('scroll', onScroll, { passive: true });
    function cleanup() {
      window.clearTimeout(timer);
      document.removeEventListener('mouseout', onMouseOut);
      window.removeEventListener('scroll', onScroll);
    }
    return cleanup;
  }, [hidden, pathname]);

  // Lock background scroll + close on Escape while the takeover is open.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
      identify(trimmed);
      track('subscribe', { source: 'popup' });
      setStatus('done');
      suppress(SUPPRESS_DAYS_DONE);
    } catch {
      setErrorMsg('Network error. Try again.');
      setStatus('error');
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] overflow-hidden bg-[#08090A] text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Subscribe for 20% off"
      style={{ animation: 'meritPop .45s cubic-bezier(0.22,1,0.36,1) both' }}
    >
      {/* Keyframes (scoped, self-contained) */}
      <style>{`
        @keyframes meritPop { from { opacity:0 } to { opacity:1 } }
        @keyframes meritRise { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
      `}</style>

      {/* 1 — The defocused vial wall, same ground as the hero */}
      <Image
        src="/brand/pattern-vials-dof.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />

      {/* 2 — Ink scrim, hero-matched: heavy center-low for type, easing at the
          edges so the wall stays perceptible */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(110% 85% at 50% 55%, rgba(8,9,10,0.82) 0%, rgba(8,9,10,0.62) 55%, rgba(8,9,10,0.42) 100%), linear-gradient(180deg, rgba(8,9,10,0.65) 0%, rgba(8,9,10,0.1) 35%, rgba(8,9,10,0.85) 100%)',
        }}
      />

      {/* 3 — Close */}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Close"
        className="absolute top-5 right-5 sm:top-7 sm:right-7 z-10 w-11 h-11 border border-white/25 flex items-center justify-center text-white/70 hover:bg-white hover:text-black transition"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* 4 — Centered offer */}
      <div className="relative z-10 h-full w-full flex items-center justify-center px-6">
        <div className="w-full max-w-2xl text-center" style={{ animation: 'meritRise .55s cubic-bezier(0.22,1,0.36,1) .06s both' }}>
          {status === 'done' ? (
            <>
              <p className="font-mono text-[11px] sm:text-[12px] tracking-[0.16em] uppercase mb-5" style={{ color: LIME }}>
                You&rsquo;re on the list
              </p>
              <h2 className="font-poster font-black uppercase tracking-[-0.05em] leading-[0.86] mb-6" style={{ fontSize: 'clamp(40px, 8vw, 88px)' }}>
                20% off,
                <br />
                <span className="text-transparent" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.6)' }}>
                  locked in.
                </span>
              </h2>
              <p className="text-[15px] text-white/70 mb-7">Use it at checkout — emailed to you too.</p>
              <div className="inline-block font-mono text-2xl sm:text-3xl font-bold tracking-[0.14em] border border-dashed px-8 py-5 mb-8" style={{ borderColor: LIME, color: LIME }}>
                {code}
              </div>
              <div>
                <a
                  href="/catalog"
                  onClick={() => setOpen(false)}
                  className="inline-block bg-white text-black px-9 py-4 text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-[#B9FF66] transition"
                >
                  Shop the catalog →
                </a>
              </div>
            </>
          ) : (
            <>
              <p className="font-mono text-[11px] sm:text-[12px] tracking-[0.16em] uppercase mb-5" style={{ color: LIME }}>
                Before you go
              </p>
              {/* Lead with the thing no competitor can copy, not the discount.
                  "20% off" is the same offer every gray-market peptide site
                  runs, and it argues on price from a brand whose entire
                  position is that it argues on proof. The certificate is the
                  differentiator; the code is the close, not the headline. */}
              <h2 className="font-poster font-black uppercase tracking-[-0.05em] leading-[0.86] mb-6" style={{ fontSize: 'clamp(38px, 7.5vw, 92px)' }}>
                Read the lab
                <br />
                <span className="text-transparent" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.6)' }}>
                  report first.
                </span>
              </h2>
              <p className="text-[15px] sm:text-base text-white/70 mb-8 leading-[1.62] max-w-[52ch] mx-auto">
                Every Merit lot is assayed by an independent laboratory before release, and the
                certificate is published before it ships. Join the list and we&rsquo;ll send new lot
                reports as they post — plus <b className="text-white font-semibold">20% off your first order</b>.
              </p>
              <form onSubmit={handleSubmit} className="max-w-md mx-auto">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="flex-1 border border-white/25 bg-white/[0.06] px-5 py-4 text-base text-white placeholder:text-white/40 focus:outline-none focus:border-white/70 transition"
                  />
                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="shrink-0 bg-white text-black px-8 py-4 text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-[#B9FF66] transition disabled:opacity-60"
                  >
                    {status === 'submitting' ? 'Sending…' : 'Send lot reports'}
                  </button>
                </div>
                {status === 'error' && errorMsg && <p className="text-sm text-rose-300 mt-3">{errorMsg}</p>}
              </form>
              <button
                type="button"
                onClick={dismiss}
                className="font-mono text-[11px] tracking-[0.14em] uppercase text-white/45 mt-7 min-h-[44px] px-4 hover:text-white transition"
              >
                Not now
              </button>
              <p className="font-mono text-[10px] tracking-[0.06em] text-white/35 mt-4">
                Research use only · No spam — unsubscribe anytime
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
