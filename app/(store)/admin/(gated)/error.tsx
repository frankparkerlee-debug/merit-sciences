'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/**
 * Error boundary for the admin route group. Surfaces the actual error
 * message + a Try-again button so operators can see what went wrong
 * instead of a blank screen.
 *
 * The error message is intentionally visible: this is the admin
 * portal — operators are us, not customers, and we'd rather see the
 * stack than guess.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[admin] error boundary caught', error);
  }, [error]);

  return (
    <main className="max-w-[680px] mx-auto px-6 py-16">
      <p className="text-[10px] tracking-[0.22em] uppercase text-rose-700 font-bold mb-2">
        — Admin error
      </p>
      <h1 className="font-display font-black text-ink tracking-[-0.025em] text-3xl mb-3">
        Something broke<span className="text-cobalt">.</span>
      </h1>
      <p className="text-sm text-ink-soft mb-6 leading-relaxed">
        The admin page hit a runtime error. The full message is below —
        copy it if you need to share it for debugging.
      </p>

      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 mb-5">
        <p className="text-[10px] uppercase tracking-wider text-rose-700 font-bold mb-2">
          Error message
        </p>
        <p className="font-mono text-sm text-rose-900 break-all whitespace-pre-wrap">
          {error?.message || 'No message — see browser console.'}
        </p>
        {error?.digest && (
          <p className="font-mono text-[11px] text-rose-700 mt-2">
            digest: {error.digest}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => reset()}
          className="bg-ink text-white px-5 py-2.5 rounded-lg text-xs font-bold tracking-wide uppercase hover:bg-cobalt transition"
        >
          Try again
        </button>
        <Link
          href="/admin/orders"
          className="bg-white border border-cobalt/20 text-ink px-5 py-2.5 rounded-lg text-xs font-bold tracking-wide uppercase hover:border-cobalt/40 transition"
        >
          ← Back to orders
        </Link>
      </div>
    </main>
  );
}
