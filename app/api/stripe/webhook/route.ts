/**
 * POST /api/stripe/webhook
 *
 * The durable fulfilment trigger for Stripe payments. Unlike the PayPal
 * Merchant-of-Record arrangement — where we never controlled the account and
 * so could not register a webhook — this one is ours, which makes it the
 * reliable path rather than a nice-to-have.
 *
 * Handles:
 *   payment_intent.succeeded  -> promote the order to PAID and run the full
 *                                fulfilment chain (confirmation email, ad
 *                                conversion, affiliate commission)
 *   payment_intent.payment_failed / canceled
 *                             -> leave the order PENDING_PAYMENT and log it,
 *                                matching the PayPal declined-capture path
 *
 * Fulfilment reuses fulfillCapturedOrder() via the PayPal-shaped adapter in
 * lib/stripe.ts, so affiliates are paid by exactly the same code that has been
 * paying them on PayPal. Idempotency comes for free: that path dedupes on the
 * capture id, which here is the Stripe charge id, and OrderCommission has a
 * unique constraint on it — so Stripe's at-least-once retries cannot
 * double-book a commission.
 */
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { stripe, paymentIntentAsPayPalOrder } from '@/lib/stripe';
import { fulfillCapturedOrder } from '@/lib/paypal-fulfillment';
import { recordOrderEvent } from '@/lib/orders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) {
    console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET is not set — refusing to process');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 });

  // Signature verification needs the RAW body — never req.json() first.
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, secret);
  } catch (err: any) {
    // A bad signature means the request did not come from Stripe. Never act.
    console.error('[stripe/webhook] signature verification failed:', err?.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.orderId;

        // Point the order at the processor id BEFORE fulfilling, so the
        // promote-by-id lookup inside createOrderFromPayPal finds this order
        // rather than creating a duplicate.
        if (orderId) {
          await prisma.order
            .update({ where: { id: orderId }, data: { paypalOrderId: pi.id } })
            .catch((err) => console.error('[stripe/webhook] could not stamp processor id', err));
        }

        const result = await fulfillCapturedOrder(paymentIntentAsPayPalOrder(pi), 'webhook');
        console.log(
          `[stripe/webhook] succeeded pi=${pi.id} order=${result.orderId} new=${result.isNew} commission=${result.commissionCents}`,
        );
        break;
      }

      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.orderId;
        const reason =
          (pi.last_payment_error?.message ?? '') || event.type.replace('payment_intent.', '');
        // Order stays PENDING_PAYMENT — the buyer can retry, and the admin
        // sees the attempt on the order timeline.
        if (orderId) {
          await recordOrderEvent({
            orderId,
            kind: 'ADMIN_COMMENT',
            message: `Stripe payment ${event.type === 'payment_intent.canceled' ? 'canceled' : 'failed'}: ${reason}`,
            metadata: { stripePaymentIntentId: pi.id },
          }).catch(() => { /* logging must never fail the webhook */ });
        }
        break;
      }

      default:
        // Everything else is acknowledged and ignored.
        break;
    }
  } catch (err) {
    // 500 tells Stripe to retry. Fulfilment is idempotent, so a retry is safe
    // and is strictly better than silently dropping a paid order.
    console.error(`[stripe/webhook] handler failed for ${event.type}`, err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
