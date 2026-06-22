import { NextResponse } from 'next/server';
import { capturePayPalOrder } from '@/lib/paypal';
import { markCartsRecovered } from '@/lib/abandoned-cart';

export const runtime = 'nodejs';

/**
 * POST /api/paypal/capture
 *
 * Body: { orderId: string }
 *
 * Called by the client SDK after the buyer approves payment (either
 * via the PayPal popup or the Advanced Card Fields form). We capture
 * server-side because:
 *   - The capture call requires our access token (server-only)
 *   - We don't want the buyer's browser to trust the capture status
 *
 * Returns: { ok: true, captureId, status, payerEmail } on success.
 *
 * NOTE: This endpoint does NOT write OrderCommission rows. That work
 * happens in /api/paypal/webhook which fires asynchronously after
 * PAYMENT.CAPTURE.COMPLETED. The webhook is the durable, retryable
 * source of truth; this endpoint just settles the buyer's flow.
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

    // Surface a friendly summary back to the client. The full PayPal
    // response is large; pick the fields we'll actually display.
    const pu = captured.purchase_units?.[0];
    const capture = pu?.payments?.captures?.[0];
    const status = capture?.status ?? captured.status;

    if (status !== 'COMPLETED') {
      // Could be PENDING (3DS challenge), DECLINED, FAILED, etc.
      return NextResponse.json(
        { ok: false, status, error: `Payment status: ${status}` },
        { status: 402 },
      );
    }

    const payerEmail = captured.payer?.email_address ?? null;
    // Close out any abandoned-cart record for this shopper so the recovery
    // cron never nudges someone who just bought. Fire-and-forget — the typed
    // email covers the card flow, payer email covers the wallet flow.
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
    return NextResponse.json(
      { ok: false, error: 'Capture failed. If you were charged, contact support — we can verify by your order id.' },
      { status: 500 },
    );
  }
}
