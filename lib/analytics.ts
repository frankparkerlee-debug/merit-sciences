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

/**
 * Bottom-of-funnel Purchase event — the signal both ad platforms need to
 * optimize for BUYERS instead of cheap clicks. Fired from checkout onApprove
 * once PayPal capture succeeds. Fans out to PostHog + Meta + TikTok.
 *
 * Compliance: the pixel payload carries ONLY value + currency (no product or
 * compound names) so it stays clean on a flagged health domain. `orderId`
 * (the PayPal order id) is passed as the Meta `eventID` / TikTok `event_id`
 * so the browser pixel and the server-side Conversions API event (fired from
 * the PayPal webhook with the same id) DEDUPLICATE instead of double-counting.
 */
// Google Ads purchase conversion label (overridable via env). transaction_id
// is set to the order id so Google de-duplicates repeat page loads.
const GADS_PURCHASE_SEND_TO =
  process.env.NEXT_PUBLIC_GADS_PURCHASE_SEND_TO || 'AW-18210986525/9hB9CO2D28kcEJ201utD';

export function trackPurchase(props: {
  value: number;
  orderId: string;
  currency?: string;
  [k: string]: unknown;
}): void {
  const { value, orderId, currency = 'USD', ...rest } = props;
  track('purchase', { order_id: orderId, value_usd: value, currency, ...rest });
  try {
    (window as any).fbq?.('track', 'Purchase', { value, currency }, { eventID: orderId });
  } catch {
    /* pixel not loaded — ignore */
  }
  try {
    (window as any).ttq?.track?.('CompletePayment', { value, currency }, { event_id: orderId });
  } catch {
    /* pixel not loaded — ignore */
  }
  try {
    (window as any).gtag?.('event', 'conversion', {
      send_to: GADS_PURCHASE_SEND_TO,
      value,
      currency,
      transaction_id: orderId,
    });
  } catch {
    /* gtag not loaded — ignore */
  }
}

/**
 * Google Ads conversion for a practitioner application submit — the B2B lead
 * signal that lets the Practitioner Search campaign optimize for real clinic
 * applications instead of clicks (it had NO valid conversion action before).
 * Fires the gtag 'conversion' event + a PostHog event. `send_to` is the
 * account's Google Ads conversion label; overridable via env.
 */
const GADS_PRACTITIONER_SEND_TO =
  process.env.NEXT_PUBLIC_GADS_PRACTITIONER_SEND_TO ||
  'AW-18210986525/C0WQCJj68ckcEJ201utD';

export function trackPractitionerLead(props?: Record<string, unknown>): void {
  track('practitioner_lead', props);
  try {
    (window as any).gtag?.('event', 'conversion', { send_to: GADS_PRACTITIONER_SEND_TO });
  } catch {
    /* gtag not loaded — ignore */
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
