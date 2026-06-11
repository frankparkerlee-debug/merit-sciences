'use client';

import { useEffect } from 'react';
import { useCart } from '@/lib/cart';

/**
 * Tiny client island — clears the persisted Zustand cart on mount.
 * Lives on /checkout/success so a successful Stripe redirect leaves
 * the user with an empty cart drawer if they navigate back.
 */
export function ClearCartOnMount() {
  const clear = useCart((s) => s.clear);
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
