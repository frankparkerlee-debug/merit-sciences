'use client';

import { useState } from 'react';

/**
 * Email capture band — feeds the existing /api/newsletter route, which
 * grants the real WELCOME20 first-order code and starts the nurture drip.
 * The 20%-off offer is the hook; "get updates" doesn't convert.
 */
export function CaptureBand() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === 'busy') return;
    setState('busy');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'homepage' }),
      });
      setState(res.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  }

  return (
    <section className="bg-white border-t border-ink/10">
      <div className="max-w-[760px] mx-auto px-6 py-14 lg:py-16 text-center">
        <p className="eyebrow text-cobalt mb-2">— First order</p>
        <h2
          className="font-display font-black text-ink tracking-[-0.03em]"
          style={{ fontSize: 'clamp(24px,3vw,36px)' }}
        >
          20% off your first order.
        </h2>
        <p className="mt-2 text-[15px] text-ink-soft">
          Drop your email and we&rsquo;ll send the code — plus restock and new-compound alerts. No spam.
        </p>

        {state === 'done' ? (
          <p className="mt-6 inline-block rounded-full bg-success/10 text-success font-bold text-[14px] px-6 py-3">
            Check your inbox — your code is on the way. ✓
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-[440px] mx-auto">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@lab.com"
              className="flex-1 rounded-full border border-ink/15 bg-cream/60 px-5 py-3.5 text-[15px] text-ink outline-none focus:border-cobalt"
            />
            <button
              type="submit"
              disabled={state === 'busy'}
              className="rounded-full bg-cobalt px-7 py-3.5 text-[14px] font-bold text-white hover:opacity-90 transition disabled:opacity-60"
            >
              {state === 'busy' ? 'Sending…' : 'Get the code'}
            </button>
          </form>
        )}
        {state === 'error' && (
          <p className="mt-3 text-[13px] text-red-600">Something hiccuped — try again.</p>
        )}
      </div>
    </section>
  );
}
