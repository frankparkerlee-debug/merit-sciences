import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/paypal/order-status?orderId=<paypal order id>
 *
 * DB-truth recovery probe for the checkout client. When the browser loses
 * the /api/paypal/capture response (proxy timeout, mid-deploy restart, flaky
 * mobile network) the buyer can't tell whether they paid. The client polls
 * this BEFORE showing any failure UI: if fulfillment recorded the capture,
 * the buyer is sent to the thank-you page instead of being nudged into
 * paying a second time.
 *
 * Returns only { found, paid } — no order details. The PayPal order id is
 * high-entropy and unguessable, and no PII leaves this endpoint.
 */
export async function GET(req: Request) {
  const orderId = new URL(req.url).searchParams.get('orderId')?.trim() ?? '';
  if (!orderId) {
    return NextResponse.json({ found: false, paid: false }, { status: 400 });
  }
  try {
    const order = await prisma.order.findUnique({
      where: { paypalOrderId: orderId },
      select: { status: true },
    });
    // Pre-created orders sit at PENDING_PAYMENT until a capture promotes
    // them; CANCELED means no live charge. Everything else = money moved.
    const paid = !!order && order.status !== 'PENDING_PAYMENT' && order.status !== 'CANCELED';
    return NextResponse.json({ found: !!order, paid });
  } catch {
    // DB hiccup → report unpaid; the client falls back to its cautious
    // "check your inbox before retrying" message rather than an error page.
    return NextResponse.json({ found: false, paid: false });
  }
}
