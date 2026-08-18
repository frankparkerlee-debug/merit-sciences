/**
 * POST /api/practitioner/card/setup-intent   (CHECKOUT origin)
 * Body: { token }
 * → { clientSecret, publishableKey, practiceName }
 *
 * Opens a SetupIntent so the browser can collect a card with Stripe Elements.
 * A SetupIntent rather than a PaymentIntent because nothing is being charged —
 * we are only storing an instrument for later use.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { stripe, stripeEnabled } from '@/lib/stripe';
import { verifyCardToken, ensureStripeCustomer } from '@/lib/practitioner-card';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!stripeEnabled()) {
    return NextResponse.json({ error: 'Card storage is unavailable right now.' }, { status: 503 });
  }
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const applicationId = verifyCardToken(String(body?.token ?? ''), Date.now());
  if (!applicationId) {
    return NextResponse.json({ error: 'This link has expired. Open it again from your portal.' }, { status: 401 });
  }
  const app = await prisma.practitionerApplication.findFirst({
    where: { id: applicationId, status: 'APPROVED' },
    select: { practiceName: true },
  });
  if (!app) return NextResponse.json({ error: 'Account not active.' }, { status: 403 });

  const customerId = await ensureStripeCustomer(applicationId);
  const si = await stripe().setupIntents.create({
    customer: customerId,
    // off_session: the card is being saved now to be charged later without the
    // practice present, which is what tells Stripe to collect the right
    // mandate up front.
    usage: 'off_session',
    payment_method_types: ['card'],
    metadata: { applicationId },
  });

  return NextResponse.json({
    clientSecret: si.client_secret,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? '',
    practiceName: app.practiceName,
  });
}
