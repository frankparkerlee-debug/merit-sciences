import { NextResponse } from 'next/server';
import { recordAbandonedCart } from '@/lib/abandoned-cart';
import { getActiveReferral } from '@/lib/referral';

export const runtime = 'nodejs';

/**
 * POST /api/abandoned-cart
 *
 * Body: { email, lines, source? }
 *
 * Persists the live cart the moment a valid email is entered at checkout,
 * so the lead + contents survive if the shopper bails. Referral is resolved
 * SERVER-side from the merit_ref cookie (not trusted from the client) so a
 * recovered checkout keeps its discount + affiliate attribution. Always
 * returns 200-ish quickly; never blocks the buyer.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const ref = await getActiveReferral().catch(() => null);

  const res = await recordAbandonedCart({
    email: String(body?.email ?? ''),
    lines: body?.lines,
    referralCode: ref?.code ?? null,
    referralSlug: ref?.slug ?? null,
    source: typeof body?.source === 'string' ? body.source : 'checkout',
  });

  if (!res.ok) return NextResponse.json({ ok: false }, { status: 400 });
  return NextResponse.json({ ok: true });
}
