'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserSupabase } from '@/lib/supabase-browser';

export function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address.');
      return;
    }
    setSubmitting(true);

    // Server-side check: is this an authorized admin email?
    try {
      const check = await fetch('/api/admin/login-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await check.json();
      if (!check.ok || !data.authorized) {
        setError('This email is not an authorized operator account.');
        setSubmitting(false);
        return;
      }
    } catch {
      setError('Network error. Try again.');
      setSubmitting(false);
      return;
    }

    // Fire Supabase magic-link, redirect back to /admin/orders
    const supabase = getBrowserSupabase();
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const { error: sbError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=/admin/orders`,
        shouldCreateUser: true,
      },
    });
    if (sbError) {
      setError(sbError.message);
      setSubmitting(false);
      return;
    }

    router.replace(`/admin/login?sent=1&email=${encodeURIComponent(trimmed)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="text-xs font-bold tracking-wider uppercase text-ink-soft">Operator email</span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="info@meritsciences.com"
          className="mt-2 block w-full rounded-xl border border-cobalt/20 bg-white px-4 py-3.5 text-base text-ink placeholder:text-ink-soft/50 focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-cobalt/10 transition"
        />
      </label>
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <p className="text-sm text-rose-900">{error}</p>
        </div>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-ink text-white px-6 py-3.5 rounded-xl text-sm font-bold tracking-wide hover:bg-cobalt transition disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? 'Sending link…' : 'Email me a sign-in link'}
      </button>
    </form>
  );
}
