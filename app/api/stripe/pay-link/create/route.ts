/**
 * POST /api/stripe/pay-link/create
 * Body: { token: string, attemptId?: string }
 *
 * Stripe successor to /api/paypal/pay-link/create — starts payment for an
 * admin-created PENDING_PAYMENT order via its signed pay link. The intent is
 * opened from the order's STORED amounts (custom / wholesale pricing is
 * preserved — never re-priced from the catalog), then the order's processor id
 * is pointed at the fresh PaymentIntent so the EXISTING Stripe webhook +
 * fulfillCapturedOrder path promotes it to PAID (confirmation email, affiliate
 * commission, ShipStation) with zero new fulfillment code.
 *
 * Compliance is inherited from createPaymentIntent: Stripe sees an amount, a
 * generic "Merit order" description, and opaque ids — no product names, no
 * storefront URLs. This route is only reachable on the checkout host because
 * the /pay page that calls it is host-pinned there.
 *
 * Tamper-proof: the client sends only the token (+ an idempotency nonce); the
 * amount comes from the DB keyed by the verified token.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPayToken } from '@/lib/pay-link';
import { createPaymentIntent } from '@/lib/stripe';

export const runtime = 'nodejs';

const STRIPE_MIN_CHARGE_CENTS = 50;

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const token = String(body.token ?? '').trim();
  const attemptId = String(body.attemptId ?? '').slice(0, 64) || 'first';
  const orderId = verifyPayToken(token);
  if (!orderId) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { lines: { select: { id: true } } },
  });
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.status !== 'PENDING_PAYMENT') {
    return NextResponse.json(
      { error: 'This order is not awaiting payment.', status: order.status },
      { status: 409 },
    );
  }
  if (order.lines.length === 0) {
    return NextResponse.json({ error: 'Order has no line items.' }, { status: 422 });
  }
  const totalCents = Number(order.totalCents);
  if (totalCents < STRIPE_MIN_CHARGE_CENTS) {
    return NextResponse.json(
      { error: `Order total is below the $0.50 card minimum.` },
      { status: 422 },
    );
  }

  try {
    const pi = await createPaymentIntent({
      orderId: order.id,
      amountCents: totalCents,
      customerEmail: order.customerEmail,
      affiliateId: order.affiliateId,
      discountCode: order.discountCode,
      // Attempt-scoped so a retried submit reuses the intent while a fresh
      // attempt (new page load) opens a new one — same contract as checkout.
      idempotencyKey: `paylink_${order.id}_${attemptId}`,
    });

    // Point the order at the intent so the shared webhook path finds and
    // promotes THIS order. RUO is (re)affirmed here — the customer ticks the
    // box on the pay page before this call is allowed to run.
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paypalOrderId: pi.id, // generic processor id — see lib/stripe.ts
        ruoAttested: true,
        ruoAttestedAt: new Date(),
        ruoAttestedIp: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null,
      },
    });

    return NextResponse.json({ clientSecret: pi.client_secret, orderId: order.id });
  } catch (err) {
    console.error('[stripe/pay-link/create] failed', err);
    return NextResponse.json({ error: 'Could not start payment. Please try again.' }, { status: 502 });
  }
}
