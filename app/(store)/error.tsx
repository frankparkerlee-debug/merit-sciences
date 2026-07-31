'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/**
 * Root storefront error boundary. Keeps Next's bare "Application error: a
 * client-side exception has occurred" screen from ever reaching a shopper.
 *
 * Primary case we care about: a deploy landing while a shopper has the site
 * open replaces the JS chunks, so their next client navigation throws
 * ChunkLoadError. We auto-recover by hard-reloading once (fetches the new
 * bundle), guarded against reload loops. Anything else shows a friendly retry
 * with reassurance for anyone mid-purchase.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const isChunkError =
      /ChunkLoadError|Loading chunk|dynamically imported module|importing a module script failed/i.test(
        `${error?.name ?? ''} ${error?.message ?? ''}`,
      );
    if (isChunkError && typeof window !== 'undefined') {
      const KEY = 'merit_chunk_reloaded';
      if (!sessionStorage.getItem(KEY)) {
        sessionStorage.setItem(KEY, '1');
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <main className="bg-cream min-h-screen flex items-center justify-center px-6">
      <div className="max-w-[440px] text-center">
        <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
          — Something interrupted
        </p>
        <h1
          className="font-display font-black text-ink tracking-[-0.03em] leading-[1.02] mb-4"
          style={{ fontSize: 'clamp(26px, 4vw, 40px)' }}
        >
          Let&apos;s try that again<span className="text-cobalt">.</span>
        </h1>
        <p className="text-sm text-ink-soft leading-relaxed mb-7">
          Something hiccuped on our end. If you were completing an order and were
          charged, it went through — a receipt is on its way, and you can email us to
          confirm.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="text-white py-3 px-7 rounded-xl text-[15px] font-bold shadow-md hover:opacity-95 transition"
            style={{ background: 'linear-gradient(135deg, #2E4DDB 0%, #5078FF 50%, #2E4DDB 100%)' }}
          >
            Try again
          </button>
          <Link
            href="/"
            className="py-3 px-7 rounded-xl text-[15px] font-bold border border-ink/15 text-ink hover:border-ink/40 transition"
          >
            Home
          </Link>
        </div>
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
    </main>
  );
}
