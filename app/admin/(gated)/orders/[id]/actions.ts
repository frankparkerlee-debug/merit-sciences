'use server';

/**
 * Admin server actions for order management.
 * All actions verify admin auth before mutating.
 */

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-session';
import { normalizeCarrier, trackingUrlFor, issueShipmentEmail, issueOrderConfirmationEmail, issueAdminOrderNotification } from '@/lib/orders';
import { getAccessToken } from '@/lib/paypal';

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

  // Fire shipment notification email + surface success/failure to operator
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
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  return { ok: true, message: 'Marked as Delivered.' };
}

/* ─── Mark order as Canceled (no money movement) ─── */

export async function markCanceled(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };
  const orderId = String(formData.get('orderId') ?? '');
  if (!orderId) return { ok: false, error: 'Missing order ID' };

  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'CANCELED', canceledAt: new Date() },
  });
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  return { ok: true, message: 'Canceled. (No refund issued — use Refund button if money was charged.)' };
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
      return { ok: false, error: `PayPal refund failed (${res.status}). Check Stripe Dashboard.` };
    }
  } catch (err: any) {
    console.error('[admin/refund] PayPal API error', err);
    return { ok: false, error: `Refund request failed: ${err?.message ?? 'unknown'}` };
  }

  // Mark our Order — webhook will also do this when PAYMENT.CAPTURE.REFUNDED fires
  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'REFUNDED', refundedAt: new Date() },
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  return { ok: true, message: 'Refund issued. Funds return to buyer in 5–10 business days.' };
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
  if (amountCents > Number(order.totalCents)) {
    return { ok: false, error: `Amount exceeds order total (${(Number(order.totalCents) / 100).toFixed(2)})` };
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

  // Mark the order — webhook would also do this when PARTIALLY_REFUNDED fires
  const isFullRefund = amountCents === Number(order.totalCents);
  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      refundedAt: isFullRefund ? new Date() : undefined,
    },
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  return {
    ok: true,
    message: `Refunded $${dollars.toFixed(2)}${isFullRefund ? ' (full)' : ' (partial)'}. Funds return to buyer in 5–10 business days.`,
  };
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
