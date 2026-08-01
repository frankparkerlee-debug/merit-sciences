/**
 * Server-authoritative cart pricing + attribution.
 *
 * Extracted so BOTH processors compute the same number and credit the same
 * affiliate. A second implementation for Stripe would be a standing risk of
 * the two paths diverging — different totals for the same cart, or a
 * commission credited on one processor and not the other. There is one
 * implementation; each route just calls it.
 *
 * Everything here is deliberately server-side: the client sends line handles
 * and quantities, and we re-derive prices, discounts and attribution. A buyer
 * cannot fake pricing or steal/redirect commission by editing the request.
 */
import 'server-only';
import { cookies } from 'next/headers';
import { prisma } from './db';
import { validateDiscountCode } from './discount';
import { getPractitionerSession } from './practitioner-session';

export const FREE_SHIPPING_CENTS_THRESHOLD = 30_000; // $300
export const FLAT_SHIPPING_CENTS = 999; // $9.99

/**
 * Ad-funnel / paid-acquisition codes. A sale arriving on one of these is our
 * own paid ad's sale, so it OVERRIDES any ?ref= cookie — we don't pay
 * affiliate commission on traffic we already bought. Stored lowercase.
 */
export const AD_FUNNEL_CODES = new Set(['welcome20']);

export type CartLineIn = {
  handle: string;
  title: string;
  bundleLabel: string;
  unitCents: number;
  qty: number;
  imageUrl?: string;
};

export type PricedCart = {
  lines: CartLineIn[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  discountCode: string | null;
  affiliateId: string | null;
  affiliateSlug: string | null;
  attributionVia: 'discount_code' | 'cookie' | null;
};

export type PriceCartError = { error: string; field?: string; status: number };

export function isPriceError(v: PricedCart | PriceCartError): v is PriceCartError {
  return (v as PriceCartError).error !== undefined;
}

/** Shape-validate and clamp client-supplied cart lines. */
export function sanitizeCartLines(lines: unknown): CartLineIn[] | null {
  if (!Array.isArray(lines) || lines.length === 0) return null;
  const out: CartLineIn[] = [];
  for (const raw of lines as any[]) {
    if (
      !raw || typeof raw.title !== 'string' || typeof raw.bundleLabel !== 'string'
      || typeof raw.unitCents !== 'number' || raw.unitCents <= 0
      || typeof raw.qty !== 'number' || raw.qty <= 0
    ) {
      return null;
    }
    out.push({
      handle: String(raw.handle || ''),
      title: raw.title,
      bundleLabel: raw.bundleLabel,
      unitCents: Math.round(raw.unitCents),
      qty: Math.min(Math.round(raw.qty), 99),
      imageUrl: typeof raw.imageUrl === 'string' ? raw.imageUrl : undefined,
    });
  }
  return out;
}

/**
 * Apply practitioner pricing, resolve the discount + affiliate, and compute
 * the totals. `lines` is mutated in place for practitioner re-pricing, matching
 * the original behaviour.
 */
export async function priceCart(args: {
  lines: CartLineIn[];
  discountCodeInput?: string;
  buyerEmail?: string | null;
}): Promise<PricedCart | PriceCartError> {
  const lines = args.lines;
  const discountCodeInput = (args.discountCodeInput ?? '').trim();

  // ── Practitioner pricing override ──────────────────────────────────────
  // Four-step waterfall: per-SKU override → physicianPriceCents × book-level
  // multiplier → bare physicianPriceCents → retail. Applied as a ratio against
  // retail so any bundle/subscribe discount the cart encoded is preserved.
  const practitionerSession = await getPractitionerSession();
  if (practitionerSession) {
    const handles = [...new Set(lines.map((l) => l.handle).filter(Boolean))];
    if (handles.length > 0) {
      const [refs, overrideRows] = await Promise.all([
        prisma.product.findMany({
          where: { handle: { in: handles } },
          select: { handle: true, priceCents: true, physicianPriceCents: true },
        }),
        prisma.practitionerPriceOverride.findMany({
          where: {
            applicationId: practitionerSession.applicationId,
            productHandle: { in: handles },
          },
          select: { productHandle: true, priceCents: true },
        }),
      ]);
      const refMap = new Map(refs.map((r) => [r.handle, r]));
      const overrideMap = new Map(overrideRows.map((o) => [o.productHandle, o.priceCents]));
      const multBps = practitionerSession.priceMultiplierBps ?? 10000;
      for (const line of lines) {
        const ref = refMap.get(line.handle);
        if (!ref || ref.priceCents <= 0) continue;
        let effectivePerVial: number | null = null;
        const override = overrideMap.get(line.handle);
        if (override != null && override > 0) {
          effectivePerVial = override;
        } else if (ref.physicianPriceCents && ref.physicianPriceCents > 0) {
          effectivePerVial = Math.round((ref.physicianPriceCents * multBps) / 10000);
        }
        if (effectivePerVial === null) continue;
        const ratio = effectivePerVial / ref.priceCents;
        line.unitCents = Math.max(1, Math.round(line.unitCents * ratio));
      }
    }
  }

  const subtotalCents = lines.reduce((sum, l) => sum + l.unitCents * l.qty, 0);

  // ── Discount + attribution ─────────────────────────────────────────────
  let affiliateId: string | null = null;
  let affiliateSlug: string | null = null;
  let discountCode: string | null = null;
  let discountCents = 0;
  let freeShipping = false;
  let attributionVia: 'discount_code' | 'cookie' | null = null;

  if (discountCodeInput) {
    const cartQuantity = lines.reduce((sum, l) => sum + l.qty, 0);
    const v = await validateDiscountCode(discountCodeInput, {
      subtotalCents,
      buyerEmail: args.buyerEmail ?? null,
      cartQuantity,
    });
    if (!v.ok) return { error: v.error, field: 'discountCode', status: 400 };
    discountCode = v.code;
    discountCents = v.discountCents;
    freeShipping = v.freeShipping;
    if (v.source === 'affiliate') {
      // Affiliate codes carry their own attribution — this wins over ?ref=.
      affiliateId = v.affiliateId;
      affiliateSlug = v.affiliateSlug;
      attributionVia = 'discount_code';
    }
    // Manual codes apply the discount but carry no affiliate, so we fall
    // through to the cookie check — a buyer referred via ?ref= who then uses a
    // general promo STILL credits their referrer.
  }

  const adOverride = !!discountCode && AD_FUNNEL_CODES.has(discountCode.toLowerCase());

  if (!affiliateId && !adOverride) {
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
        // Cookie credits the affiliate but applies no extra discount — only a
        // typed affiliate code gives the buyer the 10% off.
      }
    }
  }

  const shippingCents = freeShipping
    ? 0
    : subtotalCents - discountCents >= FREE_SHIPPING_CENTS_THRESHOLD
      ? 0
      : FLAT_SHIPPING_CENTS;

  return {
    lines,
    subtotalCents,
    discountCents,
    shippingCents,
    totalCents: subtotalCents - discountCents + shippingCents,
    discountCode,
    affiliateId,
    affiliateSlug,
    attributionVia,
  };
}
