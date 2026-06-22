'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/product-types';
import { money, productImage } from '@/lib/product-types';
import { useCart } from '@/lib/cart';
import { stackToCartLine } from '@/lib/catalog-meta';
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
  /** True when the signed-in user is an approved practitioner — used to
   *  surface a "practitioner pricing applied" banner above the grid. */
  isPractitionerPricing?: boolean;
};

// ─────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────

const FAMILY_PILLS: { id: Family | 'all'; label: string }[] = [
  { id: 'all',           label: 'All compounds' },
  { id: 'peptides',      label: 'Peptides' },
  { id: 'glp1',          label: 'GLPs' },
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

export function CatalogClient({ products, stacks, accessories, totalCount, isPractitionerPricing = false }: Props) {
  const [selectedFamily, setSelectedFamily] = useState<Family | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [subscribeMode, setSubscribeMode] = useState(false);
  const [quickViewHandle, setQuickViewHandle] = useState<string | null>(null);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  // Multi-select state — drives the bottom bulk-add FAB.
  const [selectedHandles, setSelectedHandles] = useState<string[]>([]);
  // Brief confirmation toast — single-card adds (drawer doesn't auto-open
  // anymore so the buyer needs *some* signal that the click registered).
  const [addedFlash, setAddedFlash] = useState<{ title: string; cents: number } | null>(null);

  const addToCart  = useCart((s) => s.add);
  const openDrawer = useCart((s) => s.openDrawer);

  // Lock body scroll only when the quick-view modal is open. The cart
  // drawer manages its own scroll lock via the cart store.
  useEffect(() => {
    if (quickViewHandle === null) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [quickViewHandle]);

  // Auto-clear the single-add toast after 2s.
  useEffect(() => {
    if (!addedFlash) return;
    const t = setTimeout(() => setAddedFlash(null), 2000);
    return () => clearTimeout(t);
  }, [addedFlash]);

  function toggleSelect(handle: string) {
    setSelectedHandles((curr) =>
      curr.includes(handle) ? curr.filter((h) => h !== handle) : [...curr, handle],
    );
  }

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

  // Pricing helper — picks bundle + per-unit cents based on Subscribe mode.
  function priceForProduct(product: Product) {
    const bundle = subscribeMode
      ? product.bundles?.find((b) => b.label.toLowerCase().includes('subscribe'))
        ?? product.bundles?.[0]
        ?? { label: 'Single', vials: 1, priceCents: product.priceCents }
      : product.bundles?.[0]
        ?? { label: 'Single', vials: 1, priceCents: product.priceCents };
    const unitCents = subscribeMode && bundle.vials > 0
      ? Math.round(bundle.priceCents / bundle.vials)
      : bundle.priceCents;
    return { bundle, unitCents };
  }

  // Add a single product line to the cart (no UI side-effect).
  function addProductToCart(product: Product) {
    const { bundle, unitCents } = priceForProduct(product);
    addToCart(
      {
        handle: product.handle,
        title: product.title,
        bundleLabel: subscribeMode ? `Subscribe · ${bundle.label}` : bundle.label,
        unitCents,
        imageUrl: product.imageUrl,
      },
      1,
    );
  }

  // Per-card add: drop it in and slide the (non-blocking) cart open so the
  // buyer sees it land — they can keep browsing without dismissing it.
  function handleAddToCart(product: Product) {
    addProductToCart(product);
    openDrawer();
  }

  // Buy it now: add + go straight to checkout. Anything already in the cart
  // comes along — checkout renders the full cart, not just this item.
  function handleBuyNow(product: Product) {
    addProductToCart(product);
    window.location.href = '/checkout';
  }

  // Bulk add — user explicitly chose to commit a multi-select batch.
  // Opens the drawer after submit so they see the result + can checkout.
  function handleAddSelected() {
    if (selectedHandles.length === 0) return;
    const selectedProducts = selectedHandles
      .map((h) => products.find((p) => p.product.handle === h)?.product)
      .filter(Boolean) as Product[];
    selectedProducts.forEach((product) => {
      const { bundle, unitCents } = priceForProduct(product);
      addToCart(
        {
          handle: product.handle,
          title: product.title,
          bundleLabel: subscribeMode ? `Subscribe · ${bundle.label}` : bundle.label,
          unitCents,
          imageUrl: product.imageUrl,
        },
        1,
      );
    });
    setSelectedHandles([]);
    openDrawer();
  }

  // Stack add — single line item per stack, discounted price preserved.
  // Used by StacksBreak in the catalog grid + by /stacks/[slug] PDP.
  function handleAddStack(stack: StackResolved) {
    const line = stackToCartLine(stack);
    addToCart(line, 1);
    setAddedFlash({ title: stack.name, cents: line.unitCents });
  }

  return (
    <main className="bg-cream min-h-screen">
      {/* ═══════════════ PRACTITIONER PRICING BANNER ═══════════════
          Only renders when an approved practitioner is signed in.
          Sits above the page header so it reads as account status,
          not a marketing pop-in. */}
      {isPractitionerPricing && (
        <div className="bg-ink text-white">
          <div className="px-6 lg:px-12 py-3 max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-3 text-[11px] tracking-[0.16em] uppercase font-bold">
            <span>
              <span style={{ color: '#7B96FF' }}>○</span> Practitioner pricing applied
            </span>
            <a
              href="/practitioners/portal"
              className="text-white/80 hover:text-white normal-case tracking-normal text-[12px] font-normal"
            >
              Account &rarr;
            </a>
          </div>
        </div>
      )}

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
      <div className="px-6 lg:px-12 py-6 lg:py-10 max-w-[1400px] mx-auto">
        {/* Product grid with editorial breaks interspersed */}
        <ProductGridWithBreaks
          products={sorted}
          stacks={stacks}
          subscribeMode={subscribeMode}
          selectedHandles={selectedHandles}
          onToggleSelect={toggleSelect}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          onAddStack={handleAddStack}
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
                    <Image
                      src={productImage(p.imageUrl)}
                      alt={p.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-contain p-6 group-hover:scale-[1.04] transition-transform duration-500"
                    />
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

      {/* ═══════════════ MULTI-SELECT FAB ═══════════════
          Single-action: "Add N to cart". The user chose to batch, so
          opening the drawer after submit is the appropriate confirmation. */}
      {selectedHandles.length > 0 && (
        <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 lg:bottom-6 lg:right-12 z-30 flex items-stretch bg-ink text-white rounded-2xl shadow-2xl overflow-hidden border border-white/10">
          <div className="flex items-center gap-2 px-4 py-3 border-r border-white/10 whitespace-nowrap">
            <span className="font-display text-lg font-black leading-none">
              {selectedHandles.length}
            </span>
            <span className="text-[11px] uppercase tracking-[0.14em] text-white/70 font-bold leading-tight">
              selected
            </span>
          </div>
          <button
            type="button"
            onClick={handleAddSelected}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-cobalt hover:bg-cobalt/85 transition font-bold text-sm whitespace-nowrap"
            aria-label={`Add ${selectedHandles.length} selected to cart`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            Add all to cart
          </button>
          <button
            type="button"
            onClick={() => setSelectedHandles([])}
            className="px-3 sm:px-4 py-3 hover:bg-white/8 transition font-bold text-[11px] tracking-[0.14em] uppercase text-white/70 hover:text-white border-l border-white/10"
            aria-label="Clear selection"
          >
            Clear
          </button>
        </div>
      )}

      {/* ═══════════════ ADD-TO-CART TOAST ═══════════════
          Brief confirmation for single-card adds. Drawer doesn't open
          on single add (user is still browsing), so the toast provides
          the otherwise-missing feedback signal. */}
      {addedFlash && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-40 bg-cobalt text-white px-5 py-3 rounded-full shadow-2xl font-bold text-sm flex items-center gap-2 max-w-[calc(100vw-2rem)]"
          role="status"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="flex-shrink-0">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span className="truncate">
            Added {addedFlash.title}
          </span>
          <button
            type="button"
            onClick={() => { setAddedFlash(null); openDrawer(); }}
            className="ml-1 text-[11px] tracking-[0.14em] uppercase font-bold text-white/85 hover:text-white underline-offset-2 hover:underline whitespace-nowrap"
          >
            View cart →
          </button>
        </div>
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
  selectedHandles,
  onToggleSelect,
  onAddToCart,
  onBuyNow,
  onAddStack,
  onQuickView,
  showStacksAt,
  showSupportAt,
}: {
  products: EnrichedProduct[];
  stacks: StackResolved[];
  subscribeMode: boolean;
  selectedHandles: string[];
  onToggleSelect: (handle: string) => void;
  onAddToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onAddStack: (stack: StackResolved) => void;
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
              isSelected={selectedHandles.includes(section.data.product.handle)}
              onToggleSelect={onToggleSelect}
              onAddToCart={onAddToCart}
              onBuyNow={onBuyNow}
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
              onAddStack={onAddStack}
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
  isSelected,
  onToggleSelect,
  onAddToCart,
  onBuyNow,
  onQuickView,
}: {
  enriched: EnrichedProduct;
  subscribeMode: boolean;
  isSelected: boolean;
  onToggleSelect: (handle: string) => void;
  onAddToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
  onQuickView: (handle: string) => void;
}) {
  const { product: p, family, restock } = enriched;
  const displayPrice = subscribeMode ? subscribePrice(p) : p.priceCents;

  return (
    <div
      className={`group relative bg-white rounded-2xl border transition-colors overflow-hidden flex flex-col ${
        isSelected ? 'border-cobalt/60 ring-2 ring-cobalt/15' : 'border-cobalt/8 hover:border-cobalt/30'
      }`}
    >
      {/* Select chip — top-left. Labeled pill so the multi-add flow
          is discoverable without an explainer banner. */}
      <label
        className={`absolute top-2.5 left-2.5 z-10 inline-flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-bold tracking-[0.08em] uppercase transition select-none ${
          isSelected
            ? 'bg-cobalt text-white border border-cobalt shadow-sm'
            : 'bg-white/95 text-ink border border-cobalt/25 hover:border-cobalt/60 hover:bg-white'
        }`}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(p.handle)}
          className="sr-only peer"
        />
        <span
          className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 transition ${
            isSelected ? 'bg-white border-white' : 'border-cobalt/50 bg-transparent'
          }`}
          aria-hidden="true"
        >
          {isSelected && (
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#2E4DDB" strokeWidth="4">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
        {isSelected ? 'Selected' : 'Select'}
      </label>

      {/* Restock signal — top-right corner */}
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
        <Image
          src={productImage(p.imageUrl)}
          alt={p.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 50vw, 33vw"
          className="object-contain p-5 sm:p-8 lg:p-10 group-hover:scale-[1.04] transition-transform duration-500"
        />
        <span className="hidden sm:inline-flex absolute bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-ink/90 text-white text-[10px] font-bold tracking-[0.16em] uppercase px-3 py-1 rounded-full whitespace-nowrap">
          Quick view
        </span>
      </button>

      {/* Card body */}
      <div className="p-3.5 sm:p-5 lg:p-6 flex flex-col flex-1">
        {/* Family pill */}
        <span className="inline-block self-start text-[9px] font-bold tracking-[0.14em] sm:tracking-[0.16em] uppercase text-cobalt mb-2 sm:mb-3">
          {familyLabel(family)}
        </span>

        {/* Title + price on one line. Title truncates at the half-width
            mobile breakpoint so the price never wraps off-row. */}
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <h3 className="font-display text-[15px] sm:text-lg lg:text-xl font-extrabold text-ink tracking-tight leading-tight truncate">
            <Link
              href={`/products/${p.handle}`}
              className="hover:text-cobalt transition"
            >
              {p.title}
            </Link>
          </h3>
          <span className="font-display font-black text-ink tracking-tight leading-tight whitespace-nowrap flex items-baseline gap-1.5">
            <span className="text-[15px] sm:text-lg lg:text-xl">{money(displayPrice)}</span>
            {/* Strikethrough retail when practitioner pricing is in effect.
                Skipped when subscribe mode is on (already discounted layer). */}
            {p.isPractitionerPricing && p.retailPriceCents != null && p.retailPriceCents > p.priceCents && !subscribeMode && (
              <span className="text-[12px] sm:text-[13px] text-ink-soft/60 line-through font-medium">
                {money(p.retailPriceCents)}
              </span>
            )}
          </span>
        </div>

        {/* Format */}
        <p className="text-[11px] sm:text-[12px] text-ink-soft mb-2 sm:mb-3">
          {p.vialSize} · {p.format}
        </p>

        {/* Lot data */}
        {p.lot.id !== 'TBD' && (
          <p className="text-[10.5px] sm:text-[11px] text-ink-soft mb-3 sm:mb-4 leading-snug">
            <span className="text-cobalt font-bold">Lot {p.lot.id}</span>
            {p.lot.purity && <> · <span className="hidden sm:inline">{p.lot.purity}</span></>}
            {p.lot.testedDate && (
              <span className="hidden sm:inline"> · Tested {p.lot.testedDate.slice(0, 10)}</span>
            )}
          </p>
        )}

        {/* Buy-it-now + Add-to-cart. Buy-it-now is the low-friction primary
            for single-vial buyers (straight to checkout); Add to cart slides
            the cart open and lets them keep browsing. Stacks on cramped 2-up
            mobile, side-by-side from sm up. */}
        <div className="mt-auto flex flex-col sm:flex-row items-stretch gap-2">
          <button
            type="button"
            onClick={() => onBuyNow(p)}
            className="flex-1 text-white py-2.5 sm:py-3 rounded-xl text-[12px] sm:text-sm font-bold shadow-sm hover:opacity-95 transition"
            style={{
              background:
                'linear-gradient(135deg, #2E4DDB 0%, #5078FF 50%, #2E4DDB 100%)',
            }}
            aria-label={`Buy ${p.title} now`}
          >
            Buy it now
          </button>
          <button
            type="button"
            onClick={() => onAddToCart(p)}
            className="flex-1 bg-white text-cobalt border border-cobalt/30 py-2.5 sm:py-3 rounded-xl text-[12px] sm:text-sm font-bold hover:border-cobalt hover:bg-cobalt/[0.04] transition flex items-center justify-center gap-1.5"
            aria-label={`Add ${p.title} to cart`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            Add to cart
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Stacks editorial break — full-width row inside the grid
// ─────────────────────────────────────────────────────────────────────────

function StacksBreak({
  stacks,
  subscribeMode,
  onAddStack,
}: {
  stacks: StackResolved[];
  subscribeMode: boolean;
  onAddStack: (stack: StackResolved) => void;
}) {
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
                <Link
                  href={`/stacks/${stack.slug}`}
                  className="font-display text-base font-extrabold text-white mb-1 hover:text-cobalt-soft transition"
                >
                  {stack.name}
                </Link>
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
                    onClick={() => onAddStack(stack)}
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
            <Image
              src={productImage(product.imageUrl)}
              alt={product.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-contain p-6 md:p-10"
            />
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

