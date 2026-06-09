'use client';

import { useCart } from '@/lib/cart';
import { stackToCartLine, type StackResolved } from '@/lib/catalog-meta';
import { money } from '@/lib/product-types';

/**
 * Hero "Add stack to cart" button on the stack PDP.
 *
 * Renders the full cobalt gradient CTA + savings line. Adds the stack
 * as a single line item with the discounted price + components metadata,
 * then opens the cart drawer for confirmation.
 */
export function StackAddButton({ stack }: { stack: StackResolved }) {
  const add = useCart((s) => s.add);
  const openDrawer = useCart((s) => s.openDrawer);

  return (
    <button
      type="button"
      onClick={() => {
        add(stackToCartLine(stack), 1);
        openDrawer();
      }}
      className="w-full text-white py-4 rounded-xl text-base font-bold shadow-lg hover:opacity-95 transition relative overflow-hidden flex items-center justify-center gap-2"
      style={{
        background:
          'linear-gradient(135deg, #2E4DDB 0%, #5078FF 50%, #2E4DDB 100%)',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
      Add stack · {money(stack.discountedCents)}
    </button>
  );
}
