/**
 * Affiliate payout batch engine.
 *
 * Commissions accrue at capture time (see lib/paypal-fulfillment.ts — still
 * the shared fulfillment adapter, which Stripe payments ride through), are
 * clawed back on refund, and become *payable* once they clear a hold window
 * covering the refund/chargeback period. This module aggregates payable
 * commissions per affiliate and pays them out via Stripe Connect transfers.
 *
 * PAYOUT RAIL: Stripe direct deposit ONLY (PayPal terminated 2026-08-12).
 * Money is UNPAYABLE until the affiliate connects — enforced in three
 * independent places so no path can leak a payment:
 *   1. Preview/eligibility — no stripeAccountId ⇒ method null ⇒ blocked.
 *   2. Run loop — live transfersReady() check BEFORE commissions are
 *      claimed, so an account that is connected but not finished (or was
 *      later paused by Stripe) skips the run untouched.
 *   3. retryPayout — same two checks before re-sending.
 * Commissions keep accruing throughout; nothing is forfeited, it simply
 * waits. paypalEmail is retained as historical data and pays nothing.
 *
 * Eligibility for a commission:
 *   - status PENDING or PAYABLE (not PAID, not CLAWED_BACK)
 *   - not already claimed by a payout (payoutId is null)
 *   - older than COMMISSION_HOLD_DAYS
 *   - the affiliate is ACTIVE with a verified Stripe connected account
 * An affiliate is paid only if their eligible total ≥ payoutMinUsd.
 */

import 'server-only';
import { prisma } from '@/lib/db';
import { AFFILIATE_PROGRAM } from '@/lib/affiliate';
import { sendStripeTransfer, transfersReady } from '@/lib/stripe-connect';

// Hold window before a commission can be paid — covers the refund /
// chargeback period so we don't pay out money we may claw back.
export const COMMISSION_HOLD_DAYS = 30;

/** Payout minimum. Normally $50 (AFFILIATE_PROGRAM.payoutMinUsd) — the
 *  threshold that keeps transfer fees from eating small balances. Overridable
 *  via PAYOUT_MIN_USD so a test run can pay a $1 balance without a code
 *  change, and so a promo period can lower it temporarily. Unset the env var
 *  to return to the program default; a malformed value is ignored rather than
 *  silently paying everyone. */
function minCents(): number {
  const raw = process.env.PAYOUT_MIN_USD;
  if (raw !== undefined) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return Math.round(n * 100);
    console.warn(`[payouts] ignoring malformed PAYOUT_MIN_USD=${raw}`);
  }
  return AFFILIATE_PROGRAM.payoutMinUsd * 100;
}
function minLabel(): string {
  return `$${(minCents() / 100).toFixed(2).replace(/\.00$/, '')}`;
}

export type AffiliatePayoutPreview = {
  affiliateId: string;
  name: string;
  email: string;
  paypalEmail: string | null;
  stripeAccountId: string | null;
  /** PayPal was TERMINATED as a payout rail 2026-08-12 (Parker). Stripe
   *  direct deposit is the only way affiliates get paid; paypalEmail is
   *  retained as data but earns nothing. */
  method: 'stripe' | null;
  /** matured (past the hold) commission total — payable now */
  eligibleCents: number;
  /** earned but still inside the 30-day refund hold — not payable yet */
  heldCents: number;
  /** when the earliest held commission clears the hold (null if none held) */
  earliestMatureAt: Date | null;
  commissionCount: number;
  /** true → meets the minimum AND direct deposit is connected → will be paid */
  payable: boolean;
  /** why not payable, when applicable */
  blockedReason: string | null;
};

function holdCutoff(): Date {
  return new Date(Date.now() - COMMISSION_HOLD_DAYS * 86_400_000);
}

/**
 * Per-affiliate preview of what the next payout run would do. Pure read.
 */
