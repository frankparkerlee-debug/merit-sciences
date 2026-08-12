import { prisma } from './db';
import { stripe } from './stripe';

/* ─────────────────────────────────────────────────────────────────────────
   STRIPE CONNECT PAYOUTS — pay affiliates by direct deposit from the
   platform's Stripe balance. Parker's call 2026-08-12 ("we are stable on
   stripe, lets use it for the time being") — the account risk trade-off was
   surfaced and accepted; the PayPal rail stays as fallback per affiliate.

   Shape: each affiliate onboards once as an EXPRESS connected account
   (Stripe hosts the KYC + bank-details flow; we never touch bank numbers).
   Payout runs then push Transfers from the platform balance — the same
   balance card sales settle into, so no bank top-ups are needed while
   Stripe is collecting.

   The Affiliate.stripeAccountId column is the original Phase-7 field,
   dormant since the PayPal pivot — no migration needed.

   Funding note: transfers draw on the PLATFORM balance. If a run exceeds
   the available balance, Stripe rejects with `balance_insufficient` and
   the payout row lands FAILED with that reason — retry after the next
   settlement day.
   ───────────────────────────────────────────────────────────────────────── */

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://meritsciences.com').replace(/\/$/, '');

/** Create the affiliate's Express account on first use; reuse it after.
 *  Persists the id before returning so a crash between Stripe and the DB
 *  can't orphan more than one account (create is retried idempotently by
 *  checking the DB first). */
export async function ensureExpressAccount(affiliate: {
  id: string;
  email: string;
  name: string;
  stripeAccountId: string | null;
}): Promise<string> {
  if (affiliate.stripeAccountId) return affiliate.stripeAccountId;

  const account = await stripe().accounts.create({
    type: 'express',
    email: affiliate.email,
    capabilities: { transfers: { requested: true } },
    business_type: 'individual',
    metadata: { affiliateId: affiliate.id, program: 'merit-affiliate' },
    // Express + transfers-only: the affiliate receives money, never charges.
    tos_acceptance: undefined,
  });

  await prisma.affiliate.update({
    where: { id: affiliate.id },
    data: { stripeAccountId: account.id },
  });
  return account.id;
}

/** Hosted onboarding (or resume) link. Single-use, short-lived — generate
 *  fresh on every click, never store. */
export async function createOnboardingLink(stripeAccountId: string): Promise<string> {
  const link = await stripe().accountLinks.create({
    account: stripeAccountId,
    type: 'account_onboarding',
    refresh_url: `${SITE_URL}/affiliate/dashboard/settings?stripe=refresh`,
    return_url: `${SITE_URL}/affiliate/dashboard/settings?stripe=return`,
  });
  return link.url;
}

/** Can this connected account actually receive a transfer + pay out to its
 *  bank? Checked live at payout time (and on the settings page) rather than
 *  cached — Stripe can pause an account for missing info at any point, and a
 *  stale "ready" flag would burn a payout run on a doomed transfer. */
export async function transfersReady(stripeAccountId: string): Promise<boolean> {
  try {
    const acct = await stripe().accounts.retrieve(stripeAccountId);
    return Boolean(acct.payouts_enabled && acct.capabilities?.transfers === 'active');
  } catch {
    return false;
  }
}

/** Push one affiliate's payout from the platform balance. Idempotent on the
 *  payout row id — a retried run reuses the same key, so Stripe returns the
 *  original transfer instead of paying twice. */
export async function sendStripeTransfer(args: {
  stripeAccountId: string;
  amountCents: number;
  payoutId: string;
}): Promise<{ ok: true; transferId: string } | { ok: false; error: string }> {
  try {
    const transfer = await stripe().transfers.create(
      {
        amount: args.amountCents,
        currency: 'usd',
        destination: args.stripeAccountId,
        description: 'Merit affiliate payout',
        metadata: { payoutId: args.payoutId },
      },
      { idempotencyKey: `payout-${args.payoutId}` },
    );
    return { ok: true, transferId: transfer.id };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Stripe transfer failed' };
  }
}
