'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { useCart } from '@/lib/cart';
import { money } from '@/lib/product-types';

/**
 * Cart slide-in panel.
 *
 * Mounted globally via layout.tsx. Driven by the cart store's
 * `isDrawerOpen` flag — callers explicitly choose to open it (e.g. on
 * bulk-add completion, or when the buyer taps the cart icon). Single-
 * card adds don't auto-open; they fire a toast instead.
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

      {/* Panel — cream wash, generous internal whitespace, branded header */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-[440px] bg-cream shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* ── Header — cobalt accent bar + Merit wordmark + count ─── */}
        <header className="relative bg-white border-b border-cobalt/10">
          {/* Thin cobalt strip across the top */}
          <div className="h-1 bg-gradient-to-r from-cobalt via-[#5078FF] to-cobalt" />
          <div className="flex items-center justify-between px-5 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <div>
                <p className="font-display text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold">
                  Merit<span className="text-ink">.</span>
                </p>
                <h2 className="font-display text-xl font-black tracking-tight text-ink leading-none mt-0.5">
                  Your cart
                </h2>
              </div>
              {itemCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-cobalt text-white text-[11px] font-black tracking-tight">
                  {itemCount}
                </span>
              )}
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
          </div>
        </header>

        {/* ── Free-ship progress ─────────────────────────────────── */}
        {lines.length > 0 && (
          <div className="px-5 sm:px-6 py-3 bg-white border-b border-cobalt/10">
            {qualifiesForFreeShip ? (
              <div className="flex items-center gap-2 text-[12px] font-bold text-cobalt">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cobalt text-white">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                Free shipping unlocked
              </div>
            ) : (
              <>
                <p className="text-[12px] text-ink-soft mb-1.5">
                  Add <span className="font-bold text-cobalt">{money(remainingToFreeShip)}</span> for free shipping
                </p>
                <div className="h-1.5 bg-cobalt/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (subtotalCents / FREE_SHIP_THRESHOLD_CENTS) * 100)}%`,
                      background: 'linear-gradient(90deg, #2E4DDB 0%, #5078FF 100%)',
                    }}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Body ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
          {lines.length === 0 ? (
            <EmptyState onClose={closeDrawer} />
          ) : (
            <ul className="space-y-3">
              {lines.map((line) => (
                <CartLineRow
                  key={`${line.handle}-${line.bundleLabel}`}
                  line={line}
                  onSetQty={(q) => setQty(line.handle, line.bundleLabel, q)}
                  onRemove={() => remove(line.handle, line.bundleLabel)}
                />
              ))}
            </ul>
          )}
        </div>

        {/* ── Footer — totals + Checkout (only when items present) ── */}
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

            {/* Trust strip — Merit-y sub-footer */}
            <div className="mt-4 pt-3 border-t border-cobalt/10 flex items-center justify-center gap-3 text-[10px] tracking-[0.14em] uppercase font-bold text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-cobalt" />
                Lot-documented
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-cobalt" />
                48hr dispatch
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-cobalt" />
                503B · ISO
              </span>
            </div>
          </footer>
        )}
      </aside>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────

function EmptyState({ onClose }: { onClose: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center py-10">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-5 text-cobalt border-2 border-dashed border-cobalt/30"
        style={{
          background:
            'radial-gradient(circle, rgba(46,77,219,0.06) 0%, transparent 70%)',
        }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      </div>
      <p className="font-display text-xl font-extrabold text-ink mb-1.5">
        Cart is empty<span className="text-cobalt">.</span>
      </p>
      <p className="text-[13px] text-ink-soft mb-6 max-w-[280px] leading-relaxed">
        Pick a research compound from the catalog. Every batch HPLC-verified,
        every shipment lot-documented.
      </p>
      <Link
        href="/catalog"
        onClick={onClose}
        className="inline-flex items-center gap-2 text-white px-5 py-3 rounded-xl text-sm font-bold transition hover:opacity-95"
        style={{
          background:
            'linear-gradient(135deg, #2E4DDB 0%, #5078FF 50%, #2E4DDB 100%)',
        }}
      >
        Browse catalog →
      </Link>
    </div>
  );
}

function CartLineRow({
  line,
  onSetQty,
  onRemove,
}: {
  line: import('@/lib/cart').CartLine;
  onSetQty: (qty: number) => void;
  onRemove: () => void;
}) {
  const isStack = line.handle.startsWith('stack:');
  const extraComponents =
    isStack && line.components ? Math.max(0, line.components.length - 1) : 0;

  return (
    <li className="flex gap-3 p-3 border border-cobalt/8 rounded-xl bg-white hover:border-cobalt/25 transition-colors">
      {/* Thumbnail — uses the real product image when present.
          For stacks: shows the first component's image with a "+N" overlay
          so the multi-compound nature is visible at a glance. */}
      <div className="relative w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-lg bg-gradient-to-br from-cream to-white border border-cobalt/10 flex-shrink-0 overflow-hidden">
        {line.imageUrl ? (
          <Image
            src={line.imageUrl}
            alt={line.title}
            fill
            sizes="80px"
            className="object-contain p-1.5"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-cobalt/40">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 2h6v3h-1v3l3.5 8a3 3 0 0 1-2.8 4.1H7.3A3 3 0 0 1 4.5 16L8 8V5H7V2z" />
            </svg>
          </div>
        )}
        {isStack && extraComponents > 0 && (
          <span className="absolute bottom-0.5 right-0.5 px-1.5 py-0.5 rounded-md bg-cobalt text-white text-[9px] font-black leading-none shadow-sm">
            +{extraComponents}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {isStack && (
              <p className="text-[9px] tracking-[0.18em] uppercase text-cobalt font-bold mb-0.5">
                Stack · {(line.components?.length ?? 0)} compounds
              </p>
            )}
            <p className="font-display text-sm font-extrabold text-ink leading-tight truncate">
              {line.title}
            </p>
          </div>
          <p className="font-display text-sm font-black text-ink whitespace-nowrap">
            {money(line.unitCents * line.qty)}
          </p>
        </div>
        <p className="text-[11px] text-ink-soft mt-0.5 line-clamp-1">
          {line.bundleLabel}
        </p>

        {/* Qty + Remove */}
        <div className="flex items-center justify-between mt-2">
          <div className="inline-flex items-center border border-cobalt/15 rounded-full overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => onSetQty(line.qty - 1)}
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
              onClick={() => onSetQty(line.qty + 1)}
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
            onClick={onRemove}
            className="text-[11px] text-ink-muted hover:text-ink underline-offset-2 hover:underline"
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}
