/**
 * POST /api/stripe/charge-saved   (CHECKOUT origin)
 * Body: { lines, buyer, discountCode?, ruoAttested, attemptId? }
 * →     { status: 'succeeded', orderId, processorId }
 *     | { status: 'requires_action', orderId, clientSecret }
 *
 * "Pay with the card on file" for a signed-in practitioner. Same contract as
 * /api/stripe/create-intent up to the charge: the cart is priced by
 * priceCart(), the order is persisted first, and the amount is never taken
 * from the client. The difference is the instrument: instead of opening an
 * intent for the Payment Element to confirm, the practice's stored card is
 * charged directly through chargeSavedCard(), and the Stripe webhook books
 * the order exactly as it does for every other card payment.
 *
 * The practice comes from the signed merit_practitioner cookie that
 * /api/checkout/claim set on this origin, re-read from the database, never
 * from the request body. priceCart() resolves the same cookie, and the two
 * must agree before anything is charged.
 */
import { NextResponse } from 'next/server';
import { createHash, randomUUID } from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { stripeEnabled, STRIPE_MIN_CHARGE_CENTS } from '@/lib/stripe';
import { preCreateOrder } from '@/lib/orders';
import { sanitizeCartLines, priceCart, isPriceError } from '@/lib/checkout-pricing';
import { ATTR_COOKIE, decodeAttrCookie } from '@/lib/attribution';
import { PRACTITIONER_COOKIE, verifyPractitionerCookie } from '@/lib/checkout-handoff';
import { savedCardFor, chargeSavedCard } from '@/lib/practitioner-card';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const US_STATE = /^[A-Z]{2}$/;

