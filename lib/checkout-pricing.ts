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
import { getPricingContext, priceFor } from './pricing';
import { STACK_TEMPLATES } from './catalog-meta';

export const FREE_SHIPPING_CENTS_THRESHOLD = 30_000; // $300
export const FLAT_SHIPPING_CENTS = 999; // $9.99

/**
 * Ad-funnel / paid-acquisition codes. A sale arriving on one of these is our
 * own paid ad's sale, so it OVERRIDES any ?ref= cookie — we don't pay
 * affiliate commission on traffic we already bought. Stored lowercase.
 */
export const AD_FUNNEL_CODES = new Set(['welcome20']);

/**
 * Multiplier from the per-vial price to a pack line's unit price.
 *
 * Mirrors deriveBundles() — Single ×1, 3-Pack ×3×0.95, 6-Pack ×6×0.90,
 * Subscribe ×0.90 — matched loosely because real orders carry several
 * spellings of the same tier ("Subscribe & Save 10%" and "Subscribe · Every
 * month" both being 0.90), plus add-on labels like "10mL bacteriostatic" and
 * some legacy blanks, all of which are single units. Verified against the
 * live order history: 3-Pack lines sit at exactly 2.85× retail, 6-Pack at
 * 5.40×, every Subscribe spelling at 0.90×.
 *
 * Anything unrecognised falls to ×1, the most expensive interpretation, so an
 * invented label can never buy a discount.
 */
/* NOTE on stacking: for a signed-in practitioner the subscribe multiplier
 * compounds with their account discount (10% off retail + subscribe 0.9 =
 * 19% off, verified in the 2026-08-18 smoke test). Parker's call, same day:
 * KEEP the compounding — subscribe acts as a loyalty kicker on top of account
 * terms. Do not "fix" this without a new decision from him. */
