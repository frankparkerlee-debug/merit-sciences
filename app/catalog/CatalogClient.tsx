'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/product-types';
import { money } from '@/lib/product-types';
import { useCart } from '@/lib/cart';
import type { Family, StackTemplate } from './page';

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

type Restock = { status: 'fresh' | 'low' | 'restocking'; message: string };

type EnrichedProduct = {
  product: Product;
  family: Family;
  pharmacistNote: string | null;
  restock: Restock | null;
};

type StackResolved = StackTemplate & {
  items: Product[];
  sumCents: number;
  discountedCents: number;
  savedCents: number;
};

type Props = {
  products: EnrichedProduct[];
  stacks: StackResolved[];
  accessories: Product[];
  totalCount: number;
};

// ─────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────

const FAMILY_PILLS: { id: Family | 'all'; label: string }[] = [
  { id: 'all',           label: 'All compounds' },
  { id: 'peptides',      label: 'Peptides' },
  { id: 'glp1',          label: 'GLP-1' },
  { id: 'cofactors',     label: 'Cofactors' },
  { id: 'neuropeptides', label: 'Neuropeptides' },
  { id: 'blends',        label: 'Blends' },
];

type SortOption = 'featured' | 'price-low' | 'price-high' | 'name';

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'featured',   label: 'Most-stocked' },
  { id: 'price-low',  label: 'Price: low to high' },
  { id: 'price-high', label: 'Price: high to low' },
  { id: 'name',       label: 'Name: A to Z' },
];

const ACCENT_COLORS = {
  cobalt:  { bg: 'rgba(46,77,219,0.10)',  text: '#2E4DDB', border: 'rgba(46,77,219,0.30)' },
  amber:   { bg: 'rgba(181,143,74,0.12)', text: '#B58F4A', border: 'rgba(181,143,74,0.30)' },
  violet:  { bg: 'rgba(107,91,192,0.12)', text: '#6B5BC0', border: 'rgba(107,91,192,0.30)' },
  emerald: { bg: 'rgba(74,139,110,0.12)', text: '#4A8B6E', border: 'rgba(74,139,110,0.30)' },
} as const;

const MAX_COMPARE = 3;

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

function subscribePrice(p: Product): number {
  // Subscribe price = look for a bundle labeled 'subscribe', fall back to 10% off single
  const sub = p.bundles?.find((b) =>
    b.label.toLowerCase().includes('subscribe'),
  );
  if (sub && sub.vials > 0) return Math.round(sub.priceCents / sub.vials);
  return Math.round(p.priceCents * 0.9);
}

function familyLabel(f: Family): string {
  const pill = FAMILY_PILLS.find((p) => p.id === f);
  return pill?.label ?? f;
}

// ─────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────

