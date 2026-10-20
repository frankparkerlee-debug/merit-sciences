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
    whenPixel('fbq', (fbq) => fbq('track', 'Lead', props));
  } catch {
    /* pixel not loaded — ignore */
  }
  try {
    whenPixel('ttq', (ttq) => ttq.track('SubmitForm', props));
  } catch {
    /* pixel not loaded — ignore */
  }
}

/**
 * Mid-funnel e-commerce events — the buyer-intent signals Meta/TikTok need to
 * optimize for PURCHASERS instead of the cheap top-of-funnel Lead. Without
 * these firing to the pixels, `Lead` (the /access email gate) is the only
 * mid-funnel event the ad platforms can see — so they optimize for discount-
 * hunters, not buyers. Each fires to PostHog (rich props, first-party) AND
 * fans out to the Meta + TikTok pixels carrying ONLY value + currency — never
 * product or compound names — to keep the dataset clean on a flagged health
 * domain. Standard Meta event names so ad sets can optimize directly to them.
 */
export function trackViewContent(props: { value: number; currency?: string; [k: string]: unknown }): void {
  const { value, currency = 'USD', ...rest } = props;
  track('product_viewed', { value_usd: value, currency, ...rest });
  try {
    whenPixel('fbq', (fbq) => fbq('track', 'ViewContent', { value, currency }));
  } catch {
    /* pixel not loaded — ignore */
  }
  try {
    whenPixel('ttq', (ttq) => ttq.track('ViewContent', { value, currency }));
  } catch {
    /* pixel not loaded — ignore */
  }
}

/** Google Ads "Begin Checkout (Merit)" label — see the add-to-cart note. */
/*
 * Google Ads conversion labels.
 *
 * These pointed at AW-18210986525 until Sep 2026. That account was created by
 * Shopify's Google channel, still holds a set of "Google Shopping App" actions,
 * and runs no campaigns: every purchase and practitioner application recorded
 * against it went into an account that spends nothing, while the live PMax
 * campaign in 618-453-1815 had no conversion to optimise toward but Add to
 * cart. The labels below belong to that live account.
 */
const GADS_BEGIN_CHECKOUT_SEND_TO =
  process.env.NEXT_PUBLIC_GADS_BEGIN_CHECKOUT_SEND_TO || 'AW-18408760902/_UpACIb5__wcEMbM_clE';

/**
 * Google Ads begin-checkout, fired from the STOREFRONT only.
 *
 * Deliberately separate from trackInitiateCheckout, which runs on
 * meritcheckout.com and keeps feeding Meta and TikTok there. Google is
 * different: it attributes a conversion using the `_gcl_aw` cookie, which is
 * written on meritsciences.com and unreadable from the checkout origin. Fired
 * at checkout it would record with no click attached and count toward no
 * campaign.
 *
 * So it fires here instead, at the moment the storefront mints the handoff —
 * the last point where the click id is still in reach, and a truer definition
 * of "began checkout" anyway.
 */
export function trackBeginCheckoutAds(props: { value: number; currency?: string }): void {
  const { value, currency = 'USD' } = props;
  try {
    if (GADS_BEGIN_CHECKOUT_SEND_TO) {
      gtagQueue()('event', 'conversion', {
        send_to: GADS_BEGIN_CHECKOUT_SEND_TO,
        value,
        currency,
      });
    }
  } catch {
    /* gtag not loaded — ignore */
  }
}

/** Google Ads "Add to Cart (Merit)" label. Env-driven: paste the label from
 *  the conversion action once it exists; unset means the gtag call is skipped
 *  rather than firing at a nonexistent action. */
const GADS_ADD_TO_CART_SEND_TO =
  process.env.NEXT_PUBLIC_GADS_ADD_TO_CART_SEND_TO || 'AW-18408760902/51jnCMGos_wcEMbM_clE';

export function trackAddToCart(props: { value: number; currency?: string; [k: string]: unknown }): void {
  const { value, currency = 'USD', ...rest } = props;
  track('add_to_cart', { value_usd: value, currency, ...rest });
  try {
    whenPixel('fbq', (fbq) => fbq('track', 'AddToCart', { value, currency }));
  } catch {
    /* pixel not loaded — ignore */
  }
  try {
    whenPixel('ttq', (ttq) => ttq.track('AddToCart', { value, currency }));
  } catch {
    /* pixel not loaded — ignore */
  }
  try {
    if (GADS_ADD_TO_CART_SEND_TO) {
      gtagQueue()('event', 'conversion', {
        send_to: GADS_ADD_TO_CART_SEND_TO,
        value,
        currency,
      });
    }
  } catch {
    /* gtag not loaded — ignore */
  }
}

