/**
 * POST /api/subscription/manage
 * Body: { token, action: 'skip' | 'pause' | 'resume' | 'cancel' }
 * → { ok, subscription }
 *
 * The buyer's controls for a retail subscription. The signed token from their
 * emails is the only credential: it names one subscription and nothing else.
 */
import { NextResponse } from 'next/server';
import { verifyManageToken, applyAction, describeSubscription, type ManageAction } from '@/lib/retail-subscriptions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ACTIONS: ManageAction[] = ['skip', 'pause', 'resume', 'cancel'];

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const id = verifyManageToken(body?.token);
  if (!id) return NextResponse.json({ error: 'This link is not valid. Open it again from your email.' }, { status: 401 });
  const action = String(body?.action ?? '') as ManageAction;
  if (!ACTIONS.includes(action)) return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });

  const res = await applyAction(id, action, 'buyer');
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 409 });
  return NextResponse.json({ ok: true, subscription: await describeSubscription(id) });
}
