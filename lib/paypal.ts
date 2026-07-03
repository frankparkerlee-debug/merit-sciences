/**
 * PayPal REST API client (server-side).
 *
 * Wraps:
 *   - OAuth access_token caching (9-hour TTL — we cache + refresh once
 *     the token has <5 minutes of life left).
 *   - Orders API v2 helpers: createOrder, captureOrder.
 *   - Webhook event verification (PayPal's own /v1/notifications/verify-webhook-signature).
 *
 * Environment:
 *   PAYPAL_ENV           — 'sandbox' or 'live'
 *   PAYPAL_CLIENT_ID     — REST API client id
 *   PAYPAL_CLIENT_SECRET — REST API client secret
 *   PAYPAL_WEBHOOK_ID    — id of the webhook endpoint we registered
 *                          (needed for inbound webhook verification)
 *
 * Reference docs:
 *   https://developer.paypal.com/docs/api/orders/v2/
 *   https://developer.paypal.com/api/rest/webhooks/event-validation/
 */

import 'server-only';

const SANDBOX_BASE = 'https://api-m.sandbox.paypal.com';
const LIVE_BASE = 'https://api-m.paypal.com';

function baseUrl(): string {
  return (process.env.PAYPAL_ENV ?? 'sandbox') === 'live' ? LIVE_BASE : SANDBOX_BASE;
}

function creds(): { id: string; secret: string } {
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required');
  }
  return { id, secret };
}

// ─── Access token cache ──────────────────────────────────────────────
// In-process cache. Survives across requests within the same Node
// instance; refresh when there's <5min left on the token.
type TokenCache = { token: string; expiresAt: number };
let _tokenCache: TokenCache | null = null;
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

export async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (_tokenCache && _tokenCache.expiresAt - now > TOKEN_REFRESH_BUFFER_MS) {
    return _tokenCache.token;
  }
  const { id, secret } = creds();
  const auth = Buffer.from(`${id}:${secret}`).toString('base64');
  const res = await fetch(`${baseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: 'grant_type=client_credentials',
    // Don't cache; the OAuth endpoint is rate-limited and we already
    // cache the result above.
    cache: 'no-store',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal OAuth failed (${res.status}): ${text}`);
  }
  const data = await res.json() as { access_token: string; expires_in: number };
  _tokenCache = {
    token: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return data.access_token;
}

// ─── REST helper ─────────────────────────────────────────────────────
async function paypalFetch(
  path: string,
  init: RequestInit & { headers?: Record<string, string> } = {},
): Promise<Response> {
  const token = await getAccessToken();
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
  return res;
}

// ─── Orders API ──────────────────────────────────────────────────────
export type PayPalAddress = {
  address_line_1: string;
  address_line_2?: string;
  admin_area_1: string;   // state code
  admin_area_2: string;   // city
  postal_code: string;
  country_code: 'US';
};

export type PayPalOrderRequest = {
  /** Cents → converted to decimal currency string for PayPal. */
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  /** Items shown on the PayPal review page. */
  items: Array<{
    name: string;
    description?: string;
    quantity: number;
    unitCents: number;
    sku?: string;
  }>;
  /** Discount applied to the order subtotal (in cents). */
  discountCents?: number;
  /** Our internal merchant reference — surfaces in webhooks. */
  customId: string;
  /** Short text shown to buyer on the PayPal review page. */
  description?: string;
  /** Where PayPal sends the buyer after approving (used for Smart Buttons popup return). */
  returnUrl: string;
  cancelUrl: string;
  /**
   * Optional buyer + shipping info — set only for the card-flow path
   * where we collect addresses on our form. When unset, the order
   * uses shipping_preference=GET_FROM_FILE so the wallet (Apple Pay /
   * Google Pay / PayPal account) supplies these from the buyer's
   * saved info.
   */
  shippingName?: string;
  shippingAddress?: PayPalAddress;
  payerEmail?: string;
  payerPhone?: string;
  payerFirstName?: string;
  payerLastName?: string;
};

export type PayPalOrderResponse = {
  id: string;
  status: string;
  links: Array<{ href: string; rel: string; method: string }>;
};

function centsToCurrency(cents: number): string {
  return (cents / 100).toFixed(2);
}

