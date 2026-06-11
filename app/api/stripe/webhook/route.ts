import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { tierForOrderCount } from '@/lib/affiliate';

export const runtime = 'nodejs';

/**
 * POST /api/stripe/webhook
 *
 * Receives Stripe events. We care about `checkout.session.completed`
 * — fired when a customer successfully pays through Stripe Checkout.
 *
 * For each completed session:
 *   1. Verify the signature (mandatory — un-signed payloads are rejected)
 *   2. Read metadata.affiliate_slug we threaded through at checkout time
 *   3. Look up the affiliate, validate ACTIVE status
 *   4. Guard against self-purchase (affiliate.email == customer.email)
 *   5. Find or create the permanent CustomerAffiliateLink — the
 *      evergreen lock that credits all future orders by this customer
 *      to this affiliate
 *   6. Calculate commission rate via trailing-30-day order count
 *   7. Write the OrderCommission row (idempotent on stripeSessionId)
 *   8. Bump the customer link's counters
 *
 * Idempotency: OrderCommission.stripeSessionId is @unique. Replays
 * of the same event throw on insert; we catch + 200 silently.
 */

// Stripe webhook bodies must be read RAW for signature verification.
// Disable the default body parser — we read the buffer manually.
export const dynamic = 'force-dynamic';

const REFUND_WINDOW_DAYS = 7;

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature');
  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Only act on the events we care about. Other events 200 silently
  // so Stripe doesn't keep retrying.
  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  try {
    await processCompletedCheckout(session);
  } catch (err) {
    console.error('processCompletedCheckout failed for session', session.id, err);
    // Return 500 so Stripe retries — webhook handlers must be robust
    // to retries. Idempotency guards in processCompletedCheckout
    // make that safe.
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

async function processCompletedCheckout(session: Stripe.Checkout.Session) {
  // Skip incomplete payments (Stripe sometimes fires this event before
  // payment is fully confirmed, e.g. for some bank transfers)
  if (session.payment_status !== 'paid') {
    return;
  }

  const affiliateSlug = session.metadata?.affiliate_slug?.trim() || null;
  if (!affiliateSlug) {
    // No affiliate context — direct purchase. Nothing to do for the
    // affiliate ledger.
    return;
  }

  // Resolve affiliate. Only ACTIVE affiliates earn.
  const affiliate = await prisma.affiliate.findUnique({
    where: { slug: affiliateSlug },
    select: { id: true, email: true, status: true },
  });
  if (!affiliate || affiliate.status !== 'ACTIVE') {
    return;
  }

  const customerEmail = (session.customer_details?.email ?? '').toLowerCase();
  const customerStripeId =
    typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id ?? null;
  if (!customerStripeId || !customerEmail) {
    // We need an identifier to attribute. Stripe Checkout virtually
    // always provides these, but bail safely if not.
    return;
  }

  // Self-purchase guard — affiliate's own orders never earn commission.
  // Still attributed to them in the lock so we don't accidentally credit
  // a different affiliate on later legitimate orders by the same email.
  const isSelfPurchase = customerEmail === affiliate.email.toLowerCase();

  // Find-or-create the evergreen customer-affiliate lock. Idempotent on
  // customerStripeId (the unique index).
  let link = await prisma.customerAffiliateLink.findUnique({
    where: { customerStripeId },
  });
  if (!link) {
    link = await prisma.customerAffiliateLink.create({
      data: {
        customerStripeId,
        customerEmail,
        affiliateId: affiliate.id,
        sourceCookieId: null, // we don't yet thread the click cookie id
      },
    });
  } else if (link.affiliateId !== affiliate.id) {
    // Customer already linked to a different affiliate — evergreen
    // means we keep the original attribution. The current ?ref= doesn't
    // override the historical lock. Use that link for crediting.
    affiliate.id = link.affiliateId;
  }

  // Commissionable base = subtotal (excludes shipping + tax). Stripe
  // gives us amount_subtotal in the smallest currency unit.
  const orderTotalCents = session.amount_subtotal ?? session.amount_total ?? 0;
  if (orderTotalCents <= 0) return;

  // Trailing-30-day order count for this affiliate determines their
  // current tier. We count rows in OrderCommission, NOT in the customer
  // link table — the tier reflects activity, not customer-list size.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const trailing30 = await prisma.orderCommission.count({
    where: {
      affiliateId: affiliate.id,
      occurredAt: { gte: since },
      // Don't count clawed-back commissions toward the tier — those
      // weren't real earned orders.
      status: { not: 'CLAWED_BACK' },
    },
  });
  const { rateBp } = tierForOrderCount(trailing30);
  const commissionCents = isSelfPurchase
    ? 0
    : Math.floor((orderTotalCents * rateBp) / 10_000);

  // Write the commission row. Idempotent on stripeSessionId — if Stripe
  // retries the webhook we get a P2002 unique constraint violation that
  // we swallow.
  try {
    await prisma.$transaction([
      prisma.orderCommission.create({
        data: {
          stripeSessionId: session.id,
          customerStripeId,
          customerLinkId: link.id,
          affiliateId: affiliate.id,
          orderTotalCents: BigInt(orderTotalCents),
          commissionRateBp: rateBp,
          commissionCents: BigInt(commissionCents),
          // PENDING until refund window passes; cron flips to PAYABLE
          status: 'PENDING',
        },
      }),
      prisma.customerAffiliateLink.update({
        where: { id: link.id },
        data: {
          totalOrders: { increment: 1 },
          totalCommissionCents: { increment: BigInt(commissionCents) },
        },
      }),
    ]);
  } catch (err: any) {
    if (err?.code === 'P2002') {
      // Already processed — Stripe retry, expected on intermittent failures
      return;
    }
    throw err;
  }
}
