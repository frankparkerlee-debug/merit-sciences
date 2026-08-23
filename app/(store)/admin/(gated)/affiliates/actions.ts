'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-session';
import { validateCodeFormat } from '@/lib/code-rules';

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/* ─── Suspend (deactivate) affiliate ─── */

export async function suspendAffiliate(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  const id = String(formData.get('id') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim() || null;
  if (!id) return { ok: false, error: 'Missing id' };

  const affiliate = await prisma.affiliate.findUnique({ where: { id } });
  if (!affiliate) return { ok: false, error: 'Affiliate not found' };
  if (affiliate.status === 'SUSPENDED') return { ok: false, error: 'Already suspended.' };

  await prisma.affiliate.update({
    where: { id },
    data: {
      status: 'SUSPENDED',
      suspendedAt: new Date(),
      suspendReason: reason,
    },
  });

  revalidatePath('/admin/affiliates');
  revalidatePath(`/admin/affiliates/${id}`);
  revalidatePath('/admin/discounts');
  return { ok: true, message: 'Affiliate suspended. They can no longer earn commissions; their discount code stops working.' };
}

/* ─── Reactivate affiliate ─── */

export async function reactivateAffiliate(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  const id = String(formData.get('id') ?? '').trim();
  if (!id) return { ok: false, error: 'Missing id' };

  const affiliate = await prisma.affiliate.findUnique({ where: { id } });
  if (!affiliate) return { ok: false, error: 'Affiliate not found' };
  if (affiliate.status === 'ACTIVE') return { ok: false, error: 'Already active.' };

  await prisma.affiliate.update({
    where: { id },
    data: {
      status: 'ACTIVE',
      suspendedAt: null,
      suspendReason: null,
    },
  });

  revalidatePath('/admin/affiliates');
  revalidatePath(`/admin/affiliates/${id}`);
  revalidatePath('/admin/discounts');
  return { ok: true, message: 'Affiliate reactivated.' };
}

/* ─── Delete affiliate ─── */
/**
 * Hard delete only if the affiliate has no history (no commissions, no
 * customer locks, no payouts). When there IS history, refuse with a
 * pointer to Suspend instead — deleting would either lose the audit
 * trail or break foreign keys.
 */
export async function deleteAffiliate(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  const id = String(formData.get('id') ?? '').trim();
  if (!id) return { ok: false, error: 'Missing id' };

  const affiliate = await prisma.affiliate.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          orderCommissions: true,
          customerLinks: true,
          payouts: true,
          clicks: true,
        },
      },
    },
  });
  if (!affiliate) return { ok: false, error: 'Affiliate not found' };

  const { orderCommissions, customerLinks, payouts } = affiliate._count;
  if (orderCommissions > 0 || customerLinks > 0 || payouts > 0) {
    return {
      ok: false,
      error: `Cannot delete — this affiliate has ${orderCommissions} commission(s), ${customerLinks} locked customer(s), and ${payouts} payout(s). Suspend them instead to preserve audit history.`,
    };
  }

  // Safe to delete — also clean up click records (no FK constraint elsewhere)
  await prisma.$transaction([
    prisma.click.deleteMany({ where: { affiliateId: id } }),
    prisma.affiliate.delete({ where: { id } }),
  ]);

  revalidatePath('/admin/affiliates');
  revalidatePath('/admin/discounts');
  redirect('/admin/affiliates');
}

/* ─── Change affiliate discount code ─── */

export async function changeAffiliateCode(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  const id = String(formData.get('id') ?? '').trim();
  const rawCode = String(formData.get('code') ?? '').trim();
  if (!id) return { ok: false, error: 'Missing affiliate id.' };

  // Validate format + blocklist (stores lowercase)
  const formatErr = validateCodeFormat(rawCode);
  if (formatErr) return { ok: false, error: formatErr };

  const newCode = rawCode.toLowerCase();

  // Uniqueness against other affiliate codes
  const existingAffiliate = await prisma.affiliate.findUnique({
    where: { discountCode: newCode },
    select: { id: true },
  });
  if (existingAffiliate && existingAffiliate.id !== id) {
    return { ok: false, error: 'That code is already in use by another affiliate.' };
  }

  // Uniqueness against manual discount codes
  const existingDiscount = await prisma.discount.findUnique({
    where: { code: newCode },
    select: { code: true },
  });
  if (existingDiscount) {
    return { ok: false, error: 'That code is already in use as a manual discount code.' };
  }

  await prisma.affiliate.update({ where: { id }, data: { discountCode: newCode } });

  revalidatePath(`/admin/affiliates/${id}`);
  revalidatePath('/admin/affiliates');
  return { ok: true, message: `Discount code updated to ${newCode.toUpperCase()}.` };
}

/* ─── Invite affiliate (admin-created, no public sign-up) ─── */

