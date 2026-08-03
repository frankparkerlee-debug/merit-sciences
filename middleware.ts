import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  ATTR_COOKIE,
  ATTR_COOKIE_MAX_AGE,
  buildAttribution,
  encodeAttrCookie,
  hasAttributionParams,
} from '@/lib/attribution';
import {
  isCheckoutHostname,
  isPaymentPath,
  isSupplyPath,
  checkoutOrigin,
} from '@/lib/checkout-domain';

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

// ── Split checkout domain (PayPal requirement) ─────────────────────────────
// The checkout host is a PAYMENT SURFACE ONLY. Without this fence the new
// domain serves the entire storefront — a second indexable copy of the store,
// with the catalog sitting on the domain PayPal is watching.
//
// Armed by CHECKOUT_HOST (or derived from CHECKOUT_ORIGIN). See
// lib/checkout-domain.ts for why those are two separate switches.

// Paid-platform ad/link crawlers (Meta + ByteDance/TikTok). When reviewing an
// ad they crawl its destination — and would otherwise reach the compound
// catalog on meritsciences.com and reject the ad under the drug policy. We
// rewrite them to the clean /access gate on any non-clean path (below).
// Deliberately UA-specific: real browsers (incl. the TikTok in-app webview) and
// Google/Bing are NOT matched, so the site stays fully indexable for SEO.
const AD_CRAWLER_RE =
  /facebookexternalhit|facebookcatalog|meta-externalagent|meta-externalfetcher|facebookbot|facebot|bytespider/i;

// Paths that are already compliant (chrome-stripped, no compounds) — a crawler
// may see these as-is so it can validate an ad's actual destination.
function isCleanPath(p: string): boolean {
  return p === '/access' || p.startsWith('/access/') || p === '/lp' || p.startsWith('/lp/');
}

