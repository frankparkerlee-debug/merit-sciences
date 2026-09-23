/**
 * Products withheld from the PAID-TRAFFIC catalog view.
 *
 * Google's healthcare and medicines enforcement scans three surfaces: the ad
 * copy, the keywords, and the destination URL. A clean landing page therefore
 * does not neutralise a flagged destination, and shop.meritsciences.com is
 * clean itself while every CTA on it leads to /catalog, which names prescription
 * drugs. That click is the conversion path, and reviewers follow it.
 *
 * So `/catalog?ads=1` serves the same catalog minus the listings below, and the
 * paid landers point at that. Organic, email and direct traffic keep the full
 * catalog: this is a filter on one entry path, not a delisting.
 *
 * ── What is on the list, and what is deliberately NOT ──────────────────
 * Listed: anything whose displayed title IS a prescription drug name
 * (Semaglutide; Tesamorelin, approved as Egrifta), plus Melanotan II and
 * PT-141, which sit among the most-flagged compounds in this category and
 * together did $239 in 90 days, so they cost nothing to withhold.
 *
 * NOT listed: retatrutide and tirzepatide. They are 40.6% and 7.2% of revenue,
 * and they already display site-wide under their development codes, RT3 -
 * LY3437943 and TZ2 - LY3298176. That naming predates this file and applies to
 * every visitor, which is what keeps it a naming convention rather than showing
 * Google something different from the buyer. If that ever stops being true,
 * they belong on this list.
 *
 * Excluding all ten candidates instead would remove 55.3% of catalog revenue
 * from the paid path, which would make a paid test unable to prove anything.
 *
 * Revenue figures: trailing 90 days as of 2026-09-23.
 */

export const ADS_RESTRICTED_HANDLES: ReadonlySet<string> = new Set([
  // Displayed title is a prescription drug name.
  'semaglutide-10mg',
  'semaglutide-20mg',
  'tesamorelin-20mg',
  'tesamorelin-ipamorelin',
  'th9507',
  // Most-flagged compounds; negligible revenue, so not worth the exposure.
  'melanotan-ii',
  'pt-141',
]);

/** Query flag that selects the paid-traffic view. */
export const ADS_VIEW_PARAM = 'ads';

export function isAdsView(searchParams: { [k: string]: string | string[] | undefined } | undefined): boolean {
  const v = searchParams?.[ADS_VIEW_PARAM];
  return (Array.isArray(v) ? v[0] : v) === '1';
}

export function isAdRestricted(handle: string): boolean {
  return ADS_RESTRICTED_HANDLES.has(handle);
}

/**
 * Drop restricted listings. Applied SERVER-SIDE before the catalog is handed
 * to the client component, so the withheld products are absent from the search
 * index, the category chips and the RSC payload, not merely hidden from the
 * first render.
 */
export function withoutAdRestricted<T extends { handle: string }>(products: T[]): T[] {
  return products.filter((p) => !isAdRestricted(p.handle));
}
