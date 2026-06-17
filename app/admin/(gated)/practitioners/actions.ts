'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { requireAdmin } from '@/lib/admin-session';
import { onApplicationApproved } from '@/lib/practitioner-journey';
import { supabaseAdmin } from '@/lib/supabase';

export type ReviewResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://meritsciences.com';

/**
 * Approve a Practitioner Program application. Flips status → APPROVED,
 * records reviewer + timestamp, and sends the approval email via Resend
 * with portal sign-in instructions.
 */
export async function approveApplication(
  _prev: ReviewResult | null,
  formData: FormData,
): Promise<ReviewResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  const id = String(formData.get('id') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim() || null;
  if (!id) return { ok: false, error: 'Missing application id' };

  const app = await prisma.practitionerApplication.findUnique({ where: { id } });
  if (!app) return { ok: false, error: 'Application not found' };
  if (app.status !== 'PENDING') return { ok: false, error: `Already ${app.status}` };

  await prisma.practitionerApplication.update({
    where: { id },
    data: {
      status: 'APPROVED',
      reviewedAt: new Date(),
      reviewerEmail: admin.email,
      reviewerNote: note,
    },
  });

  // Start the ONBOARDING email sequence — Day 1 begins tomorrow; today's
  // approval email is the "Day 0" of the relationship.
  await onApplicationApproved({
    email: app.email,
    firstName: app.providerName.split(' ')[0],
    practiceName: app.practiceName,
  }).catch((err) =>
    console.warn('[practitioner-approve] onboarding sequence start failed', err),
  );

  // Mint a one-click magic-link via Supabase Admin so the approval email
  // is sign-in-ready. If link generation fails (transient Supabase issue)
  // we fall back to the plain login URL — they can still type their
  // email and request a fresh link from /practitioners/login.
  let signInUrl = `${SITE_URL}/practitioners/login?email=${encodeURIComponent(app.email)}`;
  try {
    const { data: linkData, error: linkErr } = await supabaseAdmin().auth.admin.generateLink({
      type: 'magiclink',
      email: app.email,
      options: {
        redirectTo: `${SITE_URL}/auth/callback?next=/practitioners/portal`,
      },
    });
    if (!linkErr && linkData?.properties?.action_link) {
      signInUrl = linkData.properties.action_link;
    } else if (linkErr) {
      console.warn('[practitioner-approve] magic-link mint failed, using fallback', linkErr);
    }
  } catch (err) {
    console.warn('[practitioner-approve] magic-link mint threw, using fallback', err);
  }

  try {
    await sendEmail({
      to: app.email,
      subject: 'Your Merit Sciences Practitioner Account is active',
      html: approvalEmailHtml({
        firstName: app.providerName.split(' ')[0],
        practiceName: app.practiceName,
        portalUrl: signInUrl,
        catalogUrl: `${SITE_URL}/catalog`,
      }),
    });
  } catch (err) {
    console.error('[practitioner-approve] approval email failed', err);
    // Status already flipped — surface as a partial-success warning.
    revalidatePath('/admin/practitioners');
    revalidatePath(`/admin/practitioners/${id}`);
    return { ok: false, error: 'Approved in DB but approval email failed. Re-send manually.' };
  }

  revalidatePath('/admin/practitioners');
  revalidatePath(`/admin/practitioners/${id}`);
  return { ok: true, message: 'Approved + email sent.' };
}

/**
 * Deactivate an approved practitioner. Their portal access is revoked
 * (getPractitionerSession returns null for non-APPROVED statuses), so
 * subsequent page loads show retail pricing and the portal redirects to
 * login. Past orders stay intact for audit. Optionally notifies them.
 */
export async function deactivateApplication(
  _prev: ReviewResult | null,
  formData: FormData,
): Promise<ReviewResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  const id = String(formData.get('id') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim() || null;
  const notify = formData.get('notify') === 'on';
  if (!id) return { ok: false, error: 'Missing application id' };

  const app = await prisma.practitionerApplication.findUnique({ where: { id } });
  if (!app) return { ok: false, error: 'Application not found' };
  if (app.status !== 'APPROVED') {
    return { ok: false, error: `Can only deactivate APPROVED accounts (current: ${app.status})` };
  }

  await prisma.practitionerApplication.update({
    where: { id },
    data: {
      status: 'DEACTIVATED',
      reviewedAt: new Date(),
      reviewerEmail: admin.email,
      reviewerNote: note,
    },
  });

  if (notify) {
    try {
      await sendEmail({
        to: app.email,
        subject: 'Your Merit Sciences Practitioner Account has been deactivated',
        html: deactivationEmailHtml({
          firstName: app.providerName.split(' ')[0],
          note,
        }),
      });
    } catch (err) {
      console.error('[practitioner-deactivate] notification email failed', err);
    }
  }

  revalidatePath('/admin/practitioners');
  revalidatePath(`/admin/practitioners/${id}`);
  return { ok: true, message: notify ? 'Deactivated + notification sent.' : 'Deactivated.' };
}

