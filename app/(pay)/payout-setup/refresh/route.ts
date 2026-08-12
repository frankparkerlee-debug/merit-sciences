import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Stripe's account-link refresh_url. Stripe stores THIS (checkout-host) URL;
 * the browser lands here to resume an expired onboarding link and we send it home to the
 * storefront settings page. Stripe never sees where — the hop happens
 * client-side after they've left Stripe.
 */
const STORE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://meritsciences.com').replace(/\/$/, '');

export async function GET() {
  return NextResponse.redirect(`${STORE}/affiliate/dashboard/settings?stripe=refresh`, {
    status: 302,
    headers: { 'x-robots-tag': 'noindex, nofollow', 'cache-control': 'no-store' },
  });
}
