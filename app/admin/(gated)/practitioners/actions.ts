'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import { requireAdmin } from '@/lib/admin-session';
import { onApplicationApproved } from '@/lib/practitioner-journey';
import { supabaseAdmin } from '@/lib/supabase';
import { wrapPractitionerEmail, btn, heading, p, note, link } from '@/lib/practitioner-email-shell';

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
// All three wrap their body in the shared practitioner shell so the inbox
// impression matches the rest of the brand (Merit logo strip, cream
// background, cobalt eyebrow, "Reply directly" footer).

function approvalEmailHtml(d: {
  firstName: string;
  practiceName: string;
  /** Either a Supabase magic-link (one-click sign-in) or fallback to /practitioners/login */
  portalUrl: string;
  catalogUrl: string;
}): string {
  const body =
    heading(`Welcome to Merit Sciences, ${escapeHtml(d.firstName)}.`) +
    p(`Your Practitioner Program account for <strong>${escapeHtml(d.practiceName)}</strong> is active. The button below signs you straight into your portal — no password. Account-tier pricing applies the moment you’re signed in.`) +
    btn('Sign in to your portal →', d.portalUrl) +
    note(`The link expires in 60 minutes. If it’s expired by the time you click, request a new one any time at ${link('meritsciences.com/practitioners/login', 'https://meritsciences.com/practitioners/login')}.`) +
    p(`Once signed in, browse the catalog at ${link('meritsciences.com/catalog', d.catalogUrl)}.`) +
    p(`Questions? Reply to this email — you’ll reach the pharmacy team directly.`);

  return wrapPractitionerEmail({
    subject: 'Your Merit Sciences Practitioner Account is active',
    eyebrow: 'Practitioner Program · Approved',
    bodyHtml: body,
  });
}

function deactivationEmailHtml(d: { firstName: string; note: string | null }): string {
  const noteBlock = d.note
    ? p(`<em style="color:#5C6378;">${escapeHtml(d.note)}</em>`)
    : '';
  const body =
    heading(`${escapeHtml(d.firstName)}, your account has been deactivated.`) +
    p(`Your Merit Sciences Practitioner Account has been deactivated. You’ll no longer see practitioner pricing inside the portal. Past orders remain in your records.`) +
    noteBlock +
    p(`If this is in error, reply directly to this email and we’ll review.`);

  return wrapPractitionerEmail({
    subject: 'Your Merit Sciences Practitioner Account has been deactivated',
    eyebrow: 'Practitioner Program · Account update',
    bodyHtml: body,
  });
}

function rejectionEmailHtml(d: { firstName: string; note: string | null }): string {
  const noteBlock = d.note
    ? p(`<em style="color:#5C6378;">${escapeHtml(d.note)}</em>`)
    : '';
  const body =
    heading(`Thanks for applying, ${escapeHtml(d.firstName)}.`) +
    p(`We weren’t able to approve your Practitioner Program application at this time.`) +
    noteBlock +
    p(`If you think this was a mistake or you’d like to provide additional information, reply directly to this email and we’ll re-review.`) +
    p(`In the meantime, you’re welcome to order at retail through our public catalog at ${link('meritsciences.com/catalog', 'https://meritsciences.com/catalog')}.`);

  return wrapPractitionerEmail({
    subject: 'Re: Your Merit Sciences Practitioner Program application',
    eyebrow: 'Practitioner Program · Application update',
    bodyHtml: body,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Per-practice pricing ────────────────────────────────────────────────
// Two knobs per approved practitioner:
//   Knob 1: book-level multiplier in basis points (10000 = no change).
//   Knob 2: per-SKU price pins, beating the multiplier for that SKU.
//
// Form payload conventions:
//   priceMultiplierBps         — integer in basis points
//   override.<productHandle>   — dollar amount (e.g. "182.50") or empty
//                                to clear the override.

export type PricingSaveResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function savePractitionerPricing(
  _prev: PricingSaveResult | null,
  formData: FormData,
): Promise<PricingSaveResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  const id = String(formData.get('id') ?? '').trim();
  if (!id) return { ok: false, error: 'Missing application id' };

  const app = await prisma.practitionerApplication.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!app) return { ok: false, error: 'Application not found' };
  if (app.status !== 'APPROVED') {
    return { ok: false, error: 'Pricing is only configurable on approved practices.' };
  }

  // ── Knob 1: book-level multiplier ──
  const rawMult = String(formData.get('priceMultiplierBps') ?? '').trim();
  const parsedMult = Number.parseInt(rawMult, 10);
  if (!Number.isFinite(parsedMult) || parsedMult < 1000 || parsedMult > 30000) {
    return { ok: false, error: 'Multiplier must be between 10% and 300% (1000–30000 bps).' };
  }

  // ── Knob 2: per-SKU overrides ──
  // Walk every `override.<handle>` form field. Empty string = delete row.
  // Non-empty = upsert with parsed dollar amount converted to cents.
  type Pending = { handle: string; priceCents: number | null };
  const pending: Pending[] = [];
  for (const [key, value] of formData.entries()) {
    if (!key.startsWith('override.')) continue;
    const handle = key.slice('override.'.length).trim();
    if (!handle) continue;
    const raw = String(value ?? '').trim();
    if (raw === '') {
      pending.push({ handle, priceCents: null });
      continue;
    }
    const dollars = Number.parseFloat(raw);
    if (!Number.isFinite(dollars) || dollars <= 0 || dollars > 100_000) {
      return { ok: false, error: `Override price for ${handle} must be between $0.01 and $100,000.` };
    }
    pending.push({ handle, priceCents: Math.round(dollars * 100) });
  }

  const handles = pending.map((p) => p.handle);
  const knownProducts = new Set(
    (await prisma.product.findMany({
      where: { handle: { in: handles.length ? handles : ['__none__'] } },
      select: { handle: true },
    })).map((p) => p.handle),
  );

  await prisma.$transaction(async (tx) => {
    await tx.practitionerApplication.update({
      where: { id },
      data: { priceMultiplierBps: parsedMult },
    });

    for (const row of pending) {
      if (!knownProducts.has(row.handle)) continue;
      if (row.priceCents === null) {
        await tx.practitionerPriceOverride.deleteMany({
          where: { applicationId: id, productHandle: row.handle },
        });
      } else {
        await tx.practitionerPriceOverride.upsert({
          where: {
            applicationId_productHandle: { applicationId: id, productHandle: row.handle },
          },
          create: {
            applicationId: id,
            productHandle: row.handle,
            priceCents: row.priceCents,
          },
          update: { priceCents: row.priceCents },
        });
      }
    }
  });

  revalidatePath(`/admin/practitioners/${id}`);
  revalidatePath('/catalog');
  return { ok: true, message: 'Pricing saved.' };
}
