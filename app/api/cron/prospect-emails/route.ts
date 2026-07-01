/**
 * Daily processor for the consumer prospect drip (subscribers who gave us
 * their email but haven't purchased). Run on Render Cron once per day. Auth:
 * bearer token matching CRON_SECRET (same pattern as the other /api/cron jobs).
 *
 * Send: GET /api/cron/prospect-emails
 *       Authorization: Bearer ${CRON_SECRET}
 */
import { NextResponse } from 'next/server';
import { tickProspects } from '@/lib/prospect-journey';

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
    const result = await tickProspects();
    return NextResponse.json({ ok: true, ...result, durationMs: Date.now() - started });
  } catch (err) {
    console.error('[cron/prospect-emails] failed', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
