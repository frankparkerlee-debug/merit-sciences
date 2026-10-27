'use client';

/**
 * Ecommerce events for the ad vendor's server-side Google Tag Manager
 * (Stape, container GTM-5FV4G2MT served from bhs.meritsciences.com).
 *
 * Their container triggers on GA4-shaped events whose names end in `_stape`,
 * so every push here uses that suffix. Each push carries a unique `event_id`
 * so their Meta browser and server events deduplicate. The previous
 * `ecommerce` object is cleared first, as Google recommends, so fields from
 * one event never leak into the next.
 *
 * Every call is best-effort: analytics must never break the store.
 */

export type StapeItem = {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
};

type CartLineLike = {
  handle: string;
  title: string;
  bundleLabel: string;
  unitCents: number | bigint;
  qty: number;
};

const BRAND = 'Merit';

export function stapeItem(line: CartLineLike, qty = line.qty): StapeItem {
  return {
    item_id: line.handle,
    item_name: line.title,
    item_brand: BRAND,
    item_variant: line.bundleLabel,
    price: Number(line.unitCents) / 100,
    quantity: qty,
  };
}

export function stapeItems(lines: CartLineLike[]): StapeItem[] {
  return lines.map((l) => stapeItem(l));
}

export function itemsValue(items: StapeItem[]): number {
  return Math.round(items.reduce((n, i) => n + i.price * i.quantity, 0) * 100) / 100;
}

function newEventId(name: string): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${crypto.randomUUID()}_${name}`;
    }
  } catch {
    /* fall through */
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}_${name}`;
}

export type StapeUserData = {
  email?: string;
  phone?: string;
  address?: {
    first_name?: string;
    last_name?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
};

/**
 * Push one `<name>_stape` event. `name` is the GA4 event name without the
 * suffix (view_item, add_to_cart, purchase, ...).
 */
export function pushStape(
  name: string,
  ecommerce: { value: number; items: StapeItem[]; currency?: string; [k: string]: unknown },
  opts: { eventId?: string; userData?: StapeUserData } = {},
): void {
  try {
    if (typeof window === 'undefined') return;
    const w = window as any;
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ ecommerce: null });
    const payload: Record<string, unknown> = {
      event: `${name}_stape`,
      event_id: opts.eventId ?? newEventId(name),
      ecommerce: { currency: 'USD', ...ecommerce },
    };
    if (opts.userData) payload.user_data = opts.userData;
    w.dataLayer.push(payload);
  } catch {
    /* never surface analytics errors to the buyer */
  }
}

/** Split "Jane Q. Doe" into first and last name for user_data. */
export function splitName(full: string | null | undefined): { first_name?: string; last_name?: string } {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { first_name: parts[0] };
  return { first_name: parts[0], last_name: parts[parts.length - 1] };
}
