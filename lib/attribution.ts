// First-party traffic attribution.
//
// Captured on the FIRST ad-tagged landing (middleware sets the `merit_attr`
// cookie, first-touch — we don't overwrite), then attached to each order at
// checkout (create-order writes an OrderAttribution row keyed by the PayPal
// order id). Powers per-order source tracking + revenue-by-channel for ROAS.
//
// First-touch (not last) is deliberate: the funnel is ad → /access → email →
// catalog-via-email → purchase (often a later, "direct" session). The ad that
// ACQUIRED the visitor should get the credit, so we lock attribution on the
// first paid/tagged touch and carry it through.

export const ATTR_COOKIE = 'merit_attr';
export const ATTR_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export type Attribution = {
  source?: string | null; // utm_source — meta, tiktok, google, ig, affiliate…
  medium?: string | null; // utm_medium — cpc, paid_social, email, organic…
  campaign?: string | null; // utm_campaign
  content?: string | null; // utm_content — ad / creative id
  term?: string | null; // utm_term
  clickId?: string | null; // fbclid / ttclid / gclid (platform click id)
  referrer?: string | null; // referring host at first touch
  landing?: string | null; // first landing path
  ts?: number; // first-touch timestamp (ms)
};

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const CLICK_ID_KEYS = ['fbclid', 'ttclid', 'gclid', 'gbraid', 'wbraid', 'msclkid'];

export function hasAttributionParams(sp: URLSearchParams): boolean {
  return UTM_KEYS.some((k) => sp.has(k)) || CLICK_ID_KEYS.some((k) => sp.has(k));
}

function clip(v: string | null, n = 120): string | null {
  if (!v) return null;
  const s = v.trim();
  return s ? s.slice(0, n) : null;
}

function refererHost(referer: string | null): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).hostname.replace(/^www\./, '').slice(0, 120);
  } catch {
    return null;
  }
}

export function buildAttribution(
  sp: URLSearchParams,
  referer: string | null,
  pathname: string,
  nowMs: number,
): Attribution {
  const clickId = CLICK_ID_KEYS.map((k) => sp.get(k)).find(Boolean) ?? null;
  // Infer source from the click id when utm_source is absent (a raw fbclid
  // with no UTMs still tells us it's a Meta click).
  let source = clip(sp.get('utm_source'));
  if (!source && clickId) {
    if (sp.has('fbclid')) source = 'meta';
    else if (sp.has('ttclid')) source = 'tiktok';
    else if (sp.has('gclid') || sp.has('gbraid') || sp.has('wbraid')) source = 'google';
    else if (sp.has('msclkid')) source = 'bing';
  }
  return {
    source,
    medium: clip(sp.get('utm_medium')),
    campaign: clip(sp.get('utm_campaign')),
    content: clip(sp.get('utm_content')),
    term: clip(sp.get('utm_term')),
    clickId: clip(clickId, 255),
    referrer: refererHost(referer),
    landing: clip(pathname, 200),
    ts: nowMs,
  };
}

export function encodeAttrCookie(a: Attribution): string {
  return encodeURIComponent(JSON.stringify(a));
}

export function decodeAttrCookie(value: string | undefined | null): Attribution | null {
  if (!value) return null;
  try {
    const obj = JSON.parse(decodeURIComponent(value));
    return obj && typeof obj === 'object' ? (obj as Attribution) : null;
  } catch {
    return null;
  }
}
