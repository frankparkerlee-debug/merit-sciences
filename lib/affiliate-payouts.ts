/**
 * Affiliate payout batch engine.
 *
 * Commissions accrue on every PayPal capture (see api/paypal/webhook),
 * are clawed back on refund, and become *payable* once they clear a
 * hold window (covers the refund/chargeback period). This module
 * aggregates payable commissions per affiliate and pays them out via
 * PayPal Payouts.
 *
 * Eligibility for a commission:
 *   - status PENDING or PAYABLE (not PAID, not CLAWED_BACK)
 *   - not already claimed by a payout (payoutId is null)
 *   - older than COMMISSION_HOLD_DAYS
 *   - the affiliate is ACTIVE and has a paypalEmail on file
 * An affiliate is paid only if their eligible total ≥ payoutMinUsd.
 */

import 'server-only';
import { prisma } from '@/lib/db';
import { AFFILIATE_PROGRAM } from '@/lib/affiliate';
import { sendAffiliatePayout } from '@/lib/paypal-payouts';

// Hold window before a commission can be paid — covers the refund /
// chargeback period so we don't pay out money we may claw back.
export const COMMISSION_HOLD_DAYS = 30;

const MIN_CENTS = AFFILIATE_PROGRAM.payoutMinUsd * 100;

export type AffiliatePayoutPreview = {
  affiliateId: string;
  name: string;
  email: string;
  paypalEmail: string | null;
  eligibleCents: number;
  commissionCount: number;
  /** true → meets the minimum AND has a PayPal email → will be paid */
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
  const rows = await prisma.orderCommission.findMany({
    where: {
      status: { in: ['PENDING', 'PAYABLE'] },
      clawedBackAt: null,
      payoutId: null,
      occurredAt: { lte: holdCutoff() },
      affiliate: { status: 'ACTIVE' },
    },
    select: {
      id: true,
      commissionCents: true,
      affiliate: { select: { id: true, name: true, email: true, paypalEmail: true } },
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
        eligibleCents: 0,
        commissionCount: 0,
        payable: false,
        blockedReason: null,
      };
      byAff.set(a.id, p);
    }
    p.eligibleCents += Number(r.commissionCents);
    p.commissionCount += 1;
  }

  for (const p of byAff.values()) {
    if (!p.paypalEmail) p.blockedReason = 'No PayPal email on file';
    else if (p.eligibleCents < MIN_CENTS)
      p.blockedReason = `Below $${AFFILIATE_PROGRAM.payoutMinUsd} minimum`;
    p.payable = !p.blockedReason;
  }

  return [...byAff.values()].sort((a, b) => b.eligibleCents - a.eligibleCents);
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
      if (totalCents < MIN_CENTS) return null;

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

    // 2. Send via PayPal (outside the txn — network call).
    const send = await sendAffiliatePayout({
      receiverEmail: p.paypalEmail!,
      amountCents: claim.totalCents,
      payoutId: claim.payoutId,
    });

    // 3. Record the outcome.
    if (send.ok) {
      await prisma.$transaction([
        prisma.payout.update({
          where: { id: claim.payoutId },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            paypalBatchId: send.batchId,
            paypalItemId: send.itemId,
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
 * Retry a single FAILED payout. The PayPal sender_batch_id is keyed on
 * the payout id, so if the original actually went through, PayPal
 * rejects the duplicate and we surface that rather than double-paying.
 */
export async function retryPayout(payoutId: string): Promise<{ ok: boolean; error?: string }> {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: { affiliate: { select: { paypalEmail: true } } },
  });
  if (!payout) return { ok: false, error: 'Payout not found' };
  if (payout.status === 'PAID') return { ok: true };
  if (!payout.affiliate.paypalEmail) return { ok: false, error: 'Affiliate has no PayPal email' };

  await prisma.payout.update({ where: { id: payoutId }, data: { status: 'PROCESSING' } });
  const send = await sendAffiliatePayout({
    receiverEmail: payout.affiliate.paypalEmail,
    amountCents: Number(payout.totalCents),
    payoutId: payout.id,
  });

  if (send.ok) {
    await prisma.$transaction([
      prisma.payout.update({
        where: { id: payoutId },
        data: { status: 'PAID', paidAt: new Date(), paypalBatchId: send.batchId, paypalItemId: send.itemId },
      }),
      prisma.orderCommission.updateMany({ where: { payoutId }, data: { status: 'PAID' } }),
    ]);
    return { ok: true };
  }
  await prisma.payout.update({ where: { id: payoutId }, data: { status: 'FAILED', failureReason: send.error } });
  return { ok: false, error: send.error };
}
