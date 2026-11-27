/**
 * Daily subscription run: reminders, then renewals.
 *
 *   GET /api/cron/subscription-renewals
 *       &dry=1      report what is due, charge nothing, email nothing
 *       &limit=50   max renewals this run
 *   Authorization: Bearer ${CRON_SECRET}
 *
 * Safe to run more than once a day: a reminder is sent once per scheduled
 * charge, and each charge carries an idempotency key built from the
 * subscription and its scheduled date.
 */
import { NextResponse } from 'next/server';
import { runRenewals, sendUpcomingReminders } from '@/lib/retail-subscriptions';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return NextResponse.json({ ok: false, error: 'CRON_SECRET not configured on server' }, { status: 500 });
  if (request.headers.get('authorization') !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const url = new URL(request.url);
  const dry = url.searchParams.get('dry') === '1';
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10) || 50));
  const now = new Date();
  try {
    const reminders = await sendUpcomingReminders(now, dry);
    const renewals = await runRenewals(now, limit, dry);
    return NextResponse.json({ ok: true, mode: dry ? 'dry' : 'run', ...reminders, ...renewals });
  } catch (err: any) {
    console.error('[cron/subscription-renewals] failed', err);
    return NextResponse.json({ ok: false, error: err?.message ?? 'failed' }, { status: 500 });
  }
}
