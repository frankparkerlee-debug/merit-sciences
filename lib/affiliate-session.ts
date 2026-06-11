/**
 * Server-side helper to resolve the current authenticated Affiliate
 * for a request. Returns null if no user is signed in or no matching
 * Affiliate row exists.
 *
 * Identity contract:
 *   - We join Affiliate ↔ Supabase Auth via `Affiliate.supabaseUserId`,
 *     NOT by email. Email is mutable; the user id is permanent. This
 *     means email changes via Supabase Auth's updateUser() flow Just
 *     Work without complex reconciliation.
 *   - On every lookup, if Supabase's current email differs from the
 *     value we have on file, we auto-sync. That covers the case where
 *     a user just confirmed an email change.
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
  socialUrl: string | null;
  audienceSize: number | null;
};

const SELECT_FIELDS = {
  id: true,
  email: true,
  name: true,
  slug: true,
  discountCode: true,
  status: true,
  stripeCouponId: true,
  stripePromotionCodeId: true,
  socialUrl: true,
  audienceSize: true,
} as const;

/**
 * Resolve the Affiliate row for the currently signed-in Supabase user.
 *
 * If a user is signed in but no Affiliate row has been linked to that
 * supabaseUserId yet, we attempt a one-time link by matching email.
 * This covers the bootstrap case for affiliates who signed up BEFORE
 * we introduced the supabaseUserId field.
 *
 * Returns null if no session, or the user has no matching affiliate.
 */
export async function getCurrentAffiliate(): Promise<CurrentAffiliate | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) return null;

  // 1. Look up by supabaseUserId — the canonical key
  let affiliate = await prisma.affiliate.findUnique({
    where: { supabaseUserId: user.id },
    select: SELECT_FIELDS,
  });

  // 2. Bootstrap link: first sign-in for this user, fall back to email
  //    and write the supabaseUserId so subsequent lookups are direct
  if (!affiliate && user.email) {
    const byEmail = await prisma.affiliate.findUnique({
      where: { email: user.email.toLowerCase() },
      select: { id: true },
    });
    if (byEmail) {
      affiliate = await prisma.affiliate.update({
        where: { id: byEmail.id },
        data: { supabaseUserId: user.id },
        select: SELECT_FIELDS,
      });
    }
  }

  if (!affiliate) return null;

  // 3. Auto-sync email: if Supabase's current email differs (user just
  //    confirmed an email change), update our copy
  if (user.email && affiliate.email !== user.email.toLowerCase()) {
    affiliate = await prisma.affiliate.update({
      where: { id: affiliate.id },
      data: { email: user.email.toLowerCase() },
      select: SELECT_FIELDS,
    });
  }

  return affiliate as CurrentAffiliate;
}
