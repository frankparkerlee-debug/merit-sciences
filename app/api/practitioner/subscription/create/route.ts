/**
 * POST /api/practitioner/subscription/create   (CHECKOUT origin)
 * Body: { lines, discountCode?, shipping? }
 * → { ok, subscriptionId, amountCents }
 *
 * Opens a recurring order for a practice with a card on file, at the amount
 * priceCart() resolves RIGHT NOW — that figure is then frozen for the life of
 * the subscription, which is the price-lock Parker specified.
 *
 * Gated on SUBSCRIPTIONS_ENABLED. Stripe emails its own invoice receipts by
 * default, and those carry line items; until that is switched off in the
 * Dashboard, a live subscription would put a Stripe-branded receipt in front
 * of a practice. The flag exists so the code can ship before that setting is
 * changed without anything being able to fire.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getPricingContext } from '@/lib/pricing';
import { sanitizeCartLines, priceCart, isPriceError } from '@/lib/checkout-pricing';
import { createSubscription, cadenceFromLabel } from '@/lib/subscriptions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (process.env.SUBSCRIPTIONS_ENABLED !== 'on') {
    return NextResponse.json({ error: 'Recurring orders are not enabled yet.' }, { status: 503 });
  }

  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  // Identity comes from the pricing context, which resolves the practice from
  // the session on the storefront or the signed cookie on this origin — never
  // from the request body.
  const ctx = await getPricingContext();
  if (!ctx.session) {
    return NextResponse.json({ error: 'Practitioner account required.' }, { status: 401 });
  }

  const app = await prisma.practitionerApplication.findFirst({
    where: { id: ctx.session.applicationId, status: 'APPROVED' },
    select: { id: true, email: true, stripeCustomerId: true, cardPaymentMethodId: true },
  });
  if (!app?.stripeCustomerId || !app.cardPaymentMethodId) {
    return NextResponse.json(
      { error: 'Save a card on file before starting a recurring order.' },
      { status: 409 },
    );
  }

  const lines = sanitizeCartLines(body?.lines);
  if (!lines) return NextResponse.json({ error: 'Invalid or empty cart' }, { status: 400 });

  /* Every line must be a subscribe line, and all on the same cadence.
     The smoke test showed why: priceCart() prices whatever cart it is handed,
     so a mixed cart would freeze one-time items into the recurring amount and
     re-ship them every cycle. The cadence is parsed from each line's own
     bundleLabel — the string the buyer saw — never from a separate field. */
  const cadences = lines.map((l) => cadenceFromLabel(l.bundleLabel));
  if (cadences.some((c) => c === null)) {
    return NextResponse.json(
      { error: 'Recurring orders can only contain subscription items. Purchase one-time items separately.' },
      { status: 400 },
    );
  }
  const cadence = cadences[0]!;
  if (!cadences.every((c) => c!.unit === cadence.unit && c!.count === cadence.count)) {
    return NextResponse.json(
      { error: 'All items in a recurring order must renew on the same schedule.' },
      { status: 400 },
    );
  }

  /* No discount codes on recurring orders. The frozen amount recurs for the
     life of the subscription, so a one-time code (WELCOME10 is one per
     customer) would silently become a permanent price cut — the smoke test
     froze $90.99/mo where the honest recurring price is $99.98. */
  if (String(body?.discountCode ?? '').trim()) {
    return NextResponse.json(
      { error: 'Discount codes cannot be applied to recurring orders.' },
      { status: 400 },
    );
  }

  // The amount is whatever this cart costs today, resolved by the same pricer
  // the card checkout uses — never a figure from the client.
  const priced = await priceCart({ lines, buyerEmail: app.email });
  if (isPriceError(priced)) {
    return NextResponse.json({ error: priced.error }, { status: priced.status });
  }

  try {
    const { row } = await createSubscription({
      applicationId: app.id,
      stripeCustomerId: app.stripeCustomerId,
      customerEmail: app.email,
      lines: priced.lines,
      amountCents: priced.totalCents,
      cadence,
      affiliateId: priced.affiliateId,
      discountCode: priced.discountCode,
      shipping: body?.shipping ?? null,
    });
    return NextResponse.json({
      ok: true,
      subscriptionId: row.id,
      amountCents: row.unitAmountCents,
      cadence: `${cadence.count} ${cadence.unit}${cadence.count === 1 ? '' : 's'}`,
    });
  } catch (err) {
    console.error('[subscription/create] failed', err);
    return NextResponse.json({ error: 'Could not start the recurring order.' }, { status: 502 });
  }
}
