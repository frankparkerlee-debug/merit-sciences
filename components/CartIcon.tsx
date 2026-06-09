'use client';

import { useEffect, useState } from 'react';
import { useCart } from '@/lib/cart';

/**
 * Cart trigger button.
 *
 * Lives in the global Nav. Tapping it opens the slide-in CartDrawer
 * (mounted globally in layout.tsx). Shows an item-count badge once
 * the cart has anything in it.
 *
 * Why this is a client component: the cart state lives in a Zustand
 * store hydrated from localStorage, which only exists after mount.
 * We gate the badge on `mounted` to prevent SSR/CSR count drift
 * (server renders 0, client could render N — React would warn).
 */
export function CartIcon() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const itemCount = useCart((s) =>
    s.lines.reduce((sum, l) => sum + l.qty, 0),
  );
  const openDrawer = useCart((s) => s.openDrawer);

  // Avoid SSR/CSR drift — only show the badge once we know client state.
  const showBadge = mounted && itemCount > 0;

  return (
    <button
      type="button"
      onClick={openDrawer}
      className="relative inline-flex items-center gap-2 text-ink hover:text-cobalt transition group"
      aria-label={`Open cart${showBadge ? ` — ${itemCount} item${itemCount === 1 ? '' : 's'}` : ''}`}
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

      {/* Item count badge */}
      {showBadge && (
        <span
          className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-cobalt text-white text-[10px] font-black tracking-tight flex items-center justify-center shadow-sm ring-2 ring-white"
          aria-hidden="true"
        >
          {itemCount > 9 ? '9+' : itemCount}
        </span>
      )}

      <span className="hidden sm:inline text-sm font-semibold">Cart</span>
    </button>
  );
}
