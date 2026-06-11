import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * DEPRECATED 2026-06-11. Stripe webhook receiver — disabled with the
 * PayPal migration. Returns 410 GONE so any in-flight Stripe events
 * are not silently consumed.
 *
 * If Stripe re-enabled in the future, recover from git history
 * (last live commit: 2f799ca).
 *
 * Active replacement: POST /api/paypal/webhook
 */
export async function POST(_req: Request) {
  return NextResponse.json(
    { error: 'Stripe integration deprecated — using PayPal' },
    { status: 410 },
  );
}
