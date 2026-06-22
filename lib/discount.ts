/**
 * Discount code validation — server-side only.
 *
 * Validates and applies a code typed by the buyer at checkout. Supports
 * two distinct sources:
 *
 *   1. Affiliate codes  — Affiliate.discountCode (one per affiliate, flat 10% off,
 *      drives commission attribution)
 *   2. Manual codes     — Discount table (operator-created in /admin/discounts,
 *      supports PERCENT / FIXED_AMOUNT / FREE_SHIPPING with rule constraints)
 *
 * The lookup tries affiliate first (fast indexed unique constraint), then
 * falls back to manual. Returns a discriminated union so the caller knows
 * which path matched.
 */

import 'server-only';
import { prisma } from '@/lib/db';
import { AFFILIATE_PROGRAM } from '@/lib/affiliate';

export type DiscountValidationResult =
  | {
      ok: true;
      source: 'affiliate';
      affiliateId: string;
      affiliateSlug: string;
      code: string;
      discountPct: number;
      discountCents: number;
      freeShipping: false;
    }
  | {
      ok: true;
      source: 'manual';
      manualDiscountId: string;
      code: string;
      discountCents: number;
      freeShipping: boolean;
    }
  | { ok: false; error: string };

export type ValidationContext = {
  subtotalCents: number;
  buyerEmail?: string | null;     // optional — only needed for once-per-customer / customer-locked codes
  cartQuantity?: number;          // optional — only needed for min-quantity codes
};

/**
 * Validate a code typed by the buyer. Returns the calculated discount or
 * a user-facing error. Errors are intentionally generic for invalid codes
 * (don't leak which exist) but specific for rule failures the buyer can fix.
 */
export async function validateDiscountCode(
  rawCode: string,
  contextOrSubtotal: number | ValidationContext,
): Promise<DiscountValidationResult> {
  // Back-compat: callers passed `subtotalCents: number` before this rewrite.
  // Normalize into the richer context shape.
  const ctx: ValidationContext =
    typeof contextOrSubtotal === 'number'
      ? { subtotalCents: contextOrSubtotal }
      : contextOrSubtotal;

  const code = rawCode.trim().toLowerCase();
  if (!code) return { ok: false, error: 'Enter a code' };
  if (ctx.subtotalCents < 100) return { ok: false, error: 'Cart subtotal too small for a discount' };

  // ── 1) Try affiliate codes first ──────────────────────────────
  const affiliate = await prisma.affiliate.findUnique({
    where: { discountCode: code },
    select: { id: true, slug: true, status: true, discountCode: true },
  });
  if (affiliate) {
    // Never leak that the code exists if the affiliate is suspended.
    if (affiliate.status !== 'ACTIVE') return { ok: false, error: 'Invalid code' };
    const discountPct = AFFILIATE_PROGRAM.buyerDiscountPct; // 10
    const discountCents = Math.floor((ctx.subtotalCents * discountPct) / 100);
    return {
      ok: true,
      source: 'affiliate',
      affiliateId: affiliate.id,
      affiliateSlug: affiliate.slug,
      code: affiliate.discountCode,
      discountPct,
      discountCents,
      freeShipping: false,
    };
  }

  // ── 2) Try manual / operator-created codes ────────────────────
  const manual = await prisma.discount.findUnique({ where: { code } });
  if (!manual) return { ok: false, error: 'Invalid code' };

  // Status / schedule
  if (manual.status !== 'ACTIVE') return { ok: false, error: 'This code is no longer active' };
  const now = new Date();
  if (manual.startsAt > now) return { ok: false, error: 'This code is not active yet' };
  if (manual.endsAt && manual.endsAt < now) return { ok: false, error: 'This code has expired' };

  // Min purchase
  if (manual.minPurchaseCents && ctx.subtotalCents < Number(manual.minPurchaseCents)) {
    const minDollars = (Number(manual.minPurchaseCents) / 100).toFixed(2);
    return { ok: false, error: `Minimum order of $${minDollars} required for this code` };
  }

  // Min quantity
  if (manual.minQuantity && ctx.cartQuantity !== undefined && ctx.cartQuantity < manual.minQuantity) {
    return { ok: false, error: `Add at least ${manual.minQuantity} items to use this code` };
  }

  // Email-locked (single-customer code)
  if (manual.customerEmail) {
    if (!ctx.buyerEmail) {
      return { ok: false, error: 'This code is restricted to a specific customer' };
    }
    if (manual.customerEmail.toLowerCase() !== ctx.buyerEmail.toLowerCase()) {
      return { ok: false, error: 'This code is not valid for your email' };
    }
  }

  // Total max uses — query the authoritative count from Order table
  if (manual.maxUses !== null) {
    const usedCount = await prisma.order.count({
      where: {
        // Orders persist discountCode uppercased (see create-order /
        // webhook), so match that case or the count is always 0 and the
        // limit never enforces.
        discountCode: code.toUpperCase(),
        status: { not: 'PENDING_PAYMENT' }, // only count completed
      },
    });
    if (usedCount >= manual.maxUses) {
      return { ok: false, error: 'This code has reached its usage limit' };
    }
  }

  // Once-per-customer — query Order by buyer email
  if (manual.oncePerCustomer && ctx.buyerEmail) {
    const priorUse = await prisma.order.findFirst({
      where: {
        discountCode: code.toUpperCase(), // orders store the code uppercased
        customerEmail: ctx.buyerEmail.toLowerCase(),
        status: { not: 'PENDING_PAYMENT' },
      },
      select: { id: true },
    });
    if (priorUse) {
      return { ok: false, error: 'You have already used this code' };
    }
  }

  // ── Calculate the discount amount ──
  let discountCents = 0;
  let freeShipping = false;

  switch (manual.type) {
    case 'PERCENT':
      // value is stored in basis points (10% = 1000)
      discountCents = Math.floor((ctx.subtotalCents * manual.value) / 10000);
      break;
    case 'FIXED_AMOUNT':
      discountCents = Math.min(manual.value, ctx.subtotalCents);
      break;
    case 'FREE_SHIPPING':
      // Type-only — signals shipping should be free, no subtotal reduction
      discountCents = 0;
      freeShipping = true;
      break;
  }

  // freeShipping flag stacks on top of any type. A PERCENT code with the
  // freeShipping flag set will both give the percent off AND zero shipping.
  if (manual.freeShipping) freeShipping = true;

  return {
    ok: true,
    source: 'manual',
    manualDiscountId: manual.id,
    code: manual.code,
    discountCents,
    freeShipping,
  };
}
