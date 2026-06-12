import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPayPalWebhook, getPayPalOrder } from '@/lib/paypal';
import { tierForOrderCount } from '@/lib/affiliate';
import { createOrderFromPayPal, issueOrderConfirmationEmail } from '@/lib/orders';

export const runtime = 'nodejs';

/**
 * POST /api/paypal/webhook
 *
 * Receives PayPal webhook events. The events we care about:
 *
 *   - PAYMENT.CAPTURE.COMPLETED  — write the OrderCommission row
 *                                  and the evergreen CustomerAffiliateLink
 *   - PAYMENT.CAPTURE.REFUNDED   — claw back the matching commission
 *   - PAYMENT.CAPTURE.DENIED     — log but no DB write
 *
 * Idempotency: OrderCommission.paypalCaptureId is @unique. Replays of
 * the same event throw on insert; we catch + 200 silently.
 *
 * Attribution rebuild: the affiliate context lives in the order's
 * `custom_id` (JSON we packed at create-order time). We retrieve the
 * order to read it back rather than trusting webhook-side state.
 */

const PAYPAL_SIGNATURE_HEADERS = [
  'paypal-transmission-id',
  'paypal-transmission-time',
  'paypal-transmission-sig',
  'paypal-cert-url',
  'paypal-auth-algo',
] as const;

