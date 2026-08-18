/**
 * POST /api/practitioner/card/start   (STOREFRONT origin)
 * → { url }
 *
 * Mints a short-lived signed grant to add a card to the signed-in practice and
 * returns the checkout-domain URL that collects it. The grant is derived from
 * the session here because this is the only origin where that session exists —
 * Stripe must never see the storefront domain, so capture happens over there.
 */
import { NextResponse } from 'next/server';
import { getPractitionerSession } from '@/lib/practitioner-session';
import { signCardToken } from '@/lib/practitioner-card';
import { checkoutOrigin } from '@/lib/checkout-domain';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await getPractitionerSession();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });

  const token = signCardToken(session.applicationId, Date.now());
  const origin = checkoutOrigin() || '';
  return NextResponse.json({ url: `${origin}/card?t=${encodeURIComponent(token)}` });
}
