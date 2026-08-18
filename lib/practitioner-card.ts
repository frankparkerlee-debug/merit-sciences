import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import Stripe from 'stripe';
import { prisma } from './db';
import { stripe } from './stripe';

/**
 * Card-on-file for practitioner accounts.
 *
 * Two constraints shape this file.
 *
 * 1. Stripe must never see meritsciences.com. The storefront and the payment
 *    domain are deliberately separated, so card capture has to happen on the
 *    checkout origin — which is also where the practitioner's storefront
 *    session does not exist. Hence the signed token below: the storefront
 *    mints it from a verified session, and the checkout origin verifies it
 *    without needing that session.
 *
 * 2. We store nothing that could reconstruct a card. Brand, last4 and expiry
 *    are mirrored only so the portal can say which card is on file; the
 *    instrument stays at Stripe behind a PaymentMethod id.
 */

const SECRET = process.env.CRON_SECRET || 'dev-secret';
/** Deliberately short — it authorises attaching a card to an account. */
const TTL_MS = 30 * 60 * 1000;

function mac(payload: string): string {
  return createHmac('sha256', SECRET).update(`card:${payload}`).digest('base64url').slice(0, 32);
}

/** Sign a short-lived grant to add a card to one practice. */
export function signCardToken(applicationId: string, now: number): string {
  const payload = Buffer.from(JSON.stringify({ a: applicationId, e: now + TTL_MS })).toString('base64url');
  return `${payload}.${mac(payload)}`;
}

/** Returns the application id, or null if forged, malformed or expired. */
export function verifyCardToken(token: string | null | undefined, now: number): string | null {
  if (!token) return null;
  const i = token.lastIndexOf('.');
  if (i <= 0) return null;
  const payload = token.slice(0, i);
  const expected = mac(payload);
  const a = Buffer.from(token.slice(i + 1));
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { a: applicationId, e } = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (typeof applicationId !== 'string' || typeof e !== 'number' || e < now) return null;
    return applicationId;
  } catch {
    return null;
  }
}

/**
 * The Stripe Customer for a practice, created on first use.
 *
 * Nothing product-identifying goes to Stripe — same rule the PaymentIntent
 * path follows. The metadata carries our application id so a Stripe-side
 * lookup can find the account, and nothing about what they buy.
 */
export async function ensureStripeCustomer(applicationId: string): Promise<string> {
  const app = await prisma.practitionerApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, email: true, practiceName: true, stripeCustomerId: true },
  });
  if (!app) throw new Error('Application not found');
  if (app.stripeCustomerId) return app.stripeCustomerId;

  const customer = await stripe().customers.create(
    {
      email: app.email,
      name: app.practiceName,
      metadata: { applicationId: app.id },
    },
    { idempotencyKey: `practitioner-customer-${app.id}` },
  );
  await prisma.practitionerApplication.update({
    where: { id: app.id },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

/** Mirror the displayable card facts after a SetupIntent succeeds. */
export async function storeCardFromSetupIntent(
  applicationId: string,
  setupIntentId: string,
): Promise<{ brand: string; last4: string } | null> {
  const si = await stripe().setupIntents.retrieve(setupIntentId, { expand: ['payment_method'] });
  if (si.status !== 'succeeded') return null;

  const pm = si.payment_method as Stripe.PaymentMethod | null;
  if (!pm || typeof pm === 'string' || !pm.card) return null;

  // Verify the intent really belongs to this practice before trusting it —
  // the id arrives from the browser.
  const app = await prisma.practitionerApplication.findUnique({
    where: { id: applicationId },
    select: { stripeCustomerId: true },
  });
  if (!app?.stripeCustomerId || si.customer !== app.stripeCustomerId) return null;

  // Make it the default so an off-session charge picks it up without being
  // told which instrument to use.
  await stripe().customers.update(app.stripeCustomerId, {
    invoice_settings: { default_payment_method: pm.id },
  });

  await prisma.practitionerApplication.update({
    where: { id: applicationId },
    data: {
      cardPaymentMethodId: pm.id,
      cardBrand: pm.card.brand,
      cardLast4: pm.card.last4,
      cardExpMonth: pm.card.exp_month,
      cardExpYear: pm.card.exp_year,
      cardAddedAt: new Date(),
    },
  });
  return { brand: pm.card.brand, last4: pm.card.last4 };
}

/** Detach at Stripe and clear our mirror. Best-effort on the Stripe side. */
export async function removeCard(applicationId: string): Promise<void> {
  const app = await prisma.practitionerApplication.findUnique({
    where: { id: applicationId },
    select: { cardPaymentMethodId: true },
  });
  if (app?.cardPaymentMethodId) {
    await stripe().paymentMethods.detach(app.cardPaymentMethodId).catch(() => {
      /* already detached, or gone — clearing our side is what matters */
    });
  }
  await prisma.practitionerApplication.update({
    where: { id: applicationId },
    data: {
      cardPaymentMethodId: null, cardBrand: null, cardLast4: null,
      cardExpMonth: null, cardExpYear: null, cardAddedAt: null,
    },
  });
}
