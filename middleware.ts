import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Affiliate click tracking.
 *
 * When any storefront URL is hit with `?ref=SLUG`:
 *   1. Validate the slug format (don't trust URLs)
 *   2. Set the `merit_ref` cookie (30-day TTL, HttpOnly, SameSite=Lax)
 *   3. Fire-and-forget POST to /api/affiliate/track-click to log the
 *      click row in Postgres (for stats + fraud detection)
 *   4. Redirect (307) to the same URL without the `?ref=` param
 *
 * The cookie value is the slug (not the affiliate.id) so we can attribute
 * at checkout with one Prisma lookup. The cookie is HttpOnly to protect
 * against XSS-driven re-attribution.
 *
 * After the cookie is set, every subsequent storefront request from this
 * browser carries the affiliate context for the next 30 days — without
 * needing the middleware to run again.
 */

const COOKIE_NAME = 'merit_ref';
const COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

// Slug format must match what we enforce at sign-up:
//   lowercase alphanumeric + hyphen, 3-30 chars, must start/end alphanumeric.
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;

// Clean-room ad-gate domain(s). Traffic on these hosts NEVER reaches the catalog:
// every page path is rewritten to the static /gate.html email wall, so Meta's
// crawler hitting the ad's destination can't surface a single compound name. The
// real store stays on meritsciences.com. Set GATE_HOST (comma-separated) in
// Render to the clean ad domain(s) — e.g. a fresh Cloudflare domain pointed at
// Render. Deliberately NOT the onrender URL: it shares the store's backend and
// reads as "merit-sciences" — the gate belongs on a clean, separate domain.
const GATE_HOSTS = (process.env.GATE_HOST || 'trymerit.co')
  .split(',')
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

function isGateHost(host: string): boolean {
  const h = host.toLowerCase().split(':')[0]; // strip any port
  return GATE_HOSTS.some((g) => h === g || h === `www.${g}`);
}

export async function middleware(req: NextRequest) {
  // ── Clean-room gate domain (e.g. trymerit.co) ──────────────────────────
  // Serve the static email wall for EVERY page path on this host. /api/* and
  // dotted asset paths (incl. /gate.html itself) are excluded by the matcher,
  // so the form POST → /api/gate-enter and the asset itself pass through.
  if (isGateHost(req.headers.get('host') || '')) {
    const gateUrl = req.nextUrl.clone();
    gateUrl.pathname = '/gate.html';
    return NextResponse.rewrite(gateUrl);
  }

  const { searchParams, pathname } = req.nextUrl;
  const ref = searchParams.get('ref');

  // Pass through if no ?ref= param. (The vast majority of requests.)
  if (!ref) return NextResponse.next();

  // Normalize + validate. Bad slugs just pass through — we don't want to
  // surface "invalid ref" errors to the user.
  const slug = ref.trim().toLowerCase();
  if (!SLUG_RE.test(slug)) return NextResponse.next();

  // Build the redirect URL without the ?ref= param. Any other query
  // params (utm_*, etc.) are preserved.
  const cleanUrl = req.nextUrl.clone();
  cleanUrl.searchParams.delete('ref');

  // 307 preserves the request method (matters for any POST-with-ref edge
  // case) and is the correct status for "redirect, but this is the same
  // resource you wanted, just at a cleaner URL."
  const response = NextResponse.redirect(cleanUrl, 307);

  response.cookies.set(COOKIE_NAME, slug, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });

  // Fire-and-forget click log. We never await this — if it fails, the
  // user still gets their redirect with the cookie set. Cookie = source
  // of truth for attribution; click log is for stats only.
  const ipHeader = req.headers.get('x-forwarded-for');
  const ipAddress = ipHeader ? ipHeader.split(',')[0].trim() : null;
  fetch(new URL('/api/affiliate/track-click', req.nextUrl.origin), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      slug,
      ipAddress,
      userAgent:   req.headers.get('user-agent'),
      referrer:    req.headers.get('referer'),
      landingPath: pathname,
    }),
  }).catch(() => {
    // Swallow — never block the user redirect on logging
  });

  return response;
}

export const config = {
  // Match all storefront paths. Skip Next internals, static assets, and
  // /api/* routes (the track-click route would otherwise self-loop).
  matcher: [
    '/((?!api|_next/static|_next/image|favicon|robots\\.txt|sitemap\\.xml|.*\\..*).*)',
  ],
};
