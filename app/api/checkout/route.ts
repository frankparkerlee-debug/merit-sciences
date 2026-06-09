import { NextResponse } from 'next/server';

// Placeholder checkout endpoint.
// Wire to Stripe in step 2 (process.env.STRIPE_SECRET_KEY → checkout session).
// PayPal in parallel (process.env.PAYPAL_CLIENT_ID + Orders v2 API).
// For now, this just echoes the cart back so we can verify the round-trip.
export async function POST(req: Request) {
  const body = await req.json();
  return NextResponse.json({
    ok: true,
    message: 'Checkout placeholder — wire Stripe / PayPal next',
    received: body,
  });
}
