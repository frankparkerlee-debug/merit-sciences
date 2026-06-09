'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useCart } from '@/lib/cart';

/**
 * Cart indicator for the global Nav.
 *
 * Renders an outlined cart glyph + an item-count badge in the top-right
 * corner when the cart has anything in it. Dead-obvious to find, taps
 * straight to /cart.
 *
 * Why this is a client component: the cart state lives in a Zustand
 * store hydrated from localStorage, which only exists after mount. We
 * gate the badge on `mounted` to prevent the SSR/CSR count mismatch
 * (server renders 0, client could render N — React warns and re-paints).
 */
export function CartIcon() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const itemCount = useCart((s) =>
    s.lines.reduce((sum, l) => sum + l.qty, 0),
  );

  // Avoid SSR/CSR drift — only show the badge once we know client state.
  const showBadge = mounted && itemCount > 0;

  return (
    <Link
      href="/cart"
      className="relative inline-flex items-center gap-2 text-ink hover:text-cobalt transition group"
      aria-label={`Cart${showBadge ? ` — ${itemCount} item${itemCount === 1 ? '' : 's'}` : ''}`}
    >
      {/* Cart glyph — outline style matches the design vocabulary */}
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-transform group-hover:-translate-y-px"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>

      {/* Item count badge — only shows when cart has items */}
      {showBadge && (
        <span
          className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-cobalt text-white text-[10px] font-black tracking-tight flex items-center justify-center shadow-sm ring-2 ring-white"
          aria-hidden="true"
        >
          {itemCount > 9 ? '9+' : itemCount}
        </span>
      )}

      {/* "Cart" label — hidden on the tightest viewports to save space */}
      <span className="hidden sm:inline text-sm font-semibold">Cart</span>
    </Link>
  );
}
