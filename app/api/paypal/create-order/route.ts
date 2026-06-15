import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createPayPalOrder, getAccessToken } from '@/lib/paypal';
import { validateDiscountCode } from '@/lib/discount';
import { prisma } from '@/lib/db';
import { preCreateOrder } from '@/lib/orders';

export const runtime = 'nodejs';

// US state codes — used to validate buyer-provided addresses for the
// card flow. The wallet flows (Apple Pay / Google Pay / PayPal) get
// shipping info directly from the buyer's wallet so we don't validate
// these for those paths.
const US_STATE_CODES = new Set([
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV',
  'NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN',
  'TX','UT','VT','VA','WA','WV','WI','WY','DC','PR',
]);

type AddressIn = {
  fullName?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  zip?: string;
};

type CardBuyerIn = {
  email: string;
  phone: string;
  shipping: AddressIn;
  billing?: AddressIn;
};

function cleanAddress(a: AddressIn | undefined): {
  ok: true;
  address: {
    address_line_1: string;
    address_line_2?: string;
    admin_area_2: string;  // city
    admin_area_1: string;  // state
    postal_code: string;
    country_code: 'US';
  };
} | { ok: false; error: string; field?: string } {
  if (!a) return { ok: false, error: 'Address required' };
  const line1 = String(a.line1 ?? '').trim();
  const city = String(a.city ?? '').trim();
  const state = String(a.state ?? '').trim().toUpperCase();
  const zip = String(a.zip ?? '').trim();
  if (!line1) return { ok: false, error: 'Street address required', field: 'line1' };
  if (!city) return { ok: false, error: 'City required', field: 'city' };
  if (!US_STATE_CODES.has(state)) return { ok: false, error: 'Choose a valid US state', field: 'state' };
  if (!/^\d{5}(-\d{4})?$/.test(zip)) return { ok: false, error: 'ZIP must be 5 digits or 5+4', field: 'zip' };
  return {
    ok: true,
    address: {
      address_line_1: line1.slice(0, 300),
      address_line_2: a.line2 ? String(a.line2).trim().slice(0, 300) : undefined,
      admin_area_2: city.slice(0, 120),
      admin_area_1: state,
      postal_code: zip,
      country_code: 'US',
    },
  };
}

/**
 * POST /api/paypal/create-order
 *
 * Body: { lines: CartLine[], discountCode?: string }
 *
 * Server-side construction of a PayPal Orders v2 order. We do this
 * server-side (not in the browser) because:
 *   - Pricing must be authoritative — buyer can't tamper with cents
 *   - The custom_id field carries our affiliate attribution; the
 *     buyer must not be able to set it themselves
 *   - We can re-validate the discount code against the affiliate row
 *
 * Returns: { orderId: string } — the PayPal order id the client uses
 * to render Smart Buttons / Card Fields.
 */

const FREE_SHIPPING_CENTS_THRESHOLD = 10_000; // $100
const FLAT_SHIPPING_CENTS = 999;               // $9.99

