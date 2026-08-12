import { NextResponse } from 'next/server';
import { verifyBounce } from '@/lib/stripe-connect';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Checkout-host bounce onto Stripe Connect onboarding.
 *
 * The affiliate arrives here from the storefront settings page; this page —
 * on the PAYMENT host — forwards them to connect.stripe.com with a
 * no-referrer policy, so the Referer Stripe sees is this domain's story or
 * nothing at all, never the storefront. HMAC-verified and pinned to
 * connect.stripe.com so it can't be used as an open redirect.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const target = verifyBounce(url.searchParams.get('u') ?? '', url.searchParams.get('s') ?? '');
  if (!target) return new NextResponse('Not found', { status: 404 });

  const html = `<!doctype html><html><head><meta charset="utf-8">
<meta name="referrer" content="no-referrer">
<meta name="robots" content="noindex,nofollow">
<title>Continuing to secure setup…</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;color:#333}</style>
</head><body>
<p>Continuing to secure payout setup…</p>
<script>window.location.replace(${JSON.stringify(target)});</script>
<noscript><a href="${target}" rel="noreferrer">Continue</a></noscript>
</body></html>`;
  return new NextResponse(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}
