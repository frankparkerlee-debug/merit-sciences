import 'server-only';
import { prisma } from './db';
import { sendEmail } from './email';
import { AFFILIATE_PROGRAM, tierForOrderCount } from './affiliate';
import { wrapMarketingEmail, p, cta, stat, quiet, a, SITE } from './marketing-email-shell';

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Hype email fired the moment an affiliate earns a commission. The point is
 * momentum: celebrate the sale, then point at the next one (share CTA +
 * distance to the next tier). Non-blocking — callers `void` it so a send
 * failure never touches fulfillment. Skips $0 (self-purchase) rows and
 * non-ACTIVE affiliates. Re-fetches the affiliate by id so the evergreen-lock
 * "credit the original affiliate" case still emails the right person.
 */
export async function notifyAffiliateOfSale(
  affiliateId: string,
  sale: { commissionCents: number; orderTotalCents: number; rateBp: number },
): Promise<void> {
  if (sale.commissionCents <= 0) return;

  const aff = await prisma.affiliate.findUnique({
    where: { id: affiliateId },
    select: { email: true, name: true, discountCode: true, status: true },
  });
  if (!aff || aff.status !== 'ACTIVE') return;

  // Trailing-30 sale count (includes the one just written) → tier progress.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const count30 = await prisma.orderCommission.count({
    where: { affiliateId, occurredAt: { gte: since }, status: { not: 'CLAWED_BACK' } },
  });
  const { tierName } = tierForOrderCount(count30);
  const nextTier = AFFILIATE_PROGRAM.tiers.find((t) => t.minOrders > count30);
  const toNext = nextTier ? nextTier.minOrders - count30 : 0;
  const ratePct = Math.round(sale.rateBp / 100);

  const firstName = (aff.name || 'there').split(' ')[0];
  const code = aff.discountCode.toUpperCase();
  const dashUrl = `${SITE}/affiliate/dashboard`;
  const kitUrl = `${SITE}/affiliate/dashboard/kit`;

  const nextLine = nextTier
    ? p(
        `You're at <strong>${esc(tierName)}</strong> — ${ratePct}% per order. ` +
          `<strong>${toNext} more sale${toNext === 1 ? '' : 's'}</strong> in the next 30 days unlocks ` +
          `<strong>${esc(nextTier.name)} at ${nextTier.commissionPct}%</strong> on everything. Keep it rolling.`,
      )
    : p(`You're at <strong>${esc(tierName)}</strong> — top tier, earning the max ${ratePct}% on every order. 🔥`);

  const bodyHtml =
    p(`Nice one, ${esc(firstName)} — someone just checked out with your code and <strong>you got paid</strong>.`) +
    stat(money(sale.commissionCents), `your commission on a ${money(sale.orderTotalCents)} order`) +
    nextLine +
    cta('Share your link — line up the next one', kitUrl) +
    quiet(
      `Your code <strong>${esc(code)}</strong> gives your people ${AFFILIATE_PROGRAM.buyerDiscountPct}% off. ` +
        `See every sale on your ${a('dashboard', dashUrl)}. Commissions clear about 30 days after the ` +
        `sale, then they're payable.`,
    );

  const html = wrapMarketingEmail({
    subject: `You earned ${money(sale.commissionCents)}`,
    eyebrow: 'New sale',
    bodyHtml,
  });

  const text =
    `Nice one, ${firstName} — you just earned ${money(sale.commissionCents)} on a ${money(sale.orderTotalCents)} order.\n` +
    (nextTier
      ? `You're at ${tierName} (${ratePct}%). ${toNext} more sale${toNext === 1 ? '' : 's'} in 30 days unlocks ${nextTier.name} at ${nextTier.commissionPct}%.\n`
      : `You're at ${tierName} — top tier, ${ratePct}% on every order.\n`) +
    `Share your link and line up the next one: ${kitUrl}`;

  await sendEmail({
    to: aff.email,
    subject: `Cha-ching 💸 you just earned ${money(sale.commissionCents)}, ${firstName}`,
    html,
    text,
    tags: [{ name: 'type', value: 'affiliate_sale' }],
  });
}
