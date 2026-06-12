'use server';

/**
 * Admin server actions for order management.
 * All actions verify admin auth before mutating.
 */

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-session';
import { normalizeCarrier, trackingUrlFor, issueShipmentEmail } from '@/lib/orders';
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

  // Fire shipment notification email (async — don't block on send)
  issueShipmentEmail(orderId).catch((err) => {
    console.error('[admin/markShipped] shipment email failed', err);
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/admin/orders');
  return { ok: true, message: `Shipped via ${normalizedCarrier.toUpperCase()} · tracking ${trackingNumber}. Customer notified.` };
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
