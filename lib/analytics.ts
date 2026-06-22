'use client';

import posthog from 'posthog-js';

/**
 * Thin, crash-proof analytics wrapper. Every call no-ops silently if PostHog
 * isn't loaded (key unset) so analytics can never break the storefront.
 *
 * Events are intentionally semantic + ecommerce-shaped so PostHog can build a
 * real funnel (product_viewed → add_to_cart → begin_checkout → purchase) and
 * revenue analytics — not just pageviews.
 */

function ready(): boolean {
  return typeof window !== 'undefined' && !!(posthog as any).__loaded;
}

export function track(event: string, props?: Record<string, unknown>): void {
  try {
    if (ready()) posthog.capture(event, props);
  } catch {
    /* never surface analytics errors to the buyer */
  }
}

/** Tie anonymous events to a known person (email) across sessions/devices. */
export function identify(email: string, props?: Record<string, unknown>): void {
  try {
    if (ready() && email) posthog.identify(email.toLowerCase(), props);
  } catch {
    /* ignore */
  }
}