export function trackInitiateCheckout(props: { value: number; currency?: string; [k: string]: unknown }): void {
  const { value, currency = 'USD', ...rest } = props;
  track('begin_checkout', { value_usd: value, currency, ...rest });
  try {
    whenPixel('fbq', (fbq) => fbq('track', 'InitiateCheckout', { value, currency }));
  } catch {
    /* pixel not loaded — ignore */
  }
  try {
    whenPixel('ttq', (ttq) => ttq.track('InitiateCheckout', { value, currency }));
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
  process.env.NEXT_PUBLIC_GADS_PURCHASE_SEND_TO || 'AW-18408760902/FqhjCID5__wcEMbM_clE';
// Second Google Ads account (699-437-8305), so its campaigns can bid on
// purchases too (its "Purchase" action, created 2026-10-07). Fired
// alongside 618's, never awaited.
const GADS_PURCHASE_SEND_TO_B =
  process.env.NEXT_PUBLIC_GADS_PURCHASE_SEND_TO_B || 'AW-16705928231/l96QCLvz3JQdEKf4gJ4-';

/**
 * How long to let the Google beacon leave the browser before the caller
 * navigates. gtag sends the conversion as an async request; the caller here
 * hard-navigates to the success page, which cancels an in-flight request and
 * loses the conversion outright. Meta survives that because the PayPal webhook
 * re-fires Purchase server-side through the CAPI, deduped by order id. Google
 * has no such fallback, so the hit has to actually go.
 */
const GADS_BEACON_TIMEOUT_MS = 1000;

/**
 * Returns a promise that settles once Google confirms the conversion left the
 * browser, or after GADS_BEACON_TIMEOUT_MS, whichever comes first. Callers that
 * navigate immediately afterwards MUST wait on it. It never rejects and never
 * hangs: a missing gtag resolves on the spot.
 */
export function trackPurchase(props: {
  value: number;
  orderId: string;
  currency?: string;
  [k: string]: unknown;
}): Promise<void> {
  const { value, orderId, currency = 'USD', ...rest } = props;
  track('purchase', { order_id: orderId, value_usd: value, currency, ...rest });
  try {
    whenPixel('fbq', (fbq) => fbq('track', 'Purchase', { value, currency }, { eventID: orderId }));
  } catch {
    /* pixel not loaded — ignore */
  }
  try {
    whenPixel('ttq', (ttq) => ttq.track('CompletePayment', { value, currency }, { event_id: orderId }));
  } catch {
    /* pixel not loaded — ignore */
  }

  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(finish, GADS_BEACON_TIMEOUT_MS);

    // Queued, never skipped: the purchase fires on the success page's first
    // render, before the lazily loaded gtag library exists. Until 2026-10-20
    // this returned early when gtag was missing, so no Stripe purchase ever
    // reached Google (the tag read "inactive" from 9/24).
    const gtag = gtagQueue();
    if (GADS_PURCHASE_SEND_TO_B) {
      try {
        gtag('event', 'conversion', { send_to: GADS_PURCHASE_SEND_TO_B, value, currency, transaction_id: orderId });
      } catch {
        /* the primary account's hit below still goes */
      }
    }
    try {
      gtag('event', 'conversion', {
        send_to: GADS_PURCHASE_SEND_TO,
        value,
        currency,
        transaction_id: orderId,
        // gtag calls this once the hit is away. event_timeout makes gtag fire
        // it regardless after the same ceiling, so a dropped network cannot
        // leave the buyer staring at a spinner.
        event_callback: finish,
        event_timeout: GADS_BEACON_TIMEOUT_MS,
      });
    } catch {
      finish();
    }
  });
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
  'AW-18408760902/lEYrCIP5__wcEMbM_clE';

export function trackPractitionerLead(props?: Record<string, unknown>): void {
  track('practitioner_lead', props);
  try {
    gtagQueue()('event', 'conversion', { send_to: GADS_PRACTITIONER_SEND_TO });
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

/**
 * window.gtag, installed as the standard dataLayer queue if the library has not
 * loaded yet. gtag.js replays the queue when it arrives, so an event fired on
 * first render is delivered instead of dropped. Also issues the js/config
 * commands once (MarketingPixels skips them if this ran first), because a
 * conversion queued ahead of its account's config is not attributed.
 */
function gtagQueue(): (...args: unknown[]) => void {
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  if (typeof w.gtag !== 'function') {
    w.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer.push(arguments);
    };
  }
  if (!w.__meritGtagInit) {
    w.__meritGtagInit = true;
    w.gtag('set', 'linker', { accept_incoming: true, domains: ['meritsciences.com', 'meritcheckout.com'] });
    w.gtag('js', new Date());
    const ids = new Set(
      [GADS_PURCHASE_SEND_TO, GADS_PURCHASE_SEND_TO_B].filter(Boolean).map((s) => String(s).split('/')[0]),
    );
    for (const id of ids) w.gtag('config', id);
  }
  return w.gtag;
}

/**
 * Run `fn` with the Meta (fbq) or TikTok (ttq) pixel once it exists. Both load
 * lazily, after the page is idle, so an event fired on first render (the
 * success page's Purchase) used to find no pixel and be dropped. Their own
 * snippets bail out if the global already exists, so a stub cannot be
 * installed ahead of them; poll briefly instead.
 */
function whenPixel(name: 'fbq' | 'ttq', fn: (pixel: any) => void, waitedMs = 0): void {
  const w = window as any;
  const pixel = w[name];
  if (pixel && (name !== 'ttq' || typeof pixel.track === 'function')) {
    try {
      fn(pixel);
    } catch {
      /* pixel errors must never break the page */
    }
    return;
  }
  if (waitedMs >= 10_000) return;
  setTimeout(() => whenPixel(name, fn, waitedMs + 250), 250);
}

/**
 * Carry the visitor's tracking identities from the storefront to the checkout
 * domain. Every tool here keys a visitor by a first-party cookie, and
 * meritsciences.com cookies never reach meritcheckout.com, so without this
 * each tool saw an ad visitor and a buyer as two different people.
 *
 *   ph / phi   PostHog distinct id (+ whether it is an identified one);
 *              PostHogProvider bootstraps with it on the checkout domain.
 *   _gl        Google's own cross-domain linker: GA4 client and session plus
 *              the Google Ads click cookies (_gcl_aw/_gcl_au). The Google tag
 *              on the checkout domain reads it on load. JS redirects are not
 *              auto-decorated, hence generating it here.
 *   fbp / fbc  Meta's browser and click cookies; MarketingPixels writes them
 *              on the checkout domain before the Meta pixel loads.
 *
 * gclid and the ClickGo id already ride the URL (lib/checkout-handoff).
 */
export function decorateCheckoutUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw, window.location.href);
  } catch {
    return raw;
  }
  const cookie = (name: string): string | null => {
    const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name.replace(/[$.*+?^()[\]{}|\\]/g, '\\$&')}=([^;]+)`));
    return m ? decodeURIComponent(m[1]) : null;
  };

  try {
    if (ready()) {
      const id = posthog.get_distinct_id();
      if (id) {
        url.searchParams.set('ph', id);
        if (posthog.get_property('$user_state') === 'identified') url.searchParams.set('phi', '1');
      }
    }
  } catch {
    /* identity is best-effort */
  }

  try {
    const bridge = (window as any).google_tag_data?.glBridge;
    if (bridge && typeof bridge.generate === 'function') {
      const ids: Record<string, string> = {};
      for (const part of document.cookie.split(';')) {
        const [k, ...v] = part.trim().split('=');
        if (/^_ga(_[A-Z0-9]+)?$|^_gcl_(aw|au|gb|dc)$/.test(k)) ids[k] = decodeURIComponent(v.join('='));
      }
      if (Object.keys(ids).length) {
        const gl = bridge.generate(ids);
        if (gl) url.searchParams.set('_gl', gl);
      }
    }
  } catch {
    /* identity is best-effort */
  }

  const fbp = cookie('_fbp');
  const fbc = cookie('_fbc');
  if (fbp) url.searchParams.set('fbp', fbp);
  if (fbc) url.searchParams.set('fbc', fbc);

  return url.toString();
}