export async function middleware(req: NextRequest) {
  // ── Canonical-host redirect: onrender.com → meritsciences.com ──────────
  // The Render subdomain serves the same app and was getting indexed as a
  // duplicate site, splitting SEO authority. 301 every page request to the
  // canonical domain (path + query preserved). /api/* is excluded by the
  // matcher, so ShipStation/PayPal/cron integrations pointed at the onrender
  // URL keep working — and the Render health probe lives at /api/health.
  const reqHost = (req.headers.get('host') || '').toLowerCase().split(':')[0];
  if (reqHost === 'merit-sciences.onrender.com') {
    const canonical = req.nextUrl.clone();
    canonical.protocol = 'https:';
    canonical.host = 'meritsciences.com';
    canonical.port = '';
    return NextResponse.redirect(canonical, 301);
  }

  // ── Split checkout domain: payment paths only ──────────────────────────
  // Anything else that lands here (crawler, stray link, someone typing the
  // bare domain) goes back to the storefront, so the checkout host never
  // exposes catalog content and can't be indexed as a duplicate store.
  if (isCheckoutHostname(reqHost)) {
    // Root → the supply storefront home. Rewritten (not redirected) so the URL
    // stays meritcheckout.com/ and nothing points elsewhere. It can't live at
    // app/(pay)/page.tsx because the storefront homepage owns "/".
    if (req.nextUrl.pathname === '/') {
      const home = req.nextUrl.clone();
      home.pathname = '/supply';
      return NextResponse.rewrite(home);
    }
    if (!isPaymentPath(req.nextUrl.pathname) && !isSupplyPath(req.nextUrl.pathname)) {
      // DEAD-END, not a redirect home.
      //
      // This used to 301 to meritsciences.com, which defeated the point: a
      // crawler (or anyone) hitting any path here was handed the storefront
      // address, making the association machine-discoverable from the payment
      // domain itself. The checkout host must terminate — it never names or
      // points at the store.
      return new NextResponse('Not found', {
        status: 404,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'x-robots-tag': 'noindex, nofollow, noarchive',
          'referrer-policy': 'no-referrer',
        },
      });
    }
    // Payment path — serve it, and skip the affiliate/attribution cookie
    // logic below: those cookies belong to the storefront origin and are
    // carried across by the handoff row instead (lib/checkout-handoff.ts).
    return NextResponse.next();
  }

  // ── Supply line is checkout-domain ONLY ────────────────────────────────
  // The mirror of the fence above. Route groups isolate layouts, not hosts, so
  // app/(pay)/shop/... would otherwise answer on meritsciences.com too and put
  // a clinic wound-care catalog on the peptide brand. Same dead-end treatment:
  // no redirect, because a redirect would name the other domain.
  if (isSupplyPath(req.nextUrl.pathname)) {
    return new NextResponse('Not found', {
      status: 404,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'x-robots-tag': 'noindex, nofollow, noarchive',
      },
    });
  }

  // ── Clean-room gate domain (e.g. trymerit.co) ──────────────────────────
  // Serve the static email wall for EVERY page path on this host. /api/* and
  // dotted asset paths (incl. /gate.html itself) are excluded by the matcher,
  // so the form POST → /api/gate-enter and the asset itself pass through.
  if (isGateHost(req.headers.get('host') || '')) {
    const gateUrl = req.nextUrl.clone();
    gateUrl.pathname = '/gate.html';
    return NextResponse.rewrite(gateUrl);
  }

  // ── Block paid-platform crawlers from the catalog (SEO-safe) ───────────
  // A Meta/ByteDance crawler on any non-clean path is served the chrome-stripped
  // /access gate instead of the real page, so it can never surface a compound —
  // no matter which URL it tries. Real users and Google/Bing are never matched,
  // so meritsciences.com stays fully indexable.
  if (AD_CRAWLER_RE.test(req.headers.get('user-agent') || '') && !isCleanPath(req.nextUrl.pathname)) {
    const gate = req.nextUrl.clone();
    gate.pathname = '/access';
    gate.search = '';
    return NextResponse.rewrite(gate);
  }

  const { searchParams, pathname } = req.nextUrl;

  // ── First-touch traffic attribution → merit_attr cookie ────────────────
  // If this landing carries UTMs / a paid-click id and attribution isn't
  // already locked, stamp a first-touch cookie. create-order reads it and
  // writes an OrderAttribution row keyed by the PayPal order id (for ROAS).
  const attrValue =
    !req.cookies.get(ATTR_COOKIE) && hasAttributionParams(searchParams)
      ? encodeAttrCookie(buildAttribution(searchParams, req.headers.get('referer'), pathname, Date.now()))
      : null;
  const withAttr = (res: NextResponse): NextResponse => {
    if (attrValue) {
      res.cookies.set(ATTR_COOKIE, attrValue, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: ATTR_COOKIE_MAX_AGE,
      });
    }
    return res;
  };

  // ── Bridge page: suppress the Referer on the hop to the checkout domain ──
  // /checkout on the STOREFRONT renders CheckoutBridge, which forwards to the
  // checkout domain. Sending this header lets the bridge use
  // location.replace() — which leaves NO history entry, so Back from checkout
  // returns the buyer to the product page instead of hitting the bridge and
  // being auto-forwarded again (a trap: they could never get back to the
  // store) — while still leaking no referrer.
  if (pathname === '/checkout' && checkoutOrigin() && !isCheckoutHostname(reqHost)) {
    const res = NextResponse.next();
    res.headers.set('Referrer-Policy', 'no-referrer');
    return withAttr(res);
  }

  const ref = searchParams.get('ref');

  // Pass through if no ?ref= param. (The vast majority of requests.)
  if (!ref) return withAttr(NextResponse.next());

  // Normalize + validate. Bad slugs just pass through — we don't want to
  // surface "invalid ref" errors to the user.
  const slug = ref.trim().toLowerCase();
  if (!SLUG_RE.test(slug)) return withAttr(NextResponse.next());

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

  return withAttr(response);
}

export const config = {
  // Match all storefront paths. Skip Next internals, static assets, and
  // /api/* routes (the track-click route would otherwise self-loop).
  matcher: [
    '/((?!api|_next/static|_next/image|favicon|robots\\.txt|sitemap\\.xml|.*\\..*).*)',
    // Explicitly matched so the checkout-domain fence can 404 them. They are
    // excluded from the pattern above (it skips any dotted path), which meant
    // meritcheckout.com/sitemap.xml served the FULL storefront sitemap —
    // every product URL — straight off the payment domain. Same for
    // robots.txt and llms.txt, which enumerate the library.
    // On the storefront these fall through untouched.
    '/sitemap.xml',
    '/robots.txt',
    '/llms.txt',
  ],
};
