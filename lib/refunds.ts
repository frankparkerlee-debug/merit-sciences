/**
 * Refunds and the affiliate clawback that goes with them.
 *
 * Merit takes card payments through Stripe. Stripe orders keep the charge id
 * (ch_…) in Order.paypalCaptureId and the PaymentIntent (pi_…) in
 * Order.paypalOrderId: the columns predate the move off PayPal, and Stripe
 * fulfilment reuses them through the PayPal-shaped adapter in lib/stripe.ts.
 * OrderCommission is keyed by that same charge id.
 *
 * Two ways a refund happens, both handled here:
 *   1. the admin order page (refundViaStripe, then the caller books it), and
 *   2. straight from the Stripe dashboard, which only the charge.refunded
 *      webhook sees (syncStripeRefund).
 * Commission is clawed back on a FULL refund only; a partial refund leaves it.
 */
import 'server-only';
import type Stripe from 'stripe';
import { prisma } from './db';
import { stripe } from './stripe';
import { recordOrderEvent } from './orders';

type RefundableOrder = { id: string; paypalCaptureId: string | null; paypalOrderId: string | null };

/** True when Stripe holds this order's money (vs a legacy PayPal capture). */
export function isStripeOrder(o: RefundableOrder): boolean {
  return (o.paypalCaptureId ?? '').startsWith('ch_') || (o.paypalOrderId ?? '').startsWith('pi_');
}

/**
 * Refund through Stripe. `amountCents` null = whatever is left on the charge.
 * The idempotency key makes a double-clicked button one refund, not two.
 */
export async function refundViaStripe(
  order: RefundableOrder,
  amountCents: number | null,
  idempotencyKey: string,
): Promise<{ ok: true; refundId: string } | { ok: false; error: string }> {
  const capture = order.paypalCaptureId ?? '';
  const target: Stripe.RefundCreateParams = capture.startsWith('ch_')
    ? { charge: capture }
    : capture.startsWith('pi_')
      ? { payment_intent: capture }
      : (order.paypalOrderId ?? '').startsWith('pi_')
        ? { payment_intent: order.paypalOrderId! }
        : {};
  if (!target.charge && !target.payment_intent) {
    return { ok: false, error: 'No Stripe payment on this order to refund (it may still be awaiting payment).' };
  }
  try {
    const refund = await stripe().refunds.create(
      {
        ...target,
        ...(amountCents != null ? { amount: amountCents } : {}),
        metadata: { orderId: order.id, source: 'merit-admin' },
      },
      { idempotencyKey },
    );
    return { ok: true, refundId: refund.id };
  } catch (err: any) {
    console.error('[refunds] Stripe refund failed', err?.message);
    return { ok: false, error: `Stripe refund failed: ${err?.message ?? 'unknown error'}` };
  }
}

/**
 * Claw back the affiliate commission booked against a payment. Idempotent:
 * a commission already clawed back, or none at all, is a no-op, so the admin
 * action and the webhook can both call it for the same refund.
 */
export async function clawBackCommission(captureId: string, orderId: string, reason: string): Promise<void> {
  const commission = await prisma.orderCommission.findUnique({ where: { paypalCaptureId: captureId } });
  if (!commission || commission.status === 'CLAWED_BACK') return;

  await prisma.$transaction([
    prisma.orderCommission.update({
      where: { id: commission.id },
      data: { status: 'CLAWED_BACK', clawedBackAt: new Date(), clawbackReason: reason },
    }),
    prisma.customerAffiliateLink.update({
      where: { id: commission.customerLinkId },
      data: {
        totalOrders: { decrement: 1 },
        totalCommissionCents: { decrement: commission.commissionCents },
      },
    }),
  ]);

  await recordOrderEvent({
    orderId,
    kind: 'COMMISSION_CLAWED_BACK',
    message: `Affiliate commission of $${(Number(commission.commissionCents) / 100).toFixed(2)} clawed back due to refund.`,
    metadata: { commission_cents: Number(commission.commissionCents), affiliate_id: commission.affiliateId },
  });
}

/**
 * charge.refunded: mirror Stripe's refunded total onto the order. A refund
 * issued from the admin is normally booked already, so this only books what
 * the order doesn't show yet (a dashboard refund, or a webhook that beat the
 * admin's write). It sends no customer email: the admin path sends Merit's,
 * and a dashboard refund gets Stripe's receipt.
 */
export async function syncStripeRefund(charge: Stripe.Charge): Promise<void> {
  const piId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id ?? null;
  const order = await prisma.order.findFirst({
    where: { OR: [{ paypalCaptureId: charge.id }, ...(piId ? [{ paypalOrderId: piId }] : [])] },
    select: { id: true, totalCents: true, refundedCents: true, paypalCaptureId: true },
  });
  if (!order) {
    console.warn(`[refunds] charge.refunded for ${charge.id} matches no order`);
    return;
  }

  const refundedTotal = charge.amount_refunded;
  const isFull = charge.refunded === true || refundedTotal >= Number(order.totalCents);
  const alreadyBooked = Number(order.refundedCents);

  if (refundedTotal > alreadyBooked) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: isFull ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        refundedAt: isFull ? new Date() : undefined,
        refundedCents: BigInt(refundedTotal),
      },
    });
    await recordOrderEvent({
      orderId: order.id,
      kind: isFull ? 'REFUND_FULL' : 'REFUND_PARTIAL',
      message: `${isFull ? 'Full' : 'Partial'} refund of $${((refundedTotal - alreadyBooked) / 100).toFixed(2)} recorded from Stripe.`,
      metadata: { amount_cents: refundedTotal - alreadyBooked, charge_id: charge.id },
    });
  }

  if (isFull) await clawBackCommission(order.paypalCaptureId ?? charge.id, order.id, 'Refunded in Stripe');
}
