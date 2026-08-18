/**
 * POST /api/practitioner/card/remove   (STOREFRONT origin)
 *
 * Detaches the card at Stripe and clears our mirror. Session-gated: a practice
 * can only remove its own card.
 */
import { NextResponse } from 'next/server';
import { getPractitionerSession } from '@/lib/practitioner-session';
import { removeCard } from '@/lib/practitioner-card';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await getPractitionerSession();
  if (!session) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  await removeCard(session.applicationId);
  return NextResponse.json({ ok: true });
}