export async function POST(req: Request) {
  // Read raw body for verification
  const rawBody = await req.text();

  const headers = {
    transmissionId:   req.headers.get('paypal-transmission-id') ?? '',
    transmissionTime: req.headers.get('paypal-transmission-time') ?? '',
    transmissionSig:  req.headers.get('paypal-transmission-sig') ?? '',
    certUrl:          req.headers.get('paypal-cert-url') ?? '',
    authAlgo:         req.headers.get('paypal-auth-algo') ?? '',
  };

  // All five headers must be present
  for (const h of PAYPAL_SIGNATURE_HEADERS) {
    if (!req.headers.get(h)) {
      return NextResponse.json(
        { error: `Missing ${h} header` },
        { status: 400 },
      );
    }
  }

  const valid = await verifyPayPalWebhook(headers, rawBody);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Malformed body' }, { status: 400 });
  }

  try {
    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handleCaptureCompleted(event);
        break;
      case 'PAYMENT.CAPTURE.REFUNDED':
        await handleCaptureRefunded(event);
        break;
      case 'PAYMENT.CAPTURE.DENIED':
        // Nothing to write — just log so we can spot patterns
        console.log('[paypal/webhook] capture denied:', event.resource?.id);
        break;
      default:
        // Acknowledge but no-op. Stops PayPal retrying.
        break;
    }
  } catch (err) {
    console.error('[paypal/webhook] handler failed:', err);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

// ─── PAYMENT.CAPTURE.COMPLETED ────────────────────────────────────────
async function handleCaptureCompleted(event: any) {
  const capture = event.resource;
  if (!capture?.id) return;

  const captureId: string = capture.id;
  const amountCents: number = Math.round(parseFloat(capture.amount?.value ?? '0') * 100);

  // Capture's `supplementary_data.related_ids.order_id` carries our PayPal order id
  const orderId: string | undefined =
    capture.supplementary_data?.related_ids?.order_id;

  if (!orderId) {
    console.warn('[paypal/webhook] capture has no related order_id', captureId);
    return;
  }

  // Pull the order so we can read custom_id (our attribution payload)
  // and the payer details
  const order = await getPayPalOrder(orderId);
  const pu = order.purchase_units?.[0];
  const customIdRaw: string | undefined = pu?.custom_id;
  const payerEmail: string = (order.payer?.email_address ?? '').toLowerCase();
  const payerId: string | null = order.payer?.payer_id ?? null;

  // Parse attribution context if present (may be absent for direct buyers)
  let attribution: { a?: string | null; s?: string | null; v?: string | null; c?: string | null; d?: number } = {};
  if (customIdRaw) {
    try { attribution = JSON.parse(customIdRaw); } catch { /* ignore */ }
  }
  const affiliateId = attribution.a ?? null;
  const discountCode = attribution.c ?? null;

  // ── Always persist the Order first ──────────────────────────────
  // This runs for every paid order regardless of affiliate context.
  // Idempotent: returns isNew=false on webhook retries.
  let persistedOrderId: string | null = null;
  try {
    const result = await createOrderFromPayPal(order, {
      affiliateId,
      discountCode: discountCode?.toUpperCase() ?? null,
    });
    if (result) {
      persistedOrderId = result.order.id;
      if (result.isNew) {
        // Fire the branded confirmation email asynchronously. Failures
        // here don't block webhook ack — we accept some sends may be
        // lost during outages and retry via admin tooling.
        issueOrderConfirmationEmail(result.order.id).catch((err) => {
          console.error('[paypal/webhook] confirmation email failed', err);
        });
      }
    }
  } catch (err) {
    console.error('[paypal/webhook] order persistence failed', err);
    // Continue — we still want to record affiliate commission below
    // if applicable, and webhook retries will write the order next time.
  }

  // ── Affiliate commission (only if attribution + payer email exist) ──
  if (!affiliateId || !payerEmail) return;

  // Resolve affiliate and confirm ACTIVE
  const affiliate = await prisma.affiliate.findUnique({
    where: { id: affiliateId },
    select: { id: true, email: true, status: true },
  });
  if (!affiliate || affiliate.status !== 'ACTIVE') return;

  // Self-purchase guard
  const isSelfPurchase = payerEmail === affiliate.email.toLowerCase();

  // ── Evergreen lock: find-or-create by email ──────────────────────
  let link = await prisma.customerAffiliateLink.findUnique({
    where: { customerEmail: payerEmail },
  });
  if (!link) {
    link = await prisma.customerAffiliateLink.create({
      data: {
        customerEmail: payerEmail,
        paypalPayerId: payerId,
        affiliateId: affiliate.id,
      },
    });
  } else if (link.affiliateId !== affiliate.id) {
    // Historical lock wins — credit the original affiliate, not the
    // current ?ref= / code.
    affiliate.id = link.affiliateId;
  } else if (payerId && !link.paypalPayerId) {
    // Backfill paypal payer id if we didn't have it before
    await prisma.customerAffiliateLink.update({
      where: { id: link.id },
      data: { paypalPayerId: payerId },
    });
  }

  // Commissionable base = capture amount minus shipping. We don't have
  // the shipping line on the capture itself; fall back to order's
  // amount.breakdown.
  const orderTotalCents = (() => {
    const breakdown = pu?.amount?.breakdown;
    if (breakdown?.item_total?.value) {
      const itemTotal = Math.round(parseFloat(breakdown.item_total.value) * 100);
      const discount = Math.round(parseFloat(breakdown.discount?.value ?? '0') * 100);
      return Math.max(0, itemTotal - discount);
    }
    return amountCents; // fallback — over-counts shipping but never under
  })();
  if (orderTotalCents <= 0) return;

  // Tier from trailing-30-day count
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const trailing30 = await prisma.orderCommission.count({
    where: {
      affiliateId: affiliate.id,
      occurredAt: { gte: since },
      status: { not: 'CLAWED_BACK' },
    },
  });
  const { rateBp } = tierForOrderCount(trailing30);
  const commissionCents = isSelfPurchase
    ? 0
    : Math.floor((orderTotalCents * rateBp) / 10_000);

  // Write commission + bump link counters (transactional, idempotent
  // on paypalCaptureId)
  try {
    await prisma.$transaction([
      prisma.orderCommission.create({
        data: {
          paypalOrderId: orderId,
          paypalCaptureId: captureId,
          paypalPayerId: payerId,
          customerLinkId: link.id,
          affiliateId: affiliate.id,
          orderTotalCents: BigInt(orderTotalCents),
          commissionRateBp: rateBp,
          commissionCents: BigInt(commissionCents),
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
    if (err?.code === 'P2002') return; // already processed
    throw err;
  }
}

// ─── PAYMENT.CAPTURE.REFUNDED ────────────────────────────────────────
async function handleCaptureRefunded(event: any) {
  const refund = event.resource;
  // The refunded capture id lives in links[rel=up].href or in
  // supplementary_data.related_ids.capture_id
  const captureId: string | undefined =
    refund?.supplementary_data?.related_ids?.capture_id
    ?? refund?.links?.find((l: any) => l.rel === 'up')?.href?.split('/').pop();

  if (!captureId) return;

  // Mark the underlying Order as REFUNDED so admin lists reflect reality
  await prisma.order.updateMany({
    where: { paypalCaptureId: captureId, status: { not: 'REFUNDED' } },
    data: { status: 'REFUNDED', refundedAt: new Date() },
  });

  const existing = await prisma.orderCommission.findUnique({
    where: { paypalCaptureId: captureId },
  });
  if (!existing) return;
  if (existing.status === 'CLAWED_BACK') return; // already clawed

  await prisma.$transaction([
    prisma.orderCommission.update({
      where: { id: existing.id },
      data: {
        status: 'CLAWED_BACK',
        clawedBackAt: new Date(),
        clawbackReason: 'Refund issued via PayPal',
      },
    }),
    prisma.customerAffiliateLink.update({
      where: { id: existing.customerLinkId },
      data: {
        totalOrders: { decrement: 1 },
        totalCommissionCents: { decrement: existing.commissionCents },
      },
    }),
  ]);
}
