'use client';

import { useState } from 'react';
import { track, identify } from '@/lib/analytics';

export function LpEmailCapture({
  source,
  label = 'Get access + 10% off your first order',
  theme = 'dark',
}: {
  source: string;
  label?: string;
  theme?: 'dark' | 'light';
}) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [code, setCode] = useState('WELCOME10');
  const [err, setErr] = useState('');

  const isDark = theme === 'dark';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErr('Enter a valid email address.');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    setErr('');
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, source }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(data.error || 'Something went wrong.'); setStatus('error'); return; }
      if (data.code) setCode(data.code);
      identify(trimmed);
      track('lp_subscribe', { source });
      setStatus('done');
    } catch {
      setErr('Network error. Try again.');
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div className="text-center">
        <p className={`font-mono text-[11px] tracking-[0.28em] uppercase mb-3 ${isDark ? 'text-cobalt-soft' : 'text-cobalt'}`}>
          — You're in
        </p>
        <p className={`text-lg font-bold mb-4 ${isDark ? 'text-cream' : 'text-ink'}`}>
          Your 10% off code:
        </p>
        <div className={`inline-block font-mono text-2xl font-extrabold tracking-[0.14em] px-8 py-4 rounded-2xl border border-dashed mb-5 ${
          isDark ? 'text-cream bg-white/10 border-cobalt-soft/50' : 'text-ink bg-cobalt/5 border-cobalt/30'
        }`}>
          {code}
        </div>
        <p className={`text-sm ${isDark ? 'text-cream/50' : 'text-ink-soft'}`}>
          Emailed to you too. Use it at checkout.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <p className={`text-sm font-bold mb-4 ${isDark ? 'text-cream/60' : 'text-ink-soft'}`}>{label}</p>
      <form onSubmit={submit}>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className={`flex-1 rounded-xl px-5 py-4 text-base focus:outline-none focus:ring-2 transition ${
              isDark
                ? 'bg-white/10 border border-white/15 text-cream placeholder:text-cream/35 focus:border-cobalt-soft focus:ring-cobalt-soft/20'
                : 'bg-white border border-cobalt/20 text-ink placeholder:text-ink-muted focus:border-cobalt focus:ring-cobalt/15'
            }`}
          />
          <button
            type="submit"
            disabled={status === 'submitting'}
            className="shrink-0 px-7 py-4 rounded-xl text-white font-bold text-base transition hover:opacity-90 disabled:opacity-60 shadow-lg"
            style={{ background: 'linear-gradient(135deg, #2E4DDB 0%, #6B8AFF 100%)' }}
          >
            {status === 'submitting' ? 'Sending…' : 'Get access →'}
          </button>
        </div>
        {status === 'error' && err && (
          <p className="text-rose-400 text-sm mt-2">{err}</p>
        )}
      </form>
      <p className={`text-[11px] mt-3 ${isDark ? 'text-cream/30' : 'text-ink-muted'}`}>
        Research use only. No spam — unsubscribe anytime.
      </p>
    </div>
  );
}
