/**
 * POST /api/stripe/create-intent
 * Body: { lines, buyer, discountCode?, ruoAttested }
 * →     { clientSecret, orderId, subtotalCents, discountCents, shippingCents, totalCents }
 *
 * Stripe equivalent of /api/paypal/create-order. Prices the cart with the SAME
 * shared implementation (lib/checkout-pricing.ts), persists a PENDING_PAYMENT
 * order, then opens a PaymentIntent for the DB-derived total.
 *
 * The amount comes from priceCart(), never from the client — a buyer editing
 * the request cannot change what they're charged or who gets the commission.
 *
 * Nothing product-identifying reaches Stripe: a PaymentIntent carries an amount
 * and a currency, and the metadata we attach is internal ids only. See
 * lib/stripe.ts.
 */
import { NextResponse } from 'next/server';
import { stripe, createPaymentIntent, stripeEnabled } from '@/lib/stripe';
import { preCreateOrder } from '@/lib/orders';
import { sanitizeCartLines, priceCart, isPriceError } from '@/lib/checkout-pricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const US_STATE = /^[A-Z]{2}$/;

export async function POST(req: Request) {
  if (!stripeEnabled()) {
    return NextResponse.json({ error: 'Card payments are not available right now.' }, { status: 503 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body?.ruoAttested !== true) {
    return NextResponse.json(
      { error: 'You must confirm the research-use-only attestation before paying.', field: 'ruo' },
      { status: 400 },
    );
  }

  const lines = sanitizeCartLines(body?.lines);
  if (!lines) return NextResponse.json({ error: 'Invalid or empty cart' }, { status: 400 });

  // Buyer details — required, because Stripe has no wallet flow supplying
  // an address the way PayPal did. The checkout form collects these.
  const b = body?.buyer ?? {};
  const buyer = {
    email: String(b.email ?? '').trim().toLowerCase(),
    phone: String(b.phone ?? '').trim(),
    fullName: String(b.fullName ?? '').trim(),
    line1: String(b.line1 ?? '').trim(),
    line2: String(b.line2 ?? '').trim(),
    city: String(b.city ?? '').trim(),
    state: String(b.state ?? '').trim().toUpperCase(),
    zip: String(b.zip ?? '').trim(),
  };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(buyer.email)) {
    return NextResponse.json({ error: 'Enter a valid email address.', field: 'email' }, { status: 400 });
  }
  if (!buyer.fullName || !buyer.line1 || !buyer.city || !buyer.zip) {
    return NextResponse.json({ error: 'Complete your shipping address.', field: 'address' }, { status: 400 });
  }
  if (!US_STATE.test(buyer.state)) {
    return NextResponse.json({ error: 'Select a valid US state.', field: 'state' }, { status: 400 });
  }

  const priced = await priceCart({
    lines,
    discountCodeInput: String(body?.discountCode ?? ''),
    buyerEmail: buyer.email,
  });
  if (isPriceError(priced)) {
    return NextResponse.json({ error: priced.error, field: priced.field }, { status: priced.status });
  }
  if (priced.totalCents <= 0) {
    return NextResponse.json({ error: 'Order total must be greater than zero.' }, { status: 400 });
  }

  try {
    // 1. Open the intent — only an amount is needed, so this can happen before
    //    the order row exists.
    const pi = await createPaymentIntent({
      orderId: 'pending', // replaced below, once the order id exists
      amountCents: priced.totalCents,
      customerEmail: buyer.email,
      affiliateId: priced.affiliateId,
      discountCode: priced.discountCode,
    });

    // 2. Persist the order keyed to the PaymentIntent id. Storing it here (not
    //    in the webhook) means fulfilment can always find this order by
    //    processor id, even if the metadata update below fails.
    const order = await preCreateOrder({
      paypalOrderId: pi.id, // generic processor id — see lib/stripe.ts
      customerEmail: buyer.email,
      customerName: buyer.fullName,
      customerPhone: buyer.phone || null,
      shippingFullName: buyer.fullName,
      shippingLine1: buyer.line1,
      shippingLine2: buyer.line2 || null,
      shippingCity: buyer.city,
      shippingState: buyer.state,
      shippingZip: buyer.zip,
      subtotalCents: priced.subtotalCents,
      shippingCents: priced.shippingCents,
      discountCents: priced.discountCents,
      totalCents: priced.totalCents,
      discountCode: priced.discountCode,
      affiliateId: priced.affiliateId,
      lines: priced.lines.map((l) => ({
        handle: l.handle,
        title: l.title,
        bundleLabel: l.bundleLabel,
        unitCents: l.unitCents,
        qty: l.qty,
      })),
    });

    // 3. Point the intent's metadata at the real order id for the webhook.
    await stripe()
      .paymentIntents.update(pi.id, {
        metadata: {
          orderId: order.id,
          affiliateId: priced.affiliateId ?? '',
          discountCode: priced.discountCode ?? '',
        },
      })
      .catch((err) => {
        // Non-fatal: the webhook falls back to finding the order by the
        // processor id stamped in step 2.
        console.error('[stripe/create-intent] metadata update failed', err);
      });

    return NextResponse.json({
      clientSecret: pi.client_secret,
      orderId: order.id,
      subtotalCents: priced.subtotalCents,
      discountCents: priced.discountCents,
      shippingCents: priced.shippingCents,
      totalCents: priced.totalCents,
      attributionVia: priced.attributionVia,
    });
  } catch (err: any) {
    console.error('[stripe/create-intent] failed:', err?.message ?? err);
    return NextResponse.json(
      { error: 'Could not start checkout. Try again in a moment.' },
      { status: 500 },
    );
  }
}
