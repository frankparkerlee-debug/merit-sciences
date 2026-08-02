/**
 * POST /api/checkout/price
 * Body: { lines, discountCode? }
 * →     { subtotalCents, discountCents, shippingCents, totalCents,
 *         discountCode, attributionVia }
 *
 * Processor-neutral quote. Validates a discount/affiliate code and returns the
 * server-authoritative totals, creating NOTHING — no order row, no PaymentIntent,
 * no PayPal order.
 *
 * Exists because the checkout's "Apply code" button used to POST to
 * /api/paypal/create-order and throw the result away, purely to borrow its
 * validation. That coupled discount codes to PayPal: when the PayPal
 * credentials were removed on 2026-08-01, every code entry failed with
 * "Could not start checkout" even though Stripe was processing payments fine.
 * It also minted a real PayPal order on every keystroke-apply.
 *
 * Pricing and attribution come from the same lib/checkout-pricing.ts the
 * payment routes use, so the quote shown here is the amount actually charged.
 */
import { NextResponse } from 'next/server';
import { sanitizeCartLines, priceCart, isPriceError } from '@/lib/checkout-pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const lines = sanitizeCartLines(body?.lines);
  if (!lines) return NextResponse.json({ error: 'Invalid or empty cart' }, { status: 400 });

  // buyerEmail gates one-per-customer codes. The checkout collects email on the
  // payment form, below the code box, so it is usually absent here — the same
  // check runs again at create-intent, where the email is known and is the
  // authoritative gate.
  const priced = await priceCart({
    lines,
    discountCodeInput: String(body?.discountCode ?? ''),
    buyerEmail: typeof body?.buyerEmail === 'string' ? body.buyerEmail.trim().toLowerCase() : null,
  });
  if (isPriceError(priced)) {
    return NextResponse.json({ error: priced.error, field: priced.field }, { status: priced.status });
  }

  return NextResponse.json({
    subtotalCents: priced.subtotalCents,
    discountCents: priced.discountCents,
    shippingCents: priced.shippingCents,
    totalCents: priced.totalCents,
    discountCode: priced.discountCode,
    attributionVia: priced.attributionVia,
  });
}
