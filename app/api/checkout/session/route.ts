import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { stripe } from '@/lib/stripe';

export const runtime = 'nodejs';

/**
 * POST /api/checkout/session
 *
 * Creates a Stripe Checkout Session from the cart payload, threads the
 * affiliate context through metadata, and returns the hosted Stripe
 * checkout URL for the client to redirect to.
 *
 * Body: { lines: CartLine[] }  (from lib/cart.ts)
 *
 * What this does:
 *   1. Validate the line items (no zero or negative prices/quantities)
 *   2. Read the merit_ref cookie set by the affiliate-tracking middleware
 *   3. Build Stripe line_items from the cart
 *   4. Pick a shipping rate based on subtotal (free over $100, else $9.99)
 *   5. Create a Checkout Session with metadata.affiliate_slug
 *   6. Return { url } — the client redirects to it
 *
 * Discount code redemption is not yet wired (next iteration). For now
 * `allow_promotion_codes: true` lets customers enter codes if any
 * exist in Stripe Dashboard, but we don't yet auto-mint them on
 * affiliate signup.
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
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const lines: unknown = body.lines;
  if (!Array.isArray(lines) || lines.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
  }

  // Coerce + validate. Stripe rejects 0/negative amounts hard, so we
  // do the same here with a friendlier message.
  const cleanLines: CartLineIn[] = [];
  for (const raw of lines as any[]) {
    if (
      !raw || typeof raw.title !== 'string' || typeof raw.bundleLabel !== 'string'
      || typeof raw.unitCents !== 'number' || raw.unitCents <= 0
      || typeof raw.qty !== 'number' || raw.qty <= 0
    ) {
      return NextResponse.json({ error: 'Invalid cart line item' }, { status: 400 });
    }
    cleanLines.push({
      handle: String(raw.handle || ''),
      title: raw.title,
      bundleLabel: raw.bundleLabel,
      unitCents: Math.round(raw.unitCents),
      qty: Math.min(Math.round(raw.qty), 99), // cap qty to deter abuse
      imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : undefined,
    });
  }

  // Subtotal — used to pick shipping rate
  const subtotalCents = cleanLines.reduce(
    (sum, l) => sum + l.unitCents * l.qty,
    0,
  );

  // Read affiliate context from cookie (set by /middleware.ts when a
  // visitor lands with ?ref=SLUG). Will be null for direct buyers.
  const affiliateSlug = (await cookies()).get('merit_ref')?.value ?? null;

  // Build the absolute base URL for redirect targets. Falls back to a
  // request-origin sniff if NEXT_PUBLIC_SITE_URL isn't set.
  const url = new URL(req.url);
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? `${url.protocol}//${url.host}`;

  try {
    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      // line items pricing — Stripe doesn't need the products to exist
      // in its catalog; price_data is created inline.
      line_items: cleanLines.map((l) => ({
        quantity: l.qty,
        price_data: {
          currency: 'usd',
          unit_amount: l.unitCents,
          product_data: {
            name: l.title,
            description: l.bundleLabel,
            images: l.imageUrl ? [l.imageUrl] : undefined,
            metadata: { handle: l.handle },
          },
        },
      })),
      // Free shipping if subtotal qualifies, else flat $9.99.
      // (Stripe shows whichever rate we send as the only option.)
      shipping_options: [
        {
          shipping_rate_data: {
            type: 'fixed_amount',
            display_name:
              subtotalCents >= FREE_SHIPPING_CENTS_THRESHOLD
                ? 'Free shipping · 3–5 business days'
                : 'Standard shipping · 3–5 business days',
            fixed_amount: {
              amount:
                subtotalCents >= FREE_SHIPPING_CENTS_THRESHOLD
                  ? 0
                  : FLAT_SHIPPING_CENTS,
              currency: 'usd',
            },
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 3 },
              maximum: { unit: 'business_day', value: 5 },
            },
          },
        },
      ],
      // We ship US-only for now, per the policy
      shipping_address_collection: { allowed_countries: ['US'] },
      // Let customers paste in a code at checkout (we'll wire affiliate
      // codes to Stripe Promotion Codes in the next iteration).
      allow_promotion_codes: true,
      // Critical — this is how we get the affiliate context back at
      // webhook time. Stripe doesn't carry our cookie to the webhook.
      metadata: {
        affiliate_slug: affiliateSlug ?? '',
      },
      // Where Stripe redirects after success / cancel
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout/cancel`,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: 'Stripe did not return a checkout URL' },
        { status: 500 },
      );
    }
    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (e: any) {
    console.error('checkout/session failed:', e);
    return NextResponse.json(
      { error: e.message ?? 'Failed to create checkout session' },
      { status: 500 },
    );
  }
}