/**
 * Create an affiliate directly from admin and (optionally) send them a
 * branded invite. Mirrors the open sign-up route exactly — same validators,
 * same uniqueness rules, ACTIVE immediately, discount code live from the DB —
 * so an invited affiliate is indistinguishable from one who applied. The
 * invite email carries their referral link, their code, and a one-click
 * magic-link into the dashboard.
 */
export async function inviteAffiliate(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  const { validateEmail, validateName, validateIdentifier, normalizeIdentifier } = await import(
    '@/lib/affiliate'
  );

  const emailRaw = String(formData.get('email') ?? '');
  const nameRaw = String(formData.get('name') ?? '');
  const slugRaw = String(formData.get('slug') ?? '');
  const codeRaw = String(formData.get('discountCode') ?? '');
  const sendInvite = String(formData.get('sendInvite') ?? '') === 'on';

  const emailCheck = validateEmail(emailRaw);
  if (!emailCheck.ok) return { ok: false, error: emailCheck.reason };
  const nameCheck = validateName(nameRaw);
  if (!nameCheck.ok) return { ok: false, error: nameCheck.reason };
  const slugCheck = validateIdentifier(slugRaw, 'Referral handle');
  if (!slugCheck.ok) return { ok: false, error: slugCheck.reason };
  const codeCheck = validateIdentifier(codeRaw, 'Discount code');
  if (!codeCheck.ok) return { ok: false, error: codeCheck.reason };

  const slug = normalizeIdentifier(slugRaw);
  const discountCode = normalizeIdentifier(codeRaw);
  if (slug === discountCode) {
    return { ok: false, error: 'Referral handle and discount code must be different.' };
  }
  const email = emailRaw.trim().toLowerCase();
  const name = nameRaw.trim();

  let affiliateId: string;
  try {
    const affiliate = await prisma.affiliate.create({
      data: { email, name, slug, discountCode },
      select: { id: true },
    });
    affiliateId = affiliate.id;
  } catch (e: any) {
    if (e?.code === 'P2002') {
      const target: string[] = e.meta?.target ?? [];
      if (target.includes('email')) return { ok: false, error: `An affiliate with ${email} already exists.` };
      if (target.includes('slug')) return { ok: false, error: `Referral handle "${slug}" is taken.` };
      if (target.includes('discountCode')) return { ok: false, error: `Discount code "${discountCode}" is taken.` };
    }
    console.error('[affiliate-invite] create failed', e);
    return { ok: false, error: 'Server error — please try again.' };
  }

  if (sendInvite) {
    const { sendEmail } = await import('@/lib/email');
    const { wrapMarketingEmail, h, p, cta, quiet, SITE } = await import('@/lib/marketing-email-shell');
    const { supabaseAdmin } = await import('@/lib/supabase');

    // One-click sign-in; plain login URL if the mint hiccups.
    let dashUrl = `${SITE}/affiliate/login?email=${encodeURIComponent(email)}`;
    try {
      const { data: linkData, error: linkErr } = await supabaseAdmin().auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo: `${SITE}/auth/callback?next=/affiliate/dashboard` },
      });
      if (!linkErr && linkData?.properties?.action_link) dashUrl = linkData.properties.action_link;
    } catch (err) {
      console.warn('[affiliate-invite] magic-link mint failed, using login fallback', err);
    }

    const firstName = name.split(' ')[0];
    const refLink = `${SITE}/?ref=${slug}`;
    const bodyHtml = [
      h(`${firstName}, you're invited.`),
      p(
        `We'd like you in the <strong>Merit Sciences affiliate program</strong>. ` +
          `You earn a <strong>flat 20% commission</strong> on every order you send — and the ` +
          `people you send get 10% off with your code.`,
      ),
      p(
        `<strong>Your referral link</strong><br/>` +
          `<a href="${refLink}" style="color:#2D6BE4;">${refLink.replace('https://', '')}</a><br/><br/>` +
          `<strong>Your discount code</strong><br/>` +
          `<span style="font-family:monospace;font-size:17px;letter-spacing:0.08em;">${discountCode.toUpperCase()}</span> — 10% off for your buyers`,
      ),
      p(
        `Anyone who buys through your link or types your code is locked to you — ` +
          `you keep earning on their reorders, not just the first sale.`,
      ),
      cta('Open your dashboard', dashUrl),
      quiet(
        `Stats, links, and payout setup live in the dashboard. Add your direct-deposit ` +
          `details there so commissions can pay out (30-day hold, $50 minimum).`,
      ),
    ].join('');

    await sendEmail({
      to: email,
      subject: "You're invited: Merit Sciences affiliate program",
      html: wrapMarketingEmail({
        subject: "You're invited: Merit Sciences affiliate program",
        eyebrow: 'Affiliate invitation',
        bodyHtml,
      }),
    }).catch((err) => console.error('[affiliate-invite] invite email failed', err));
  }

  revalidatePath('/admin/affiliates');
  return { ok: true, message: affiliateId };
}
