import 'server-only';
import { prisma } from './db';
import { sendEmail } from './email';
import { wrapMarketingEmail, p, cta, quiet, SITE } from './marketing-email-shell';

/* ─────────────────────────────────────────────────────────────────────────
   PAYOUT-DETAILS NUDGE — emails affiliates who have no way to get paid.

   Trigger state (2026-08-12 snapshot): ~13 ACTIVE affiliates had neither a
   connected Stripe account nor a PayPal email — including one with matured
   commission already waiting. Commissions accrue silently for these
   accounts and the payout run just skips them, so nobody notices until an
   affiliate asks where their money is.

   Sequence: up to THREE touches, minimum 3 days apart, per affiliate.
   Exits automatically the moment they add either payout method (the target
   query excludes them). State lives on Affiliate.payoutNudgeCount /
   payoutNudgeLastAt — reset both to re-enter someone.

   Runs from the daily customer-emails cron (piggybacked — no new Render
   infra). Deliberately conservative: hard cap per run so a bug can never
   blast the full list, and every send is logged.
   ───────────────────────────────────────────────────────────────────────── */

const MIN_DAYS_BETWEEN_TOUCHES = 3;
const MAX_TOUCHES = 3;
const MAX_SENDS_PER_RUN = 25;

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** ACTIVE affiliates with no payout method, due for their next touch. */
async function findNudgeTargets() {
  const cutoff = new Date(Date.now() - MIN_DAYS_BETWEEN_TOUCHES * 86_400_000);
  const affiliates = await prisma.affiliate.findMany({
    where: {
      status: 'ACTIVE',
      paypalEmail: null,
      stripeAccountId: null,
      payoutNudgeCount: { lt: MAX_TOUCHES },
      OR: [{ payoutNudgeLastAt: null }, { payoutNudgeLastAt: { lte: cutoff } }],
    },
    select: { id: true, name: true, email: true, payoutNudgeCount: true },
    take: MAX_SENDS_PER_RUN,
  });
  if (affiliates.length === 0) return [];

  // Owed balance per target — personalizes the subject and makes touch 2/3
  // concrete ("you have $23.62 waiting"), which is the line that converts.
  const owed = await prisma.orderCommission.groupBy({
    by: ['affiliateId'],
    where: {
      affiliateId: { in: affiliates.map((a) => a.id) },
      status: { in: ['PENDING', 'PAYABLE'] },
      payoutId: null,
    },
    _sum: { commissionCents: true },
  });
  const owedBy = new Map(owed.map((o) => [o.affiliateId, Number(o._sum.commissionCents ?? 0)]));

  return affiliates.map((a) => ({ ...a, owedCents: owedBy.get(a.id) ?? 0 }));
}

function buildEmail(args: { firstName: string; touch: number; owedCents: number }) {
  const { firstName, touch, owedCents } = args;
  const settingsUrl = `${SITE}/affiliate/dashboard/settings`;
  const hasMoney = owedCents > 0;

  const subject =
    touch === 1
      ? hasMoney
        ? `${money(args.owedCents)} is accruing — tell us where to send it`
        : 'Set up how you get paid'
      : touch === 2
        ? hasMoney
          ? `Your ${money(owedCents)} still has nowhere to go`
          : 'Your Merit payouts have nowhere to go yet'
        : 'Last reminder — add your payout details';

  const opener = hasMoney
    ? p(
        `Hi ${firstName} — you've earned <strong>${money(owedCents)}</strong> in commission, ` +
          `but there's no payout method on your account, so payout runs are skipping you.`,
      )
    : p(
        `Hi ${firstName} — your affiliate account has no payout method on file yet, ` +
          `so when your commissions come due we have nowhere to send them.`,
      );

  const bodyHtml = [
    opener,
    p(
      `It takes about two minutes to fix, and there are two options in your dashboard settings:`,
    ),
    p(
      `<strong>Direct deposit (recommended)</strong> — connect your bank through Stripe. ` +
        `We never see your bank details, and payouts land straight in your account.<br/>` +
        `<strong>PayPal</strong> — just add the email on your PayPal account.`,
    ),
    cta('Add payout details', settingsUrl),
    quiet(
      `Payouts run after a 30-day hold with a $50 minimum — details in your dashboard. ` +
        `Already added them? Then you're all set and this is the last note about it.`,
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

/** Daily tick. Returns counts for the cron response. Failures on one
 *  affiliate never block the rest, and state only advances on a
 *  successful send. */
export async function tickPayoutNudges(): Promise<{ sent: number; skipped: number }> {
  const targets = await findNudgeTargets();
  let sent = 0;
  let skipped = 0;

  for (const t of targets) {
    const touch = t.payoutNudgeCount + 1;
    const firstName = (t.name || 'there').split(' ')[0];
    try {
      const email = buildEmail({ firstName, touch, owedCents: t.owedCents });
      const result = await sendEmail({ to: t.email, subject: email.subject, html: email.html });
      if (!result.ok) throw new Error(result.error);
      await prisma.affiliate.update({
        where: { id: t.id },
        data: { payoutNudgeCount: touch, payoutNudgeLastAt: new Date() },
      });
      sent += 1;
      console.log(`[payout-nudge] touch ${touch} → ${t.email} (owed ${t.owedCents}¢)`);
    } catch (err) {
      skipped += 1;
      console.error(`[payout-nudge] failed for ${t.email}`, err);
    }
  }
  return { sent, skipped };
}
