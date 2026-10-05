'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CartLine = {
  handle: string;          // for stacks: 'stack:recovery-stack'
  title: string;
  bundleLabel: string;
  unitCents: number;
  qty: number;
  imageUrl?: string;        // thumbnail in cart drawer
  // For stack line items: the underlying compound handles. Used by
  // fulfillment + by the drawer to render a "+N more" badge.
  components?: string[];
};

type CartState = {
  lines: CartLine[];
  // Drawer open state — drives the global slide-in CartDrawer panel.
  // NOT persisted (would auto-open on every page load). Bottom of the
  // persist `partialize` config excludes it.
  isDrawerOpen: boolean;
  add: (line: Omit<CartLine, 'qty'>, qty?: number) => void;
  setQty: (handle: string, bundleLabel: string, qty: number) => void;
  remove: (handle: string, bundleLabel: string) => void;
  clear: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  totalCents: () => number;
  itemCount: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      isDrawerOpen: false,
      // add() is passive — it does NOT auto-open the drawer. The caller
      // chooses whether to flash a toast (single add) or open the drawer
      // explicitly (bulk add / checkout flow). This avoids the "every
      // add interrupts my browse with a drawer pop-in" UX.
      add: (line, qty = 1) =>
        set((s) => {
          const existing = s.lines.findIndex(
            (l) => l.handle === line.handle && l.bundleLabel === line.bundleLabel,
          );
          if (existing >= 0) {
            const next = [...s.lines];
            next[existing] = { ...next[existing], qty: next[existing].qty + qty };
            return { lines: next };
          }
          return { lines: [...s.lines, { ...line, qty }] };
        }),
      setQty: (handle, bundleLabel, qty) =>
        set((s) => {
          if (qty <= 0) {
            return {
              lines: s.lines.filter(
                (l) => !(l.handle === handle && l.bundleLabel === bundleLabel),
              ),
            };
          }
          return {
            lines: s.lines.map((l) =>
              l.handle === handle && l.bundleLabel === bundleLabel
                ? { ...l, qty }
                : l,
            ),
          };
        }),
      remove: (handle, bundleLabel) =>
        set((s) => ({
          lines: s.lines.filter((l) => !(l.handle === handle && l.bundleLabel === bundleLabel)),
        })),
      clear: () => set({ lines: [] }),
      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      totalCents: () =>
        get().lines.reduce((sum, l) => sum + l.unitCents * l.qty, 0),
      itemCount: () => get().lines.reduce((sum, l) => sum + l.qty, 0),
    }),
    {
      name: 'merit-cart',
      // Only persist `lines` — never persist `isDrawerOpen` (the drawer
      // would pop open on every cold page load otherwise).
      partialize: (s) => ({ lines: s.lines }),
      // Deferred: hydration from localStorage can finish before `useCart`
      // is assigned.
      onRehydrateStorage: () => () => {
        if (typeof window !== 'undefined') setTimeout(syncRenamedLines, 0);
      },
    },
  ),
);

/**
 * A cart saved before a product was renamed still holds the old handle, name
 * and thumbnail. Ask the server once per session for the current ones (it owns
 * the mapping, so no retired name ships in this bundle), then patch the lines,
 * merging any that now point at the same product and bundle.
 */
async function syncRenamedLines() {
  try {
    if (sessionStorage.getItem('merit-cart-synced')) return;
    sessionStorage.setItem('merit-cart-synced', '1');
  } catch {
    // Storage blocked: still worth one attempt this page load.
  }
  const handles = useCart
    .getState()
    .lines.map((l) => l.handle)
    .filter((h) => !h.startsWith('stack:') && !h.startsWith('supply:'));
  if (handles.length === 0) return;
  try {
    const res = await fetch('/api/cart/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handles }),
    });
    if (!res.ok) return;
    const { renamed } = (await res.json()) as {
      renamed?: { from: string; handle: string; title: string; imageUrl?: string }[];
    };
    if (!renamed?.length) return;
    const byOld = new Map(renamed.map((r) => [r.from, r]));
    useCart.setState((s) => {
      const merged: CartLine[] = [];
      for (const line of s.lines) {
        const r = byOld.get(line.handle);
        const next = r ? { ...line, handle: r.handle, title: r.title, imageUrl: r.imageUrl ?? line.imageUrl } : line;
        const same = merged.find((m) => m.handle === next.handle && m.bundleLabel === next.bundleLabel);
        if (same) same.qty += next.qty;
        else merged.push({ ...next });
      }
      return { lines: merged };
    });
  } catch {
    // Offline or a blip: checkout re-derives the name server-side regardless.
  }
}
