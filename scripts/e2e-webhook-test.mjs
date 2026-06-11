// End-to-end webhook test:
// 1. Seed a test affiliate (ACTIVE)
// 2. Build a synthetic checkout.session.completed event with realistic shape
// 3. Sign it with STRIPE_WEBHOOK_SECRET (HMAC-SHA256, per Stripe's spec)
// 4. POST to production
// 5. Query DB to verify OrderCommission row + CustomerAffiliateLink

import crypto from 'node:crypto';
import { PrismaClient } from '../lib/generated/prisma/index.js';

const prisma = new PrismaClient();

const TEST_AFFILIATE_SLUG = 'e2e-test-' + Math.random().toString(36).slice(2, 8);
const TEST_CUSTOMER_EMAIL = 'webhook-test+' + Date.now() + '@meritsciences.com';
const TEST_CUSTOMER_ID = 'cus_test_e2e_' + Math.random().toString(36).slice(2, 10);
const TEST_SESSION_ID = 'cs_test_e2e_' + Math.random().toString(36).slice(2, 16);
const PROD_WEBHOOK = 'https://merit-sciences.onrender.com/api/stripe/webhook';
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

if (!WEBHOOK_SECRET) {
  console.error('STRIPE_WEBHOOK_SECRET not set');
  process.exit(1);
}

// ─── 1. Seed test affiliate ───────────────────────────────────────────
console.log('► Seeding test affiliate:', TEST_AFFILIATE_SLUG);
const affiliate = await prisma.affiliate.create({
  data: {
    slug: TEST_AFFILIATE_SLUG,
    name: 'E2E Webhook Test',
    email: 'affiliate-' + Date.now() + '@e2e-test.com', // different from customer
    discountCode: TEST_AFFILIATE_SLUG.toUpperCase(),
    status: 'ACTIVE',
  },
});
console.log('  affiliate.id =', affiliate.id);
console.log('  affiliate.email =', affiliate.email);

// ─── 2. Build synthetic checkout.session.completed event ──────────────
const eventId = 'evt_test_e2e_' + Math.random().toString(36).slice(2, 14);
const eventPayload = {
  id: eventId,
  object: 'event',
  api_version: '2026-05-27.dahlia',
  created: 1781150000,
  type: 'checkout.session.completed',
  livemode: false,
  data: {
    object: {
      id: TEST_SESSION_ID,
      object: 'checkout.session',
      payment_status: 'paid',
      status: 'complete',
      mode: 'payment',
      currency: 'usd',
      amount_subtotal: 12000, // $120.00 — over $100 so no shipping
      amount_total: 12000,
      customer: TEST_CUSTOMER_ID,
      customer_details: {
        email: TEST_CUSTOMER_EMAIL,
        name: 'E2E Test Customer',
      },
      metadata: {
        affiliate_slug: TEST_AFFILIATE_SLUG,
      },
    },
  },
};
const rawBody = JSON.stringify(eventPayload);

// ─── 3. Sign per Stripe spec: t=<ts>,v1=<HMAC-SHA256(ts.body, secret)> ─
const timestamp = Math.floor(Date.now() / 1000);
const signedPayload = `${timestamp}.${rawBody}`;
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(signedPayload, 'utf8')
  .digest('hex');
const stripeSignature = `t=${timestamp},v1=${signature}`;

// ─── 4. POST to production ────────────────────────────────────────────
console.log('► POSTing event to', PROD_WEBHOOK);
console.log('  amount_subtotal =', eventPayload.data.object.amount_subtotal, 'cents');
console.log('  affiliate_slug  =', TEST_AFFILIATE_SLUG);
const res = await fetch(PROD_WEBHOOK, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'stripe-signature': stripeSignature,
  },
  body: rawBody,
});
const responseText = await res.text();
console.log('  HTTP', res.status, '—', responseText);

if (res.status !== 200) {
  console.error('✗ Webhook returned non-200, aborting verification');
  await prisma.affiliate.delete({ where: { id: affiliate.id } });
  process.exit(1);
}

// Wait a moment for DB writes to settle
await new Promise(r => setTimeout(r, 1500));

// ─── 5. Verify DB state ───────────────────────────────────────────────
console.log('► Verifying DB writes...');

const commission = await prisma.orderCommission.findUnique({
  where: { stripeSessionId: TEST_SESSION_ID },
  include: { affiliate: { select: { slug: true } } },
});
const link = await prisma.customerAffiliateLink.findUnique({
  where: { customerStripeId: TEST_CUSTOMER_ID },
  include: { affiliate: { select: { slug: true } } },
});

console.log('');
console.log('═══ RESULTS ═══');
if (!commission) {
  console.log('✗ OrderCommission row NOT found — webhook likely failed silently');
} else {
  console.log('✓ OrderCommission written:');
  console.log('    sessionId        =', commission.stripeSessionId);
  console.log('    affiliate.slug   =', commission.affiliate.slug);
  console.log('    orderTotalCents  =', commission.orderTotalCents.toString());
  console.log('    commissionRateBp =', commission.commissionRateBp, '(=', commission.commissionRateBp / 100, '%)');
  console.log('    commissionCents  =', commission.commissionCents.toString(), '($', (Number(commission.commissionCents) / 100).toFixed(2), ')');
  console.log('    status           =', commission.status);
}
if (!link) {
  console.log('✗ CustomerAffiliateLink row NOT found');
} else {
  console.log('✓ CustomerAffiliateLink (evergreen lock) written:');
  console.log('    customerStripeId =', link.customerStripeId);
  console.log('    customerEmail    =', link.customerEmail);
  console.log('    affiliate.slug   =', link.affiliate.slug);
  console.log('    totalOrders      =', link.totalOrders);
  console.log('    totalCommission  = $', (Number(link.totalCommissionCents) / 100).toFixed(2));
}

// ─── 6. Cleanup test rows ─────────────────────────────────────────────
console.log('► Cleaning up test rows...');
if (commission) await prisma.orderCommission.delete({ where: { id: commission.id } });
if (link) await prisma.customerAffiliateLink.delete({ where: { id: link.id } });
await prisma.affiliate.delete({ where: { id: affiliate.id } });
console.log('  done.');
await prisma.$disconnect();
