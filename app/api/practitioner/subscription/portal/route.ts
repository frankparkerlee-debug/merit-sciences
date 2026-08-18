/**
 * POST /api/practitioner/subscription/portal   (STOREFRONT origin)
 * → { url }
 *
 * Hands back a Stripe-hosted billing portal link. This is why there is no
 * pause / cancel / update-card UI in the portal: Stripe hosts all of it, and
 * anything we built would be a worse copy that also has to handle dunning.
 *
 * The return_url names the CHECKOUT origin deliberately — it is given to
 * Stripe and shown to the practice, so it must never be the storefront.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getPractitionerSession } from '@/lib/practitioner-session';
import { billingPortalUrl } from '@/lib/subscriptions';
import { checkoutOrigin } from '@/lib/checkout-domain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await getPractitionerSession();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const app = await prisma.practitionerApplication.findUnique({
    where: { id: session.applicationId },
    select: { stripeCustomerId: true },
  });
  if (!app?.stripeCustomerId) {
    return NextResponse.json({ error: 'No billing account yet.' }, { status: 409 });
  }

  try {
    const url = await billingPortalUrl(app.stripeCustomerId, `${checkoutOrigin() ?? ''}/pay-home`);
    return NextResponse.json({ url });
  } catch (err) {
    console.error('[subscription/portal] failed', err);
    return NextResponse.json({ error: 'Could not open billing management.' }, { status: 502 });
  }
}
