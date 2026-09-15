/**
 * The first-order welcome offer, defined once.
 *
 * It used to be a literal in fourteen places: the newsletter route, the ad
 * gate, the access page, the subscribe popup, the welcome bar, two copies of
 * the ad-funnel code list, a static HTML gate, and every welcome email. Moving
 * from 20% to 15% meant finding all of them. Now it's this file.
 *
 * Changing the offer: create the new discount row in /admin/discounts (or the
 * newsletter route will create it on first signup), then update these two
 * values. Keep the OLD code in AD_FUNNEL_CODES and leave its row active for a
 * while: it's sitting in inboxes and in browsers' localStorage, and a buyer who
 * was promised a code should still get it. Once the row is disabled, drop it
 * from the set; RETIRED_CODES below keeps stale stored copies from surfacing.
 *
 * History: WELCOME20 (20%) ran 2026-06-27 to 2026-09-14, 40 orders.
 */
export const WELCOME_CODE = 'WELCOME15';
export const WELCOME_PCT = 15;

/**
 * Cookie that carries the offer from the ad host (shop.meritsciences.com) to
 * the store. Set on the parent domain by middleware; DiscountCodeCapture on
 * the store copies it into localStorage, and the checkout handoff reads it as
 * a fallback, so the buyer never types the code.
 */
export const WELCOME_COOKIE = 'merit_welcome';
export const WELCOME_COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

/**
 * Codes that mark a sale as OUR paid acquisition. A sale on one of these
 * overrides any ?ref= affiliate cookie: we don't pay commission on traffic we
 * already bought. Lowercase, since codes are stored and compared lowercase.
 */
export const AD_FUNNEL_CODES: ReadonlySet<string> = new Set([WELCOME_CODE.toLowerCase()]);

/**
 * Former welcome codes whose discount rows are now disabled. A browser that
 * stored one of these (localStorage, an old email link) is holding a promise
 * we made; swap it for the current code instead of letting checkout reject it.
 * Lowercase.
 */
export const RETIRED_WELCOME_CODES: ReadonlySet<string> = new Set(['welcome20']);

/**
 * Normalise a stored or typed welcome code: trims, uppercases, and maps a
 * retired code onto the live one. Returns null for empty input.
 */
export function currentWelcomeCode(code: string | null | undefined): string | null {
  const c = (code ?? '').trim().toUpperCase();
  if (!c) return null;
  return RETIRED_WELCOME_CODES.has(c.toLowerCase()) ? WELCOME_CODE : c;
}
