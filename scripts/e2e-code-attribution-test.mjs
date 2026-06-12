// E2E test: code-based attribution wins over cookie.
//
// Scenarios tested:
//   1. ONLY code present → code-based attribution
//   2. BOTH code + cookie (different affiliates) → code wins
//   3. ONLY cookie (regression check that Phase 4 still works) → cookie-based
//
// For each: we seed two affiliates, build a synthetic
// checkout.session.completed event with the relevant fields set, sign
// it with STRIPE_WEBHOOK_SECRET, POST to production, and verify the
// resulting OrderCommission row credits the CORRECT affiliate.

import crypto from 'node:crypto';
import { PrismaClient } from '../lib/generated/prisma/index.js';

const prisma = new PrismaClient();
const PROD_WEBHOOK = 'https://merit-sciences.onrender.com/api/stripe/webhook';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
if (!WEBHOOK_SECRET) {
  console.error('STRIPE_WEBHOOK_SECRET not set');
  process.exit(1);
}

function rnd(prefix, n = 8) {
  return prefix + Math.random().toString(36).slice(2, 2 + n);
}

// Build a synthetic event signed per Stripe's spec.
function buildSignedEvent(eventBody) {
  const ts = Math.floor(Date.now() / 1000);
  const payload = JSON.stringify(eventBody);
  const sig = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(`${ts}.${payload}`, 'utf8')
    .digest('hex');
  return {
    payload,
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': `t=${ts},v1=${sig}`,
    },
  };
}

function makeSessionEvent({
  sessionId,
  customerStripeId,
  customerEmail,
  amountSubtotalCents,
  affiliateSlugInMetadata = null,
  promotionCodeId = null,
}) {
  return {
    id: rnd('evt_test_'),
    object: 'event',
    api_version: '2026-05-27.dahlia',
    created: Math.floor(Date.now() / 1000),
    type: 'checkout.session.completed',
    livemode: false,
    data: {
      object: {
        id: sessionId,
        object: 'checkout.session',
        payment_status: 'paid',
        status: 'complete',
        mode: 'payment',
        currency: 'usd',
        amount_subtotal: amountSubtotalCents,
        amount_total: amountSubtotalCents,
        customer: customerStripeId,
        customer_details: { email: customerEmail },
        metadata: {
          affiliate_slug: affiliateSlugInMetadata ?? '',
        },
        // Promotion code (if used) appears in session.discounts
        discounts: promotionCodeId
          ? [{ coupon: 'cpn_fake', promotion_code: promotionCodeId }]
          : [],
      },
    },
  };
}

async function fireEvent(eventBody) {
  const { payload, headers } = buildSignedEvent(eventBody);
  const res = await fetch(PROD_WEBHOOK, {
    method: 'POST',
    headers,
    body: payload,
  });
  return { status: res.status, body: await res.text() };
}

async function getCommissionByeSessionId(stripeSessionId) {
  return prisma.orderCommission.findUnique({
    where: { stripeSessionId },
    include: { affiliate: { select: { slug: true } } },
  });
}

let pass = 0;
let fail = 0;
async function assert(label, cond, detail = '') {
  if (cond) {
    console.log(`  ✓ ${label}`);
    pass++;
  } else {
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
    fail++;
  }
}

// ─── Setup: create two affiliates ────────────────────────────────────
console.log('═══ SETUP ═══');
const affA = await prisma.affiliate.create({
  data: {
    slug: rnd('e2e-a-'),
    name: 'Affiliate A — Code Owner',
    email: rnd('email-a-') + '@e2e-test.com',
    discountCode: rnd('codea').toUpperCase(),
    stripePromotionCodeId: rnd('promo_fake_'),
    status: 'ACTIVE',
  },
});
const affB = await prisma.affiliate.create({
  data: {
    slug: rnd('e2e-b-'),
    name: 'Affiliate B — Cookie Sender',
    email: rnd('email-b-') + '@e2e-test.com',
    discountCode: rnd('codeb').toUpperCase(),
    status: 'ACTIVE',
  },
});
console.log(`  affiliate A: slug=${affA.slug}  fake_promo_id=${affA.stripePromotionCodeId}`);
console.log(`  affiliate B: slug=${affB.slug}`);

// Track all session IDs we create so we can clean up
const createdSessionIds = [];

