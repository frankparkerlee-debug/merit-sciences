'use server';

/**
 * Admin server actions for order management.
 * All actions verify admin auth before mutating.
 */

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-session';
import { normalizeCarrier, trackingUrlFor, issueShipmentEmail, issueOrderConfirmationEmail, issuePaymentRequestEmail, issueAdminOrderNotification, issueRefundEmail, issueCancellationEmail, recordOrderEvent } from '@/lib/orders';
import { getAccessToken } from '@/lib/paypal';
import { syncOrderTrackingToPayPal } from '@/lib/paypal-tracking';

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/* ─── Mark order as Processing ─── */

export async function markProcessing(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };
  const orderId = String(formData.get('orderId') ?? '');
  if (!orderId) return { ok: false, error: 'Missing order ID' };

  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'PROCESSING', processingAt: new Date() },
  });
  await recordOrderEvent({
    orderId,
    kind: 'MARKED_PROCESSING',
    message: 'Order marked as Processing.',
    actorEmail: admin.email,
  });
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  return { ok: true, message: 'Marked as Processing.' };
}

/* ─── Mark order as Shipped (with tracking) ─── */

export async function markShipped(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };
  const orderId = String(formData.get('orderId') ?? '');
  const carrier = String(formData.get('carrier') ?? '').trim();
  const trackingNumber = String(formData.get('trackingNumber') ?? '').trim();
  if (!orderId) return { ok: false, error: 'Missing order ID' };
  if (!carrier) return { ok: false, error: 'Carrier required', };
  if (!trackingNumber) return { ok: false, error: 'Tracking number required' };

  const normalizedCarrier = normalizeCarrier(carrier);
  const trackingUrl = trackingUrlFor(normalizedCarrier, trackingNumber);

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'SHIPPED',
      shippingCarrier: normalizedCarrier,
      trackingNumber,
      trackingUrl,
      shippedAt: new Date(),
    },
  });
  await recordOrderEvent({
    orderId,
    kind: 'MARKED_SHIPPED',
    message: `Marked Shipped via ${normalizedCarrier.toUpperCase()} · tracking ${trackingNumber}.`,
    metadata: { carrier: normalizedCarrier, tracking_number: trackingNumber, tracking_url: trackingUrl },
    actorEmail: admin.email,
  });

  // Push the tracking number to PayPal (seller-protection signal) — detached;
  // the cron sweep is the safety net if this instance recycles first.
  void syncOrderTrackingToPayPal(orderId).catch(() => {});

  // Fire shipment notification email + surface success/failure to operator
  // (issueShipmentEmail records its own SHIPMENT_EMAIL_SENT or EMAIL_FAILED event)
  const emailResult = await issueShipmentEmail(orderId);

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');

  if (!emailResult.ok) {
    return {
      ok: true,
      message: `Shipped via ${normalizedCarrier.toUpperCase()} · tracking ${trackingNumber}. ⚠ Customer email failed: ${emailResult.error}`,
    };
  }
  return {
    ok: true,
    message: `Shipped via ${normalizedCarrier.toUpperCase()} · tracking ${trackingNumber}. Customer notified (email id ${emailResult.id}).`,
  };
}

/* ─── Mark order as Delivered ─── */

export async function markDelivered(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };
  const orderId = String(formData.get('orderId') ?? '');
  if (!orderId) return { ok: false, error: 'Missing order ID' };

  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'DELIVERED', deliveredAt: new Date() },
  });
  await recordOrderEvent({
    orderId,
    kind: 'MARKED_DELIVERED',
    message: 'Order marked as Delivered.',
    actorEmail: admin.email,
  });
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  return { ok: true, message: 'Marked as Delivered.' };
}

/* ─── Mark order as Canceled (no money movement) ─── */

