import 'server-only';
import { sendEmail } from './email';
import { wrapMarketingEmail, h, p, cta, quiet, SITE } from './marketing-email-shell';

/**
 * "You've been paid" — sent the moment a payout transfer succeeds, from every
 * path that can succeed (batch run, retry, and the retry heal). Without this
 * the affiliate's first signal was Stripe's bank-deposit notice a day or two
 * later, which reads as an unexplained deposit rather than Merit paying them.
 *
 * Fire-and-forget from callers: a payout must never fail (or appear failed)
 * because the notification bounced.
 */
export async function sendPayoutPaidEmail(args: {
  to: string;
  name: string;
  amountCents: number;
}): Promise<void> {
  const firstName = (args.name || 'there').split(' ')[0];
  const money = `$${(args.amountCents / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const bodyHtml = [
    h(`${money} is on the way.`),
    p(
      `Hi ${firstName} — your Merit commission payout of <strong>${money}</strong> was just sent ` +
        `by direct deposit. It typically lands in your bank within 1–2 business days; the ` +
        `deposit will come from Stripe, our payments provider.`,
    ),
    p(
      `Your dashboard has the full breakdown of the orders behind it — and everything you earn ` +
        `from here keeps accruing toward the next payout.`,
    ),
    cta('View your dashboard', `${SITE}/affiliate/dashboard`),
    quiet(
      `Payouts run after a 30-day hold on each sale with a $50 minimum balance. ` +
        `Questions about this payout — just reply to this email.`,
    ),
  ].join('');

  await sendEmail({
    to: args.to,
    subject: `Your ${money} Merit commission is on the way`,
    html: wrapMarketingEmail({
      subject: `Your ${money} Merit commission is on the way`,
      eyebrow: 'Merit Affiliate Program',
      bodyHtml,
    }),
  }).then(
    (r) => {
      if (!r.ok) console.error('[payout-paid-email] send failed', r.error);
    },
    (err) => console.error('[payout-paid-email] send threw', err),
  );
}
