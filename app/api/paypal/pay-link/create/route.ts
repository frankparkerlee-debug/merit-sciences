/**
 * POST /api/paypal/pay-link/create
 * Body: { token: string }
 *
 * Starts payment for an admin-created PENDING_PAYMENT order via a signed pay
 * link. Builds a PayPal order from the order's STORED amounts (custom /
 * wholesale pricing is preserved — never re-priced from the catalog), then
 * points the order's paypalOrderId at the freshly-created PayPal order so the
 * EXISTING /api/paypal/capture + fulfillCapturedOrder path promotes it to PAID
 * (confirmation email + affiliate commission) with zero new fulfillment code.
 *
 * Tamper-proof: the amount and items come from the DB keyed by the verified
 * token — the client sends only the token. An order that isn't PENDING_PAYMENT
 * is rejected (already paid / canceled).
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createPayPalOrder } from '@/lib/paypal';
import { verifyPayToken, buildPayToken } from '@/lib/pay-link';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const token = String(body.token ?? '').trim();
  const orderId = verifyPayToken(token);
  if (!orderId) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { lines: true },
  });
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.status !== 'PENDING_PAYMENT') {
    return NextResponse.json({ error: 'This order is not awaiting payment.', status: order.status }, { status: 409 });
  }
  if (order.lines.length === 0) {
    return NextResponse.json({ error: 'Order has no line items.' }, { status: 422 });
  }

  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://meritsciences.com').replace(/\/$/, '');
  const payUrl = `${base}/pay/${buildPayToken(order.id)}`;

  try {
    const ppOrder = await createPayPalOrder({
      subtotalCents: Number(order.subtotalCents),
      shippingCents: Number(order.shippingCents),
      discountCents: Number(order.discountCents),
      totalCents: Number(order.totalCents),
      items: order.lines.map((l) => ({
        name: l.title.slice(0, 127),
        description: l.bundleLabel?.slice(0, 127) || undefined,
        quantity: l.qty,
        unitCents: Number(l.unitCents),
        sku: l.handle.slice(0, 127),
      })),
      // Carries affiliate + code attribution into fulfillment (custom_id),
      // matching the storefront checkout so commission credits correctly.
      customId: JSON.stringify({ a: order.affiliateId ?? null, c: order.discountCode ?? null }),
      description: `Merit Sciences order ${order.paypalOrderId}`,
      returnUrl: payUrl,
      cancelUrl: payUrl,
      // SET the admin-entered ship-to so PayPal/wallet can't override where a
      // wholesale order goes.
      shippingName: order.shippingFullName,
      shippingAddress: {
        address_line_1: order.shippingLine1,
        address_line_2: order.shippingLine2 || undefined,
        admin_area_1: order.shippingState,
        admin_area_2: order.shippingCity,
        postal_code: order.shippingZip,
        country_code: 'US',
      },
      payerEmail: order.customerEmail,
    });

    // Point the order at the real PayPal order id so the shared capture +
    // fulfillment path finds and promotes THIS order (no duplicate row).
    // ruoAttested is (re)affirmed here — the customer ticks the RUO box on the
    // pay page before this call is allowed to run.
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paypalOrderId: ppOrder.id,
        ruoAttested: true,
        ruoAttestedAt: new Date(),
        ruoAttestedIp: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null,
      },
    });

    return NextResponse.json({ orderId: ppOrder.id });
  } catch (err) {
    console.error('[pay-link/create] failed', err);
    return NextResponse.json({ error: 'Could not start payment. Please try again.' }, { status: 502 });
  }
}
