'use server';

import { sendEmail } from '@/lib/email';
import { supabaseAdmin } from '@/lib/supabase';
import { isApprovedPractitioner } from '@/lib/practitioner-session';
import { wrapPractitionerEmail, btn, heading, p, note, link } from '@/lib/practitioner-email-shell';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://meritsciences.com').replace(/\/$/, '');

export type SignInResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Mint a magic-link via Supabase Admin and send it through Resend wrapped
 * in our branded email shell. This replaces the default
 * supabase.auth.signInWithOtp() flow (which sends Supabase's plain
 * un-branded template) so every practitioner-facing email looks like
 * part of one brand family.
 */
export async function requestPractitionerMagicLink(
  _prev: SignInResult | null,
  formData: FormData,
): Promise<SignInResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }

  // Privacy-respecting: don't reveal whether the email exists. If it's
  // not an approved practitioner, return a generic success message
  // anyway. (Attackers can't enumerate practitioners by email.)
  const approved = await isApprovedPractitioner(email);
  if (!approved) {
    return {
      ok: true,
      message: `If ${email} is an approved Practitioner account, a sign-in link is on its way.`,
    };
  }

  // Mint the magic link
  let signInUrl: string;
  try {
    const { data, error } = await supabaseAdmin().auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${SITE_URL}/auth/callback?next=/practitioners/portal`,
      },
    });
    if (error || !data?.properties?.hashed_token) {
      console.error('[practitioner-login] magic-link mint failed', error);
      return { ok: false, error: 'Could not generate a sign-in link. Please try again.' };
    }
    // Send a token_hash link pointed at OUR callback (verified server-side via
    // verifyOtp). The raw action_link routes through Supabase's verify endpoint
    // and lands code-less on our server route → "Missing sign-in code".
    signInUrl =
      `${SITE_URL}/auth/callback?token_hash=${encodeURIComponent(data.properties.hashed_token)}` +
      `&type=magiclink&next=${encodeURIComponent('/practitioners/portal')}`;
  } catch (err) {
    console.error('[practitioner-login] magic-link mint threw', err);
    return { ok: false, error: 'Could not generate a sign-in link. Please try again.' };
  }

  // Send via Resend with the branded shell
  try {
    const body =
      heading('Sign in to your Practitioner Portal.') +
      p(`Use the button below to open your Merit Sciences practitioner portal — your account pricing, order history, and fast reorders. No password needed.`) +
      btn('Sign in to your portal →', signInUrl) +
      note(`This link expires in 60 minutes and can only be used once. If you didn’t request it, you can safely ignore this email.`) +
      p(`Questions? Reply directly — you reach the pharmacy team.`);

    await sendEmail({
      to: email,
      subject: 'Your Merit Sciences sign-in link',
      html: wrapPractitionerEmail({
        subject: 'Your Merit Sciences sign-in link',
        eyebrow: 'Practitioner Portal · Sign in',
        bodyHtml: body,
      }),
    });
  } catch (err) {
    console.error('[practitioner-login] sign-in email failed', err);
    return { ok: false, error: 'Sign-in link generated but email failed to send. Try again or contact info@meritpeptides.com.' };
  }

  return {
    ok: true,
    message: `Sign-in link sent to ${email}. Check your inbox.`,
  };
}