type CartLineIn = {
  handle: string;
  title: string;
  bundleLabel: string;
  unitCents: number;
  qty: number;
  imageUrl?: string;
};

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const lines: unknown = body.lines;
  const discountCodeInput: string = String(body.discountCode ?? '').trim();
  const buyer: CardBuyerIn | undefined = body.buyer ?? undefined; // present only for card flow
  const ruoAttested: boolean = body.ruoAttested === true;
  if (!Array.isArray(lines) || lines.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
  }
  if (!ruoAttested) {
    return NextResponse.json(
      { error: 'You must confirm the research-use-only attestation before paying.', field: 'ruo' },
      { status: 400 },
    );
  }

  // ── Sanitize cart lines ──────────────────────────────────────────
  const cleanLines: CartLineIn[] = [];
  for (const raw of lines as any[]) {
    if (
      !raw || typeof raw.title !== 'string' || typeof raw.bundleLabel !== 'string'
      || typeof raw.unitCents !== 'number' || raw.unitCents <= 0
      || typeof raw.qty !== 'number' || raw.qty <= 0
    ) {
      return NextResponse.json({ error: 'Invalid cart line' }, { status: 400 });
    }
    cleanLines.push({
      handle: String(raw.handle || ''),
      title: raw.title,
      bundleLabel: raw.bundleLabel,
      unitCents: Math.round(raw.unitCents),
      qty: Math.min(Math.round(raw.qty), 99),
      imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : undefined,
    });
  }

  const subtotalCents = cleanLines.reduce(
    (sum, l) => sum + l.unitCents * l.qty,
    0,
  );

  // ── Discount resolution: typed code first (affiliate OR manual), then cookie ──
  // We do this server-side so the buyer can't fake attribution or pricing.
  let affiliateId: string | null = null;
  let affiliateSlug: string | null = null;
  let discountCode: string | null = null;
  let discountCents = 0;
  let freeShipping = false;
  let attributionVia: 'discount_code' | 'cookie' | null = null;

  if (discountCodeInput) {
    const cartQuantity = cleanLines.reduce((sum, l) => sum + l.qty, 0);
    const v = await validateDiscountCode(discountCodeInput, {
      subtotalCents,
      buyerEmail: buyer?.email ?? null,
      cartQuantity,
    });
    if (!v.ok) {
      return NextResponse.json({ error: v.error, field: 'discountCode' }, { status: 400 });
    }
    discountCode = v.code;
    discountCents = v.discountCents;
    freeShipping = v.freeShipping;
    attributionVia = 'discount_code';
    if (v.source === 'affiliate') {
      // Affiliate codes carry commission attribution
      affiliateId = v.affiliateId;
      affiliateSlug = v.affiliateSlug;
    }
    // Manual codes: no affiliate attribution. discountCode + discountCents only.
  } else {
    // Fall back to cookie-based attribution (set by middleware on ?ref=)
    const cookieSlug = (await cookies()).get('merit_ref')?.value ?? null;
    if (cookieSlug) {
      const aff = await prisma.affiliate.findUnique({
        where: { slug: cookieSlug },
        select: { id: true, slug: true, status: true },
      });
      if (aff && aff.status === 'ACTIVE') {
        affiliateId = aff.id;
        affiliateSlug = aff.slug;
        attributionVia = 'cookie';
        // Cookie-only attribution doesn't apply a buyer discount
        // (cookie is silent — only typed codes give 10% off)
      }
    }
  }

  // ── Pricing ──────────────────────────────────────────────────────
  // FREE_SHIPPING manual codes force shippingCents = 0 regardless of
  // the subtotal threshold.
  const shippingCents = freeShipping
    ? 0
    : subtotalCents - discountCents >= FREE_SHIPPING_CENTS_THRESHOLD
      ? 0
      : FLAT_SHIPPING_CENTS;
  const totalCents = subtotalCents - discountCents + shippingCents;

  // ── Build the custom_id payload — JSON in PayPal's custom field ──
  // PayPal limits custom_id to 127 chars. We pack only what we need
  // to attribute commission at webhook time. Affiliate id is a cuid
  // (~25 chars); via is short; everything else is recoverable.
  const customId = JSON.stringify({
    a: affiliateId ?? null,       // affiliate id (canonical)
    s: affiliateSlug ?? null,      // slug for debug
    v: attributionVia ?? null,     // 'discount_code' | 'cookie' | null
    c: discountCode ?? null,       // applied code
    d: discountCents,              // discount amount (cents)
  }).slice(0, 127);

  // ── Build redirect URLs (Render-safe; same trick as Stripe route)
  const url = new URL(req.url);
  const forwardedHost = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const forwardedProto = req.headers.get('x-forwarded-proto') ?? 'https';
  // Defensive scheme handling — if NEXT_PUBLIC_SITE_URL is set without
  // "https://" (operator typo when switching to live domain), add it.
  // PayPal rejects URLs without a scheme with INVALID_PARAMETER_SYNTAX.
  const rawOrigin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
    ?? (forwardedHost && !forwardedHost.startsWith('localhost')
        ? `${forwardedProto}://${forwardedHost}`
        : `${url.protocol}//${url.host}`);
  const origin = /^https?:\/\//.test(rawOrigin) ? rawOrigin : `https://${rawOrigin}`;

  // ── If card-flow buyer info supplied, validate it ───────────────
  let shippingName: string | undefined;
  let shippingAddress: ReturnType<typeof cleanAddress> extends { ok: true; address: infer A } ? A : never | undefined;
  let payerEmail: string | undefined;
  let payerPhone: string | undefined;
  let payerFirstName: string | undefined;
  let payerLastName: string | undefined;

  if (buyer) {
    // Contact
    payerEmail = String(buyer.email ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail)) {
      return NextResponse.json({ error: 'Valid email required', field: 'email' }, { status: 400 });
    }
    payerPhone = String(buyer.phone ?? '').replace(/\D/g, '');
    if (payerPhone.length < 7 || payerPhone.length > 14) {
      return NextResponse.json({ error: 'Valid phone number required', field: 'phone' }, { status: 400 });
    }
    // Shipping address + name
    const fullName = String(buyer.shipping?.fullName ?? '').trim();
    if (fullName.length < 2) {
      return NextResponse.json({ error: 'Full name required', field: 'fullName' }, { status: 400 });
    }
    const parts = fullName.split(/\s+/);
    payerFirstName = parts[0];
    payerLastName = parts.slice(1).join(' ') || parts[0];
    shippingName = fullName;

    const shipResult = cleanAddress(buyer.shipping);
    if (!shipResult.ok) {
      return NextResponse.json({ error: shipResult.error, field: `shipping.${shipResult.field ?? 'address'}` }, { status: 400 });
    }
    shippingAddress = shipResult.address as any;
  }

  // ── Create the order on PayPal ───────────────────────────────────
  try {
    const order = await createPayPalOrder({
      subtotalCents,
      shippingCents,
      totalCents,
      discountCents,
      items: cleanLines.map((l) => ({
        name: l.title,
        description: l.bundleLabel,
        quantity: l.qty,
        unitCents: l.unitCents,
        sku: l.handle,
      })),
      customId,
      description: 'Merit Sciences — research compounds',
      returnUrl: `${origin}/checkout/success`,
      cancelUrl: `${origin}/checkout/cancel`,
      // Card flow only — wallet flows leave these undefined
      shippingName,
      shippingAddress: shippingAddress as any,
      payerEmail,
      payerPhone,
      payerFirstName,
      payerLastName,
    });

    // ── PRE-CREATE Order row for card flow ─────────────────────────
    // PayPal does NOT include payer.email_address on the order response
    // after Advanced Card Fields capture, so the webhook can't build
    // the order from PayPal alone. We persist a PENDING_PAYMENT row
    // NOW with all the buyer info from the form. The webhook will
    // promote it to PAID when the capture completes.
    // Wallet flows (PayPal account / Apple Pay / Google Pay) skip
    // this — those flows DO have payer.email on the order response.
    if (buyer && payerEmail) {
      try {
        await preCreateOrder({
          paypalOrderId: order.id,
          customerEmail: payerEmail,
          customerName: shippingName ?? `${payerFirstName ?? ''} ${payerLastName ?? ''}`.trim(),
          customerPhone: payerPhone ?? null,
          shippingFullName: shippingName!,
          shippingLine1: (shippingAddress as any).address_line_1,
          shippingLine2: (shippingAddress as any).address_line_2 ?? null,
          shippingCity: (shippingAddress as any).admin_area_2,
          shippingState: (shippingAddress as any).admin_area_1,
          shippingZip: (shippingAddress as any).postal_code,
          shippingCountry: (shippingAddress as any).country_code,
          subtotalCents,
          shippingCents,
          discountCents,
          totalCents,
          discountCode: discountCode?.toUpperCase() ?? null,
          affiliateId,
          lines: cleanLines.map((l) => ({
            handle: l.handle,
            title: l.title,
            bundleLabel: l.bundleLabel,
            unitCents: l.unitCents,
            qty: l.qty,
          })),
        });
      } catch (err) {
        // Don't block checkout if pre-create fails — the webhook will
        // still try to create the Order. Just log so we can investigate.
        console.error('[create-order] preCreateOrder failed', err);
      }
    }

    return NextResponse.json({
      orderId: order.id,
      subtotalCents,
      shippingCents,
      discountCents,
      totalCents,
      attributionVia,
    });
  } catch (err: any) {
    console.error('[paypal/create-order] failed:', err.message ?? err);
    return NextResponse.json(
      { error: 'Could not start checkout. Try again in a moment.' },
      { status: 500 },
    );
  }
}
