/**
 * ClickGo (bhsclick.com): the ad vendor's click and conversion tracker.
 *
 * The SDK keeps the vendor's click id in a first-party `_cg_click` cookie on
 * the landing domain, scoped here to all of meritsciences.com so a visitor who
 * lands on shop.meritsciences.com is still recognised at checkout. Checkout
 * runs on a different registrable domain (the checkout origin), which can
 * never see that cookie, so the id rides the checkout redirect as `cg`
 * (exactly as `gclid` does) and the success page passes it to
 * trackConversion explicitly.
 *
 * The SDK loads on landing and browsing pages and on the order-success page.
 * It never loads on the payment form. Payloads carry the order id and total
 * only, never product names.
 */

const API_BASE = 'https://bhsclick.com';
const SDK_SRC = `${API_BASE}/sdk.js`;
const PIXEL_ID = 'f85b6a8a5370NjIzOA';
const COOKIE = '_cg_click';
const CHECKOUT_KEY = 'merit_cg_click';
/** Query parameter that carries the click id onto the checkout origin. */
export const CLICKGO_PARAM = 'cg';

type ClickGoApi = {
  version: string;
  configure: (opts: Record<string, unknown>) => unknown;
  track: (opts?: Record<string, unknown>) => Promise<string>;
  trackConversion: (opts: Record<string, unknown>) => Promise<unknown>;
  urlParam: (name: string) => string;
};

/** ClickGo ids are UUIDs; the SDK also accepts 32 hex chars and dashes them. */
export function normalizeClickGoId(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let v = String(raw).trim().replace(/^\{|\}$/g, '');
  if (/^[0-9a-f]{32}$/i.test(v)) {
    v = `${v.slice(0, 8)}-${v.slice(8, 12)}-${v.slice(12, 16)}-${v.slice(16, 20)}-${v.slice(20)}`;
  }
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) ? v.toLowerCase() : null;
}

let sdk: Promise<ClickGoApi | null> | null = null;

function loadSdk(): Promise<ClickGoApi | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  const w = window as unknown as { ClickGo?: ClickGoApi };
  if (w.ClickGo?.version) return Promise.resolve(w.ClickGo);
  if (!sdk) {
    sdk = new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = SDK_SRC;
      s.async = true;
      s.onload = () => resolve(w.ClickGo ?? null);
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
  }
  return sdk;
}

/** The click id the SDK stored on this origin, if any. */
export function readClickGoId(): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(?:^|;)\\s*${COOKIE}=([^;]+)`));
  if (!m) return null;
  try {
    return normalizeClickGoId(decodeURIComponent(m[1]));
  } catch {
    return null;
  }
}

/**
 * Landing and browsing pages. The SDK reads `click_id` / `uid` from the URL on
 * its own; the vendor's instructions name the parameter `clickid`, so that one
 * is passed in explicitly.
 */
export async function trackClickGoLanding(): Promise<void> {
  try {
    const cg = await loadSdk();
    if (!cg) return;
    const onMerit = /(^|\.)meritsciences\.com$/i.test(window.location.hostname);
    cg.configure({ apiBase: API_BASE, ...(onMerit ? { cookieDomain: 'meritsciences.com' } : {}) });
    const explicit = normalizeClickGoId(cg.urlParam('clickid'));
    await cg.track(explicit ? { clickId: explicit } : {});
  } catch {
    // Third-party tracking must never break a page.
  }
}

/**
 * Initiate Checkout pixel, fired on the storefront as checkout starts. Resolves
 * once both scripts have loaded (or after a short cap), so the caller can hold
 * the redirect long enough for the requests to land. No click id, no request.
 */
export function fireClickGoInitiateCheckout(capMs = 1200): Promise<void> {
  const id = readClickGoId();
  if (!id || typeof document === 'undefined') return Promise.resolve();
  const loads = (['pixel', 'container'] as const).map(
    (kind) =>
      new Promise<void>((done) => {
        const s = document.createElement('script');
        s.async = true;
        s.src = `${API_BASE}/event/${kind}/${PIXEL_ID}.js?uid=${encodeURIComponent(id)}`;
        s.onload = () => done();
        s.onerror = () => done();
        document.head.appendChild(s);
      }),
  );
  return Promise.race([
    Promise.all(loads).then(() => undefined),
    new Promise<void>((done) => setTimeout(done, capMs)),
  ]);
}

/** Checkout origin: keep the id that arrived on the redirect for this tab. */
export function rememberCheckoutClickId(): void {
  try {
    const id = normalizeClickGoId(new URLSearchParams(window.location.search).get(CLICKGO_PARAM));
    if (id) sessionStorage.setItem(CHECKOUT_KEY, id);
  } catch {
    /* private mode */
  }
}

function checkoutClickId(): string | null {
  try {
    const stored = normalizeClickGoId(sessionStorage.getItem(CHECKOUT_KEY));
    if (stored) return stored;
  } catch {
    /* private mode */
  }
  // Same-origin checkout (no split domain): the landing cookie is right here.
  return readClickGoId();
}

/** Order-success page. Fires only for visitors who arrived with a click id. */
export async function fireClickGoConversion(p: { orderId: string; orderTotal: number }): Promise<void> {
  const clickId = checkoutClickId();
  if (!clickId) return;
  try {
    const cg = await loadSdk();
    if (!cg) return;
    cg.configure({ apiBase: API_BASE });
    await cg.trackConversion({
      clickId,
      orderId: p.orderId,
      orderTotal: Number(p.orderTotal.toFixed(2)),
      includePublisherPixels: true,
    });
  } catch {
    // Never break the confirmation page.
  }
}
