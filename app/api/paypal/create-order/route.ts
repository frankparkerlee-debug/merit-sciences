import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createPayPalOrder } from '@/lib/paypal';
import { validateDiscountCode } from '@/lib/discount';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

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
  if (!Array.isArray(lines) || lines.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
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

  // ── Affiliate resolution: code (explicit) > cookie (implicit) ────
  // We do this server-side so the buyer can't fake attribution.
  let affiliateId: string | null = null;
  let affiliateSlug: string | null = null;
  let discountCode: string | null = null;
  let discountCents = 0;
  let attributionVia: 'discount_code' | 'cookie' | null = null;

  if (discountCodeInput) {
    const v = await validateDiscountCode(discountCodeInput, subtotalCents);
    if (!v.ok) {
      return NextResponse.json({ error: v.error, field: 'discountCode' }, { status: 400 });
    }
    affiliateId = v.affiliateId;
    affiliateSlug = v.affiliateSlug;
    discountCode = v.code;
    discountCents = v.discountCents;
    attributionVia = 'discount_code';
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
  const shippingCents = subtotalCents - discountCents >= FREE_SHIPPING_CENTS_THRESHOLD
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
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
    ?? (forwardedHost && !forwardedHost.startsWith('localhost')
        ? `${forwardedProto}://${forwardedHost}`
        : `${url.protocol}//${url.host}`);

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
    });

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
