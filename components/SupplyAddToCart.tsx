'use client';

import { useState } from 'react';
import { useCart } from '@/lib/cart';

/**
 * Add-to-cart for supply products.
 *
 * The handle is stored with a `supply:` prefix — the same device the cart
 * already uses for stacks (`stack:`). It gives the server an unambiguous
 * signal about which table owns the line, so pricing resolves a collagen
 * dressing against supply_products and a compound against products, with no
 * chance of a handle collision deciding it.
 *
 * unitCents is sent for display continuity only. The server re-derives every
 * price from the database before charging — see lib/checkout-pricing.ts.
 */
export function SupplyAddToCart({
  handle,
  title,
  priceCents,
  unitsPerBox,
  imageUrl,
  compact = false,
}: {
  handle: string;
  title: string;
  priceCents: number;
  unitsPerBox: number | null;
  imageUrl: string | null;
  compact?: boolean;
}) {
  const add = useCart((s) => s.add);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    // qty is the SECOND argument — add() takes Omit<CartLine,'qty'> and merges
    // into an existing line of the same handle+bundleLabel rather than
    // duplicating it.
    add(
      {
        handle: `supply:${handle}`,
        title,
        bundleLabel: unitsPerBox && unitsPerBox > 1 ? `Box of ${unitsPerBox}` : 'Each',
        unitCents: priceCents,
        imageUrl: imageUrl ?? undefined,
      },
      qty,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  if (compact) {
    return (
      <button
        onClick={handleAdd}
        className="w-full rounded-lg bg-ink py-2 text-[12px] font-bold uppercase tracking-wider text-white transition hover:opacity-90"
      >
        {added ? 'Added ✓' : 'Add to cart'}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center rounded-lg border border-ink/15">
        <button
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          aria-label="Decrease quantity"
          className="px-3 py-2.5 text-lg leading-none text-ink-soft transition hover:text-ink"
        >
          −
        </button>
        <input
          type="number"
          min={1}
          max={999}
          value={qty}
          onChange={(e) => setQty(Math.min(999, Math.max(1, Number(e.target.value) || 1)))}
          className="w-14 border-x border-ink/15 py-2.5 text-center text-[15px] font-semibold text-ink focus:outline-none"
          aria-label="Quantity"
        />
        <button
          onClick={() => setQty((q) => Math.min(999, q + 1))}
          aria-label="Increase quantity"
          className="px-3 py-2.5 text-lg leading-none text-ink-soft transition hover:text-ink"
        >
          +
        </button>
      </div>

      <button
        onClick={handleAdd}
        className="flex-1 rounded-xl bg-ink px-6 py-3 text-[13px] font-bold uppercase tracking-wider text-white shadow-sm transition hover:opacity-90"
      >
        {added ? 'Added to cart ✓' : 'Add to cart'}
      </button>
    </div>
  );
}
