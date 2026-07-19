/**
 * Daily processor for the customer lifecycle sequences (post-delivery
 * follow-up, replenishment, win-back) — see lib/customer-journey.ts.
 *
 * Run on Render Cron once per day, alongside /api/cron/prospect-emails.
 * Auth: bearer token matching CRON_SECRET (same pattern as every /api/cron
 * job).
 *
 * Send: GET /api/cron/customer-emails
 *       Authorization: Bearer ${CRON_SECRET}
 */
import { NextResponse } from 'next/server';
import { tickCustomers } from '@/lib/customer-journey';

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
    const result = await tickCustomers();
    return NextResponse.json({ ok: true, ...result, durationMs: Date.now() - started });
  } catch (err) {
    console.error('[cron/customer-emails] failed', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
