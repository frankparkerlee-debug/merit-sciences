'use server';

import { sendEmail } from '@/lib/email';
import { prisma } from '@/lib/db';
import { onApplicationSubmitted } from '@/lib/practitioner-journey';

export type PractitionerApplicationInput = {
  practiceName: string;
  providerName: string;
  credentials: string;
  state: string;
  licenseNumber: string;
  npi: string;
  email: string;
  phone: string;
  specialty: string;
  monthlyVolume: string;
  notes: string;
};

export type SubmitResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const ADMIN_EMAIL = 'info@meritpeptides.com';

/**
 * Submit a Practitioner Program application. Stores nothing to DB yet —
 * emails the admin who reviews + approves manually. Confirmation goes
 * back to the applicant so they know it landed.
 *
 * Pricing is never quoted in the confirmation — account-tier pricing is
 * applied inside the portal after approval (standard or custom).
 */
export async function submitPractitionerApplication(
  _prev: SubmitResult | null,
  formData: FormData,
): Promise<SubmitResult> {
  const data: PractitionerApplicationInput = {
    practiceName: String(formData.get('practiceName') ?? '').trim(),
    providerName: String(formData.get('providerName') ?? '').trim(),
    credentials: String(formData.get('credentials') ?? '').trim(),
    state: String(formData.get('state') ?? '').trim(),
    licenseNumber: String(formData.get('licenseNumber') ?? '').trim(),
    npi: String(formData.get('npi') ?? '').trim(),
    email: String(formData.get('email') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim(),
    specialty: String(formData.get('specialty') ?? '').trim(),
    monthlyVolume: String(formData.get('monthlyVolume') ?? '').trim(),
    notes: String(formData.get('notes') ?? '').trim(),
  };

  if (!data.practiceName || !data.providerName || !data.credentials ||
      !data.state || !data.licenseNumber || !data.npi || !data.email) {
    return { ok: false, error: 'Missing required fields.' };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }

  const html = `
    <div style="font-family:system-ui,sans-serif;color:#0B0F1A;max-width:560px;margin:0 auto;">
      <h2 style="margin:0 0 16px;font-size:18px;color:#2E4DDB;">New Practitioner Program application</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tbody>
          ${row('Practice', data.practiceName)}
          ${row('Provider', `${data.providerName}, ${data.credentials}`)}
          ${row('Specialty', data.specialty || '—')}
          ${row('State / License', `${data.state} · ${data.licenseNumber}`)}
          ${row('NPI', data.npi)}
          ${row('Email', `<a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a>`)}
          ${row('Phone', data.phone || '—')}
          ${row('Est. monthly volume', data.monthlyVolume || '—')}
          ${data.notes ? row('Notes', escapeHtml(data.notes)) : ''}
        </tbody>
      </table>
      <p style="margin-top:24px;font-size:12px;color:#5C6378;">
        Submitted via meritsciences.com/practitioners. Reply to <a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a> to approve and set portal pricing tier.
      </p>
    </div>
  `;

  // Persist BEFORE sending emails so we have a record even if Resend
  // fails. Admin can still triage from /admin/practitioners.
  let appId: string | null = null;
  try {
    const created = await prisma.practitionerApplication.create({
      data: {
        practiceName: data.practiceName,
        providerName: data.providerName,
        credentials: data.credentials,
        state: data.state.toUpperCase(),
        licenseNumber: data.licenseNumber,
        npi: data.npi,
        email: data.email.toLowerCase(),
        phone: data.phone || null,
        specialty: data.specialty || null,
        monthlyVolume: data.monthlyVolume || null,
        notes: data.notes || null,
        status: 'PENDING',
      },
      select: { id: true },
    });
    appId = created.id;
    // Pause any in-flight PROSPECT sequence — the application + admin
    // emails take over from here.
    await onApplicationSubmitted(data.email).catch((err) =>
      console.warn('[practitioner-apply] journey pause failed (non-fatal)', err),
    );
  } catch (err) {
    console.error('[practitioner-apply] DB persist failed', err);
    // Don't fail the submission on DB error — still try to email so we
    // don't lose the lead. The admin email is the fallback record.
  }

  try {
    await sendEmail({
      to: ADMIN_EMAIL,
      subject: `Practitioner Program — ${data.practiceName} (${data.credentials})`,
      html,
    });
  } catch (err) {
    console.error('[practitioner-apply] admin email failed', err);
    // If both DB AND admin email failed, surface the error so the user
    // knows to reach out directly.
    if (!appId) {
      return { ok: false, error: 'Could not submit application. Please email info@meritpeptides.com directly.' };
    }
  }

  // Confirmation to applicant — no pricing quoted, no "savings" language
  try {
    await sendEmail({
      to: data.email,
      subject: 'Your Merit Sciences Practitioner Program application',
      html: `
        <div style="font-family:system-ui,sans-serif;color:#0B0F1A;max-width:560px;margin:0 auto;">
          <h2 style="margin:0 0 12px;font-size:18px;">Thanks, ${escapeHtml(data.providerName.split(' ')[0])}.</h2>
          <p style="font-size:14px;line-height:22px;margin:0 0 16px;">
            We received your Practitioner Program application for
            <strong>${escapeHtml(data.practiceName)}</strong>. Our pharmacy team verifies
            license + NPI within one business day; you&rsquo;ll get a follow-up with portal
            access and your account pricing tier.
          </p>
          <p style="font-size:14px;line-height:22px;margin:0 0 16px;">
            In the meantime, browse the public catalog at
            <a href="https://meritsciences.com/catalog" style="color:#2E4DDB;">meritsciences.com/catalog</a>.
          </p>
          <p style="font-size:12px;color:#5C6378;margin-top:24px;">
            Merit Sciences · Dallas, TX · 503B outsourcing facility · ISO certified
          </p>
        </div>
      `,
    });
  } catch (err) {
    // Confirmation failure is not fatal — admin still got the application
    console.warn('[practitioner-apply] confirmation email failed (non-fatal)', err);
  }

  return {
    ok: true,
    message: "Application received. We'll review and email you within 1 business day.",
  };
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 12px 6px 0;color:#5C6378;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;vertical-align:top;white-space:nowrap;">${label}</td>
    <td style="padding:6px 0;color:#0B0F1A;">${value}</td>
  </tr>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
