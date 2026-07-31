'use client';

import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/lib/cart';

/**
 * Storefront-side bridge to the split checkout domain.
 *
 * Rendered at /checkout on meritsciences.com when CHECKOUT_ORIGIN is set.
 * Reads the cart (localStorage, this origin) plus the stashed promo code,
 * mints a handoff server-side — which also captures the HttpOnly affiliate and
 * attribution cookies the client can't see — and forwards to the checkout
 * domain.
 *
 * Doing it here rather than at each call site means every existing "Checkout"
 * link (cart drawer, PDP, emails, bookmarks) keeps working untouched.
 */
export function CheckoutBridge() {
  const lines = useCart((s) => s.lines);
  const [hydrated, setHydrated] = useState(false);
  const [failed, setFailed] = useState(false);
  const firedRef = useRef(false);

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated || firedRef.current) return;
    if (lines.length === 0) return; // empty cart — show the notice below
    firedRef.current = true;

    let welcomeCode: string | null = null;
    try {
      welcomeCode = localStorage.getItem('merit_welcome_code');
    } catch {
      /* private mode */
    }

    (async () => {
      try {
        const res = await fetch('/api/checkout/handoff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lines, welcomeCode }),
        });
        const data = await res.json();
        if (data?.url) {
          // Navigate via an anchor with rel="noreferrer" rather than
          // location.replace, so the browser sends NO Referer on the hop.
          // Otherwise the checkout domain (and anything it loads) would
          // receive the full storefront URL the buyer came from — the exact
          // association this split exists to remove. Same tab, no opener.
          const a = document.createElement('a');
          a.href = data.url;
          a.rel = 'noreferrer noopener';
          document.body.appendChild(a);
          a.click();
          return;
        }
        setFailed(true);
      } catch {
        setFailed(true);
      }
    })();
  }, [hydrated, lines]);

  const emptyCart = hydrated && lines.length === 0;

  return (
    <div className="max-w-[560px] mx-auto px-5 py-24 text-center">
      {emptyCart ? (
        <>
          <h1 className="font-display font-black text-ink text-2xl mb-2">Your cart is empty.</h1>
          <p className="text-sm text-ink-soft mb-6">Add a compound to continue to checkout.</p>
          <a
            href="/catalog"
            className="inline-block rounded-lg bg-ink px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
          >
            Browse the catalog
          </a>
        </>
      ) : failed ? (
        <>
          <h1 className="font-display font-black text-ink text-2xl mb-2">Couldn&rsquo;t open checkout.</h1>
          <p className="text-sm text-ink-soft mb-6">
            Something went wrong starting your order. Please try again.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-block rounded-lg bg-ink px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
          >
            Try again
          </button>
        </>
      ) : (
        <>
          <div
            className="mx-auto mb-5 h-8 w-8 animate-spin rounded-full border-2 border-cobalt/20 border-t-cobalt"
            aria-hidden
          />
          <p className="text-sm text-ink-soft">Taking you to secure checkout&hellip;</p>
        </>
      )}
    </div>
  );
}
