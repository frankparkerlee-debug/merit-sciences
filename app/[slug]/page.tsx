import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';
// Resolves a referral slug + bounces to the homepage — never cache.
export const dynamic = 'force-dynamic';

type Props = { params: { slug: string } };

// Same shape we enforce at affiliate sign-up (lowercase alphanumeric +
// hyphen, 3-30 chars, must start/end alphanumeric).
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/;

/**
 * Path-based affiliate referral links: meritsciences.com/<slug>.
 *
 * Affiliates naturally share the clean path (e.g. /founder), not the
 * ?ref= query form — so the pretty URL must work or those referrals are
 * silently lost (404, no cookie, no attribution).
 *
 * This top-level catch-all resolves a single segment as an affiliate
 * slug. Static routes (/about, /catalog, /products, …) take precedence
 * in Next's router, so only otherwise-unmatched paths reach here:
 *   - real ACTIVE affiliate → hand off to /?ref=<slug> so the existing
 *     middleware sets the merit_ref cookie + logs the click, then lands
 *     the visitor on a clean homepage URL.
 *   - anything else → 404 (exactly as before this route existed).
 */
export default async function ReferralSlugPage({ params }: Props) {
  const slug = params.slug.trim().toLowerCase();
  if (!SLUG_RE.test(slug)) notFound();

  let isActiveAffiliate = false;
  try {
    const aff = await prisma.affiliate.findUnique({
      where: { slug },
      select: { status: true },
    });
    isActiveAffiliate = aff?.status === 'ACTIVE';
  } catch {
    // DB blip — 404 rather than 500. The visitor can retry the link.
    notFound();
  }

  if (!isActiveAffiliate) notFound();

  // redirect() throws NEXT_REDIRECT — must stay outside the try/catch.
  redirect(`/?ref=${encodeURIComponent(slug)}`);
}
