'use server';

/**
 * Server actions for the affiliate settings page.
 *
 * Each action is its own form submission so a failure in one section
 * doesn't lose changes in another. Returns ActionResult with either an
 * error message or a success flag. The settings page renders the result.
 *
 * Mutations that touch external systems (Stripe, Supabase Auth) are
 * done OUTSIDE the Prisma transaction so a roll-back doesn't leave
 * orphan external resources. The pattern:
 *   1. Validate input
 *   2. Mutate external system (Stripe/Supabase) — if this fails, abort
 *   3. Mutate our DB — if this fails, log + leave the external state
 *      slightly out-of-sync (admin can reconcile via /api/admin/...)
 */

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getCurrentAffiliate } from '@/lib/affiliate-session';
import { createServerSupabase } from '@/lib/supabase-server';
import {
  normalizeIdentifier,
  validateEmail,
  validateIdentifier,
  validateName,
  AFFILIATE_PROGRAM,
} from '@/lib/affiliate';

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string; field?: string };

// ─── Update profile (name, social URL, audience size) ───────────────
export async function updateProfile(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const affiliate = await getCurrentAffiliate();
  if (!affiliate) return { ok: false, error: 'Not signed in.' };

  const name = String(formData.get('name') ?? '').trim();
  const socialUrl = String(formData.get('socialUrl') ?? '').trim();
  const audienceSizeRaw = String(formData.get('audienceSize') ?? '').trim();

  const nameCheck = validateName(name);
  if (!nameCheck.ok) return { ok: false, error: nameCheck.reason, field: 'name' };

  let audienceSize: number | null = null;
  if (audienceSizeRaw) {
    const n = Number(audienceSizeRaw.replace(/[^0-9]/g, ''));
    if (Number.isFinite(n)) audienceSize = Math.max(0, Math.min(1_000_000_000, Math.floor(n)));
  }

  await prisma.affiliate.update({
    where: { id: affiliate.id },
    data: {
      name,
      socialUrl: socialUrl || null,
      audienceSize,
    },
  });
  revalidatePath('/affiliate/dashboard/settings');
  revalidatePath('/affiliate/dashboard');
  return { ok: true, message: 'Profile updated.' };
}

// ─── Update referral slug ────────────────────────────────────────────
export async function updateSlug(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const affiliate = await getCurrentAffiliate();
  if (!affiliate) return { ok: false, error: 'Not signed in.' };

  const slug = normalizeIdentifier(String(formData.get('slug') ?? ''));
  const slugCheck = validateIdentifier(slug, 'Referral handle');
  if (!slugCheck.ok) return { ok: false, error: slugCheck.reason, field: 'slug' };

  if (slug === affiliate.slug) {
    return { ok: false, error: 'That\'s already your current handle.', field: 'slug' };
  }
  if (slug === affiliate.discountCode) {
    return { ok: false, error: 'Referral handle must be different from your discount code.', field: 'slug' };
  }

  try {
    await prisma.affiliate.update({
      where: { id: affiliate.id },
      data: { slug },
    });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return { ok: false, error: `Handle "${slug}" is taken — try another.`, field: 'slug' };
    }
    throw e;
  }
  revalidatePath('/affiliate/dashboard/settings');
  revalidatePath('/affiliate/dashboard');
  return { ok: true, message: `Handle updated. Old links with ?ref=${affiliate.slug} still work for 30 days while the cookie expires.` };
}

// ─── Update discount code ───────────────────────────────────────────
export async function updateDiscountCode(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const affiliate = await getCurrentAffiliate();
  if (!affiliate) return { ok: false, error: 'Not signed in.' };

  const newCode = normalizeIdentifier(String(formData.get('discountCode') ?? ''));
  const codeCheck = validateIdentifier(newCode, 'Discount code');
  if (!codeCheck.ok) return { ok: false, error: codeCheck.reason, field: 'discountCode' };

  if (newCode === affiliate.discountCode) {
    return { ok: false, error: 'That\'s already your current code.', field: 'discountCode' };
  }
  if (newCode === affiliate.slug) {
    return { ok: false, error: 'Discount code must be different from your referral handle.', field: 'discountCode' };
  }

  // Discount codes are validated server-side from our DB at checkout
  // (lib/discount.ts + the PayPal create-order route), so updating the
  // code is a single DB write — no external sync.
  try {
    await prisma.affiliate.update({
      where: { id: affiliate.id },
      data: { discountCode: newCode },
    });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return { ok: false, error: `Code "${newCode}" is taken — try another.`, field: 'discountCode' };
    }
    throw e;
  }

  revalidatePath('/affiliate/dashboard/settings');
  revalidatePath('/affiliate/dashboard');
  return { ok: true, message: `Code updated to ${newCode.toUpperCase()}. The old code stops working immediately.` };
}

// ─── Update PayPal payout email ──────────────────────────────────────
export async function updatePaypalEmail(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const affiliate = await getCurrentAffiliate();
  if (!affiliate) return { ok: false, error: 'Not signed in.' };

  const paypalEmail = String(formData.get('paypalEmail') ?? '').trim().toLowerCase();
  const check = validateEmail(paypalEmail);
  if (!check.ok) return { ok: false, error: check.reason, field: 'paypalEmail' };

  await prisma.affiliate.update({
    where: { id: affiliate.id },
    data: { paypalEmail },
  });
  revalidatePath('/affiliate/dashboard/settings');
  return { ok: true, message: 'PayPal payout email saved. Commission payouts will go here.' };
}

// ─── Request email change (Supabase confirmation flow) ──────────────
export async function requestEmailChange(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const affiliate = await getCurrentAffiliate();
  if (!affiliate) return { ok: false, error: 'Not signed in.' };

  const newEmail = String(formData.get('email') ?? '').trim().toLowerCase();
  const emailCheck = validateEmail(newEmail);
  if (!emailCheck.ok) return { ok: false, error: emailCheck.reason, field: 'email' };
  if (newEmail === affiliate.email) {
    return { ok: false, error: 'That\'s already your current email.', field: 'email' };
  }

  // Check the new email isn't claimed by another affiliate
  const taken = await prisma.affiliate.findFirst({
    where: { email: newEmail, NOT: { id: affiliate.id } },
    select: { id: true },
  });
  if (taken) return { ok: false, error: 'That email belongs to another affiliate.', field: 'email' };

  // Tell Supabase Auth to send a confirmation email to the NEW address.
  // Supabase handles the confirmation flow itself — clicking the link in
  // that email actually updates auth.users.email. Once confirmed, the
  // Supabase webhook (or next signin) syncs to our Affiliate.email field
  // via getCurrentAffiliate's email lookup.
  //
  // Note: Supabase Auth's updateUser({ email }) ONLY sends to the new
  // email. The OLD email gets a re-auth notification separately. The
  // user must confirm both for the change to complete (security against
  // hijacked sessions).
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) {
    return { ok: false, error: `Couldn\'t request email change: ${error.message}`, field: 'email' };
  }

  // Note: we DO NOT update Affiliate.email here. We wait until the user
  // confirms the change (which logs them in with the new email next).
  // The auth/callback handler will reconcile on next sign-in.

  return {
    ok: true,
    message: `Confirmation sent to ${newEmail}. Click the link in that email to complete the change.`,
  };
}