export function CatalogClient({ products, stacks, accessories, totalCount }: Props) {
  const [selectedFamily, setSelectedFamily] = useState<Family | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [subscribeMode, setSubscribeMode] = useState(false);
  const [compareList, setCompareList] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [quickViewHandle, setQuickViewHandle] = useState<string | null>(null);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  // Brief confirmation flash after bulk-add. Auto-clears after 2s.
  const [addedFlash, setAddedFlash] = useState<{ count: number; cents: number } | null>(null);

  const addToCart = useCart((s) => s.add);

  // Lock body scroll when modal/drawer is open
  useEffect(() => {
    const shouldLock = quickViewHandle !== null || compareOpen;
    if (shouldLock) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [quickViewHandle, compareOpen]);

  const filtered = useMemo(() => {
    if (selectedFamily === 'all') return products;
    return products.filter((ep) => ep.family === selectedFamily);
  }, [products, selectedFamily]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortBy) {
      case 'price-low':
        arr.sort((a, b) => a.product.priceCents - b.product.priceCents);
        break;
      case 'price-high':
        arr.sort((a, b) => b.product.priceCents - a.product.priceCents);
        break;
      case 'name':
        arr.sort((a, b) => a.product.title.localeCompare(b.product.title));
        break;
      case 'featured':
      default:
        // Featured order preserves the original (server-side) order
        break;
    }
    return arr;
  }, [filtered, sortBy]);

  const quickViewProduct = quickViewHandle
    ? products.find((p) => p.product.handle === quickViewHandle)?.product
    : null;

  const comparedProducts = compareList
    .map((h) => products.find((p) => p.product.handle === h))
    .filter(Boolean) as EnrichedProduct[];

  function toggleCompare(handle: string) {
    setCompareList((curr) => {
      if (curr.includes(handle)) return curr.filter((h) => h !== handle);
      if (curr.length >= MAX_COMPARE) return curr;
      return [...curr, handle];
    });
  }

  // Bulk add: drops every checked product into the cart at its Single
  // bundle (or subscribe-bundle pricing if Subscribe toggle is on),
  // qty 1 each. Clears the selection + closes the compare drawer.
  function handleAddAllToCart() {
    if (comparedProducts.length === 0) return;
    let totalCents = 0;
    comparedProducts.forEach(({ product }) => {
      const bundle = subscribeMode
        ? product.bundles?.find((b) => b.label.toLowerCase().includes('subscribe'))
          ?? product.bundles?.[0]
          ?? { label: 'Single', vials: 1, priceCents: product.priceCents }
        : product.bundles?.[0]
          ?? { label: 'Single', vials: 1, priceCents: product.priceCents };
      const unitCents = subscribeMode && bundle.vials > 0
        ? Math.round(bundle.priceCents / bundle.vials)
        : bundle.priceCents;
      addToCart(
        {
          handle: product.handle,
          title: product.title,
          bundleLabel: subscribeMode ? `Subscribe · ${bundle.label}` : bundle.label,
          unitCents,
        },
        1,
      );
      totalCents += unitCents;
    });
    setAddedFlash({ count: comparedProducts.length, cents: totalCents });
    setCompareList([]);
    setCompareOpen(false);
  }

  // Auto-clear the added-to-cart confirmation flash after 2.5s.
  useEffect(() => {
    if (!addedFlash) return;
    const t = setTimeout(() => setAddedFlash(null), 2500);
    return () => clearTimeout(t);
  }, [addedFlash]);

  return (
    <main className="bg-cream min-h-screen">
      {/* ═══════════════ PAGE HEADER ═══════════════
          Compact on mobile (eyebrow + h1 + 1-line tagline = ~110px)
          so the filter row + first product land above the fold. */}
      <div className="px-6 lg:px-12 pt-6 sm:pt-12 lg:pt-16 pb-4 sm:pb-8 lg:pb-10 max-w-[1400px] mx-auto">
        <p className="text-[10px] sm:text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2 sm:mb-4">
          — The Catalog
        </p>
        <h1
          className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95]"
          style={{ fontSize: 'clamp(28px, 6vw, 88px)' }}
        >
          {totalCount} compounds<span className="text-cobalt">.</span>
        </h1>
        {/* Tagline: hidden on mobile to reclaim ~80px. */}
        <p className="hidden sm:block mt-5 text-base lg:text-lg text-ink-soft max-w-xl leading-relaxed">
          Organized by chemistry, not promise. Every batch pharmacy-verified,
          every shipment lot-documented. Pick a family to narrow it down.
        </p>
      </div>

      {/* ═══════════════ STICKY FILTER STRIP ═══════════════ */}
      <div className="sticky top-0 z-20 bg-cream/95 backdrop-blur-sm border-y border-cobalt/10">
        <div className="px-6 lg:px-12 py-4 max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-3 lg:gap-4">
          {/* Family pills (left) */}
          <div className="flex flex-wrap items-center gap-2">
            {FAMILY_PILLS.map((pill) => {
              const isActive = selectedFamily === pill.id;
              const count =
                pill.id === 'all'
                  ? products.length
                  : products.filter((p) => p.family === pill.id).length;
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setSelectedFamily(pill.id)}
                  className={`inline-flex items-center gap-1.5 px-3 lg:px-3.5 py-1.5 lg:py-2 rounded-full text-[11px] lg:text-[12px] tracking-[0.05em] font-semibold transition ${
                    isActive
                      ? 'bg-ink text-white border-ink'
                      : 'bg-white text-ink border border-cobalt/15 hover:border-cobalt/40'
                  }`}
                >
                  {pill.label}
                  <span className={`text-[10px] ${isActive ? 'text-white/60' : 'text-ink-muted'}`}>
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Sort + subscribe toggle (right) */}
          <div className="flex items-center gap-3 lg:gap-4">
            {/* Subscribe toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[11px] tracking-[0.15em] uppercase text-ink-soft font-semibold">
                Subscribe pricing
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={subscribeMode}
                onClick={() => setSubscribeMode((v) => !v)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  subscribeMode ? 'bg-cobalt' : 'bg-ink-muted/30'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                    subscribeMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </label>

            {/* Sort dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSortMenuOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-cobalt/15 bg-white text-[11px] tracking-[0.05em] font-semibold text-ink hover:border-cobalt/40 transition"
              >
                Sort: {SORT_OPTIONS.find((s) => s.id === sortBy)?.label}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {sortMenuOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-cobalt/15 rounded-lg shadow-lg overflow-hidden z-30 min-w-[180px]">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setSortBy(opt.id);
                        setSortMenuOpen(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-[12px] font-medium transition ${
                        sortBy === opt.id ? 'bg-cobalt/10 text-cobalt' : 'text-ink hover:bg-cream'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════ MAIN GRID ═══════════════ */}
      <div className="px-6 lg:px-12 py-10 lg:py-14 max-w-[1400px] mx-auto">
        {/* Product grid with editorial breaks interspersed */}
        <ProductGridWithBreaks
          products={sorted}
          stacks={stacks}
          subscribeMode={subscribeMode}
          compareList={compareList}
          onToggleCompare={toggleCompare}
          onQuickView={setQuickViewHandle}
          showStacksAt={6}
          showSupportAt={12}
        />

        {/* Empty state */}
        {sorted.length === 0 && (
          <div className="text-center py-20">
            <p className="text-ink-soft text-base mb-4">No compounds in this family yet.</p>
            <button
              type="button"
              onClick={() => setSelectedFamily('all')}
              className="text-cobalt font-semibold text-sm hover:underline"
            >
              Show all {products.length} compounds →
            </button>
          </div>
        )}

        {/* Accessories section */}
        {accessories.length > 0 && (
          <div className="mt-20 lg:mt-24 pt-10 lg:pt-12 border-t border-cobalt/10">
            <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
              — Reconstitution
            </p>
            <h2 className="font-display text-2xl lg:text-3xl font-extrabold text-ink tracking-tight mb-6">
              Bacteriostatic water<span className="text-cobalt">.</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {accessories.map((p) => (
                <Link
                  key={p.handle}
                  href={`/products/${p.handle}`}
                  className="group block bg-white rounded-2xl overflow-hidden border border-cobalt/8 hover:border-cobalt/30 transition-colors"
                >
                  <div className="relative aspect-[5/3] bg-cream overflow-hidden">
                    {p.imageUrl && (
                      <Image
                        src={p.imageUrl}
                        alt={p.title}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-contain p-6 group-hover:scale-[1.04] transition-transform duration-500"
                      />
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-display text-base font-extrabold text-ink mb-1">{p.title}</h3>
                    <p className="text-sm text-ink-soft mb-3">{p.vialSize} · {p.format}</p>
                    <span className="font-display text-base font-bold text-ink">
                      {money(p.priceCents)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════ STICKY TRUST FOOTER ═══════════════
          Mobile: just the shipping line on one row (~36px tall).
          Desktop: shipping + Pharmacologist link, two columns. */}
      <div className="sticky bottom-0 z-10 bg-ink text-white border-t border-cobalt/30">
        <div className="px-6 lg:px-12 py-2 lg:py-3 max-w-[1400px] mx-auto flex items-center justify-between gap-3 text-[12px]">
          <p className="font-semibold flex items-center gap-2 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-cobalt" />
            Free Shipping Over $100
          </p>
          <Link
            href="mailto:rx@meritsciences.com"
            className="hidden sm:inline-block text-cobalt-soft hover:text-white font-semibold tracking-[0.15em] uppercase text-[10px] whitespace-nowrap"
          >
            Talk to a Pharmacologist →
          </Link>
        </div>
      </div>

      {/* ═══════════════ SELECTION FAB — two-action pill ═══════════════
          Floats above the sticky trust footer. Left section: count.
          Middle: primary cobalt "Add to cart". Right: outline "Compare".
          Both actions operate on the same checkbox selection set. */}
      {compareList.length > 0 && (
        <div
          className="fixed bottom-16 right-3 left-3 sm:left-auto lg:bottom-20 lg:right-12 z-30 flex items-stretch bg-ink text-white rounded-full shadow-2xl overflow-hidden border border-white/10"
        >
          {/* Count badge */}
          <div className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3 border-r border-white/10 whitespace-nowrap">
            <span className="font-display text-base sm:text-lg font-black leading-none">
              {compareList.length}
            </span>
            <span className="text-[10px] sm:text-[11px] uppercase tracking-[0.14em] text-white/70 font-bold leading-tight">
              selected
            </span>
          </div>

          {/* Add to cart — primary action */}
          <button
            type="button"
            onClick={handleAddAllToCart}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 bg-cobalt hover:bg-cobalt/85 transition font-bold text-[12px] sm:text-sm whitespace-nowrap"
            aria-label={`Add ${compareList.length} selected to cart`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            Add to cart
          </button>

          {/* Compare — secondary action */}
          <button
            type="button"
            onClick={() => setCompareOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-white/8 transition font-bold text-[12px] sm:text-sm border-l border-white/10 whitespace-nowrap"
            aria-label={`Compare ${compareList.length} selected`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <line x1="14" y1="17.5" x2="21" y2="17.5" strokeLinecap="round" />
              <line x1="17.5" y1="14" x2="17.5" y2="21" strokeLinecap="round" />
            </svg>
            Compare
            <span className="hidden sm:inline text-white/60 font-semibold">
              {compareList.length}/{MAX_COMPARE}
            </span>
          </button>
        </div>
      )}

      {/* ═══════════════ ADDED-TO-CART TOAST ═══════════════
          Floats top-center for ~2.5s after a bulk add. Cobalt for
          on-brand confirmation; auto-dismisses via the effect above. */}
      {addedFlash && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-40 bg-cobalt text-white px-5 py-3 rounded-full shadow-2xl font-bold text-sm flex items-center gap-2 animate-[slideDown_0.25s_ease-out]"
          role="status"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {addedFlash.count} added to cart · {money(addedFlash.cents)}
          <Link
            href="/cart"
            className="ml-2 text-[11px] tracking-[0.14em] uppercase font-bold text-white/85 hover:text-white underline-offset-2 hover:underline"
          >
            View cart →
          </Link>
        </div>
      )}

      {/* ═══════════════ COMPARE DRAWER ═══════════════ */}
      {compareOpen && (
        <CompareDrawer
          products={comparedProducts}
          onClose={() => setCompareOpen(false)}
          onClear={() => {
            setCompareList([]);
            setCompareOpen(false);
          }}
          onRemove={(handle) => toggleCompare(handle)}
          onAddAll={handleAddAllToCart}
          subscribeMode={subscribeMode}
        />
      )}

      {/* ═══════════════ QUICK VIEW MODAL ═══════════════ */}
      {quickViewProduct && (
        <QuickViewModal
          product={quickViewProduct}
          onClose={() => setQuickViewHandle(null)}
          subscribeMode={subscribeMode}
        />
      )}
    </main>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Sub-components
// ═════════════════════════════════════════════════════════════════════════

function ProductGridWithBreaks({
  products,
  stacks,
  subscribeMode,
  compareList,
  onToggleCompare,
  onQuickView,
  showStacksAt,
  showSupportAt,
}: {
  products: EnrichedProduct[];
  stacks: StackResolved[];
  subscribeMode: boolean;
  compareList: string[];
  onToggleCompare: (handle: string) => void;
  onQuickView: (handle: string) => void;
  showStacksAt: number;
  showSupportAt: number;
}) {
  // Render products with editorial breaks injected at strategic positions
  const sections: Array<
    | { type: 'product'; data: EnrichedProduct }
    | { type: 'stacks'; data: StackResolved[] }
    | { type: 'support' }
  > = [];

  products.forEach((p, i) => {
    sections.push({ type: 'product', data: p });
    if (i === showStacksAt - 1) sections.push({ type: 'stacks', data: stacks });
    if (i === showSupportAt - 1) sections.push({ type: 'support' });
  });

  return (
    // 2-up on mobile, 3-up on desktop. 1-up read as oversized for browsing —
    // 2-up doubles the products-per-fold and feels more intentional.
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 lg:gap-6">
      {sections.map((section, idx) => {
        if (section.type === 'product') {
          return (
            <ProductCard
              key={`p-${section.data.product.handle}`}
              enriched={section.data}
              subscribeMode={subscribeMode}
              inCompare={compareList.includes(section.data.product.handle)}
              onToggleCompare={onToggleCompare}
              onQuickView={onQuickView}
            />
          );
        }
        if (section.type === 'stacks') {
          return (
            <StacksBreak
              key={`stacks-${idx}`}
              stacks={section.data}
              subscribeMode={subscribeMode}
            />
          );
        }
        if (section.type === 'support') {
          return <SupportBreak key={`support-${idx}`} />;
        }
        return null;
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ProductCard
// ─────────────────────────────────────────────────────────────────────────

function ProductCard({
  enriched,
  subscribeMode,
  inCompare,
  onToggleCompare,
  onQuickView,
}: {
  enriched: EnrichedProduct;
  subscribeMode: boolean;
  inCompare: boolean;
  onToggleCompare: (handle: string) => void;
  onQuickView: (handle: string) => void;
}) {
  const { product: p, family, pharmacistNote, restock } = enriched;
  const displayPrice = subscribeMode ? subscribePrice(p) : p.priceCents;

  return (
    <div className="group relative bg-white rounded-2xl border border-cobalt/8 hover:border-cobalt/30 transition-colors overflow-hidden flex flex-col">
      {/* Compare checkbox — top-left */}
      <label className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 cursor-pointer">
        <input
          type="checkbox"
          checked={inCompare}
          onChange={() => onToggleCompare(p.handle)}
          className="sr-only peer"
        />
        <span
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
            inCompare
              ? 'bg-cobalt border-cobalt'
              : 'bg-white/90 border-cobalt/30 group-hover:border-cobalt/60'
          }`}
        >
          {inCompare && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
      </label>

      {/* Restock signal — top-right */}
      {restock && (
        <span
          className={`absolute top-3 right-3 z-10 inline-flex items-center gap-1 text-[9px] font-bold tracking-[0.12em] uppercase px-2 py-1 rounded ${
            restock.status === 'fresh'
              ? 'bg-green-500/10 text-green-700 border border-green-500/30'
              : restock.status === 'low'
              ? 'bg-amber-500/10 text-amber-700 border border-amber-500/30'
              : 'bg-cobalt/10 text-cobalt border border-cobalt/30'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              restock.status === 'fresh' ? 'bg-green-600' : restock.status === 'low' ? 'bg-amber-600' : 'bg-cobalt'
            }`}
          />
          {restock.status === 'fresh' ? 'New lot' : restock.status === 'low' ? 'Low stock' : 'Restocking'}
        </span>
      )}

      {/* Vial image — click → quick view */}
      <button
        type="button"
        onClick={() => onQuickView(p.handle)}
        className="relative aspect-square bg-gradient-to-br from-white to-[#EDE8DD]/40 overflow-hidden"
        aria-label={`Quick view ${p.title}`}
      >
        {p.imageUrl && (
          <Image
            src={p.imageUrl}
            alt={p.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
            className="object-contain p-5 sm:p-8 lg:p-10 group-hover:scale-[1.04] transition-transform duration-500"
          />
        )}
        {/* Hover hint — desktop only (touch users tap to quick-view) */}
        <span className="hidden sm:inline-flex absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-ink/90 text-white text-[10px] font-bold tracking-[0.16em] uppercase px-3 py-1 rounded-full whitespace-nowrap">
          Quick view
        </span>
      </button>

      {/* Card body — tighter padding/type at half-width mobile */}
      <div className="p-3.5 sm:p-5 lg:p-6 flex flex-col flex-1">
        {/* Family pill */}
        <span className="inline-block self-start text-[9px] font-bold tracking-[0.14em] sm:tracking-[0.16em] uppercase text-cobalt mb-2 sm:mb-3">
          {familyLabel(family)}
        </span>

        {/* Title + format */}
        <h3 className="font-display text-[15px] sm:text-lg lg:text-xl font-extrabold text-ink tracking-tight leading-tight mb-1">
          {p.title}
        </h3>
        <p className="text-[11px] sm:text-[12px] text-ink-soft mb-2 sm:mb-3">
          {p.vialSize} · {p.format}
        </p>

        {/* Lot data — the substance. Compacted on mobile to one short line. */}
        {p.lot.id !== 'TBD' && (
          <p className="text-[10.5px] sm:text-[11px] text-ink-soft mb-3 sm:mb-4 leading-snug">
            <span className="text-cobalt font-bold">Lot {p.lot.id}</span>
            {p.lot.purity && <> · <span className="hidden sm:inline">{p.lot.purity}</span></>}
            {p.lot.testedDate && (
              <span className="hidden sm:inline"> · Tested {p.lot.testedDate.slice(0, 10)}</span>
            )}
          </p>
        )}

        {/* Pharmacist's note — hidden on mobile (too dense at half-width) */}
        {pharmacistNote && (
          <div className="hidden sm:block mb-4 px-3 py-2 bg-cream/60 border-l-2 border-cobalt/40 rounded-r-md">
            <p className="text-[10.5px] tracking-[0.18em] uppercase text-cobalt font-bold mb-1">
              The pharmacist
            </p>
            <p className="text-[12px] text-ink-soft leading-snug italic">
              &ldquo;{pharmacistNote}&rdquo;
            </p>
          </div>
        )}

        {/* Restock message — desktop only at half-width mobile */}
        {restock && (
          <p className="hidden sm:block text-[11px] text-ink-soft mb-4">
            {restock.message}
          </p>
        )}

        {/* Pricing row — bottom. Stack on mobile so the price isn't crushed
            against the "Details →" link at half-width. */}
        <div className="mt-auto pt-3 sm:pt-4 border-t border-cobalt/10">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 sm:gap-0">
            <div>
              <span className="font-display text-base sm:text-xl lg:text-2xl font-bold text-ink">
                {money(displayPrice)}
              </span>
              {!subscribeMode && (
                <span className="hidden sm:inline text-[11px] text-ink-soft ml-2">
                  or {money(subscribePrice(p))} subscribe
                </span>
              )}
              {subscribeMode && (
                <span className="text-[10px] sm:text-[11px] text-ink-muted ml-2 line-through">
                  {money(p.priceCents)}
                </span>
              )}
            </div>
            <Link
              href={`/products/${p.handle}`}
              className="text-[9px] sm:text-[10px] uppercase tracking-[0.18em] sm:tracking-[0.22em] text-cobalt font-bold hover:text-ink transition"
            >
              Details →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Stacks editorial break — full-width row inside the grid
// ─────────────────────────────────────────────────────────────────────────

function StacksBreak({ stacks, subscribeMode }: { stacks: StackResolved[]; subscribeMode: boolean }) {
  return (
    <div className="col-span-2 lg:col-span-3 my-4 lg:my-6">
      <div className="bg-ink text-white rounded-2xl p-6 lg:p-8 overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt-soft font-bold mb-3">
              — Editorial Break
            </p>
            <h2 className="font-display text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              What researchers stack together<span className="text-cobalt">.</span>
            </h2>
          </div>
          <p className="text-[12px] text-white/60 max-w-xs leading-relaxed">
            Pre-built multi-compound combinations, one-click add to cart.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {stacks.map((stack) => {
            const accent = ACCENT_COLORS[stack.accentColor];
            return (
              <div
                key={stack.slug}
                className="bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:border-white/30 transition-colors flex flex-col"
              >
                <span
                  className="inline-block self-start text-[9px] font-bold tracking-[0.16em] uppercase mb-3 px-2 py-0.5 rounded"
                  style={{ background: accent.bg, color: accent.text, border: `1px solid ${accent.border}` }}
                >
                  Stack
                </span>
                <h3 className="font-display text-base font-extrabold text-white mb-1">{stack.name}</h3>
                <p className="text-[11px] text-white/60 mb-3">{stack.subtitle}</p>
                <p className="text-[11.5px] text-white/75 mb-4 leading-snug flex-1">{stack.description}</p>

                {/* Compounds list */}
                <div className="text-[11px] text-cobalt-soft mb-4">
                  {stack.items.map((p) => p.title).join(' + ')}
                </div>

                {/* Price + button */}
                <div className="flex items-baseline justify-between gap-2 pt-3 border-t border-white/10">
                  <div>
                    <p className="font-display text-lg font-bold text-white">
                      {money(stack.discountedCents)}
                    </p>
                    <p className="text-[10px] text-white/60 line-through">{money(stack.sumCents)}</p>
                  </div>
                  <button
                    type="button"
                    className="bg-cobalt text-white px-3 py-2 rounded-md text-[10px] font-bold tracking-[0.12em] uppercase hover:opacity-90 transition"
                  >
                    Add stack →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Support editorial break — "Talk to a pharmacist"
// ─────────────────────────────────────────────────────────────────────────

function SupportBreak() {
  return (
    <div className="col-span-2 lg:col-span-3 my-4 lg:my-6">
      <div className="bg-cobalt text-white rounded-2xl p-6 lg:p-8 flex flex-col lg:flex-row items-start lg:items-center gap-5">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white/15 border border-white/25 flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-[11px] tracking-[0.22em] uppercase text-white/80 font-bold mb-2">
            — Editorial Break
          </p>
          <h3 className="font-display text-xl lg:text-2xl font-extrabold mb-1">
            Talk to a Pharmacologist.
          </h3>
          <p className="text-[13px] text-white/85 leading-relaxed">
            Our team answers compound questions, lot questions, and
            research-protocol questions — same business day. No bots, no
            tickets, no script.
          </p>
        </div>
        <a
          href="mailto:rx@meritsciences.com"
          className="bg-white text-ink px-5 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition whitespace-nowrap"
        >
          Email the team →
        </a>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Quick View Modal
// ─────────────────────────────────────────────────────────────────────────

function QuickViewModal({
  product,
  onClose,
  subscribeMode,
}: {
  product: Product;
  onClose: () => void;
  subscribeMode: boolean;
}) {
  const [selectedBundleIdx, setSelectedBundleIdx] = useState(0);
  const bundles = product.bundles ?? [
    { label: 'Single', vials: 1, priceCents: product.priceCents },
  ];
  const selected = bundles[selectedBundleIdx];

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm flex items-center justify-center p-4 lg:p-8 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white border border-cobalt/20 flex items-center justify-center hover:border-cobalt/50 transition"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Image side — compact on mobile (~35vh) so the buybox fits
              alongside without forcing a scroll. Full square on desktop. */}
          <div className="relative aspect-[5/3] md:aspect-square max-h-[34vh] md:max-h-none bg-gradient-to-br from-white to-cream overflow-hidden">
            {product.imageUrl && (
              <Image
                src={product.imageUrl}
                alt={product.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain p-6 md:p-10"
              />
            )}
          </div>

          {/* Detail side */}
          <div className="p-5 md:p-8 flex flex-col">
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-1.5">
              {product.eyebrow.split('·')[0].trim()}
            </p>
            <h2 className="font-display text-xl md:text-3xl font-black text-ink tracking-tight mb-1">
              {product.title}
            </h2>
            <p className="text-[12px] md:text-sm text-ink-soft mb-4 md:mb-5">
              {product.vialSize} · {product.format}
            </p>

            {/* Lot strip */}
            {product.lot.id !== 'TBD' && (
              <div className="bg-cream/60 border-l-2 border-cobalt rounded-r-md p-3 mb-5">
                <p className="text-[10px] tracking-[0.18em] uppercase text-cobalt font-bold mb-1">
                  Current shipping lot
                </p>
                <p className="text-sm text-ink font-semibold">
                  Lot {product.lot.id} · {product.lot.purity}
                </p>
                {product.lot.testedDate && (
                  <p className="text-[11px] text-ink-soft mt-0.5">
                    Tested {product.lot.testedDate.slice(0, 10)}
                  </p>
                )}
              </div>
            )}

            {/* Bundle picker */}
            <p className="text-[10px] tracking-[0.22em] uppercase text-ink-soft font-bold mb-2">
              Choose pack size
            </p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {bundles.map((b, i) => (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => setSelectedBundleIdx(i)}
                  className={`text-left rounded-lg p-2.5 border transition ${
                    selectedBundleIdx === i
                      ? 'border-ink bg-cream/40'
                      : 'border-cobalt/15 hover:border-cobalt/40'
                  }`}
                >
                  <p className="text-[11px] font-bold text-ink">{b.label}</p>
                  <p className="font-display text-sm font-bold text-ink">
                    {money(b.priceCents)}
                  </p>
                </button>
              ))}
            </div>

            {/* Add to cart + link */}
            <button
              type="button"
              className="w-full bg-cobalt text-white py-3 rounded-lg font-bold text-sm hover:opacity-90 transition mb-3"
            >
              Add to cart · {money(selected.priceCents)}
            </button>
            <Link
              href={`/products/${product.handle}`}
              className="text-center text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold hover:text-ink transition"
            >
              See full details →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Compare Drawer
// ─────────────────────────────────────────────────────────────────────────

function CompareDrawer({
  products,
  onClose,
  onClear,
  onRemove,
  onAddAll,
  subscribeMode,
}: {
  products: EnrichedProduct[];
  onClose: () => void;
  onClear: () => void;
  onRemove: (handle: string) => void;
  onAddAll: () => void;
  subscribeMode: boolean;
}) {
  if (products.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-ink/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
          <p className="text-ink-soft mb-4">No compounds selected for compare.</p>
          <button type="button" onClick={onClose} className="bg-ink text-white px-5 py-2.5 rounded-lg font-bold text-sm">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm flex items-end lg:items-stretch justify-end"
      onClick={onClose}
    >
      <div
        className="bg-white w-full lg:w-[720px] max-h-[90vh] lg:max-h-full overflow-y-auto rounded-t-2xl lg:rounded-none lg:rounded-l-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-cobalt/10 p-5 lg:p-6 flex items-center justify-between z-10">
          <div>
            <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-1">
              — Compare
            </p>
            <h2 className="font-display text-xl font-extrabold text-ink">
              {products.length} compounds, side by side
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-cobalt/20 flex items-center justify-center hover:border-cobalt/50 transition"
            aria-label="Close compare drawer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Comparison grid */}
        <div className="p-5 lg:p-6">
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${products.length}, minmax(0, 1fr))` }}
          >
            {/* Image row */}
            {products.map((ep) => (
              <div key={`img-${ep.product.handle}`} className="relative aspect-square bg-cream rounded-lg overflow-hidden">
                {ep.product.imageUrl && (
                  <Image
                    src={ep.product.imageUrl}
                    alt={ep.product.title}
                    fill
                    sizes="33vw"
                    className="object-contain p-3"
                  />
                )}
                <button
                  type="button"
                  onClick={() => onRemove(ep.product.handle)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white border border-cobalt/30 flex items-center justify-center hover:bg-red-500 hover:border-red-500 hover:text-white transition"
                  aria-label="Remove from compare"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Spec rows */}
          <div className="mt-5 space-y-0">
            {[
              { label: 'Family', getter: (ep: EnrichedProduct) => familyLabel(ep.family) },
              { label: 'Vial size', getter: (ep: EnrichedProduct) => ep.product.vialSize },
              { label: 'Format', getter: (ep: EnrichedProduct) => ep.product.format },
              { label: 'Current lot', getter: (ep: EnrichedProduct) => ep.product.lot.id === 'TBD' ? '—' : `Lot ${ep.product.lot.id}` },
              { label: 'Purity', getter: (ep: EnrichedProduct) => ep.product.lot.purity || '—' },
              { label: 'Price', getter: (ep: EnrichedProduct) => money(subscribeMode ? subscribePrice(ep.product) : ep.product.priceCents) },
            ].map((row) => (
              <div key={row.label} className="grid gap-3 py-3 border-b border-cobalt/10" style={{ gridTemplateColumns: `repeat(${products.length}, minmax(0, 1fr))` }}>
                <div className="col-span-full mb-1">
                  <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold">
                    {row.label}
                  </p>
                </div>
                {products.map((ep) => (
                  <div key={`${row.label}-${ep.product.handle}`}>
                    <p className="text-sm text-ink font-semibold">
                      {ep.product === products[0].product && row.label === 'Family' ? '' : ''}
                      {row.getter(ep)}
                    </p>
                  </div>
                ))}
              </div>
            ))}

            {/* Titles row */}
            <div className="grid gap-3 pt-3" style={{ gridTemplateColumns: `repeat(${products.length}, minmax(0, 1fr))` }}>
              {products.map((ep) => (
                <Link
                  key={`title-${ep.product.handle}`}
                  href={`/products/${ep.product.handle}`}
                  className="text-center text-[11px] uppercase tracking-[0.18em] text-cobalt font-bold hover:text-ink transition"
                >
                  {ep.product.title} →
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Footer — Clear (left), Close (middle), Add all to cart (right primary) */}
        <div className="sticky bottom-0 bg-white border-t border-cobalt/10 p-4 lg:p-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] uppercase tracking-[0.18em] text-ink-soft font-bold hover:text-ink transition whitespace-nowrap"
          >
            Clear all
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg font-bold text-sm border border-cobalt/20 text-ink hover:bg-cream transition whitespace-nowrap"
            >
              Close
            </button>
            <button
              type="button"
              onClick={onAddAll}
              className="bg-cobalt text-white px-4 sm:px-5 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition whitespace-nowrap inline-flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
              Add all to cart
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
