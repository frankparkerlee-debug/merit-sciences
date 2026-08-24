import 'server-only';
import { prisma } from './db';
import { sendEmail } from './email';
import { wrapMarketingEmail, h, p, cta, quiet, SITE } from './marketing-email-shell';

/* ─────────────────────────────────────────────────────────────────────────
   PAYOUT SETUP ANNOUNCEMENT — the one-time "here is how you get paid now"
   email to the whole affiliate roster.

   Distinct from lib/affiliate-payout-nudge.ts: that is a 3-touch drip that
   chases stragglers over weeks. This is a single broadcast explaining the
   change (PayPal terminated 2026-08-12, direct deposit is the only rail)
   with step-by-step instructions.

   Sending it stamps payoutNudgeLastAt so the drip's 3-day spacing applies
   from this send — nobody gets the announcement and a nudge on consecutive
   days.

   ── SEND DISCIPLINE ──────────────────────────────────────────────────────
   Every send is an explicit, admin-triggered action. There is no cron entry
   and no automatic path: broadcasting to real people is Parker's decision,
   made once, not a behavior the system can drift into.
   ───────────────────────────────────────────────────────────────────────── */

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function step(n: number, html: string): string {
  return `<tr>
    <td style="vertical-align:top;padding:0 12px 14px 0;width:26px;">
      <div style="width:24px;height:24px;border-radius:12px;background:#2D6BE4;color:#ffffff;font:700 12px/24px -apple-system,Helvetica,Arial,sans-serif;text-align:center;">${n}</div>
    </td>
    <td style="vertical-align:top;padding:0 0 14px 0;font:400 15px/1.55 -apple-system,Helvetica,Arial,sans-serif;color:#33383F;">${html}</td>
  </tr>`;
}

/**
 * The canonical direct-deposit setup walkthrough, shared by every email that
 * needs it — this announcement, the admin invite, and the sign-up welcome —
 * so the instructions can never drift between them.
 */
export function payoutSetupStepsHtml(): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;margin:0 0 8px 0;">
    ${step(1, `Sign in to your affiliate dashboard at <a href="${SITE}/affiliate/login" style="color:#2D6BE4;">${SITE.replace('https://', '')}/affiliate/login</a>`)}
    ${step(2, 'Open <strong>Settings</strong> from the dashboard menu')}
    ${step(3, 'Click <strong>Set up direct deposit</strong>')}
    ${step(4, 'Complete the secure form — it asks for your identity details and the bank account you want paid into. This is handled by Stripe, our payments provider; Merit never sees your bank details.')}
    ${step(5, 'You’re done when your settings page shows <strong>✓ Direct deposit connected</strong>')}
  </table>`;
}

export function buildPayoutAnnouncement(args: {
  firstName: string;
  owedCents: number;
  hadPaypal: boolean;
}): { subject: string; html: string } {
  const { firstName, owedCents, hadPaypal } = args;
  const settingsUrl = `${SITE}/affiliate/dashboard/settings`;
  const hasMoney = owedCents > 0;

  const subject = hasMoney
    ? `Action needed: set up direct deposit to receive your ${money(owedCents)}`
    : 'Action needed: set up direct deposit for your commissions';

  const bodyHtml = [
    h('Merit affiliate payouts are moving to direct deposit'),

    hasMoney
      ? p(
          `Hi ${firstName} — you've earned <strong>${money(owedCents)}</strong> in commission so far. ` +
            `To receive it, you now need to connect direct deposit to your affiliate account. ` +
            `It takes about two minutes and only has to be done once.`,
        )
      : p(
          `Hi ${firstName} — a quick change to how Merit pays affiliate commissions. ` +
            `Payouts now go by direct deposit to your bank, and you'll need to connect ` +
            `your account once so we have somewhere to send them. It takes about two minutes.`,
        ),

    hadPaypal
      ? p(
          `<strong>Note:</strong> PayPal payouts have been discontinued. The PayPal email on ` +
            `your account will no longer receive payments, so this step is required even if ` +
            `you had one on file.`,
        )
      : '',

    p('<strong>How to set it up</strong>'),
    payoutSetupStepsHtml(),

    cta('Set up direct deposit', settingsUrl),

    p(
      `<strong>What happens to what you've already earned:</strong> nothing is lost. ` +
        `Commissions keep accruing whether or not you've connected — they simply can't be sent ` +
        `until you do. Once connected, your balance goes out on the next payout run.`,
    ),

    quiet(
      `Payouts run after a 30-day hold on each sale (covering the refund window) with a $50 ` +
        `minimum balance. Questions about your account or your balance — just reply to this email.`,
    ),
  ].join('');

  return {
    subject,
    html: wrapMarketingEmail({
      subject,
      eyebrow: 'Merit Affiliate Program',
      bodyHtml,
      unsubscribeUrl: settingsUrl,
    }),
  };
}

