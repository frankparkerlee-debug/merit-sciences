// Backfill Stripe Coupon + PromotionCode for any affiliate that doesn't
// yet have stripeCouponId set. Safe to run multiple times — sync helper
// is idempotent.

import { PrismaClient } from '../lib/generated/prisma/index.js';
import Stripe from 'stripe';

const prisma = new PrismaClient();
// Pin to 2024-06-20 — this script only touches Coupons + PromotionCodes,
// both of which were reshaped in 2026-05-27.dahlia (param rename
// coupon→promotion etc). Older API works fine for our use case.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

// AFFILIATE_PROGRAM constant — buyer gets 10% off
const BUYER_DISCOUNT_PCT = 10;

const unsynced = await prisma.affiliate.findMany({
  where: { stripeCouponId: null },
  select: { id: true, name: true, slug: true, discountCode: true },
});
console.log(`► Found ${unsynced.length} unsynced affiliate(s).`);

for (const a of unsynced) {
  console.log(`  - syncing ${a.slug} (${a.discountCode})...`);
  try {
    const coupon = await stripe.coupons.create({
      name: `Affiliate — ${a.name}`,
      percent_off: BUYER_DISCOUNT_PCT,
      duration: 'forever',
      metadata: {
        affiliate_id: a.id,
        affiliate_slug: a.slug,
        source: 'merit-affiliate-program',
      },
    });
    const promo = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: a.discountCode.toUpperCase(),
      active: true,
      metadata: {
        affiliate_id: a.id,
        affiliate_slug: a.slug,
        source: 'merit-affiliate-program',
      },
    });
    await prisma.affiliate.update({
      where: { id: a.id },
      data: {
        stripeCouponId: coupon.id,
        stripePromotionCodeId: promo.id,
      },
    });
    console.log(`    ✓ coupon=${coupon.id}  promo=${promo.id}  code=${a.discountCode.toUpperCase()}`);
  } catch (err) {
    console.error(`    ✗ failed:`, err.message);
  }
}

await prisma.$disconnect();
console.log('Done.');
