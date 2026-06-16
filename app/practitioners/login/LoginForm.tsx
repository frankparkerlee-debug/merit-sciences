'use client';

import { useState } from 'react';
import { getBrowserSupabase } from '@/lib/supabase-browser';

export function LoginForm({ initialEmail = '' }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    setSubmitting(true);

    // Server-side: is this email an approved practitioner?
    try {
      const check = await fetch('/api/practitioners/login-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await check.json();
      if (!check.ok || !data.authorized) {
        setError(
          'No approved Practitioner account matches this email. Apply at /practitioners or contact info@meritpeptides.com.',
        );
        setSubmitting(false);
        return;
      }
    } catch {
      setError('Network error. Try again.');
      setSubmitting(false);
      return;
    }

    // Fire Supabase magic-link
    const supabase = getBrowserSupabase();
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const { error: sbError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=/practitioners/portal`,
        shouldCreateUser: true,
      },
    });
    setSubmitting(false);
    if (sbError) {
      setError(sbError.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900 leading-relaxed">
        <p className="font-bold mb-1">Check your inbox.</p>
        <p>
          We sent a sign-in link to <strong>{email}</strong>. Click it from the same device to land
          in your portal. The link expires in 60 minutes.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </div>
      )}
      <label className="block">
        <span className="block text-[10px] tracking-[0.18em] uppercase font-bold text-ink-soft mb-1.5">
          Email
        </span>
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@yourpractice.com"
          className="w-full rounded-lg border border-cobalt/20 bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-cobalt/20"
        />
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-cobalt text-white font-bold tracking-[0.16em] uppercase text-sm py-3.5 rounded-xl hover:bg-ink transition-colors disabled:opacity-60"
      >
        {submitting ? 'Sending…' : 'Send sign-in link →'}
      </button>
    </form>
  );
}
