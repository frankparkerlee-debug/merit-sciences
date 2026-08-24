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
// Stripe-visible URLs live on the CHECKOUT host, never the storefront: the
// account-link return/refresh URLs are stored by Stripe, and the affiliate's
// browser hands Stripe a Referer on arrival. Both must tell the same story
// as the rest of the payment surface (meritcheckout.com). Falls back to the
// storefront in dev where no split domain exists.
const STRIPE_FACING_ORIGIN = (process.env.CHECKOUT_ORIGIN || SITE_URL).replace(/\/$/, '');

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
    refresh_url: `${STRIPE_FACING_ORIGIN}/payout-setup/refresh`,
    return_url: `${STRIPE_FACING_ORIGIN}/payout-setup/return`,
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
  /** Distinguishes retry attempts in the idempotency key. Stripe caches a
   *  FAILED request's response per key for 24h, so a retry that reuses the
   *  first attempt's key gets the original error replayed — "insufficient
   *  funds" kept coming back after the balance was funded, because Stripe
   *  never looked again. Same-attempt network retries still share one key. */
  attempt?: string;
}): Promise<{ ok: true; transferId: string } | { ok: false; error: string }> {
  try {
    const transfer = await stripe().transfers.create(
      {
        amount: args.amountCents,
        currency: 'usd',
        destination: args.stripeAccountId,
        description: 'Merit affiliate payout',
        // transfer_group makes prior sends for this payout findable, which is
        // what lets retryPayout heal instead of double-paying now that retry
        // attempts use distinct idempotency keys.
        transfer_group: `payout-${args.payoutId}`,
        metadata: { payoutId: args.payoutId },
      },
      { idempotencyKey: `payout-${args.payoutId}${args.attempt ? `-${args.attempt}` : ''}` },
    );
    return { ok: true, transferId: transfer.id };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Stripe transfer failed' };
  }
}

/* ── Outbound bounce signing ──────────────────────────────────────────────
   The settings page must not link the affiliate's browser from the
   storefront straight to connect.stripe.com (Referer would name the store).
   Instead the server action redirects to
   ${CHECKOUT_ORIGIN}/payout-setup/go?u=<b64url>&s=<hmac>, and that page —
   on the checkout host, with a no-referrer meta policy — forwards to
   Stripe. The HMAC stops the bounce from being an open redirect; the target
   is additionally pinned to connect.stripe.com at verification time. */

import { createHmac, timingSafeEqual } from 'crypto';

function bounceSecret(): string {
  // CRON_SECRET is the only long random secret guaranteed present in every
  // environment; derive rather than reuse raw so logs of one never unlock
  // the other.
  return createHmac('sha256', process.env.CRON_SECRET || 'dev-secret')
    .update('payout-bounce-v1')
    .digest('hex');
}

export function signBounce(url: string): string {
  return createHmac('sha256', bounceSecret()).update(url).digest('hex').slice(0, 32);
}

export function buildBounceUrl(stripeUrl: string): string {
  const u = Buffer.from(stripeUrl, 'utf8').toString('base64url');
  return `${STRIPE_FACING_ORIGIN}/payout-setup/go?u=${u}&s=${signBounce(stripeUrl)}`;
}

/** Verify + decode a bounce param pair. Returns the Stripe URL or null. */
export function verifyBounce(u: string, s: string): string | null {
  let url: string;
  try {
    url = Buffer.from(u, 'base64url').toString('utf8');
  } catch {
    return null;
  }
  if (!url.startsWith('https://connect.stripe.com/')) return null;
  const expected = signBounce(url);
  if (expected.length !== s.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(s))) return null;
  } catch {
    return null;
  }
  return url;
}

/**
 * A transfer already sent for this payout, if any. Backs retryPayout's heal
 * path: with per-attempt idempotency keys, "did the money actually move?" is
 * answered by looking for the transfer itself (transfer_group) rather than by
 * replaying a cached Stripe response.
 */
export async function findTransferForPayout(payoutId: string): Promise<string | null> {
  try {
    const list = await stripe().transfers.list({ transfer_group: `payout-${payoutId}`, limit: 1 });
    return list.data[0]?.id ?? null;
  } catch {
    return null;
  }
}
