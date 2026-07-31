import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createServerSupabase } from '@/lib/supabase-server';

export const runtime = 'nodejs';

/**
 * GET /auth/callback — magic-link landing endpoint.
 *
 * Handles two link shapes so every sign-in path works:
 *   - ?token_hash=...&type=...  → our branded, self-emailed links (minted via
 *     admin.generateLink, sent through Resend). Verified server-side with
 *     verifyOtp — needs NO browser PKCE verifier, so it works from any device
 *     or email client. This is what affiliates + practitioners use.
 *   - ?code=...                 → client-initiated PKCE (browser signInWithOtp,
 *     used by admin login). Exchanged with exchangeCodeForSession.
 *
 * Supabase may instead redirect here with ?error=...&error_code=... when a
 * one-time link was already consumed (commonly an email-security scanner
 * pre-clicking it). We surface that honestly instead of a generic
 * "missing code".
 *
 * On success we route by role; on any failure we bounce to the right login
 * page with a message so the user can request a fresh link.
 */

const VALID_OTP_TYPES: readonly EmailOtpType[] = [
  'magiclink', 'signup', 'invite', 'recovery', 'email_change', 'email',
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const typeParam = url.searchParams.get('type');
  const sbError = url.searchParams.get('error_description') || url.searchParams.get('error');
  const next = url.searchParams.get('next') || '/affiliate/dashboard';

  // Route failures back to the right login page.
  const isAdminFlow = next.startsWith('/admin');
  const isPractitionerFlow = next.startsWith('/practitioners');
  const loginPath = isAdminFlow
    ? '/admin/login'
    : isPractitionerFlow
      ? '/practitioners/login'
      : '/affiliate/login';

  // Compute the real public origin (Render's request URL is the internal port).
  const forwardedHost = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const forwardedProto = req.headers.get('x-forwarded-proto') ?? 'https';
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
    ?? (forwardedHost && !forwardedHost.startsWith('localhost')
        ? `${forwardedProto}://${forwardedHost}`
        : url.origin);

  const bounce = (msg: string) =>
    NextResponse.redirect(`${origin}${loginPath}?error=${encodeURIComponent(msg)}`);

  // Supabase already reported a failure (link expired / already used — often an
  // email scanner consumed the one-time token before the human clicked).
  if (sbError) {
    return bounce('That sign-in link was already used or has expired. Request a fresh one below.');
  }

  const supabase = await createServerSupabase();

  if (tokenHash) {
    // Branded, self-emailed link (affiliate / practitioner). Server-verifiable.
    const type: EmailOtpType =
      typeParam && (VALID_OTP_TYPES as readonly string[]).includes(typeParam)
        ? (typeParam as EmailOtpType)
        : 'magiclink';
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) {
      return bounce('That sign-in link was already used or has expired. Request a fresh one below.');
    }
  } else if (code) {
    // Client-initiated PKCE link (admin signInWithOtp).
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return bounce('That sign-in link was already used or has expired. Request a fresh one below.');
    }
  } else {
    // No verifiable credential on the URL at all.
    return bounce('That sign-in link looks incomplete. Request a fresh one below.');
  }

  // Honor `next` but only internal relative paths (anti open-redirect).
  let safeNext = isAdminFlow
    ? '/admin/orders'
    : isPractitionerFlow
      ? '/practitioners/portal'
      : '/affiliate/dashboard';
  if (next.startsWith('/') && !next.startsWith('//')) {
    safeNext = next;
  }

  // Defense in depth: if `next` was stripped en route, route by the signed-in
  // user's role so practitioners/admins don't land on the affiliate dashboard.
  if (safeNext === '/affiliate/dashboard' || !next) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const email = user.email.toLowerCase();
        const adminList = (process.env.ADMIN_EMAILS ?? '')
          .split(',')
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);
        if (adminList.includes(email)) {
          safeNext = '/admin/orders';
        } else {
          const { isApprovedPractitioner } = await import('@/lib/practitioner-session');
          if (await isApprovedPractitioner(email)) {
            safeNext = '/practitioners/portal';
          }
        }
      }
    } catch {
      // Best-effort routing fallback — never block auth on a lookup failure.
    }
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
