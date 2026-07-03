'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/**
 * Error boundary for the order-confirmation route.
 *
 * By the time a buyer reaches /checkout/success their payment has already been
 * captured server-side (onApprove only navigates here after a COMPLETED
 * capture), so whatever broke on the client, their order IS placed. We show a
 * reassuring "order confirmed" message rather than the bare Next.js
 * "Application error" screen.
 *
 * The most common trigger is a deploy landing mid-session: the new build
 * replaces the JS chunks, so navigating here from an already-loaded page throws
 * ChunkLoadError. We auto-recover by hard-reloading once to pull the fresh
 * bundle (guarded against reload loops via sessionStorage).
 */
export default function SuccessError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    const isChunkError =
      /ChunkLoadError|Loading chunk|dynamically imported module|importing a module script failed/i.test(
        `${error?.name ?? ''} ${error?.message ?? ''}`,
      );
    if (isChunkError && typeof window !== 'undefined') {
      const KEY = 'merit_success_reloaded';
      if (!sessionStorage.getItem(KEY)) {
        sessionStorage.setItem(KEY, '1');
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <main className="bg-cream min-h-screen">
      <section className="bg-white border-b border-cobalt/10">
        <div className="h-1 bg-gradient-to-r from-cobalt via-[#5078FF] to-cobalt" />
        <div className="max-w-[640px] mx-auto px-5 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cobalt text-white mb-6 shadow-md">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
            — Order confirmed
          </p>
          <h1
            className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95] mb-4"
            style={{ fontSize: 'clamp(32px, 5vw, 56px)' }}
          >
            You&apos;re all set<span className="text-cobalt">.</span>
          </h1>
          <p className="text-base sm:text-lg text-ink-soft leading-relaxed mb-2">
            Your payment went through and your order is confirmed — a receipt is on its
            way to your inbox.
          </p>
          <p className="text-sm text-ink-soft leading-relaxed mb-8">
            Your order ships within 48 hours from our facility in Dallas. You&apos;ll
            receive a tracking number as soon as it leaves.
          </p>
          <Link
            href="/catalog"
            className="inline-block text-white py-3.5 px-8 rounded-xl text-base font-bold shadow-md hover:opacity-95 transition"
            style={{ background: 'linear-gradient(135deg, #2E4DDB 0%, #5078FF 50%, #2E4DDB 100%)' }}
          >
            Continue shopping
          </Link>
          <p className="text-center text-[12px] text-ink-muted mt-6">
            Questions? Email{' '}
            <a
              href="mailto:rx@meritsciences.com"
              className="text-cobalt font-bold underline-offset-2 hover:underline"
            >
              rx@meritsciences.com
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
