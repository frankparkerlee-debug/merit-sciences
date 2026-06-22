import 'server-only';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { AFFILIATE_PROGRAM } from '@/lib/affiliate';

export type ActiveReferral = {
  /** The affiliate's referral handle (the ?ref= slug). */
  slug: string;
  /** The affiliate's discount code, uppercased for display. */
  code: string;
  /** Buyer discount percent (e.g. 10). */
  discountPct: number;
};

/**
 * Resolve the referring affiliate from the `merit_ref` cookie (set by
 * middleware on ?ref=). Returns null unless the cookie maps to an ACTIVE
 * affiliate with a discount code.
 *
 * One source of truth for "is this visitor referred, and at what discount"
 * — reused by checkout (auto-fill the code), the catalog, and PDPs (show
 * the strikethrough price). Server-only; safe to call from any server
 * component / route.
 */
export async function getActiveReferral(): Promise<ActiveReferral | null> {
  try {
    const slug = (await cookies()).get('merit_ref')?.value ?? null;
    if (!slug) return null;
    const aff = await prisma.affiliate.findUnique({
      where: { slug },
      select: { status: true, slug: true, discountCode: true },
    });
    if (aff?.status !== 'ACTIVE' || !aff.discountCode) return null;
    return {
      slug: aff.slug,
      code: aff.discountCode.toUpperCase(),
      discountPct: AFFILIATE_PROGRAM.buyerDiscountPct,
    };
  } catch {
    // Never let a referral lookup break a storefront page.
    return null;
  }
}
