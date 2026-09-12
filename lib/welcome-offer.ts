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
 * was promised a code should still get it.
 */
export const WELCOME_CODE = 'WELCOME15';
export const WELCOME_PCT = 15;

/**
 * Codes that mark a sale as OUR paid acquisition. A sale on one of these
 * overrides any ?ref= affiliate cookie: we don't pay commission on traffic we
 * already bought. Lowercase, since codes are stored and compared lowercase.
 */
export const AD_FUNNEL_CODES: ReadonlySet<string> = new Set([
  WELCOME_CODE.toLowerCase(),
  'welcome20', // retired 2026-09-12, still honoured for anyone holding it
]);