/** Owed (unpaid, un-clawed-back) commission per affiliate id. */
async function owedByAffiliate(ids: string[]): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();
  const rows = await prisma.orderCommission.groupBy({
    by: ['affiliateId'],
    where: {
      affiliateId: { in: ids },
      status: { in: ['PENDING', 'PAYABLE'] },
      payoutId: null,
      clawedBackAt: null,
    },
    _sum: { commissionCents: true },
  });
  return new Map(rows.map((r) => [r.affiliateId, Number(r._sum.commissionCents ?? 0)]));
}

export type AnnouncementResult = {
  mode: 'test' | 'dry-run' | 'broadcast';
  recipients: { email: string; name: string; owedCents: number; sent?: boolean; error?: string }[];
  sent: number;
  failed: number;
};

/**
 * Send the announcement.
 *   test      → renders each real affiliate's copy but delivers ONLY to
 *               `testTo`, so the sender sees exactly what a recipient gets.
 *   dry-run   → resolves the recipient list, sends nothing.
 *   broadcast → sends for real to every ACTIVE affiliate without a
 *               connected Stripe account.
 */
export async function sendPayoutAnnouncement(opts: {
  mode: 'test' | 'dry-run' | 'broadcast';
  testTo?: string;
}): Promise<AnnouncementResult> {
  const affiliates = await prisma.affiliate.findMany({
    where: { status: 'ACTIVE', stripeAccountId: null },
    select: { id: true, name: true, email: true, paypalEmail: true },
    orderBy: { createdAt: 'asc' },
  });
  const owed = await owedByAffiliate(affiliates.map((a) => a.id));

  const result: AnnouncementResult = { mode: opts.mode, recipients: [], sent: 0, failed: 0 };

  if (opts.mode === 'dry-run') {
    result.recipients = affiliates.map((a) => ({
      email: a.email,
      name: a.name,
      owedCents: owed.get(a.id) ?? 0,
    }));
    return result;
  }

  if (opts.mode === 'test') {
    if (!opts.testTo) throw new Error('test mode requires testTo');
    // Render the version the highest-balance affiliate would get — the copy
    // with the money line and, if anyone had one, the PayPal notice — so the
    // test is the fullest form of the email rather than an empty shell.
    const withOwed = affiliates
      .map((a) => ({ a, owedCents: owed.get(a.id) ?? 0 }))
      .sort((x, y) => y.owedCents - x.owedCents);
    const sample = withOwed[0];
    const email = buildPayoutAnnouncement({
      firstName: sample ? (sample.a.name || 'there').split(' ')[0] : 'there',
      owedCents: sample?.owedCents ?? 0,
      hadPaypal: sample ? !!sample.a.paypalEmail : true,
    });
    const send = await sendEmail({
      to: opts.testTo,
      subject: `[TEST] ${email.subject}`,
      html: email.html,
    });
    result.recipients = [
      {
        email: opts.testTo,
        name: 'TEST',
        owedCents: sample?.owedCents ?? 0,
        sent: send.ok,
        error: send.ok ? undefined : send.error,
      },
    ];
    result[send.ok ? 'sent' : 'failed'] += 1;
    return result;
  }

  // broadcast
  for (const a of affiliates) {
    const owedCents = owed.get(a.id) ?? 0;
    const email = buildPayoutAnnouncement({
      firstName: (a.name || 'there').split(' ')[0],
      owedCents,
      hadPaypal: !!a.paypalEmail,
    });
    const send = await sendEmail({ to: a.email, subject: email.subject, html: email.html });
    if (send.ok) {
      // Stamp the drip clock so the 3-touch nudge spaces off this send.
      await prisma.affiliate
        .update({ where: { id: a.id }, data: { payoutNudgeLastAt: new Date() } })
        .catch(() => {});
      result.sent += 1;
    } else {
      result.failed += 1;
    }
    result.recipients.push({
      email: a.email,
      name: a.name,
      owedCents,
      sent: send.ok,
      error: send.ok ? undefined : send.error,
    });
  }
  console.log(`[payout-announcement] broadcast: ${result.sent} sent, ${result.failed} failed`);
  return result;
}
