/**
 * Stripe — interim card processing while a permanent high-risk acquirer is
 * sourced. Runs alongside PayPal; which one the checkout offers is decided by
 * paymentsProvider() below — normally by which processor has credentials, with
 * PAYMENTS_PROVIDER available as an explicit override.
 *
 * ── ANONYMIZATION ────────────────────────────────────────────────────────
 * Stripe sees materially LESS than PayPal did, and that is structural rather
 * than something we have to defend: a PaymentIntent is an amount + a currency.
 * There are no line items in the request at all, so there is nothing to cloak.
 * The three fields that CAN carry product information are set explicitly here:
 *
 *   description                  generic, never a compound or category
 *   statement_descriptor_suffix  what the buyer sees on their statement — the
 *                                exact control PayPal never gave us, and the
 *                                main driver of "I don't recognise this charge"
 *                                disputes
 *   metadata                     internal ids ONLY (order id, affiliate id,
 *                                discount code). Never a product name, handle,
 *                                or title.
 *
 * Anything that would name a compound stays in our own database and in the
 * Merit-branded emails, exactly as with PayPal.
 *
 * ── WHY THE PAYPAL-SHAPED ADAPTER ────────────────────────────────────────
 * Post-payment fulfilment (order promotion, confirmation email, affiliate
 * commission, ad conversion) is a single battle-tested path in
 * lib/paypal-fulfillment.ts. Rather than fork it — and risk paying affiliates
 * incorrectly on a second, less-tested code path — the webhook adapts a
 * succeeded PaymentIntent into the minimal PayPal shape that function expects.
 * One fulfilment path, two processors.
 */
import 'server-only';
import Stripe from 'stripe';

/**
 * Which processor the checkout should present.
 *
 * Resolution order:
 *   1. An explicit PAYMENTS_PROVIDER, if it clearly says "stripe" or "paypal".
 *   2. Otherwise: whichever processor actually has credentials.
 *
 * Step 2 exists because step 1 was a single point of failure. On 2026-08-01 the
 * PayPal keys were removed and PAYMENTS_PROVIDER=stripe did not reach the
 * running process, so checkout resolved to a processor with no credentials and
 * went down — the page rendered "Payment processor not configured" while both
 * Stripe keys sat right there in the environment. A configured processor should
 * never be dark because a *third* variable failed to arrive. Now the keys
 * themselves are the signal, and PAYMENTS_PROVIDER is only an override.
 *
 * normalize() strips quotes and zero-width characters: env values are pasted by
 * hand, and neither a literal `"stripe"` nor a stray U+200B survives a bare
 * === comparison (String.prototype.trim removes neither).
 */
export function paymentsProvider(): 'paypal' | 'stripe' {
  const explicit = normalizeEnv(process.env.PAYMENTS_PROVIDER);
  if (explicit === 'stripe') return 'stripe';
  if (explicit === 'paypal') return 'paypal';
  return stripeEnabled() ? 'stripe' : 'paypal';
}

/** Lowercase, strip surrounding quotes, drop zero-width/BOM characters. */
function normalizeEnv(v: string | undefined): string {
  return (v ?? '')
    .replace(/[​-‍﻿]/g, '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .trim()
    .toLowerCase();
}

export function stripeEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY?.trim();
}

export function paypalEnabled(): boolean {
  return !!process.env.PAYPAL_CLIENT_ID?.trim() && !!process.env.PAYPAL_CLIENT_SECRET?.trim();
}

let _client: Stripe | null = null;

export function stripe(): Stripe {
  if (_client) return _client;
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  _client = new Stripe(key, { apiVersion: '2026-05-27.dahlia' });
  return _client;
}

/**
 * Statement descriptor suffix. Card networks allow ~22 chars total including
 * the account prefix, alphanumerics and spaces only. Anything the buyer won't
 * recognise here becomes a dispute, so this should match what the checkout
 * page says — "Merit".
 */
export function statementDescriptorSuffix(): string {
  const raw = process.env.STRIPE_STATEMENT_DESCRIPTOR?.trim() || 'Merit';
  return raw.replace(/[^A-Za-z0-9 ]/g, '').slice(0, 22).trim() || 'Merit';
}

export type CreateIntentArgs = {
  /** Our order id — the ONLY thing that links this charge back to a cart. */
  orderId: string;
  amountCents: number;
  customerEmail: string;
  affiliateId?: string | null;
  discountCode?: string | null;
  /**
   * Idempotency key for the create call, supplied by the caller.
   *
   * MUST be unique per distinct checkout attempt. This was previously derived
   * from `orderId`, which is the literal string "pending" at create time —
   * every checkout therefore sent Stripe the same key, so the first order of
   * any 24-hour window succeeded and every subsequent one failed with
   * "Could not start checkout". See /api/stripe/create-intent for how the key
   * is now built (per-attempt nonce + a fingerprint of the priced cart).
   */
  idempotencyKey: string;
};

/**
 * Create a PaymentIntent for an already-persisted PENDING_PAYMENT order.
 *
 * The amount comes from the DB, never from the client — same rule as the
 * PayPal path. `metadata.orderId` is what the webhook uses to find the order,
 * so it is the one field that must always be present.
 */
export async function createPaymentIntent(args: CreateIntentArgs): Promise<Stripe.PaymentIntent> {
  return stripe().paymentIntents.create(
    {
      amount: args.amountCents,
      currency: 'usd',
      // Generic by design — this string can surface in Stripe's dashboard,
      // exports, and some receipt surfaces.
      description: 'Merit order',
      statement_descriptor_suffix: statementDescriptorSuffix(),
      receipt_email: args.customerEmail || undefined,
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId: args.orderId,
        // Attribution, mirroring PayPal's custom_id. Ids and codes only.
        affiliateId: args.affiliateId ?? '',
        discountCode: args.discountCode ?? '',
      },
    },
    // Idempotent per ATTEMPT: a retry of the same submit reuses the intent
    // instead of opening a second one. The caller owns key construction — see
    // CreateIntentArgs.idempotencyKey for why this must not be derived from
    // orderId.
    { idempotencyKey: args.idempotencyKey },
  );
}

/**
 * Adapt a succeeded PaymentIntent into the minimal PayPal order shape that
 * fulfillCapturedOrder() consumes, so both processors share one fulfilment
 * path. Only the fields that function actually reads are populated:
 *
 *   id                                    -> stored as the order's processor id
 *   purchase_units[0].custom_id           -> affiliate + discount attribution
 *   ...payments.captures[0].id            -> the charge id (commission ledger key)
 *   ...captures[0].amount.value           -> dollars, as PayPal formats them
 */
export function paymentIntentAsPayPalOrder(pi: Stripe.PaymentIntent): any {
  const chargeId =
    typeof pi.latest_charge === 'string' ? pi.latest_charge : pi.latest_charge?.id ?? pi.id;

  return {
    id: pi.id,
    purchase_units: [
      {
        custom_id: JSON.stringify({
          a: pi.metadata?.affiliateId || null,
          c: pi.metadata?.discountCode || null,
        }),
        payments: {
          captures: [
            {
              id: chargeId,
              amount: { value: (pi.amount_received || pi.amount || 0) / 100 + '', currency_code: 'USD' },
            },
          ],
        },
      },
    ],
    payer: { email_address: pi.receipt_email ?? undefined },
  };
}
