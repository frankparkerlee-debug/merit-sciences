/**
 * POST /api/subscription/card-save   (CHECKOUT origin)
 * Body: { token, setupIntentId } → { ok, brand, last4, subscription }
 *
 * Records the card a subscriber just confirmed. The server re-reads the
 * SetupIntent and checks it belongs to this subscriber before trusting it.
 */
import { NextResponse } from 'next/server';
import { verifyManageToken, replaceCard, describeSubscription } from '@/lib/retail-subscriptions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const id = verifyManageToken(body?.token);
  if (!id) return NextResponse.json({ error: 'This link is not valid. Open it again from your email.' }, { status: 401 });
  const setupIntentId = String(body?.setupIntentId ?? '');
  if (!/^seti_[A-Za-z0-9]+$/.test(setupIntentId)) return NextResponse.json({ error: 'That card could not be saved.' }, { status: 400 });
  try {
    const card = await replaceCard(id, setupIntentId);
    if (!card) return NextResponse.json({ error: 'That card could not be saved.' }, { status: 400 });
    return NextResponse.json({ ok: true, ...card, subscription: await describeSubscription(id) });
  } catch (err) {
    console.error('[subscription/card-save] failed', err);
    return NextResponse.json({ error: 'That card could not be saved.' }, { status: 502 });
  }
}
