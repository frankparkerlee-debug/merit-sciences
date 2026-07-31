'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function LookupForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedRef = orderRef.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please enter a valid email.');
      return;
    }
    if (trimmedRef.length < 5) {
      setError('Order reference looks too short.');
      return;
    }
    setSubmitting(true);
    try {
      // Single endpoint — always returns success-shaped response to
      // avoid leaking whether a given email/order combination exists.
      await fetch('/api/orders/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, orderRef: trimmedRef }),
      });
      router.replace('/orders/lookup?sent=1');
    } catch {
      setError('Network error — please try again.');
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="text-xs font-bold tracking-wider uppercase text-ink-soft">Email</span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-2 block w-full rounded-xl border border-cobalt/20 bg-white px-4 py-3.5 text-base text-ink placeholder:text-ink-soft/50 focus:outline-none focus:border-cobalt"
        />
      </label>
      <label className="block">
        <span className="text-xs font-bold tracking-wider uppercase text-ink-soft">Order reference</span>
        <input
          type="text"
          required
          value={orderRef}
          onChange={(e) => setOrderRef(e.target.value)}
          placeholder="e.g. 0YR42856YR929153A"
          className="mt-2 block w-full rounded-xl border border-cobalt/20 bg-white px-4 py-3.5 text-base text-ink placeholder:text-ink-soft/50 focus:outline-none focus:border-cobalt font-mono"
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
        {submitting ? 'Sending link…' : 'Email me a secure link'}
      </button>
    </form>
  );
}