export async function POST(req: Request) {
  if (!stripeEnabled()) {
    return NextResponse.json({ error: 'Card payments are not available right now.' }, { status: 503 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body?.ruoAttested !== true) {
    return NextResponse.json(
      { error: 'You must confirm the research-use-only attestation before paying.', field: 'ruo' },
      { status: 400 },
    );
  }

  const applicationId = verifyPractitionerCookie(cookies().get(PRACTITIONER_COOKIE)?.value);
  if (!applicationId) {
    return NextResponse.json(
      { error: 'Your practitioner session was not found on this page. Reload checkout from your portal cart.' },
      { status: 401 },
    );
  }

  const lines = sanitizeCartLines(body?.lines);
  if (!lines) return NextResponse.json({ error: 'Invalid or empty cart' }, { status: 400 });

  const b = body?.buyer ?? {};
  const buyer = {
    email: String(b.email ?? '').trim().toLowerCase(),
    phone: String(b.phone ?? '').trim(),
    fullName: String(b.fullName ?? '').trim(),
    line1: String(b.line1 ?? '').trim(),
    line2: String(b.line2 ?? '').trim(),
    city: String(b.city ?? '').trim(),
    state: String(b.state ?? '').trim().toUpperCase(),
    zip: String(b.zip ?? '').trim(),
  };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(buyer.email)) {
    return NextResponse.json({ error: 'Enter a valid email address.', field: 'email' }, { status: 400 });
  }
  if (!buyer.fullName || !buyer.line1 || !buyer.city || !buyer.zip) {
    return NextResponse.json({ error: 'Complete your shipping address.', field: 'address' }, { status: 400 });
  }
  if (!US_STATE.test(buyer.state)) {
    return NextResponse.json({ error: 'Select a valid US state.', field: 'state' }, { status: 400 });
  }

  const priced = await priceCart({
    lines,
    discountCodeInput: String(body?.discountCode ?? ''),
    buyerEmail: buyer.email,
    shipping: { line1: buyer.line1, zip: buyer.zip },
  });
  if (isPriceError(priced)) {
    return NextResponse.json({ error: priced.error, field: priced.field }, { status: priced.status });
  }
  if (priced.practitionerApplicationId !== applicationId) {
    return NextResponse.json({ error: 'Practitioner pricing could not be confirmed for this cart.' }, { status: 403 });
  }
  if (priced.totalCents < STRIPE_MIN_CHARGE_CENTS) {
    return NextResponse.json(
      { error: `Order total is $${(priced.totalCents / 100).toFixed(2)}, below the $0.50 card minimum.` },
      { status: 400 },
    );
  }

  const card = await savedCardFor(applicationId);
  if (!card) {
    return NextResponse.json({ error: 'There is no card on file for this account.', code: 'no-card' }, { status: 409 });
  }

  const attemptId = String(body?.attemptId ?? '').slice(0, 64) || randomUUID();
  const fingerprint = createHash('sha256')
    .update(
      [
        attemptId,
        buyer.email,
        priced.totalCents,
        priced.discountCode ?? '',
        priced.lines.map((l) => `${l.handle}:${l.qty}:${l.unitCents}`).join(','),
      ].join('|'),
    )
    .digest('hex')
    .slice(0, 48);

  try {
    // Persist first. The processor id is a placeholder until the charge
    // exists; chargeSavedCard() re-points it at the PaymentIntent.
    const order = await preCreateOrder({
      paypalOrderId: `pending_${randomUUID().replace(/-/g, '')}`,
      customerEmail: buyer.email,
      customerName: buyer.fullName,
      customerPhone: buyer.phone || null,
      shippingFullName: buyer.fullName,
      shippingLine1: buyer.line1,
      shippingLine2: buyer.line2 || null,
      shippingCity: buyer.city,
      shippingState: buyer.state,
      shippingZip: buyer.zip,
      subtotalCents: priced.subtotalCents,
      shippingCents: priced.shippingCents,
      discountCents: priced.discountCents,
      totalCents: priced.totalCents,
      discountCode: priced.discountCode,
      affiliateId: priced.affiliateId,
      practitionerApplicationId: priced.practitionerApplicationId,
      lines: priced.lines.map((l) => ({
        handle: l.handle,
        title: l.title,
        bundleLabel: l.bundleLabel,
        unitCents: l.unitCents,
        qty: l.qty,
      })),
    });

    // RUO: the buyer ticked the attestation on this page before this call.
    await prisma.order.update({
      where: { id: order.id },
      data: {
        ruoAttested: true,
        ruoAttestedAt: new Date(),
        ruoAttestedIp: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null,
      },
    });

    const charge = await chargeSavedCard({
      orderId: order.id,
      idempotencyKey: `saved_${fingerprint}`,
      initiatedBy: 'buyer',
    });

    if (!charge.ok) {
      // A duplicate submit already charged an earlier order for this attempt;
      // the row created above is a stray. Remove it so admin never sees a
      // second "awaiting payment" order for one purchase. Best-effort.
      if (charge.code === 'duplicate') {
        await prisma.order
          .deleteMany({ where: { id: order.id, status: 'PENDING_PAYMENT' } })
          .catch((err) => console.error('[stripe/charge-saved] stray order cleanup failed', err));
      }
      const status =
        charge.code === 'declined' ? 402 : charge.code === 'no-card' || charge.code === 'duplicate' ? 409 : 500;
      return NextResponse.json({ error: charge.message, code: charge.code }, { status });
    }

    // Attribution, keyed by the processor id the order now carries. Non-fatal.
    try {
      const attr = decodeAttrCookie(cookies().get(ATTR_COOKIE)?.value);
      if (attr && (attr.source || attr.referrer || attr.clickId)) {
        await prisma.orderAttribution.upsert({
          where: { paypalOrderId: charge.paymentIntentId },
          create: {
            paypalOrderId: charge.paymentIntentId,
            source: attr.source ?? null,
            medium: attr.medium ?? null,
            campaign: attr.campaign ?? null,
            content: attr.content ?? null,
            term: attr.term ?? null,
            clickId: attr.clickId ?? null,
            referrer: attr.referrer ?? null,
            landing: attr.landing ?? null,
          },
          update: {},
        });
      }
    } catch (err) {
      console.error('[stripe/charge-saved] attribution write failed', err);
    }

    if (charge.status === 'requires_action') {
      return NextResponse.json({
        status: 'requires_action',
        orderId: order.id,
        processorId: charge.paymentIntentId,
        clientSecret: charge.clientSecret,
      });
    }
    return NextResponse.json({ status: 'succeeded', orderId: order.id, processorId: charge.paymentIntentId });
  } catch (err: any) {
    console.error('[stripe/charge-saved] failed:', { type: err?.type, code: err?.code, message: err?.message ?? String(err) });
    return NextResponse.json({ error: 'Could not complete the payment. Try again in a moment.' }, { status: 500 });
  }
}
