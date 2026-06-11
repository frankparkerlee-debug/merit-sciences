/**
 * Server-side helper to resolve the current authenticated Affiliate
 * for a request. Returns null if no user is signed in or no matching
 * Affiliate row exists.
 *
 * Use this in Server Components and Route Handlers that need to gate
 * content on affiliate identity (dashboard pages, login-gated pricing,
 * etc.). Centralizing the lookup means we always pull a consistent
 * set of fields and can swap the auth mechanism later without touching
 * every caller.
 */

import 'server-only';
import { createServerSupabase } from '@/lib/supabase-server';
import { prisma } from '@/lib/db';

export type CurrentAffiliate = {
  id: string;
  email: string;
  name: string;
  slug: string;
  discountCode: string;
  status: 'ACTIVE' | 'SUSPENDED';
  stripeCouponId: string | null;
  stripePromotionCodeId: string | null;
};

/**
 * Resolve the Affiliate row for the currently signed-in user.
 * Returns null if there is no session, no matching Affiliate, or the
 * session is somehow malformed.
 */
export async function getCurrentAffiliate(): Promise<CurrentAffiliate | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user?.email) return null;

  const affiliate = await prisma.affiliate.findUnique({
    where: { email: user.email.toLowerCase() },
    select: {
      id: true,
      email: true,
      name: true,
      slug: true,
      discountCode: true,
      status: true,
      stripeCouponId: true,
      stripePromotionCodeId: true,
    },
  });
  return affiliate as CurrentAffiliate | null;
}