export async function getPayoutPreview(): Promise<AffiliatePayoutPreview[]> {
  const cutoff = holdCutoff();
  // Pull ALL un-paid, un-clawed commissions for active affiliates — INCLUDING
  // those still inside the hold window. We split matured vs held per affiliate
  // so held earnings are SHOWN (flagged), instead of dropping the affiliate
  // from the query entirely — which made the screen read "no one earned"
  // during the hold even when commission had accrued.
  const rows = await prisma.orderCommission.findMany({
    where: {
      status: { in: ['PENDING', 'PAYABLE'] },
      clawedBackAt: null,
      payoutId: null,
      affiliate: { status: 'ACTIVE' },
    },
    select: {
      commissionCents: true,
      occurredAt: true,
      affiliate: { select: { id: true, name: true, email: true, paypalEmail: true, stripeAccountId: true } },
    },
  });

  const byAff = new Map<string, AffiliatePayoutPreview>();
  for (const r of rows) {
    const a = r.affiliate;
    let p = byAff.get(a.id);
    if (!p) {
      p = {
        affiliateId: a.id,
        name: a.name,
        email: a.email,
        paypalEmail: a.paypalEmail,
        stripeAccountId: a.stripeAccountId,
        method: a.stripeAccountId ? 'stripe' : null,
        eligibleCents: 0,
        heldCents: 0,
        earliestMatureAt: null,
        commissionCount: 0,
        payable: false,
        blockedReason: null,
      };
      byAff.set(a.id, p);
    }
    p.commissionCount += 1;
    const cents = Number(r.commissionCents);
    if (r.occurredAt <= cutoff) {
      p.eligibleCents += cents; // matured — payable now
    } else {
      p.heldCents += cents; // still in the refund hold
      const matureAt = new Date(r.occurredAt.getTime() + COMMISSION_HOLD_DAYS * 86_400_000);
      if (!p.earliestMatureAt || matureAt < p.earliestMatureAt) p.earliestMatureAt = matureAt;
    }
  }

  for (const p of byAff.values()) {
    if (!p.method) {
      p.blockedReason = 'Direct deposit not connected (payouts are Stripe-only)';
    } else if (p.eligibleCents < minCents()) {
      if (p.heldCents > 0 && p.earliestMatureAt) {
        const d = p.earliestMatureAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        p.blockedReason = `In ${COMMISSION_HOLD_DAYS}-day refund hold — matures ${d}`;
      } else {
        p.blockedReason = `Below ${minLabel()} minimum`;
      }
    }
    p.payable = !p.blockedReason;
  }

  return [...byAff.values()].sort(
    (a, b) => (b.eligibleCents + b.heldCents) - (a.eligibleCents + a.heldCents),
  );
}

export type RunPayoutsResult = {
  paidCount: number;
  failedCount: number;
  paidCents: number;
  failures: { affiliateId: string; name: string; error: string }[];
};

/**
 * Execute payouts for every eligible affiliate. Claim-then-send so a
 * concurrent run can't double-include commissions, and a PayPal failure
 * leaves an auditable FAILED payout that can be retried.
 */
