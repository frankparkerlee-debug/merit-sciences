'use client';

import { useCart } from '@/lib/cart';
import { stackToCartLine, type StackResolved } from '@/lib/catalog-meta';

/**
 * Client-side Add-to-cart button for the PDP "Pairs Well With" section.
 *
 * The PDP page itself is a server component (it imports server-only
 * catalog data). This island handles the click handler that touches
 * the Zustand cart store + opens the drawer.
 */
export function PdpStackAddButton({ stack }: { stack: StackResolved }) {
  const add        = useCart((s) => s.add);
  const openDrawer = useCart((s) => s.openDrawer);

  return (
    <button
      type="button"
      onClick={() => {
        add(stackToCartLine(stack), 1);
        openDrawer();
      }}
      className="bg-cobalt text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition inline-flex items-center gap-2"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      Add stack →
    </button>
  );
}
