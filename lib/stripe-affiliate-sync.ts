/**
 * Stripe ↔ Affiliate sync.
 *
 * Each Affiliate has a buyer-facing discount code (e.g. "PARKERLEE10").
 * For Stripe Checkout to honor it, we need a Stripe Coupon (the offer)
 * and a Stripe PromotionCode (the customer-facing alias). This module
 * creates and keeps track of both.
 *
 * Design notes:
 *   - Idempotent: re-calling sync() on an already-synced affiliate is a
 *     no-op (returns the existing IDs).
 *   - One Coupon + one PromotionCode per Affiliate. We do NOT share a
 *     single 10%-off Coupon across all affiliates — that would make it
 *     impossible to revoke a single affiliate's code without breaking
 *     the rest.
 *   - The Coupon is `duration: 'forever'`. It applies once per session
 *     (Stripe behavior), so subscribers using it on a one-time order
 *     get 10% off that order; future orders need to re-enter the code.
 *   - We catch ALL errors and return a typed result so callers can
 *     decide whether to fail the calling flow (signup) or just log.
 */

import 'server-only';
import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';
import { AFFILIATE_PROGRAM } from '@/lib/affiliate';

export type AffiliateSyncResult =
  | { ok: true; couponId: string; promotionCodeId: string; alreadySynced: boolean }
  | { ok: false; error: string };

/**
 * Ensure a Stripe Coupon + PromotionCode exist for this affiliate.
 * Returns the IDs on success or an error message on failure.
 *
 * Safe to call multiple times — if the affiliate is already synced,
 * we return the existing IDs without hitting Stripe at all.
 */
export async function syncAffiliateDiscountCode(
  affiliateId: string,
): Promise<AffiliateSyncResult> {
  const affiliate = await prisma.affiliate.findUnique({
    where: { id: affiliateId },
    select: {
      id: true,
      name: true,
      slug: true,
      discountCode: true,
      stripeCouponId: true,
      stripePromotionCodeId: true,
    },
  });
  if (!affiliate) return { ok: false, error: 'Affiliate not found' };

  // Short-circuit if already synced
  if (affiliate.stripeCouponId && affiliate.stripePromotionCodeId) {
    return {
      ok: true,
      couponId: affiliate.stripeCouponId,
      promotionCodeId: affiliate.stripePromotionCodeId,
      alreadySynced: true,
    };
  }

  const s = stripe();

  // Stripe PromotionCode code values are UPPERCASE by convention and
  // up to 500 chars. We use the discountCode in uppercase — that's
  // what customers see and type.
  const codeValue = affiliate.discountCode.toUpperCase();

  // API version pin for Coupon + PromotionCode endpoints.
  // The 2026-05-27.dahlia version renamed `coupon` → `promotion` on
  // PromotionCode and reshapes the underlying object model. We don't
  // need the new shape, so pin per-call to the last stable pre-rename
  // version. The rest of the integration (Checkout Sessions, etc.)
  // stays on 2026-05-27.dahlia.
  const LEGACY_COUPON_API: { apiVersion: any } = { apiVersion: '2024-06-20' };

  try {
    // ─── Step 1: Coupon ───────────────────────────────────────────────
    // One Coupon per affiliate. Metadata carries our affiliate id so
    // we can reverse-look-up from Stripe if needed.
    let couponId = affiliate.stripeCouponId;
    if (!couponId) {
      const coupon = await s.coupons.create(
        {
          name: `Affiliate — ${affiliate.name}`,
          percent_off: AFFILIATE_PROGRAM.buyerDiscountPct,
          duration: 'forever',
          // applies_to omitted → applies to all products
          metadata: {
            affiliate_id: affiliate.id,
            affiliate_slug: affiliate.slug,
            source: 'merit-affiliate-program',
          },
        },
        LEGACY_COUPON_API,
      );
      couponId = coupon.id;
    }

    // ─── Step 2: PromotionCode ────────────────────────────────────────
    // The customer-facing alias. Stripe PromotionCode codes are
    // case-insensitive and globally unique within the Stripe account.
    let promotionCodeId = affiliate.stripePromotionCodeId;
    if (!promotionCodeId) {
      // Cast: Stripe Node SDK types match 2026-05-27.dahlia which
      // renamed `coupon` → `promotion`. We pin per-call to 2024-06-20
      // (which still uses `coupon`), but the type system doesn't know.
      const promoParams: any = {
        coupon: couponId,
        code: codeValue,
        active: true,
        // No max redemptions — affiliates can drive as many orders as
        // they can. Tier ceiling is enforced server-side via the
        // trailing-30-day commission count, not by Stripe.
        metadata: {
          affiliate_id: affiliate.id,
          affiliate_slug: affiliate.slug,
          source: 'merit-affiliate-program',
        },
      };
      const promo = await s.promotionCodes.create(promoParams, LEGACY_COUPON_API);
      promotionCodeId = promo.id;
    }

    // ─── Step 3: Persist IDs ──────────────────────────────────────────
    // Only NOW do we touch our DB — if Stripe failed above we don't
    // want stale IDs in the row.
    await prisma.affiliate.update({
      where: { id: affiliate.id },
      data: {
        stripeCouponId: couponId,
        stripePromotionCodeId: promotionCodeId,
      },
    });

    return {
      ok: true,
      couponId,
      promotionCodeId,
      alreadySynced: false,
    };
  } catch (err: any) {
    // Stripe rejects duplicate `code` values across promotion codes.
    // If that's the failure, we surface a specific error so the caller
    // can present a clean message to the affiliate (and offer to pick
    // a new code).
    const msg = err?.raw?.message ?? err?.message ?? 'Stripe sync failed';
    console.error('[stripe-affiliate-sync] failed for affiliate', affiliateId, msg);
    return { ok: false, error: msg };
  }
}

/**
 * Reverse lookup: given a PromotionCode id (as it appears on a
 * checkout.session.completed event), find the Affiliate it belongs to.
 *
 * Used by the webhook for code-based attribution. Returns null if no
 * matching affiliate (e.g. a non-affiliate Stripe coupon was used).
 */
export async function affiliateForStripePromotionCode(
  stripePromotionCodeId: string,
): Promise<{ id: string; slug: string; email: string; status: string } | null> {
  const a = await prisma.affiliate.findUnique({
    where: { stripePromotionCodeId },
    select: { id: true, slug: true, email: true, status: true },
  });
  return a;
}