export function packMultiplier(bundleLabel: string): number {
  const l = (bundleLabel || '').toLowerCase();
  if (l.includes('6-pack') || l.includes('6 pack')) return 6 * 0.9;
  if (l.includes('3-pack') || l.includes('3 pack')) return 3 * 0.95;
  if (l.includes('subscribe')) return 0.9;
  return 1;
}

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
  /** Approved practitioner whose session priced this cart, if any. */
  practitionerApplicationId: string | null;
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
  shipping?: { line1?: string | null; zip?: string | null } | null;
}): Promise<PricedCart | PriceCartError> {
  const lines = args.lines;
  const discountCodeInput = (args.discountCodeInput ?? '').trim();

  // ── Authoritative line pricing ─────────────────────────────────────────
  // EVERY line's unit price is re-derived here from the database. The client's
  // `unitCents` is discarded, not adjusted.
  //
  // It used to be trusted: sanitizeCartLines only checks that unitCents is a
  // positive number, and the subtotal was computed straight from it, so a cart
  // edited in localStorage was charged at whatever price it claimed — a $99.99
  // vial for $0.01 produced a $0.01 PaymentIntent. The practitioner block below
  // was the only thing that ever touched the number, and it scaled the client's
  // figure by a ratio rather than replacing it.
  //
  // Re-deriving also makes practitioner pricing correct at checkout instead of
  // incidental. The storefront resolves prices through priceFor(); this now
  // calls the SAME resolver rather than keeping a second copy of the waterfall
  // that has to be kept in step with it by hand.
  const pricingCtx = await getPricingContext();
  const practitionerSession = pricingCtx.session;

  {
    const productHandles = [...new Set(
      lines.filter((l) => !l.handle.startsWith('supply:') && !l.handle.startsWith('stack:'))
           .map((l) => l.handle).filter(Boolean),
    )];
    const stackSlugs = [...new Set(
      lines.filter((l) => l.handle.startsWith('stack:'))
           .map((l) => l.handle.slice('stack:'.length)),
    )];
    const supplyHandles = [...new Set(
      lines.filter((l) => l.handle.startsWith('supply:'))
           .map((l) => l.handle.slice('supply:'.length)),
    )];
    // Stack member prices have to be resolved too, so fetch them alongside.
    const stackMemberHandles = stackSlugs.flatMap(
      (s) => STACK_TEMPLATES.find((t) => t.slug === s)?.handles ?? [],
    );

    const [products, supplies] = await Promise.all([
      productHandles.length + stackMemberHandles.length > 0
        ? prisma.product.findMany({
            where: { handle: { in: [...new Set([...productHandles, ...stackMemberHandles])] } },
            select: { handle: true, priceCents: true, physicianPriceCents: true, status: true },
          })
        : Promise.resolve([]),
      supplyHandles.length > 0
        ? prisma.supplyProduct.findMany({
            where: { handle: { in: supplyHandles } },
            select: { handle: true, priceCents: true, clinicPriceCents: true },
          })
        : Promise.resolve([]),
    ]);
    const productMap = new Map(products.map((p) => [p.handle, p]));
    const supplyMap = new Map(supplies.map((p) => [p.handle, p]));

    /** Per-vial price this buyer is entitled to, via the shared resolver. */
    const perVial = (handle: string): number | null => {
      const p = productMap.get(handle);
      if (!p || p.priceCents <= 0) return null;
      /* DRAFT products are not for sale. `status` was already selected here
         but never tested, so anything unpublished — placeholder price, no
         stock, no COA — could be bought by anyone who had the direct PDP
         URL. Returning null makes the caller fail closed with "no longer
         available". Admins can still put a draft on a MANUAL order, which
         is a deliberate, authenticated action. */
      if (p.status !== 'ACTIVE') return null;
      return priceFor(
        { handle, priceCents: p.priceCents, physicianPriceCents: p.physicianPriceCents },
        pricingCtx,
      ).effectivePriceCents;
    };

    for (const line of lines) {
      let authoritative: number | null = null;

      if (line.handle.startsWith('stack:')) {
        const tpl = STACK_TEMPLATES.find((t) => t.slug === line.handle.slice('stack:'.length));
        if (tpl) {
          const parts = tpl.handles.map(perVial);
          if (parts.every((c): c is number => c != null)) {
            const sum = parts.reduce((a, b) => a + b, 0);
            authoritative = Math.round(sum * (1 - tpl.bundleDiscountPct / 100));
          }
        }
      } else if (line.handle.startsWith('supply:')) {
        const s = supplyMap.get(line.handle.slice('supply:'.length));
        if (s && s.priceCents > 0) {
          // Clinic pricing on supply mirrors the peptide rule: session-gated,
          // never exposed to retail buyers.
          authoritative =
            practitionerSession && s.clinicPriceCents && s.clinicPriceCents > 0
              ? s.clinicPriceCents
              : s.priceCents;
        }
      } else {
        const base = perVial(line.handle);
        if (base != null) authoritative = Math.round(base * packMultiplier(line.bundleLabel));
      }

      if (authoritative == null || authoritative <= 0) {
        // Fail closed. A line we cannot price from our own records is not a
        // line we should quietly charge the client's number for.
        return {
          error: 'One or more items are no longer available. Refresh your cart and try again.',
          field: 'lines',
          status: 400,
        };
      }
      line.unitCents = Math.max(1, authoritative);
    }
  }

  const subtotalCents = lines.reduce((sum, l) => sum + l.unitCents * l.qty, 0);

  // ── Discount-eligible subtotal ─────────────────────────────────────────
  // Supply-line products (collagen dressings, compression, wound care) are
  // NEVER discountable, and the discount is computed against the peptide
  // subtotal only.
  //
  // This is a compliance rule, not a merchandising preference. These items are
  // billed by the purchasing clinic to a payer, and a discount on an item
  // reimbursed by a federal healthcare program has to satisfy the Anti-Kickback
  // Statute discount safe harbor — which requires the discount be disclosed and
  // accurately reported by the buyer on its cost report or claim. A percentage
  // code applied silently at checkout does none of that. Cheaper to make these
  // ineligible than to build disclosure plumbing for a promo code.
  //
  // Identified by the `supply:` handle prefix set in SupplyAddToCart, the same
  // convention the cart already uses for `stack:`.
  const discountableCents = lines
    .filter((l) => !l.handle.startsWith('supply:'))
    .reduce((sum, l) => sum + l.unitCents * l.qty, 0);

  // ── Discount + attribution ─────────────────────────────────────────────
  let affiliateId: string | null = null;
  let affiliateSlug: string | null = null;
  let discountCode: string | null = null;
  let discountCents = 0;
  let freeShipping = false;
  let attributionVia: 'discount_code' | 'cookie' | null = null;

  if (discountCodeInput) {
    if (discountableCents <= 0) {
      return {
        error: 'Discount codes cannot be applied to clinical supply orders.',
        field: 'discountCode',
        status: 400,
      };
    }
    const cartQuantity = lines
      .filter((l) => !l.handle.startsWith('supply:'))
      .reduce((sum, l) => sum + l.qty, 0);
    // Validated against the DISCOUNTABLE subtotal, not the cart total — a
    // minimum-spend code must not be unlocked by supply lines it can't apply to.
    const v = await validateDiscountCode(discountCodeInput, {
      subtotalCents: discountableCents,
      buyerEmail: args.buyerEmail ?? null,
      shipping: args.shipping ?? null,
      cartQuantity,
    });
    if (!v.ok) return { error: v.error, field: 'discountCode', status: 400 };
    discountCode = v.code;
    // Clamped: a fixed-amount code must never eat into the supply lines.
    discountCents = Math.min(v.discountCents, discountableCents);
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
    practitionerApplicationId: practitionerSession?.applicationId ?? null,
  };
}