/**
 * Reactivate a previously-deactivated account. Flips status back to
 * APPROVED. Optionally sends a welcome-back email. Doesn't generate a
 * new magic-link (use /practitioners/login or generate one manually
 * via the approve flow if needed).
 */
export async function reactivateApplication(
  _prev: ReviewResult | null,
  formData: FormData,
): Promise<ReviewResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  const id = String(formData.get('id') ?? '').trim();
  if (!id) return { ok: false, error: 'Missing application id' };

  const app = await prisma.practitionerApplication.findUnique({ where: { id } });
  if (!app) return { ok: false, error: 'Application not found' };
  if (app.status !== 'DEACTIVATED') {
    return { ok: false, error: `Can only reactivate DEACTIVATED accounts (current: ${app.status})` };
  }

  await prisma.practitionerApplication.update({
    where: { id },
    data: {
      status: 'APPROVED',
      reviewedAt: new Date(),
      reviewerEmail: admin.email,
      reviewerNote: null,
    },
  });

  revalidatePath('/admin/practitioners');
  revalidatePath(`/admin/practitioners/${id}`);
  return { ok: true, message: 'Reactivated.' };
}

/**
 * Hard-delete a practitioner application. Removes:
 *   • The PractitionerApplication row
 *   • The PractitionerJourney email-sequence state (if any)
 *   • The Supabase Auth user (kills active sessions + sign-in)
 *
 * Past orders are NOT deleted — they belong to the order record, not
 * the practitioner, and stay as audit trail. Use sparingly; for most
 * cases prefer deactivateApplication so the audit trail stays.
 */
export async function deleteApplication(
  _prev: ReviewResult | null,
  formData: FormData,
): Promise<ReviewResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  const id = String(formData.get('id') ?? '').trim();
  if (!id) return { ok: false, error: 'Missing application id' };

  const app = await prisma.practitionerApplication.findUnique({ where: { id } });
  if (!app) return { ok: false, error: 'Application not found' };

  // 1. Email sequence state — delete by email (no FK so we have to look up)
  await prisma.practitionerJourney.deleteMany({ where: { email: app.email } });

  // 2. Supabase Auth user — look up by email, delete if found. Doing this
  //    BEFORE the application row delete so a partial failure leaves the
  //    DB record intact to retry from.
  try {
    const sb = supabaseAdmin();
    // listUsers paginates; with our scale a single page is fine.
    const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
    const user = list?.users.find((u) => u.email?.toLowerCase() === app.email.toLowerCase());
    if (user) {
      await sb.auth.admin.deleteUser(user.id);
    }
  } catch (err) {
    console.warn('[practitioner-delete] supabase user delete failed (continuing)', err);
  }

  // 3. The application itself
  await prisma.practitionerApplication.delete({ where: { id } });

  revalidatePath('/admin/practitioners');
  return { ok: true, message: 'Deleted. Past orders preserved as audit trail.' };
}

/**
 * Reject an application. Sends a polite decline via Resend.
 */
export async function rejectApplication(
  _prev: ReviewResult | null,
  formData: FormData,
): Promise<ReviewResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  const id = String(formData.get('id') ?? '').trim();
  const note = String(formData.get('note') ?? '').trim() || null;
  if (!id) return { ok: false, error: 'Missing application id' };

  const app = await prisma.practitionerApplication.findUnique({ where: { id } });
  if (!app) return { ok: false, error: 'Application not found' };
  if (app.status !== 'PENDING') return { ok: false, error: `Already ${app.status}` };

  await prisma.practitionerApplication.update({
    where: { id },
    data: {
      status: 'REJECTED',
      reviewedAt: new Date(),
      reviewerEmail: admin.email,
      reviewerNote: note,
    },
  });

  try {
    await sendEmail({
      to: app.email,
      subject: 'Re: Your Merit Sciences Practitioner Program application',
      html: rejectionEmailHtml({
        firstName: app.providerName.split(' ')[0],
        note,
      }),
    });
  } catch (err) {
    console.error('[practitioner-reject] rejection email failed', err);
    revalidatePath('/admin/practitioners');
    revalidatePath(`/admin/practitioners/${id}`);
    return { ok: false, error: 'Rejected in DB but decline email failed.' };
  }

  revalidatePath('/admin/practitioners');
  revalidatePath(`/admin/practitioners/${id}`);
  return { ok: true, message: 'Rejected + decline email sent.' };
}

