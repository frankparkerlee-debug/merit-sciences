import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { sendPayoutAnnouncement } from '@/lib/affiliate-payout-announcement';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Affiliate payout-setup announcement — the one-time broadcast telling every
 * affiliate how to connect direct deposit (PayPal terminated 2026-08-12).
 *
 *   GET                        → dry run: who would receive it, and their
 *                                owed balance. Sends nothing.
 *   POST { test: true }        → delivers ONE copy to the signed-in admin,
 *                                rendered as the highest-balance affiliate
 *                                would see it.
 *   POST { confirm: "SEND" }   → real broadcast to every ACTIVE affiliate
 *                                without a connected Stripe account.
 *
 * The literal confirm token is deliberate: a broadcast to real people should
 * be impossible to trigger by a stray click or a mis-typed curl. There is no
 * cron path — this only ever runs when a human asks for it.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await sendPayoutAnnouncement({ mode: 'dry-run' });
  return NextResponse.json({
    ...result,
    wouldSendTo: result.recipients.length,
    totalOwedCents: result.recipients.reduce((s, r) => s + r.owedCents, 0),
    hint: 'POST {"test":true} to send yourself a copy · POST {"confirm":"SEND"} to broadcast',
  });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine — treated as neither test nor confirmed */
  }

  if (body?.test === true) {
    const result = await sendPayoutAnnouncement({ mode: 'test', testTo: admin.email });
    return NextResponse.json(result);
  }

  if (body?.confirm !== 'SEND') {
    return NextResponse.json(
      {
        error:
          'Refusing to broadcast without confirmation. POST {"confirm":"SEND"} to send for real, or {"test":true} to send yourself a copy first.',
      },
      { status: 400 },
    );
  }

  const result = await sendPayoutAnnouncement({ mode: 'broadcast' });
  console.log(`[payout-announcement] broadcast authorized by ${admin.email}`);
  return NextResponse.json(result);
}
