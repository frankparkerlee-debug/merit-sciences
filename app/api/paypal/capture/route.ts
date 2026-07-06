import { NextResponse } from 'next/server';
import { capturePayPalOrder } from '@/lib/paypal';
import { markCartsRecovered } from '@/lib/abandoned-cart';
import { fulfillCapturedOrder } from '@/lib/paypal-fulfillment';
import { recordOrderEvent } from '@/lib/orders';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * POST /api/paypal/capture
 *
 * Body: { orderId: string }
 *
 * Called by the client SDK after the buyer approves payment (PayPal popup or
 * Advanced Card Fields). We capture server-side (needs the access token) and
 * then run durable fulfillment inline.
 *
 * Fulfillment (order PAID + confirmation email + affiliate commission + ad
 * signal) normally lives in /api/paypal/webhook. But under the Merchant-of-
 * Record setup we don't yet control the webhook on that PayPal account, so we
 * run the SAME `fulfillCapturedOrder` here, synchronously. It's idempotent, so
 * once a webhook is wired the two paths can't double-book.
 *
 * Reconciliation: a COMPLETED capture promotes the order to PAID; anything
 * else (declined / pending / error) leaves it PENDING_PAYMENT and drops a
 * flagged note on the order so it surfaces in admin against the PayPal ledger.
 */
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const orderId = String(body.orderId ?? '').trim();
  if (!orderId) {
    return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
  }

  try {
    const captured = await capturePayPalOrder(orderId);

    const pu = captured.purchase_units?.[0];
    const capture = pu?.payments?.captures?.[0];
    const status = capture?.status ?? captured.status;

    if (status !== 'COMPLETED') {
      // PENDING (3DS), DECLINED, FAILED, etc. Flag for reconciliation; unpaid.
      await flagFailedCapture(orderId, String(status ?? 'UNKNOWN'));
      return NextResponse.json(
        { ok: false, status, error: `Payment status: ${status}` },
        { status: 402 },
      );
    }

    // ── Durable fulfillment — order PAID + email + commission + ad signal.
    // DETACHED, not awaited: the buyer's confirmation must not wait on
    // email/CAPI/DB round-trips. Every extra second here widens the window
    // where a proxy timeout / mid-deploy restart eats the response and the
    // buyer — already charged — sees a failure and pays again. Render runs a
    // long-lived Node process, so the detached promise completes reliably;
    // failures land in logs and surface as PAID-in-PayPal/unrecorded-here
    // during reconciliation. fulfillCapturedOrder is idempotent throughout.
    void fulfillCapturedOrder(captured, 'capture').catch((err) => {
      console.error('[paypal/capture] detached fulfillment failed after successful capture', err);
    });

    const payerEmail = captured.payer?.email_address ?? null;
    // Close out any abandoned-cart record for this shopper.
    markCartsRecovered([typeof body.email === 'string' ? body.email : null, payerEmail]).catch(() => {});

    return NextResponse.json({
      ok: true,
      orderId,
      captureId: capture.id,
      status,
      payerEmail,
      payerId: captured.payer?.payer_id ?? null,
      amount: capture.amount,
    });
  } catch (err: any) {
    console.error('[paypal/capture] failed:', err.message ?? err);
    await flagFailedCapture(orderId, 'CAPTURE_ERROR');
    return NextResponse.json(
      { ok: false, error: 'Capture failed. If you were charged, contact support — we can verify by your order id.' },
      { status: 500 },
    );
  }
}

/**
 * Drop a flagged note on the pre-created order so a failed/declined payment is
 * visible for reconciliation. The order stays PENDING_PAYMENT (unpaid).
 */
async function flagFailedCapture(paypalOrderId: string, status: string): Promise<void> {
  try {
    const pre = await prisma.order.findUnique({
      where: { paypalOrderId },
      select: { id: true },
    });
    if (!pre) return;
    await recordOrderEvent({
      orderId: pre.id,
      kind: 'ADMIN_COMMENT',
      message: `⚠️ Payment did not complete — PayPal status: ${status}. Order left unpaid; reconcile against PayPal.`,
      metadata: { payment_status: status, source: 'capture' },
    });
  } catch (e) {
    console.error('[paypal/capture] failed to flag failed capture', e);
  }
}
