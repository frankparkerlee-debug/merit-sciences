'use client';

import { useEffect } from 'react';

/**
 * Global error boundary — the LAST line of defense. app/error.tsx covers
 * route segments, but an exception inside the root layout itself (Nav,
 * CartDrawer, analytics providers) or inside Next's client router bypasses
 * it and previously rendered the bare "Application error: a client-side
 * exception has occurred" screen. Shoppers hit that moments after paying,
 * read it as a failed payment, and paid again.
 *
 * This replaces the ENTIRE document when it fires, so it must render its own
 * <html>/<body> and use inline styles only (the app stylesheet may not be
 * loaded). Same auto-recovery as the route boundaries: a mid-deploy chunk
 * mismatch hard-reloads once to pick up the fresh bundle.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    const isChunkError =
      /ChunkLoadError|Loading chunk|dynamically imported module|importing a module script failed/i.test(
        `${error?.name ?? ''} ${error?.message ?? ''}`,
      );
    if (isChunkError && typeof window !== 'undefined') {
      const KEY = 'merit_global_reloaded';
      if (!sessionStorage.getItem(KEY)) {
        sessionStorage.setItem(KEY, '1');
        window.location.reload();
      }
    }
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FAF7F2',
          color: '#0B0F19',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: 440 }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#2E4DDB',
              fontWeight: 700,
              marginBottom: 12,
            }}
          >
            — Something interrupted
          </p>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 14px' }}>
            Let&apos;s try that again.
          </h1>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: '#4B5163', margin: '0 0 26px' }}>
            Something hiccuped on our end. If you were completing an order and saw
            PayPal confirm, <strong>your payment went through</strong> — check your
            inbox for a receipt before paying again, or email{' '}
            <a href="mailto:rx@meritsciences.com" style={{ color: '#2E4DDB', fontWeight: 700 }}>
              rx@meritsciences.com
            </a>{' '}
            and we&apos;ll verify your order.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: 'linear-gradient(135deg, #2E4DDB 0%, #5078FF 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '12px 26px',
                fontSize: 15,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Reload
            </button>
            <a
              href="/"
              style={{
                border: '1px solid rgba(11,15,25,0.15)',
                borderRadius: 12,
                padding: '12px 26px',
                fontSize: 15,
                fontWeight: 700,
                color: '#0B0F19',
                textDecoration: 'none',
              }}
            >
              Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