try {
  // ─── TEST 1: code-only → code-based attribution ────────────────────
  console.log('\n═══ TEST 1: code-only ═══');
  const sess1 = rnd('cs_test_e2e_');
  createdSessionIds.push(sess1);
  const cust1 = rnd('cus_test_e2e_');
  const r1 = await fireEvent(makeSessionEvent({
    sessionId: sess1,
    customerStripeId: cust1,
    customerEmail: rnd('buyer-') + '@example.com',
    amountSubtotalCents: 10000, // $100
    promotionCodeId: affA.stripePromotionCodeId,
    affiliateSlugInMetadata: null,
  }));
  await assert('webhook returns 200', r1.status === 200, `got ${r1.status} — ${r1.body}`);
  await new Promise(r => setTimeout(r, 1000));
  const c1 = await getCommissionByeSessionId(sess1);
  await assert('commission row written', !!c1);
  await assert('attributed to affiliate A (code owner)', c1?.affiliate.slug === affA.slug,
    `got ${c1?.affiliate.slug}, expected ${affA.slug}`);
  await assert('rate = 1500bp (15% Affiliate tier)', c1?.commissionRateBp === 1500);
  await assert('commission = $15.00', c1?.commissionCents?.toString() === '1500');

  // ─── TEST 2: BOTH code and cookie present → code wins ──────────────
  console.log('\n═══ TEST 2: code + cookie, code wins ═══');
  const sess2 = rnd('cs_test_e2e_');
  createdSessionIds.push(sess2);
  const cust2 = rnd('cus_test_e2e_');
  const r2 = await fireEvent(makeSessionEvent({
    sessionId: sess2,
    customerStripeId: cust2,
    customerEmail: rnd('buyer-') + '@example.com',
    amountSubtotalCents: 20000, // $200
    promotionCodeId: affA.stripePromotionCodeId, // code from A
    affiliateSlugInMetadata: affB.slug,          // cookie from B
  }));
  await assert('webhook returns 200', r2.status === 200, `got ${r2.status} — ${r2.body}`);
  await new Promise(r => setTimeout(r, 1000));
  const c2 = await getCommissionByeSessionId(sess2);
  await assert('commission row written', !!c2);
  await assert('CODE wins: attributed to affiliate A', c2?.affiliate.slug === affA.slug,
    `got ${c2?.affiliate.slug}, expected ${affA.slug}`);
  await assert('commission = $30.00 (15% of $200)', c2?.commissionCents?.toString() === '3000');

  // ─── TEST 3: ONLY cookie → cookie attribution (Phase 4 regression) ─
  console.log('\n═══ TEST 3: cookie-only (Phase 4 regression) ═══');
  const sess3 = rnd('cs_test_e2e_');
  createdSessionIds.push(sess3);
  const cust3 = rnd('cus_test_e2e_');
  const r3 = await fireEvent(makeSessionEvent({
    sessionId: sess3,
    customerStripeId: cust3,
    customerEmail: rnd('buyer-') + '@example.com',
    amountSubtotalCents: 5000, // $50
    affiliateSlugInMetadata: affB.slug,
    promotionCodeId: null,
  }));
  await assert('webhook returns 200', r3.status === 200, `got ${r3.status} — ${r3.body}`);
  await new Promise(r => setTimeout(r, 1000));
  const c3 = await getCommissionByeSessionId(sess3);
  await assert('commission row written', !!c3);
  await assert('attributed to affiliate B (cookie)', c3?.affiliate.slug === affB.slug,
    `got ${c3?.affiliate.slug}, expected ${affB.slug}`);
  await assert('commission = $7.50', c3?.commissionCents?.toString() === '750');

} finally {
  // ─── Cleanup ───────────────────────────────────────────────────────
  console.log('\n═══ CLEANUP ═══');
  // Delete commission rows + customer links by session/affiliate ids
  for (const sid of createdSessionIds) {
    const c = await prisma.orderCommission.findUnique({ where: { stripeSessionId: sid } });
    if (c) {
      await prisma.orderCommission.delete({ where: { id: c.id } });
      const l = await prisma.customerAffiliateLink.findUnique({ where: { id: c.customerLinkId } });
      if (l) await prisma.customerAffiliateLink.delete({ where: { id: l.id } });
    }
  }
  await prisma.affiliate.delete({ where: { id: affA.id } });
  await prisma.affiliate.delete({ where: { id: affB.id } });
  console.log('  ✓ test rows cleaned');
  await prisma.$disconnect();
}

console.log(`\n═══ RESULTS ═══\n  ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
