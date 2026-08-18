/**
 * POST /api/practitioner/card/save   (CHECKOUT origin)
 * Body: { token, setupIntentId }
 * → { ok, brand, last4 }
 *
 * Called after Elements confirms. The SetupIntent is re-read server-side and
 * checked against the practice's own Stripe customer before anything is
 * stored, so a browser cannot hand us someone else's intent id.
 */
import { NextResponse } from 'next/server';
import { verifyCardToken, storeCardFromSetupIntent } from '@/lib/practitioner-card';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const applicationId = verifyCardToken(String(body?.token ?? ''), Date.now());
  if (!applicationId) return NextResponse.json({ error: 'This link has expired.' }, { status: 401 });

  const setupIntentId = String(body?.setupIntentId ?? '').trim();
  if (!setupIntentId) return NextResponse.json({ error: 'Missing setup intent.' }, { status: 400 });

  try {
    const card = await storeCardFromSetupIntent(applicationId, setupIntentId);
    if (!card) return NextResponse.json({ error: 'That card could not be saved.' }, { status: 400 });
    return NextResponse.json({ ok: true, ...card });
  } catch (err) {
    console.error('[practitioner-card] save failed', err);
    return NextResponse.json({ error: 'That card could not be saved.' }, { status: 502 });
  }
}
