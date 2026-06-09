'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useCart } from '@/lib/cart';
import { money } from '@/lib/product-types';

/**
 * Cart slide-in panel.
 *
 * Mounted globally via layout.tsx so any "Add to cart" anywhere on the
 * site (catalog cards, PDP buybox, quick view) auto-opens it via the
 * cart store's `isDrawerOpen` flag.
 *
 * The cart-store `add()` action sets `isDrawerOpen: true` after every
 * successful add, so this panel is the single canonical confirmation
 * surface — no separate toast needed.
 */
const FREE_SHIP_THRESHOLD_CENTS = 10_000; // $100
const FLAT_SHIPPING_CENTS = 999;          // $9.99 under threshold

export function CartDrawer() {
  const isOpen     = useCart((s) => s.isDrawerOpen);
  const lines      = useCart((s) => s.lines);
  const closeDrawer = useCart((s) => s.closeDrawer);
  const setQty     = useCart((s) => s.setQty);
  const remove     = useCart((s) => s.remove);

  const subtotalCents = lines.reduce((sum, l) => sum + l.unitCents * l.qty, 0);
  const itemCount     = lines.reduce((sum, l) => sum + l.qty, 0);

  const qualifiesForFreeShip = subtotalCents >= FREE_SHIP_THRESHOLD_CENTS;
  const remainingToFreeShip = Math.max(0, FREE_SHIP_THRESHOLD_CENTS - subtotalCents);
  const shippingCents = qualifiesForFreeShip ? 0 : (lines.length > 0 ? FLAT_SHIPPING_CENTS : 0);
  const grandTotalCents = subtotalCents + shippingCents;

  // Lock body scroll while open.
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  // ESC to close.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, closeDrawer]);

  return (
    <>
      {/* Backdrop — pointer-events off when closed so it doesn't trap clicks */}
      <div
        onClick={closeDrawer}
        aria-hidden={!isOpen}
        className={`fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[420px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* ── Header ────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-cobalt/10">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-xl font-black tracking-tight text-ink">
              Cart
            </h2>
            <span className="text-[12px] text-ink-soft font-semibold">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="w-9 h-9 rounded-full border border-cobalt/15 hover:border-cobalt/40 hover:bg-cream flex items-center justify-center transition"
            aria-label="Close cart"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        {/* ── Free-ship progress (only when items present) ─────────── */}
        {lines.length > 0 && (
          <div className="px-5 sm:px-6 py-3 bg-cream/60 border-b border-cobalt/10">
            {qualifiesForFreeShip ? (
              <p className="text-[12px] font-bold text-cobalt flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Free shipping unlocked
              </p>
            ) : (
              <>
                <p className="text-[12px] text-ink-soft mb-1.5">
                  <span className="font-bold text-cobalt">{money(remainingToFreeShip)}</span> from free shipping
                </p>
                <div className="h-1 bg-cobalt/15 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cobalt rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (subtotalCents / FREE_SHIP_THRESHOLD_CENTS) * 100)}%` }}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Body — line items or empty state ──────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
          {lines.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-10">
              <div className="w-16 h-16 rounded-full bg-cream flex items-center justify-center mb-5 text-ink-muted">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
              </div>
              <p className="font-display text-lg font-extrabold text-ink mb-1">
                Your cart is empty
              </p>
              <p className="text-[13px] text-ink-soft mb-6 max-w-[260px]">
                Browse the catalog to add research-grade peptides to your order.
              </p>
              <Link
                href="/catalog"
                onClick={closeDrawer}
                className="inline-flex items-center gap-2 bg-ink text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-steel transition"
              >
                Browse catalog →
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {lines.map((line) => (
                <li
                  key={`${line.handle}-${line.bundleLabel}`}
                  className="flex gap-3 p-3 border border-cobalt/10 rounded-xl bg-white"
                >
                  {/* Thumb */}
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-gradient-to-br from-cream to-white border border-cobalt/10 flex-shrink-0" />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-display text-sm font-extrabold text-ink leading-tight truncate">
                        {line.title}
                      </p>
                      <p className="font-display text-sm font-bold text-ink whitespace-nowrap">
                        {money(line.unitCents * line.qty)}
                      </p>
                    </div>
                    <p className="text-[11px] text-ink-soft mt-0.5 truncate">
                      {line.bundleLabel}
                    </p>

                    {/* Qty + Remove */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="inline-flex items-center border border-cobalt/15 rounded-full overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setQty(line.handle, line.bundleLabel, line.qty - 1)}
                          className="w-7 h-7 flex items-center justify-center text-ink hover:bg-cream transition"
                          aria-label="Decrease quantity"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </button>
                        <span className="w-7 text-center text-[12px] font-bold text-ink">
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(line.handle, line.bundleLabel, line.qty + 1)}
                          className="w-7 h-7 flex items-center justify-center text-ink hover:bg-cream transition"
                          aria-label="Increase quantity"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(line.handle, line.bundleLabel)}
                        className="text-[11px] text-ink-muted hover:text-ink underline-offset-2 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Footer — totals + Checkout (only when items present) ──── */}
        {lines.length > 0 && (
          <footer className="border-t border-cobalt/10 px-5 sm:px-6 py-4 bg-white">
            <dl className="space-y-1.5 mb-4">
              <div className="flex justify-between text-[13px] text-ink-soft">
                <dt>Subtotal</dt>
                <dd className="font-semibold text-ink">{money(subtotalCents)}</dd>
              </div>
              <div className="flex justify-between text-[13px] text-ink-soft">
                <dt>Shipping</dt>
                <dd className="font-semibold text-ink">
                  {shippingCents === 0 ? 'Free' : money(shippingCents)}
                </dd>
              </div>
              <div className="flex justify-between text-base pt-2 border-t border-cobalt/10 mt-2">
                <dt className="font-display font-bold text-ink">Total</dt>
                <dd className="font-display font-black text-ink">{money(grandTotalCents)}</dd>
              </div>
            </dl>

            <Link
              href="/checkout"
              onClick={closeDrawer}
              className="block text-center text-white py-3.5 rounded-xl text-base font-bold shadow-md hover:opacity-95 transition"
              style={{
                background:
                  'linear-gradient(135deg, #2E4DDB 0%, #5078FF 50%, #2E4DDB 100%)',
              }}
            >
              Checkout · {money(grandTotalCents)}
            </Link>

            <button
              type="button"
              onClick={closeDrawer}
              className="block w-full text-center text-[12px] tracking-[0.18em] uppercase text-ink-muted font-bold mt-3 hover:text-ink transition"
            >
              Continue shopping
            </button>
          </footer>
        )}
      </aside>
    </>
  );
}
