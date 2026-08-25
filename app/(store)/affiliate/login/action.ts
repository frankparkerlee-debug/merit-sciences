'use server';

import { sendEmail } from '@/lib/email';
import { mintSignInLink } from '@/lib/magic-link';
import { supabaseAdmin } from '@/lib/supabase';
import { prisma } from '@/lib/db';
// Shared brand shell — generic despite the "practitioner" name (cream card,
// cobalt accents, Merit header/footer). Reused so the affiliate + practitioner
// sign-in emails read as one brand family.
import { wrapPractitionerEmail, btn, heading, p, note } from '@/lib/practitioner-email-shell';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://meritsciences.com').replace(/\/$/, '');

export type SignInResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

/**
 * Mint a magic link via Supabase Admin and send it through Resend wrapped in
 * the branded shell — replacing supabase.auth.signInWithOtp()'s plain default
 * template so the affiliate sign-in email matches the rest of the brand and
 * is explicit about what they're signing into.
 */
export async function requestAffiliateMagicLink(
  _prev: SignInResult | null,
  formData: FormData,
): Promise<SignInResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const nextRaw = String(formData.get('next') ?? '/affiliate/dashboard');
  // Only honor internal relative redirects.
  const next = nextRaw.startsWith('/') ? nextRaw : '/affiliate/dashboard';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }

  // Must be an existing affiliate — otherwise point them at the join page
  // rather than minting a ghost auth user.
  const affiliate = await prisma.affiliate.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!affiliate) {
    return { ok: false, error: `No affiliate account found for ${email}. Join the program first at /affiliate.` };
  }

  const admin = supabaseAdmin();

  // An affiliate's Supabase Auth user is created on first sign-in. generateLink
  // (type: magiclink) needs the user to already exist, so ensure it first;
  // ignore the "already registered" error on repeat logins.
  try {
    await admin.auth.admin.createUser({ email, email_confirm: true });
  } catch {
    /* user already exists — fine */
  }

  // Mint the magic link we'll send ourselves (branded), instead of letting
  // Supabase send its default template.
  // Shared minter — always the server-verifiable token_hash shape,
  // and it reads both the SDK-nested and REST-flat response shapes so a
  // client-version change can't silently break sign-in.
  const signInUrl = await mintSignInLink({ email, next: '/affiliate/dashboard' });
  if (!signInUrl) {
    return { ok: false, error: 'Could not generate a sign-in link. Please try again.' };
  }

  // Send via Resend in the branded shell.
  try {
    const body =
      heading('Sign in to your Affiliate Portal.') +
      p('Use the button below to open your Merit Sciences affiliate dashboard — track your referrals and commissions, copy your link, and request payouts. No password needed.') +
      btn('Sign in to your dashboard →', signInUrl) +
      note('This link expires in 60 minutes and can only be used once. If you didn’t request it, you can safely ignore this email.');

    await sendEmail({
      to: email,
      subject: 'Your Merit Sciences affiliate sign-in link',
      html: wrapPractitionerEmail({
        subject: 'Your Merit Sciences affiliate sign-in link',
        eyebrow: 'Affiliate Program · Sign in',
        bodyHtml: body,
        footerNote: 'Merit Sciences &middot; Affiliate Program &middot; Dallas, TX',
      }),
    });
  } catch (err) {
    console.error('[affiliate-login] sign-in email failed', err);
    return { ok: false, error: 'Sign-in link generated but the email failed to send. Try again in a moment.' };
  }

  return { ok: true, message: `Sign-in link sent to ${email}. Check your inbox.` };
}
