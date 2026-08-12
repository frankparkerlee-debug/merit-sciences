import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stripe's account-link return_url. Stripe stores THIS (checkout-host) URL;
 * the browser lands here after onboarding and we send it home to the
 * storefront settings page. Stripe never sees where — the hop happens
 * client-side after they've left Stripe.
 */
const STORE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://meritsciences.com').replace(/\/$/, '');

export async function GET() {
  return NextResponse.redirect(`${STORE}/affiliate/dashboard/settings?stripe=return`, {
    status: 302,
    headers: { 'x-robots-tag': 'noindex, nofollow', 'cache-control': 'no-store' },
  });
}
