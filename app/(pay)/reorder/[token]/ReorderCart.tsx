'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart, type CartLine } from '@/lib/cart';
import { track } from '@/lib/analytics';

/**
 * Client half of the one-click reorder flow: replaces the cart with the
 * repriced lines from the referenced order and bounces straight to /checkout.
 * Mirrors app/cart/recover/[token]/RecoverCart.tsx — imperative getState()
 * writes so it never re-renders on cart mutations.
 */
export function ReorderCart({ lines }: { lines: CartLine[] }) {
  const router = useRouter();

  useEffect(() => {
    try {
      const cart = useCart.getState();
      cart.clear();
      (Array.isArray(lines) ? lines : []).forEach((l) => {
        const { qty, ...rest } = l;
        cart.add(rest, qty || 1);
      });
      track('reorder_link_opened', {
        item_count: (lines ?? []).reduce((n, l) => n + (l.qty || 1), 0),
      });
    } catch {
      /* even if rehydrate fails, still send them to checkout */
    }
    router.replace('/checkout');
  }, [lines, router]);

  return (
    <main className="bg-cream min-h-screen flex items-center justify-center px-6">
      <div className="text-center">
        <div className="mx-auto mb-4 w-8 h-8 rounded-full border-2 border-cobalt/20 border-t-cobalt animate-spin" />
        <p className="text-sm text-ink-soft">Rebuilding your order…</p>
      </div>
    </main>
  );
}
