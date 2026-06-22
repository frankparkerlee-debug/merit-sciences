/**
 * Abandoned-cart recovery sweep. Run on Render Cron (hourly is ideal; daily
 * works). Auth: bearer token matching CRON_SECRET (same pattern as the other
 * crons). Emails are gated behind ABANDONED_CART_RECOVERY=on — until that's
 * set this no-ops and reports { enabled: false }.
 *
 * Send: GET /api/cron/abandoned-carts
 *       Authorization: Bearer ${CRON_SECRET}
 */
import { NextResponse } from 'next/server';
import { sweepAbandonedCarts } from '@/lib/abandoned-cart';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: 'CRON_SECRET not configured on server' },
      { status: 500 },
    );
  }
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const started = Date.now();
  try {
    const result = await sweepAbandonedCarts();
    return NextResponse.json({ ok: true, ...result, durationMs: Date.now() - started });
  } catch (err) {
    console.error('[cron/abandoned-carts] failed', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
