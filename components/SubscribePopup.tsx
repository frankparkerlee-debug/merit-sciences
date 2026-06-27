'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { track, identify } from '@/lib/analytics';

/**
 * Subscribe / exit-intent popup → email capture → 20%-off-first-order code.
 *
 * Full-screen cobalt takeover: the vial pattern fills the viewport behind a
 * deep cobalt→ink wash, the four colored lane vials float around the edges
 * for depth, and the offer sits center-stage in monumental cream type. Built
 * to stop the scroll and grab attention on the way out.
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

// Decorative lane vials scattered around the offer. Each floats on its own
// rhythm (--r tilt + staggered duration/delay) for a living, layered feel.
// Smaller/blurred ones drop out on narrow screens to avoid clutter.
const VIALS = [
  { src: 'lane-nad-transparent',          cls: 'top-[-5%] left-[-3%] w-40 sm:w-56 lg:w-72',                r: '-12deg', dur: '7s',   delay: '0s',   op: 'opacity-90', blur: '' },
  { src: 'lane-bpc-transparent',          cls: 'bottom-[-7%] right-[-4%] w-44 sm:w-60 lg:w-80',            r: '11deg',  dur: '8s',   delay: '.6s',  op: 'opacity-90', blur: '' },
  { src: 'lane-blends-transparent',       cls: 'top-[7%] right-[3%] w-28 sm:w-40 lg:w-52 hidden sm:block', r: '8deg',   dur: '6.5s', delay: '1.2s', op: 'opacity-70', blur: 'blur-[1px]' },
  { src: 'lane-selank-transparent',       cls: 'bottom-[9%] left-[2%] w-28 sm:w-40 lg:w-52 hidden sm:block', r: '-8deg', dur: '7.5s', delay: '.3s',  op: 'opacity-70', blur: 'blur-[1px]' },
  { src: 'merit-vial-canonical-transparent', cls: 'top-[42%] left-[11%] w-20 lg:w-28 hidden lg:block',     r: '4deg',   dur: '9s',   delay: '.9s',  op: 'opacity-50', blur: 'blur-[2px]' },
] as const;

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
    const timer = window.setTimeout(show, TIMED_DELAY_MS);
    document.addEventListener('mouseout', onMouseOut);
    function cleanup() {
      window.clearTimeout(timer);
      document.removeEventListener('mouseout', onMouseOut);
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
      className="fixed inset-0 z-[80] overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Subscribe for 20% off"
      style={{ animation: 'meritPop .5s cubic-bezier(0.22,1,0.36,1) both' }}
    >
      {/* Keyframes (scoped, self-contained) */}
      <style>{`
        @keyframes meritPop { from { opacity:0 } to { opacity:1 } }
        @keyframes meritRise { from { opacity:0; transform:translateY(22px) } to { opacity:1; transform:translateY(0) } }
        @keyframes meritFloat { 0%,100% { transform:translateY(0) rotate(var(--r,0deg)) } 50% { transform:translateY(-22px) rotate(var(--r,0deg)) } }
        @keyframes meritGlow { 0%,100% { opacity:.45; transform:translate(-50%,-50%) scale(1) } 50% { opacity:.8; transform:translate(-50%,-50%) scale(1.12) } }
      `}</style>

      {/* 1 — Vial pattern, full-bleed */}
      <Image
        src="/brand/scene-pattern-cobalt.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />

      {/* 2 — Cobalt→ink wash for drama + legibility */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 38%, rgba(46,77,219,0.34) 0%, rgba(11,15,25,0.62) 45%, rgba(11,15,25,0.92) 100%)',
        }}
      />
      {/* 2b — Vertical scrim so the top eyebrow + bottom microcopy stay legible
          over the bright pattern (esp. on mobile) without dimming the vials. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(11,15,25,0.5) 0%, rgba(11,15,25,0) 28%, rgba(11,15,25,0) 66%, rgba(11,15,25,0.8) 100%)',
        }}
      />

      {/* 3 — Soft glow behind the headline */}
      <div
        className="absolute left-1/2 top-1/2 w-[60vw] h-[60vw] max-w-[640px] max-h-[640px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(107,138,255,0.45) 0%, rgba(107,138,255,0) 65%)',
          animation: 'meritGlow 6s ease-in-out infinite',
        }}
      />

      {/* 4 — Floating lane vials */}
      {VIALS.map((v, i) => (
        <div
          key={i}
          aria-hidden
          className={`pointer-events-none absolute ${v.cls} aspect-[1/2.3] ${v.op} ${v.blur}`}
          style={{ ['--r' as string]: v.r, animation: `meritFloat ${v.dur} ease-in-out ${v.delay} infinite` } as React.CSSProperties}
        >
          <Image
            src={`/brand/${v.src}.webp`}
            alt=""
            fill
            sizes="320px"
            className="object-contain"
            style={{ filter: 'drop-shadow(0 24px 44px rgba(0,0,0,0.45))' }}
          />
        </div>
      ))}

      {/* 5 — Close */}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Close"
        className="absolute top-5 right-5 sm:top-7 sm:right-7 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/15 flex items-center justify-center text-cream/80 hover:text-white transition"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* 6 — Centered offer */}
      <div className="relative z-10 h-full w-full flex items-center justify-center px-6">
        <div className="w-full max-w-xl text-center" style={{ animation: 'meritRise .6s cubic-bezier(0.22,1,0.36,1) .08s both' }}>
          {status === 'done' ? (
            <>
              <p className="font-display text-[12px] tracking-[0.28em] uppercase text-cobalt-soft font-bold mb-4">— You’re in</p>
              <h2 className="font-display font-black text-cream tracking-[-0.03em] leading-[0.92] mb-5" style={{ fontSize: 'clamp(40px, 8vw, 76px)' }}>
                Here’s your 20% off<span className="text-cobalt-soft">.</span>
              </h2>
              <p className="text-base text-cream/70 mb-7">Use it at checkout — emailed to you too.</p>
              <div className="inline-block font-mono text-2xl sm:text-3xl font-extrabold tracking-[0.14em] text-cream bg-white/10 backdrop-blur-sm border border-dashed border-cobalt-soft/60 rounded-2xl px-8 py-5 mb-8 shadow-2xl">
                {code}
              </div>
              <div>
                <a
                  href="/catalog"
                  onClick={() => setOpen(false)}
                  className="inline-block text-white px-9 py-4 rounded-2xl text-base font-bold transition hover:opacity-95 shadow-xl"
                  style={{ background: 'linear-gradient(135deg, #2E4DDB 0%, #6B8AFF 50%, #2E4DDB 100%)' }}
                >
                  Shop the catalog →
                </a>
              </div>
            </>
          ) : (
            <>
              <p className="font-display text-[12px] tracking-[0.28em] uppercase text-cobalt-soft font-bold mb-4">— Merit Sciences · Welcome offer</p>
              <h2 className="font-display font-black text-cream tracking-[-0.035em] leading-[0.9] mb-5" style={{ fontSize: 'clamp(44px, 9vw, 88px)' }}>
                Get 20% off<br />your first order<span className="text-cobalt-soft">.</span>
              </h2>
              <p className="text-base sm:text-lg text-cream/75 mb-8 leading-relaxed max-w-lg mx-auto">
                Pharmacy-grade research compounds — HPLC-tested to ≥99%, a COA in every box. Join the list for your code plus restock alerts.
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
                    className="flex-1 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm px-5 py-4 text-base text-cream placeholder:text-cream/45 focus:outline-none focus:border-cobalt-soft focus:ring-2 focus:ring-cobalt-soft/30 transition"
                  />
                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className="shrink-0 text-white px-7 py-4 rounded-2xl text-base font-bold transition hover:opacity-95 disabled:opacity-60 shadow-xl"
                    style={{ background: 'linear-gradient(135deg, #2E4DDB 0%, #6B8AFF 50%, #2E4DDB 100%)' }}
                  >
                    {status === 'submitting' ? 'Sending…' : 'Get my code'}
                  </button>
                </div>
                {status === 'error' && errorMsg && <p className="text-sm text-rose-300 mt-3">{errorMsg}</p>}
              </form>
              <button
                type="button"
                onClick={dismiss}
                className="text-[11px] tracking-[0.18em] uppercase text-cream/50 font-bold mt-6 hover:text-cream/80 transition"
              >
                No thanks, I'll pay full price
              </button>
              <p className="text-[11px] text-cream/40 mt-5">Research use only. No spam — unsubscribe anytime.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
