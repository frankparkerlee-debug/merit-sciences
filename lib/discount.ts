/**
 * Discount code validation — server-side only.
 *
 * Replaces the Stripe Coupon + PromotionCode flow. With PayPal as the
 * processor, codes are validated and applied AT OUR CART, before we
 * create the PayPal order. The discount amount goes into the PayPal
 * order's `amount.breakdown.discount` so PayPal shows it as a line
 * item on the review page.
 *
 * The affiliate id and code are persisted in the order's `custom_id`
 * field so the webhook can attribute commission without re-validating.
 */

import 'server-only';
import { prisma } from '@/lib/db';
import { AFFILIATE_PROGRAM } from '@/lib/affiliate';

export type DiscountValidationResult =
  | {
      ok: true;
      affiliateId: string;
      affiliateSlug: string;
      code: string;
      discountPct: number;
      discountCents: number;
    }
  | { ok: false; error: string };

/**
 * Validate a discount code typed by the buyer.
 *
 * Returns the affiliate that owns it, the discount % to apply, and
 * the discount amount in cents (rounded). Codes are looked up case-
 * insensitively against Affiliate.discountCode (lowercased on insert).
 *
 * Edge cases handled:
 *   - Empty/missing code → error
 *   - Code doesn't match any affiliate → "Invalid code"
 *   - Code matches a SUSPENDED affiliate → "Invalid code" (don't leak)
 *   - Subtotal too small → error
 */
export async function validateDiscountCode(
  rawCode: string,
  subtotalCents: number,
): Promise<DiscountValidationResult> {
  const code = rawCode.trim().toLowerCase();
  if (!code) return { ok: false, error: 'Enter a code' };
  if (subtotalCents < 100) return { ok: false, error: 'Cart subtotal too small for a discount' };

  const affiliate = await prisma.affiliate.findUnique({
    where: { discountCode: code },
    select: { id: true, slug: true, status: true, discountCode: true },
  });
  // Never leak whether the code exists if the affiliate is suspended.
  if (!affiliate || affiliate.status !== 'ACTIVE') {
    return { ok: false, error: 'Invalid code' };
  }

  const discountPct = AFFILIATE_PROGRAM.buyerDiscountPct; // 10
  const discountCents = Math.floor((subtotalCents * discountPct) / 100);

  return {
    ok: true,
    affiliateId: affiliate.id,
    affiliateSlug: affiliate.slug,
    code: affiliate.discountCode,
    discountPct,
    discountCents,
  };
}