export async function runPayouts(): Promise<RunPayoutsResult> {
  const preview = (await getPayoutPreview()).filter((p) => p.payable);
  const result: RunPayoutsResult = {
    paidCount: 0,
    failedCount: 0,
    paidCents: 0,
    failures: [],
  };

  for (const p of preview) {
    // 0. Verify the connected account can actually receive BEFORE claiming —
    //    an unfinished onboarding then simply skips this run instead of
    //    littering FAILED payout rows that need manual retry.
    if (!(await transfersReady(p.stripeAccountId!))) {
      result.failedCount += 1;
      result.failures.push({
        affiliateId: p.affiliateId,
        name: p.name,
        error: 'Stripe onboarding incomplete — affiliate must finish direct-deposit setup',
      });
      continue;
    }

    // 1. Claim the affiliate's eligible commissions into a fresh Payout
    //    inside a transaction so a parallel run can't grab them too.
    const claim = await prisma.$transaction(async (tx) => {
      const commissions = await tx.orderCommission.findMany({
        where: {
          affiliateId: p.affiliateId,
          status: { in: ['PENDING', 'PAYABLE'] },
          clawedBackAt: null,
          payoutId: null,
          occurredAt: { lte: holdCutoff() },
        },
        select: { id: true, commissionCents: true, occurredAt: true },
      });
      if (commissions.length === 0) return null;

      const totalCents = commissions.reduce((s, c) => s + Number(c.commissionCents), 0);
      if (totalCents < minCents()) return null;

      const periodStart = commissions.reduce(
        (min, c) => (c.occurredAt < min ? c.occurredAt : min),
        commissions[0].occurredAt,
      );
      const payout = await tx.payout.create({
        data: {
          affiliateId: p.affiliateId,
          periodStart,
          periodEnd: new Date(),
          totalCents: BigInt(totalCents),
          status: 'PROCESSING',
        },
      });
      await tx.orderCommission.updateMany({
        where: { id: { in: commissions.map((c) => c.id) } },
        data: { payoutId: payout.id },
      });
      return { payoutId: payout.id, totalCents };
    });

    if (!claim) continue;

    // 2. Send via Stripe — the only rail. Readiness was verified above;
    //    the transfer is idempotent on the payout row id.
    const t = await sendStripeTransfer({
      stripeAccountId: p.stripeAccountId!,
      amountCents: claim.totalCents,
      payoutId: claim.payoutId,
    });
    const send:
      | { ok: true; rail: 'stripe'; transferId: string }
      | { ok: false; error: string } = t.ok
      ? { ok: true, rail: 'stripe', transferId: t.transferId }
      : { ok: false, error: t.error };

    // 3. Record the outcome.
    if (send.ok) {
      await prisma.$transaction([
        prisma.payout.update({
          where: { id: claim.payoutId },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            stripeTransferId: send.transferId,
          },
        }),
        prisma.orderCommission.updateMany({
          where: { payoutId: claim.payoutId },
          data: { status: 'PAID' },
        }),
      ]);
      result.paidCount += 1;
      result.paidCents += claim.totalCents;
    } else {
      await prisma.payout.update({
        where: { id: claim.payoutId },
        data: { status: 'FAILED', failureReason: send.error },
      });
      result.failedCount += 1;
      result.failures.push({ affiliateId: p.affiliateId, name: p.name, error: send.error });
    }
  }

  return result;
}

/**
 * Retry a single FAILED payout — Stripe-only since PayPal's termination
 * (2026-08-12). The transfer's idempotency key is the payout id, so if the
 * original actually went through, Stripe returns that same transfer instead
 * of paying twice.
 */
export async function retryPayout(payoutId: string): Promise<{ ok: boolean; error?: string }> {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: { affiliate: { select: { stripeAccountId: true } } },
  });
  if (!payout) return { ok: false, error: 'Payout not found' };
  if (payout.status === 'PAID') return { ok: true };
  if (!payout.affiliate.stripeAccountId) {
    return { ok: false, error: 'Affiliate has not connected direct deposit' };
  }
  if (!(await transfersReady(payout.affiliate.stripeAccountId))) {
    return { ok: false, error: 'Affiliate direct-deposit onboarding incomplete' };
  }

  await prisma.payout.update({ where: { id: payoutId }, data: { status: 'PROCESSING' } });
  const send = await sendStripeTransfer({
    stripeAccountId: payout.affiliate.stripeAccountId,
    amountCents: Number(payout.totalCents),
    payoutId: payout.id,
  });

  if (send.ok) {
    await prisma.$transaction([
      prisma.payout.update({
        where: { id: payoutId },
        data: { status: 'PAID', paidAt: new Date(), stripeTransferId: send.transferId },
      }),
      prisma.orderCommission.updateMany({ where: { payoutId }, data: { status: 'PAID' } }),
    ]);
    return { ok: true };
  }
  await prisma.payout.update({ where: { id: payoutId }, data: { status: 'FAILED', failureReason: send.error } });
  return { ok: false, error: send.error };
}
