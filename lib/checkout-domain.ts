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

/** The only paths the checkout domain may serve. Everything else 301s home. */
export function isPaymentPath(pathname: string): boolean {
  return (
    pathname === '/checkout' ||
    pathname.startsWith('/checkout/') ||
    pathname.startsWith('/pay/') ||
    pathname === '/reorder' ||
    pathname.startsWith('/reorder/')
  );
}

/** True when checkout redirects to a different origin than the storefront. */
export function isSplitCheckout(): boolean {
  return checkoutOrigin() !== null;
}
