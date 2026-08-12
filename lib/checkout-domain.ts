/**
 * Checkout-domain configuration. Pure env + string logic — NO prisma, NO
 * `server-only` — so the edge middleware and server components can both
 * import it.
 *
 * Two switches, deliberately separate, because their safe-ordering during
 * rollout is opposite:
 *
 *   CHECKOUT_HOST    Fences the checkout domain to payment paths and strips
 *                    storefront chrome from it. SET THIS FIRST — the moment
 *                    the domain resolves. Until it is set, the new domain
 *                    serves the entire storefront, catalog included.
 *
 *   CHECKOUT_ORIGIN  Flips the live redirect: buyers on the storefront start
 *                    being forwarded to the checkout domain. SET THIS LAST —
 *                    only once that domain actually serves over HTTPS, or
 *                    every buyer is sent to a dead host.
 *
 * Setting only CHECKOUT_ORIGIN still fences correctly (the host is derived
 * from it), so the single-variable setup remains valid.
 */

/** Absolute origin buyers are redirected to, or null when not split yet. */
export function checkoutOrigin(): string | null {
  const raw = process.env.CHECKOUT_ORIGIN?.trim();
  if (!raw) return null;
  const withScheme = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/$/, '');
}

/** Hostname of the checkout domain (no scheme, no port), or null. */
export function checkoutHost(): string | null {
  const raw = process.env.CHECKOUT_HOST?.trim() || process.env.CHECKOUT_ORIGIN?.trim();
  if (!raw) return null;
  try {
    return new URL(/^https?:\/\//.test(raw) ? raw : `https://${raw}`).host
      .toLowerCase()
      .split(':')[0];
  } catch {
    return null;
  }
}

/** True when `host` is the configured checkout domain (www tolerated). */
export function isCheckoutHostname(host: string | null | undefined): boolean {
  const configured = checkoutHost();
  if (!configured) return false;
  const h = (host || '').toLowerCase().split(':')[0];
  return h === configured || h === `www.${configured}`;
}

/** Payment paths. Servable on the checkout domain. */
export function isPaymentPath(pathname: string): boolean {
  return (
    pathname === '/checkout' ||
    pathname.startsWith('/checkout/') ||
    // Stripe Connect onboarding touchpoints. Stripe stores the account-link
    // return/refresh URLs and sees the Referer on arrival — both must name
    // the checkout host, never the storefront (same doctrine as checkout).
    pathname.startsWith('/payout-setup/') ||
    pathname.startsWith('/pay/') ||
    pathname === '/reorder' ||
    pathname.startsWith('/reorder/') ||
    // Policies must be reachable from checkout (card network requirement) and
    // the rewritten root gives the domain an honest face instead of a 404.
    pathname === '/legal' ||
    pathname.startsWith('/legal/') ||
    pathname === '/pay-home'
  );
}

/**
 * Supply-line paths — the clinic storefront (collagen / wound care / DME) that
 * lives ONLY on the checkout domain.
 *
 * This exists because Next.js route groups isolate layouts, not hostnames.
 * app/(pay)/shop/... answers on every host the app serves, so without an
 * explicit check the wound-care catalog would also be reachable at
 * meritsciences.com/shop — the exact leak the split-domain work was done to
 * prevent, just running the other direction. The middleware therefore fences
 * BOTH ways: these paths are servable on the checkout host and 404 on the
 * storefront host.
 *
 * NOT including '/': that is the storefront homepage on meritsciences.com and
 * is rewritten to /supply on the checkout host before this is consulted.
 */
export function isSupplyPath(pathname: string): boolean {
  return (
    pathname === '/supply' ||
    pathname.startsWith('/supply/') ||
    pathname === '/shop' ||
    pathname.startsWith('/shop/')
  );
}

/** True when checkout redirects to a different origin than the storefront. */
export function isSplitCheckout(): boolean {
  return checkoutOrigin() !== null;
}

/**
 * Support address to show on payment surfaces.
 *
 * On the checkout domain the storefront address (rx@meritsciences.com) would
 * name the store on a page that must not reference it, so it's suppressed —
 * callers fall back to "reply to your order confirmation email", which works
 * without publishing any domain. Set CHECKOUT_SUPPORT_EMAIL to show a real
 * address there once one exists on the checkout domain.
 */
export function supportEmailFor(host: string | null | undefined): string | null {
  if (!isCheckoutHostname(host)) {
    return process.env.SUPPORT_EMAIL?.trim() || 'rx@meritsciences.com';
  }
  return process.env.CHECKOUT_SUPPORT_EMAIL?.trim() || null;
}
