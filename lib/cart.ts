'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CartLine = {
  handle: string;
  title: string;
  bundleLabel: string;
  unitCents: number;
  qty: number;
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
      add: (line, qty = 1) =>
        set((s) => {
          const existing = s.lines.findIndex(
            (l) => l.handle === line.handle && l.bundleLabel === line.bundleLabel,
          );
          if (existing >= 0) {
            const next = [...s.lines];
            next[existing] = { ...next[existing], qty: next[existing].qty + qty };
            return { lines: next, isDrawerOpen: true };
          }
          return {
            lines: [...s.lines, { ...line, qty }],
            isDrawerOpen: true, // auto-open drawer on add — instant feedback
          };
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
    },
  ),
);
