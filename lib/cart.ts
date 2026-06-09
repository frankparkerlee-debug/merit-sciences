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
  add: (line: Omit<CartLine, 'qty'>, qty?: number) => void;
  remove: (handle: string, bundleLabel: string) => void;
  clear: () => void;
  totalCents: () => number;
  itemCount: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
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
      remove: (handle, bundleLabel) =>
        set((s) => ({
          lines: s.lines.filter((l) => !(l.handle === handle && l.bundleLabel === bundleLabel)),
        })),
      clear: () => set({ lines: [] }),
      totalCents: () =>
        get().lines.reduce((sum, l) => sum + l.unitCents * l.qty, 0),
      itemCount: () => get().lines.reduce((sum, l) => sum + l.qty, 0),
    }),
    { name: 'merit-cart' },
  ),
);
