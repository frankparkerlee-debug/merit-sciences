'use client';

import { useCart } from '@/lib/cart';
import { money } from '@/lib/product-types';
import Link from 'next/link';

export default function CartPage() {
  const { lines, remove, totalCents } = useCart();

  return (
    <section className="max-w-container mx-auto px-8 py-16">
      <p className="eyebrow text-cobalt mb-3">— YOUR CART</p>
      <h1 className="font-display text-4xl font-extrabold tracking-tighter mb-10">
        Cart ({lines.length})
      </h1>

      {lines.length === 0 ? (
        <div className="border border-border-soft rounded-lg p-12 text-center">
          <p className="text-ink-soft mb-6">Your cart is empty.</p>
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 bg-ink text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-steel transition"
          >
            Browse catalog →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-10">
          <div className="space-y-3">
            {lines.map((line) => (
              <div
                key={`${line.handle}-${line.bundleLabel}`}
                className="flex items-center gap-4 p-4 border border-border-soft rounded-lg"
              >
                <div className="w-16 h-16 rounded bg-gradient-to-br from-white to-cream border border-border-soft flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-display font-semibold text-sm">{line.title}</p>
                  <p className="text-xs text-ink-muted mt-0.5">{line.bundleLabel}</p>
                </div>
                <p className="font-display font-semibold text-sm">
                  {money(line.unitCents * line.qty)}
                </p>
                <button
                  onClick={() => remove(line.handle, line.bundleLabel)}
                  className="text-xs text-ink-muted hover:text-ink"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <aside className="border border-border-soft rounded-lg p-6 h-fit">
            <h2 className="font-display text-lg font-bold mb-4">Order summary</h2>
            <div className="flex justify-between text-sm py-2 border-b border-border-soft">
              <span className="text-ink-soft">Subtotal</span>
              <span className="font-semibold">{money(totalCents())}</span>
            </div>
            <div className="flex justify-between text-sm py-2 border-b border-border-soft">
              <span className="text-ink-soft">Shipping</span>
              <span className="font-semibold">{totalCents() >= 10000 ? 'Free' : '$9.99'}</span>
            </div>
            <div className="flex justify-between text-base py-3 mt-2 font-display font-bold">
              <span>Total</span>
              <span>{money(totalCents() + (totalCents() >= 10000 ? 0 : 999))}</span>
            </div>
            <Link
              href="/checkout"
              className="block text-center bg-ink text-white py-3.5 rounded-lg text-sm font-semibold mt-4 hover:bg-steel transition"
            >
              Checkout →
            </Link>
          </aside>
        </div>
      )}
    </section>
  );
}
