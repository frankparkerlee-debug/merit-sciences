/**
 * POST /api/subscription/card-intent   (CHECKOUT origin)
 * Body: { token } → { clientSecret, publishableKey }
 *
 * Opens a SetupIntent so a subscriber can put a different card on file.
 * Nothing is charged here.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { stripe, stripeEnabled } from '@/lib/stripe';
import { verifyManageToken } from '@/lib/retail-subscriptions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!stripeEnabled()) return NextResponse.json({ error: 'Card updates are unavailable right now.' }, { status: 503 });
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const id = verifyManageToken(body?.token);
  if (!id) return NextResponse.json({ error: 'This link is not valid. Open it again from your email.' }, { status: 401 });
  const sub = await prisma.retailSubscription.findUnique({ where: { id }, select: { stripeCustomerId: true, status: true } });
  if (!sub || sub.status === 'CANCELED') return NextResponse.json({ error: 'This subscription has ended.' }, { status: 409 });

  const si = await stripe().setupIntents.create({
    customer: sub.stripeCustomerId,
    usage: 'off_session',
    payment_method_types: ['card'],
    metadata: { retailSubscriptionId: id },
  });
  return NextResponse.json({ clientSecret: si.client_secret, publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? '' });
}
