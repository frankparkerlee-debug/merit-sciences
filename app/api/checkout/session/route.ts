import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * DEPRECATED 2026-06-11.
 *
 * This route created Stripe Checkout Sessions. The storefront has
 * migrated to PayPal (with Advanced Card Fields for native card UX),
 * so this endpoint no longer creates real sessions.
 *
 * Returning 410 GONE rather than 404 so the cart drawer (if anyone
 * sees an old client bundle for a few minutes after deploy) gets a
 * clear "this route is deprecated, refresh" signal.
 *
 * Replacement: POST /api/paypal/create-order
 *
 * The original implementation can be recovered from git history
 * (last live commit before deprecation: 2f799ca).
 */
export async function POST(_req: Request) {
  return NextResponse.json(
    {
      error: 'Checkout migrated to PayPal',
      replacement: '/checkout',
      hint: 'Hard-refresh and click Checkout — buyer goes to /checkout, not Stripe.',
    },
    { status: 410 },
  );
}
