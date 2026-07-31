'use client';

import { useEffect } from 'react';
import { useCart } from '@/lib/cart';

/**
 * Tiny client island — clears the persisted Zustand cart on mount.
 * Lives on /checkout/success so a successful redirect leaves the user
 * with an empty cart drawer if they navigate back.
 *
 * Also retires the WELCOME20 first-order offer for this browser: the buyer
 * has now placed an order, so the welcome bar / auto-fill must stop showing
 * it (belt-and-suspenders with the discount's own oncePerCustomer per-email
 * guard — this closes the "used it, then came back and got offered it again"
 * gap even across a different email on the same device).
 */
export function ClearCartOnMount() {
  const clear = useCart((s) => s.clear);
  useEffect(() => {
    clear();
    try {
      localStorage.setItem('merit_welcome_used', '1');
      localStorage.removeItem('merit_welcome_code');
    } catch {
      /* private mode — ignore */
    }
  }, [clear]);
  return null;
}
