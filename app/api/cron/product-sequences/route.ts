/**
 * Daily processor for the compound education sequences (lib/sequence-journey.ts).
 * Advances every active SequenceEnrollment to its next due beat.
 *
 * Send: GET /api/cron/product-sequences
 *       Authorization: Bearer ${CRON_SECRET}
 */
import { NextResponse } from 'next/server';
import { tickSequences } from '@/lib/sequence-journey';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET not configured on server' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const started = Date.now();
  try {
    const result = await tickSequences();
    return NextResponse.json({ ok: true, ...result, durationMs: Date.now() - started });
  } catch (err) {
    console.error('[cron/product-sequences] failed', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
