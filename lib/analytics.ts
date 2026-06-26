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

/**
 * Top-of-funnel Lead event for the paid funnel — fired from the /access
 * Enter click + email capture. Fans out to PostHog + the Meta/TikTok ad
 * pixels (the Meta optimization signal, since Purchase is blocked on
 * flagged health domains). Every leg is guarded so a missing pixel never
 * breaks the click.
 */
export function trackLead(props?: Record<string, unknown>): void {
  track('lead', props);
  try {
    (window as any).fbq?.('track', 'Lead', props);
  } catch {
    /* pixel not loaded — ignore */
  }
  try {
    (window as any).ttq?.track?.('SubmitForm', props);
  } catch {
    /* pixel not loaded — ignore */
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
