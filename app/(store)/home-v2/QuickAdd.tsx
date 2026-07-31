'use client';

import { useState } from 'react';
import { useCart } from '@/lib/cart';

/**
 * Homepage quick-add — a REAL add-to-cart, not a disguised PDP link.
 * Adds the product's Single bundle and opens the cart drawer so the
 * shopper is one click from checkout without ever leaving the page.
 */
export function QuickAdd({
  handle,
  title,
  bundleLabel,
  unitCents,
  imageUrl,
}: {
  handle: string;
  title: string;
  bundleLabel: string;
  unitCents: number;
  imageUrl?: string;
}) {
  const add = useCart((s) => s.add);
  const openDrawer = useCart((s) => s.openDrawer);
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        add({ handle, title, bundleLabel, unitCents, imageUrl }, 1);
        setAdded(true);
        openDrawer();
        setTimeout(() => setAdded(false), 2000);
      }}
      className={`mt-3 w-full rounded-full py-2 text-center text-[13px] font-bold transition ${
        added
          ? 'bg-success text-white'
          : 'bg-cobalt/10 text-cobalt hover:bg-cobalt hover:text-white'
      }`}
    >
      {added ? 'Added ✓' : 'Add to cart'}
    </button>
  );
}
