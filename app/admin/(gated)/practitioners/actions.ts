'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { requireAdmin } from '@/lib/admin-session';

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

  try {
    await sendEmail({
      to: app.email,
      subject: 'Your Merit Sciences Practitioner Account is active',
      html: approvalEmailHtml({
        firstName: app.providerName.split(' ')[0],
        practiceName: app.practiceName,
        portalUrl: `${SITE_URL}/orders/lookup`,
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
        active. Your account-tier pricing is applied automatically when you sign in.
      </p>
      <p style="margin:24px 0;">
        <a href="${d.portalUrl}" style="display:inline-block;background:#2E4DDB;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;letter-spacing:0.06em;font-size:13px;">
          Sign in to your account →
        </a>
      </p>
      <p style="font-size:14px;line-height:22px;margin:0 0 16px;">
        Browse the full catalog at
        <a href="${d.catalogUrl}" style="color:#2E4DDB;">meritsciences.com/catalog</a>.
        Practitioner pricing displays once you&rsquo;re signed in.
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