export async function createPayPalOrder(req: PayPalOrderRequest): Promise<PayPalOrderResponse> {
  const itemTotalCents = req.items.reduce(
    (sum, it) => sum + it.unitCents * it.quantity,
    0,
  );

  // Whether the buyer provided shipping (card flow) or wallet should
  // supply it. Two different shipping_preference values.
  const buyerProvidedShipping = !!(req.shippingAddress && req.shippingName);

  const purchaseUnit: any = {
    reference_id: 'default',
    custom_id: req.customId,
    description: req.description?.slice(0, 127),
    amount: {
      currency_code: 'USD',
      value: centsToCurrency(req.totalCents),
      breakdown: {
        item_total: { currency_code: 'USD', value: centsToCurrency(itemTotalCents) },
        shipping:   { currency_code: 'USD', value: centsToCurrency(req.shippingCents) },
        discount:   { currency_code: 'USD', value: centsToCurrency(req.discountCents ?? 0) },
      },
    },
    items: req.items.map((it) => ({
      name: it.name.slice(0, 127),
      description: it.description?.slice(0, 127),
      quantity: String(it.quantity),
      unit_amount: { currency_code: 'USD', value: centsToCurrency(it.unitCents) },
      sku: it.sku?.slice(0, 127),
      category: 'PHYSICAL_GOODS',
    })),
  };

  if (buyerProvidedShipping) {
    purchaseUnit.shipping = {
      name: { full_name: req.shippingName!.slice(0, 300) },
      address: req.shippingAddress!,
    };
  }

  const body: any = {
    intent: 'CAPTURE',
    purchase_units: [purchaseUnit],
    application_context: {
      // Name shown on PayPal's own approval screen. Overridable via env so the
      // Merchant-of-Record's registered name can be set without a code change;
      // defaults to "Merit".
      brand_name: process.env.PAYPAL_BRAND_NAME || 'Merit',
      landing_page: 'NO_PREFERENCE',
      shipping_preference: buyerProvidedShipping ? 'SET_PROVIDED_ADDRESS' : 'GET_FROM_FILE',
      user_action: 'PAY_NOW',
      return_url: req.returnUrl,
      cancel_url: req.cancelUrl,
    },
  };

  // Payer block carries email + phone + name when the buyer typed
  // them on our form. PayPal uses these for the receipt + as fallback
  // contact info when the wallet doesn't supply them.
  if (req.payerEmail || req.payerPhone || req.payerFirstName) {
    body.payer = {};
    if (req.payerEmail) body.payer.email_address = req.payerEmail;
    if (req.payerFirstName || req.payerLastName) {
      body.payer.name = {
        given_name: req.payerFirstName?.slice(0, 140),
        surname:    req.payerLastName?.slice(0, 140),
      };
    }
    if (req.payerPhone) {
      body.payer.phone = {
        phone_number: { national_number: req.payerPhone.replace(/\D/g, '').slice(0, 14) },
      };
    }
  }

  const res = await paypalFetch('/v2/checkout/orders', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal createOrder failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<PayPalOrderResponse>;
}

export async function capturePayPalOrder(orderId: string): Promise<any> {
  const res = await paypalFetch(`/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    // PayPal expects an empty body but a Content-Type
    body: '{}',
    // PayPal-Request-Id makes the capture idempotent across retries
    headers: { 'PayPal-Request-Id': `merit-capture-${orderId}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal captureOrder failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function getPayPalOrder(orderId: string): Promise<any> {
  const res = await paypalFetch(`/v2/checkout/orders/${orderId}`, {
    method: 'GET',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayPal getOrder failed (${res.status}): ${text}`);
  }
  return res.json();
}

// ─── Webhook verification ────────────────────────────────────────────
// PayPal verifies inbound webhooks by POSTing the raw event payload
// back to /v1/notifications/verify-webhook-signature, along with the
// transmission headers. We can't HMAC-verify ourselves because PayPal
// signs with a rotating cert chain.
export type PayPalWebhookHeaders = {
  transmissionId: string;
  transmissionTime: string;
  transmissionSig: string;
  certUrl: string;
  authAlgo: string;
};

export async function verifyPayPalWebhook(
  headers: PayPalWebhookHeaders,
  rawBody: string,
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error('PAYPAL_WEBHOOK_ID is not configured; cannot verify');
    return false;
  }

  // The verify endpoint accepts the parsed event body as JSON, not raw
  // text. Parse once here.
  let parsedEvent: any;
  try {
    parsedEvent = JSON.parse(rawBody);
  } catch {
    return false;
  }

  const res = await paypalFetch('/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    body: JSON.stringify({
      transmission_id:   headers.transmissionId,
      transmission_time: headers.transmissionTime,
      cert_url:          headers.certUrl,
      auth_algo:         headers.authAlgo,
      transmission_sig:  headers.transmissionSig,
      webhook_id:        webhookId,
      webhook_event:     parsedEvent,
    }),
  });
  if (!res.ok) return false;
  const data = await res.json() as { verification_status: string };
  return data.verification_status === 'SUCCESS';
}
