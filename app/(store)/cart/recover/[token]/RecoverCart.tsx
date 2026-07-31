'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart, type CartLine } from '@/lib/cart';
import { track } from '@/lib/analytics';

/**
 * Rehydrates a saved cart from the recovery email, re-seeds the referral
 * cookie (so the affiliate discount + attribution return), then redirects
 * to /checkout. Reads/writes the cart store imperatively via getState() so
 * it doesn't re-render on every cart mutation.
 */
export function RecoverCart({
  lines,
  referralSlug,
}: {
  lines: CartLine[];
  referralSlug: string | null;
}) {
  const router = useRouter();

  useEffect(() => {
    try {
      const cart = useCart.getState();
      cart.clear();
      (Array.isArray(lines) ? lines : []).forEach((l) => {
        const { qty, ...rest } = l;
        cart.add(rest, qty || 1);
      });
      // Re-seed the referral cookie (non-httpOnly is fine — server reads the
      // value on the next /checkout request and auto-applies the discount).
      if (referralSlug) {
        document.cookie = `merit_ref=${encodeURIComponent(referralSlug)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
      }
      track('cart_recovered', { item_count: (lines ?? []).reduce((n, l) => n + (l.qty || 1), 0) });
    } catch {
      /* even if rehydrate fails, still send them to checkout */
    }
    router.replace('/checkout');
  }, [lines, referralSlug, router]);

  return (
    <main className="bg-cream min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <div className="mx-auto mb-4 w-8 h-8 rounded-full border-2 border-cobalt/20 border-t-cobalt animate-spin" />
        <p className="text-sm text-ink-soft">Restoring your cart…</p>
      </div>
    </main>
  );
}
