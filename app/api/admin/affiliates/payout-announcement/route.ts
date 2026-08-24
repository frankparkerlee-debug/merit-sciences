import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { requireAdmin } from '@/lib/admin-session';
import { sendPayoutAnnouncement } from '@/lib/affiliate-payout-announcement';

/** Operator identity for this request: a signed-in admin, or the ops secret
 *  (Authorization: Bearer CRON_SECRET) for sends run from the ops tooling.
 *  Both are humans deciding to send — the confirm token below still applies. */
async function requireOperator(req: Request): Promise<string | null> {
  const admin = await requireAdmin();
  if (admin) return admin.email;
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get('authorization') ?? '';
  if (secret && header.startsWith('Bearer ')) {
    const given = Buffer.from(header.slice(7));
    const expected = Buffer.from(secret);
    if (given.length === expected.length && timingSafeEqual(given, expected)) {
      return 'ops-secret';
    }
  }
  return null;
}

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
export async function GET(req: Request) {
  const operator = await requireOperator(req);
  if (!operator) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await sendPayoutAnnouncement({ mode: 'dry-run' });
  return NextResponse.json({
    ...result,
    wouldSendTo: result.recipients.length,
    totalOwedCents: result.recipients.reduce((s, r) => s + r.owedCents, 0),
    hint: 'POST {"test":true} to send yourself a copy · POST {"confirm":"SEND"} to broadcast',
  });
}

export async function POST(req: Request) {
  const operator = await requireOperator(req);
  if (!operator) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    /* empty body is fine — treated as neither test nor confirmed */
  }

  if (body?.test === true) {
    const testTo =
      operator === 'ops-secret' ? String(body?.testTo ?? '').trim() : operator;
    if (!testTo) {
      return NextResponse.json({ error: 'test mode via ops secret requires testTo' }, { status: 400 });
    }
    const result = await sendPayoutAnnouncement({ mode: 'test', testTo });
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
  console.log(`[payout-announcement] broadcast authorized by ${operator}`);
  return NextResponse.json(result);
}