export async function markCanceled(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };
  const orderId = String(formData.get('orderId') ?? '');
  const reason = String(formData.get('reason') ?? '').trim() || null;
  if (!orderId) return { ok: false, error: 'Missing order ID' };

  // Figure out whether the buyer was charged — drives the email copy
  // (refund-coming vs. no-charge messaging).
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { paypalCaptureId: true, refundedCents: true, totalCents: true },
  });
  const wasPaid = !!order?.paypalCaptureId && (Number(order.refundedCents) < Number(order.totalCents));

  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'CANCELED', canceledAt: new Date() },
  });
  await recordOrderEvent({
    orderId,
    kind: 'MARKED_CANCELED',
    message: reason ? `Order canceled — reason: ${reason}` : 'Order canceled.',
    actorEmail: admin.email,
  });

  // Fire customer cancellation email (records its own event row)
  const emailResult = await issueCancellationEmail(orderId, { reason, wasPaid });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');

  const tail = emailResult.ok
    ? ` Customer notified (email id ${emailResult.id}).`
    : ` ⚠ Customer email failed: ${emailResult.error}`;
  return { ok: true, message: `Canceled.${tail}` };
}

/* ─── Refund (calls PayPal refund API) ─── */

export async function refundOrder(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };
  const orderId = String(formData.get('orderId') ?? '');
  if (!orderId) return { ok: false, error: 'Missing order ID' };

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: 'Order not found' };
  if (order.status === 'REFUNDED') return { ok: false, error: 'Already refunded' };

  // Call PayPal refund API
  try {
    const token = await getAccessToken();
    const base = (process.env.PAYPAL_ENV ?? 'sandbox') === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
    const res = await fetch(`${base}/v2/payments/captures/${order.paypalCaptureId}/refund`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `merit-refund-${order.id}`,
      },
      body: JSON.stringify({}), // full refund
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[admin/refund] PayPal refund failed', res.status, text);
      return { ok: false, error: `PayPal refund failed (${res.status}): ${text.slice(0, 200)}` };
    }
  } catch (err: any) {
    console.error('[admin/refund] PayPal API error', err);
    return { ok: false, error: `Refund request failed: ${err?.message ?? 'unknown'}` };
  }

  // Mark our Order + claw back affiliate commission immediately
  // (the webhook also does this on PAYMENT.CAPTURE.REFUNDED but we don't
  // want to depend on it succeeding — clawback should happen synchronously).
  const refundCents = Number(order.totalCents) - Number(order.refundedCents);
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'REFUNDED',
      refundedAt: new Date(),
      refundedCents: { increment: BigInt(Math.max(0, refundCents)) },
    },
  });
  await clawBackCommission(order.paypalCaptureId!, orderId);

  const refundDollars = (refundCents / 100).toFixed(2);
  await recordOrderEvent({
    orderId,
    kind: 'REFUND_FULL',
    message: `Full refund of $${refundDollars} issued via PayPal.`,
    metadata: { amount_cents: refundCents, capture_id: order.paypalCaptureId },
    actorEmail: admin.email,
  });

  // Fire customer refund email (records its own event row)
  const emailResult = await issueRefundEmail(orderId, {
    refundCents,
    isFull: true,
    reason: null,
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  const tail = emailResult.ok
    ? ` Customer notified (email id ${emailResult.id}).`
    : ` ⚠ Customer email failed: ${emailResult.error}`;
  return { ok: true, message: `Full refund issued. Funds return to buyer in 5–10 business days. Affiliate commission clawed back.${tail}` };
}

/* ─── Partial refund ─── */

export async function refundOrderPartial(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };
  const orderId = String(formData.get('orderId') ?? '');
  const amountInput = String(formData.get('amount') ?? '').trim();
  if (!orderId) return { ok: false, error: 'Missing order ID' };
  if (!amountInput) return { ok: false, error: 'Amount required (in dollars, e.g. 12.50)' };

  // Parse dollars → cents. Accept "12.50", "12", "$12.50"
  const cleaned = amountInput.replace(/[$,\s]/g, '');
  const dollars = parseFloat(cleaned);
  if (!isFinite(dollars) || dollars <= 0) return { ok: false, error: 'Invalid amount' };
  const amountCents = Math.round(dollars * 100);

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: 'Order not found' };
  if (!order.paypalCaptureId) return { ok: false, error: 'No PayPal capture to refund (order may still be PENDING_PAYMENT)' };
  if (order.status === 'REFUNDED') return { ok: false, error: 'Already fully refunded' };
  const remainingCents = Number(order.totalCents) - Number(order.refundedCents);
  if (amountCents > remainingCents) {
    return { ok: false, error: `Amount exceeds refundable balance ($${(remainingCents / 100).toFixed(2)} left after prior refunds)` };
  }

  // Call PayPal partial refund
  try {
    const token = await getAccessToken();
    const base = (process.env.PAYPAL_ENV ?? 'sandbox') === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
    const res = await fetch(`${base}/v2/payments/captures/${order.paypalCaptureId}/refund`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `merit-refund-${order.id}-${amountCents}`,
      },
      body: JSON.stringify({
        amount: { value: dollars.toFixed(2), currency_code: 'USD' },
      }),
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[admin/refundPartial] PayPal partial refund failed', res.status, text);
      return { ok: false, error: `PayPal partial refund failed (${res.status}): ${text.slice(0, 200)}` };
    }
  } catch (err: any) {
    console.error('[admin/refundPartial] PayPal API error', err);
    return { ok: false, error: `Partial refund request failed: ${err?.message ?? 'unknown'}` };
  }

  // Mark the order + increment refund ledger
  // isFullRefund = this refund brings the running total up to the order total
  const newRefundedCents = Number(order.refundedCents) + amountCents;
  const isFullRefund = newRefundedCents >= Number(order.totalCents);
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      refundedAt: isFullRefund ? new Date() : undefined,
      refundedCents: { increment: BigInt(amountCents) },
    },
  });

  // Claw back commission only on FULL refund (partials leave the commission)
  if (isFullRefund) {
    await clawBackCommission(order.paypalCaptureId!, orderId);
  }

  await recordOrderEvent({
    orderId,
    kind: isFullRefund ? 'REFUND_FULL' : 'REFUND_PARTIAL',
    message: `${isFullRefund ? 'Full' : 'Partial'} refund of $${dollars.toFixed(2)} issued via PayPal.`,
    metadata: { amount_cents: amountCents, capture_id: order.paypalCaptureId },
    actorEmail: admin.email,
  });

  // Fire customer refund email (records its own event row)
  const emailResult = await issueRefundEmail(orderId, {
    refundCents: amountCents,
    isFull: isFullRefund,
    reason: null,
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  const tail = emailResult.ok
    ? ` Customer notified (email id ${emailResult.id}).`
    : ` ⚠ Customer email failed: ${emailResult.error}`;
  return {
    ok: true,
    message: `Refunded $${dollars.toFixed(2)}${isFullRefund ? ' (full)' : ' (partial)'}. Funds return to buyer in 5–10 business days.${isFullRefund ? ' Affiliate commission clawed back.' : ''}${tail}`,
  };
}

/**
 * Claw back the affiliate commission tied to a PayPal capture.
 * Idempotent — webhook calls this same logic; double-call is a no-op.
 */
async function clawBackCommission(paypalCaptureId: string, orderId: string): Promise<void> {
  const commission = await prisma.orderCommission.findUnique({
    where: { paypalCaptureId },
  });
  if (!commission || commission.status === 'CLAWED_BACK') return;

  await prisma.$transaction([
    prisma.orderCommission.update({
      where: { id: commission.id },
      data: {
        status: 'CLAWED_BACK',
        clawedBackAt: new Date(),
        clawbackReason: 'Refund issued via admin',
      },
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

/* ─── Force-resend customer confirmation email (testing/recovery) ─── */

export async function forceResendConfirmation(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };
  const orderId = String(formData.get('orderId') ?? '');
  if (!orderId) return { ok: false, error: 'Missing order ID' };

  const result = await issueOrderConfirmationEmail(orderId);
  if (!result.ok) {
    return { ok: false, error: `Email send failed: ${result.error}` };
  }
  return { ok: true, message: `Confirmation email re-sent (Resend id: ${result.id})` };
}

/* ─── Resend the pay link to the customer (invoice / awaiting-payment order) ─── */
export async function resendPaymentRequest(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };
  const orderId = String(formData.get('orderId') ?? '');
  if (!orderId) return { ok: false, error: 'Missing order ID' };

  const result = await issuePaymentRequestEmail(orderId);
  if (!result.ok) return { ok: false, error: `Email send failed: ${result.error}` };
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: `Pay link re-sent to the customer.` };
}

/* ─── Re-check PayPal capture (escape hatch when webhook hasn't fired) ─── */

export async function recheckPayPalCapture(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };
  const orderId = String(formData.get('orderId') ?? '');
  if (!orderId) return { ok: false, error: 'Missing order ID' };

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, error: 'Order not found' };
  if (order.status !== 'PENDING_PAYMENT') {
    return { ok: false, error: `Order is already ${order.status}. Nothing to re-check.` };
  }

  // Pull PayPal order to see if a capture exists
  try {
    const token = await getAccessToken();
    const base = (process.env.PAYPAL_ENV ?? 'sandbox') === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
    const res = await fetch(`${base}/v2/checkout/orders/${order.paypalOrderId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[admin/recheck] PayPal fetch failed', res.status, text);
      return { ok: false, error: `PayPal lookup failed (${res.status}).` };
    }
    const payPalOrder: any = await res.json();
    const capture = payPalOrder?.purchase_units?.[0]?.payments?.captures?.[0];
    const captureStatus = capture?.status;

    if (!capture || captureStatus !== 'COMPLETED') {
      return { ok: false, error: `PayPal status: ${payPalOrder.status ?? 'unknown'} · capture: ${captureStatus ?? 'none'}. Buyer probably abandoned — Cancel order if so.` };
    }

    // Promote to PAID
    const captureId = capture.id;
    const payerId = payPalOrder?.payer?.payer_id ?? null;
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PAID',
        paypalCaptureId: captureId,
        paypalPayerId: payerId,
        paidAt: new Date(),
      },
    });
    await recordOrderEvent({
      orderId,
      kind: 'PAYMENT_CAPTURED',
      message: `Payment captured via admin re-check. Capture ID ${captureId}.`,
      metadata: { capture_id: captureId, source: 'admin_recheck' },
      actorEmail: admin.email,
    });

    // Fire confirmation email (the webhook would have done this)
    // — issueOrderConfirmationEmail() also fires the admin notification
    const emailResult = await issueOrderConfirmationEmail(orderId);

    revalidatePath(`/admin/orders/${orderId}`);
    revalidatePath('/admin/orders');

    if (!emailResult.ok) {
      return {
        ok: true,
        message: `Promoted to PAID. Capture: ${captureId}. ⚠ Customer email failed: ${emailResult.error}`,
      };
    }
    return {
      ok: true,
      message: `Promoted to PAID. Capture: ${captureId}. Customer notified (email id ${emailResult.id}).`,
    };
  } catch (err: any) {
    console.error('[admin/recheck] error', err);
    return { ok: false, error: `Re-check failed: ${err?.message ?? 'unknown'}` };
  }
}

/* ─── Add internal note ─── */

export async function updateInternalNote(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };
  const orderId = String(formData.get('orderId') ?? '');
  const note = String(formData.get('note') ?? '').trim();
  if (!orderId) return { ok: false, error: 'Missing order ID' };

  await prisma.order.update({
    where: { id: orderId },
    data: { internalNotes: note || null },
  });
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: 'Note saved.' };
}

/* ─── Add admin comment to the activity timeline ─── */

export async function addOrderComment(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };
  const orderId = String(formData.get('orderId') ?? '');
  const comment = String(formData.get('comment') ?? '').trim();
  if (!orderId) return { ok: false, error: 'Missing order ID' };
  if (!comment) return { ok: false, error: 'Comment is empty' };
  if (comment.length > 2000) return { ok: false, error: 'Comment too long (max 2000 chars)' };

  await recordOrderEvent({
    orderId,
    kind: 'ADMIN_COMMENT',
    message: comment,
    actorEmail: admin.email,
  });

  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: 'Comment added to timeline.' };
}
