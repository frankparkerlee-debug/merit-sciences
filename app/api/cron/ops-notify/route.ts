/**
 * Backstop for the fulfillment team's new-order emails.
 *
 * fulfillCapturedOrder already sends one inline on every capture. This sweep
 * catches the orders that send missed — Resend rate-limited or down, Render
 * restarting mid-webhook, a transient DB error — by finding paid orders with
 * no ADMIN_NOTIFIED event and sending them.
 *
 * Idempotent: notifyOpsOfOrder() skips any order already notified, so running
 * this often is free and running it twice cannot double-send.
 *
 * Send: GET /api/cron/ops-notify
 *       Authorization: Bearer ${CRON_SECRET}
 *
 * Recommended schedule: every 15 minutes. The point is that a missed order is
 * caught in minutes, not whenever somebody notices a package didn't ship.
 */
import { NextResponse } from 'next/server';
import { sweepOpsNotifications } from '@/lib/ops-notify';

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
    const result = await sweepOpsNotifications();
    if (result.sent > 0) {
      // Worth a log line: every one of these is an order the inline send lost.
      console.warn(`[cron/ops-notify] recovered ${result.sent} missed ops notification(s)`);
    }
    return NextResponse.json({ ok: true, ...result, durationMs: Date.now() - started });
  } catch (err) {
    console.error('[cron/ops-notify] failed', err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
