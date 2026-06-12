import { NextResponse } from 'next/server';
import { issueOrderLookupEmail } from '@/lib/orders';

export const runtime = 'nodejs';

/**
 * POST /api/orders/lookup
 * Body: { email, orderRef }
 *
 * Sends a magic-link to view the order — only if email matches the
 * order's customerEmail. ALWAYS returns 200 to prevent email/order
 * enumeration; check the result in your inbox.
 */
export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ ok: true }); // always 200
  }
  const email = String(body.email ?? '').trim().toLowerCase();
  const orderRef = String(body.orderRef ?? '').trim();
  if (!email || !orderRef) return NextResponse.json({ ok: true });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;
  // Fire-and-forget; we always return success-shape regardless
  issueOrderLookupEmail(email, orderRef, ip).catch((err) => {
    console.error('[orders/lookup] send failed', err);
  });
  return NextResponse.json({ ok: true });
}