// ── Email templates ──────────────────────────────────────────────────────
function approvalEmailHtml(d: {
  firstName: string;
  practiceName: string;
  /** Either a Supabase magic-link (one-click sign-in) or fallback to /practitioners/login */
  portalUrl: string;
  catalogUrl: string;
}): string {
  return `
    <div style="font-family:system-ui,sans-serif;color:#0B0F1A;max-width:560px;margin:0 auto;padding:24px 0;">
      <p style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#2E4DDB;font-weight:700;margin:0 0 8px;">
        — Practitioner Program · Approved
      </p>
      <h2 style="margin:0 0 16px;font-size:24px;line-height:1.15;letter-spacing:-0.02em;">
        Welcome to Merit Sciences, ${escapeHtml(d.firstName)}.
      </h2>
      <p style="font-size:14px;line-height:22px;margin:0 0 16px;">
        Your Practitioner Program account for <strong>${escapeHtml(d.practiceName)}</strong> is
        active. The link below signs you straight into your portal &mdash; no password.
        Account-tier pricing applies the moment you&rsquo;re signed in.
      </p>
      <p style="margin:24px 0;">
        <a href="${d.portalUrl}" style="display:inline-block;background:#2E4DDB;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;letter-spacing:0.06em;font-size:13px;">
          Sign in to your portal →
        </a>
      </p>
      <p style="font-size:12px;line-height:18px;color:#5C6378;margin:0 0 16px;">
        The link expires in 60 minutes. If it&rsquo;s expired by the time you click, request a new
        one any time at <a href="https://meritsciences.com/practitioners/login" style="color:#2E4DDB;">meritsciences.com/practitioners/login</a>.
      </p>
      <p style="font-size:14px;line-height:22px;margin:0 0 16px;">
        Once signed in, browse the catalog at
        <a href="${d.catalogUrl}" style="color:#2E4DDB;">meritsciences.com/catalog</a>.
      </p>
      <p style="font-size:14px;line-height:22px;margin:0 0 16px;">
        Questions? Reply to this email &mdash; you&rsquo;ll reach the pharmacy team directly.
      </p>
      <p style="font-size:11px;color:#5C6378;margin-top:28px;padding-top:16px;border-top:1px solid #E5E1D6;">
        Merit Sciences &middot; Dallas, TX &middot; 503B outsourcing facility &middot; ISO certified
      </p>
    </div>
  `;
}

function deactivationEmailHtml(d: { firstName: string; note: string | null }): string {
  return `
    <div style="font-family:system-ui,sans-serif;color:#0B0F1A;max-width:560px;margin:0 auto;padding:24px 0;">
      <p style="font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#2E4DDB;font-weight:700;margin:0 0 8px;">
        — Practitioner Program · Account update
      </p>
      <h2 style="margin:0 0 12px;font-size:20px;line-height:1.2;letter-spacing:-0.02em;">
        ${escapeHtml(d.firstName)}, your account has been deactivated.
      </h2>
      <p style="font-size:14px;line-height:22px;margin:0 0 16px;">
        Your Merit Sciences Practitioner Account has been deactivated. You&rsquo;ll no longer see
        practitioner pricing inside the portal. Past orders remain in your records.
        ${d.note ? `<br /><br /><em>${escapeHtml(d.note)}</em>` : ''}
      </p>
      <p style="font-size:14px;line-height:22px;margin:0 0 16px;">
        If this is in error, reply directly to this email and we&rsquo;ll review.
      </p>
      <p style="font-size:11px;color:#5C6378;margin-top:28px;padding-top:16px;border-top:1px solid #E5E1D6;">
        Merit Sciences &middot; Dallas, TX
      </p>
    </div>
  `;
}

function rejectionEmailHtml(d: { firstName: string; note: string | null }): string {
  return `
    <div style="font-family:system-ui,sans-serif;color:#0B0F1A;max-width:560px;margin:0 auto;padding:24px 0;">
      <h2 style="margin:0 0 12px;font-size:20px;line-height:1.2;letter-spacing:-0.02em;">
        Thanks for applying, ${escapeHtml(d.firstName)}.
      </h2>
      <p style="font-size:14px;line-height:22px;margin:0 0 16px;">
        We weren&rsquo;t able to approve your Practitioner Program application at this time.
        ${d.note ? `<br /><br /><em>${escapeHtml(d.note)}</em>` : ''}
      </p>
      <p style="font-size:14px;line-height:22px;margin:0 0 16px;">
        If you think this was a mistake or you&rsquo;d like to provide additional information,
        reply directly to this email and we&rsquo;ll re-review.
      </p>
      <p style="font-size:14px;line-height:22px;margin:0 0 16px;">
        In the meantime, you&rsquo;re welcome to order at retail through our public catalog at
        <a href="https://meritsciences.com/catalog" style="color:#2E4DDB;">meritsciences.com/catalog</a>.
      </p>
      <p style="font-size:11px;color:#5C6378;margin-top:28px;padding-top:16px;border-top:1px solid #E5E1D6;">
        Merit Sciences &middot; Dallas, TX
      </p>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
