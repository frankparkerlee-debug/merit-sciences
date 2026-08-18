import 'server-only';
import type Stripe from 'stripe';
import { prisma } from './db';
import { stripe } from './stripe';
import type { CartLineIn } from './checkout-pricing';

/**
 * Practitioner subscriptions.
 *
 * Stripe Billing owns the hard part — the schedule, the automatic charge,
 * failed-payment retries, dunning and the hosted management portal. This file
 * owns the two things Stripe cannot know: what to ship, and the risk rule.
 *
 * ── THE RISK RULE ────────────────────────────────────────────────────────
 * Nothing product-identifying and no storefront URL may reach Stripe. A
 * PaymentIntent made that easy — it carries an amount and an order id and
 * nothing else. A subscription cannot: every invoice must have a line item,
 * and a line item must have a name, and that name is rendered on Stripe's
 * hosted invoice, its PDF, its emails and the customer portal.
 *
 * So the name is fixed HERE, as a constant, and `createSubscription` is the
 * only way to open one. A caller cannot pass a product name because there is
 * no parameter for it. That is deliberate: the failure mode this guards
 * against is not a bug, it is somebody later writing the obvious code and
 * putting "Retatrutide 10 mg" on a Stripe invoice.
 *
 * The real contents live in our own `lines` snapshot, which never leaves us.
 */
const STRIPE_FACING_LINE_NAME = 'Merit order';

/**
 * The single Stripe Product every subscription bills against.
 *
 * Subscription `price_data` requires a Product id — unlike invoice items, it
 * will not take an inline `product_data`. That turns out to be the safer
 * shape: there is exactly ONE product, created once with a fixed generic
 * name, and every subscription points at it. There is no per-subscription
 * name to get wrong, so a compound name cannot reach a Stripe invoice even by
 * accident.
 *
 * Found by metadata rather than a hardcoded id so this works across
 * environments without configuration, and memoised because it never changes.
 */
let productIdCache: string | null = null;

async function ensureStripeProduct(): Promise<string> {
  if (productIdCache) return productIdCache;

  const found = await stripe()
    .products.search({ query: "metadata['merit']:'subscription-line'", limit: 1 })
    .catch(() => null);
  if (found?.data?.[0]?.id) {
    productIdCache = found.data[0].id;
    return productIdCache;
  }

  const created = await stripe().products.create(
    {
      name: STRIPE_FACING_LINE_NAME,
      metadata: { merit: 'subscription-line' },
    },
    { idempotencyKey: 'merit-subscription-line-product' },
  );
  productIdCache = created.id;
  return created.id;
}

export type Cadence = { unit: 'week' | 'month'; count: number };

/**
 * Cadence comes from the line's own bundleLabel — the string the buyer saw
 * ("Subscribe · Every 6 weeks") — not from a separate client field that could
 * disagree with it. Returns null for anything that is not a subscribe label,
 * which doubles as the mixed-cart detector.
 */
export function cadenceFromLabel(bundleLabel: string): Cadence | null {
  const m = /^subscribe\s*·\s*every\s+(?:(\d+)\s+)?(week|month)s?$/i.exec((bundleLabel || '').trim());
  if (!m) return null;
  const count = m[1] ? parseInt(m[1], 10) : 1;
  if (!Number.isFinite(count) || count < 1 || count > 12) return null;
  return { unit: m[2].toLowerCase() as 'week' | 'month', count };
}

export type SubscriptionInput = {
  applicationId: string;
  stripeCustomerId: string;
  customerEmail: string;
  /** What ships each cycle. Stored by us; never sent to Stripe. */
  lines: CartLineIn[];
  /** The amount charged at checkout, frozen for the life of the subscription. */
  amountCents: number;
  cadence: Cadence;
  affiliateId?: string | null;
  discountCode?: string | null;
  shipping?: unknown;
};

/**
 * Open a subscription. The ONLY way one should ever be created.
 *
 * `price_data` is used rather than a pre-made Price so the amount can be the
 * exact figure resolved at checkout — Parker's rule — without mirroring every
 * SKU × account-rate combination into Stripe as a Price object.
 */
export async function createSubscription(input: SubscriptionInput) {
  if (!Number.isFinite(input.amountCents) || input.amountCents <= 0) {
    throw new Error('Subscription amount must be positive');
  }
  const productId = await ensureStripeProduct();

  const sub = await stripe().subscriptions.create({
    customer: input.stripeCustomerId,
    items: [
      {
        price_data: {
          currency: 'usd',
          // The one generic product. See THE RISK RULE above — there is no
          // per-subscription name, so there is nothing to leak.
          product: productId,
          unit_amount: input.amountCents,
          recurring: { interval: input.cadence.unit, interval_count: input.cadence.count },
        },
      },
    ],
    // The saved card is charged without the practice present.
    off_session: true,
    payment_behavior: 'allow_incomplete',
    collection_method: 'charge_automatically',
    // Ids only — same discipline the PaymentIntent path follows. No handles,
    // no compound names, no storefront URLs.
    metadata: { applicationId: input.applicationId },
    expand: ['latest_invoice.payment_intent'],
  });

  const row = await prisma.practitionerSubscription.create({
    data: {
      stripeSubscriptionId: sub.id,
      stripeCustomerId: input.stripeCustomerId,
      applicationId: input.applicationId,
      customerEmail: input.customerEmail,
      lines: input.lines as unknown as object,
      unitAmountCents: input.amountCents,
      intervalUnit: input.cadence.unit,
      intervalCount: input.cadence.count,
      affiliateId: input.affiliateId ?? null,
      discountCode: input.discountCode ?? null,
      shipping: (input.shipping ?? null) as unknown as object,
      status: sub.status === 'active' || sub.status === 'trialing' ? 'ACTIVE' : 'INCOMPLETE',
    },
  });
  return { subscription: sub, row };
}

/** Look up our mirror for an incoming Stripe event. */
export async function findByStripeId(stripeSubscriptionId: string) {
  return prisma.practitionerSubscription.findUnique({ where: { stripeSubscriptionId } });
}

/** Mirror a status change from Stripe (cancel, past_due, etc.). */
export async function syncStatus(sub: Stripe.Subscription) {
  const status =
    sub.status === 'active' || sub.status === 'trialing'
      ? 'ACTIVE'
      : sub.status === 'canceled'
        ? 'CANCELED'
        : sub.status === 'past_due' || sub.status === 'unpaid'
          ? 'PAST_DUE'
          : 'INCOMPLETE';
  await prisma.practitionerSubscription
    .update({
      where: { stripeSubscriptionId: sub.id },
      data: { status, canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null },
    })
    .catch(() => { /* an event for a subscription we never mirrored — ignore */ });
}

/**
 * A link to Stripe's hosted management portal.
 *
 * This is why there is no pause/cancel/update-card UI to build: Stripe hosts
 * it. The return_url must name the CHECKOUT origin — it is handed to Stripe
 * and shown to the practice, so it must never be the storefront.
 */
export async function billingPortalUrl(stripeCustomerId: string, returnUrl: string) {
  const session = await stripe().billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });
  return session.url;
}
