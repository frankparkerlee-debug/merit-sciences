import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const runtime = 'nodejs';

/**
 * GET /auth/callback?code=...&next=...
 *
 * Magic-link landing endpoint. Supabase Auth redirects users here after
 * they click the link in their email. We exchange the one-time `code`
 * for a session, which writes the supabase auth cookies. Then we
 * redirect to `next` (the page they were trying to reach) or the
 * default dashboard.
 *
 * If the exchange fails — link expired, already used, etc. — we send
 * them back to /affiliate/login with an error so they can request
 * another link.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/affiliate/dashboard';

  // Route admins back to /admin/login on error, practitioners back to
  // /practitioners/login, affiliates back to /affiliate/login.
  const isAdminFlow = next.startsWith('/admin');
  const isPractitionerFlow = next.startsWith('/practitioners');
  const loginPath = isAdminFlow
    ? '/admin/login'
    : isPractitionerFlow
      ? '/practitioners/login'
      : '/affiliate/login';

  // Compute the origin for redirects. On Render the request URL is the
  // internal port — use forwarded headers to build the real public URL.
  const forwardedHost = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const forwardedProto = req.headers.get('x-forwarded-proto') ?? 'https';
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
    ?? (forwardedHost && !forwardedHost.startsWith('localhost')
        ? `${forwardedProto}://${forwardedHost}`
        : url.origin);

  if (!code) {
    return NextResponse.redirect(
      `${origin}${loginPath}?error=${encodeURIComponent('Missing sign-in code. Try requesting another link.')}`,
    );
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}${loginPath}?error=${encodeURIComponent('Sign-in link expired or already used. Request a new one.')}`,
    );
  }

  // Honor the `next` param but only if it stays within our site
  // (relative path or matching origin) — defensive against open-redirect.
  let safeNext = isAdminFlow
    ? '/admin/orders'
    : isPractitionerFlow
      ? '/practitioners/portal'
      : '/affiliate/dashboard';
  if (next.startsWith('/') && !next.startsWith('//')) {
    safeNext = next;
  }

  // Defense in depth: if `next` was stripped en route (e.g. Supabase Auth
  // overriding redirect_to from the Site URL allowlist), check the
  // signed-in user's role and route them to the right portal anyway.
  // Without this, practitioners would land at the affiliate dashboard
  // and have to navigate manually.
  if (safeNext === '/affiliate/dashboard' || !next) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const email = user.email.toLowerCase();
        // Admin override
        const adminList = (process.env.ADMIN_EMAILS ?? '')
          .split(',')
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);
        if (adminList.includes(email)) {
          safeNext = '/admin/orders';
        } else {
          // Practitioner override — direct DB read to avoid a tight
          // coupling to prisma/db on the auth path
          const { isApprovedPractitioner } = await import('@/lib/practitioner-session');
          if (await isApprovedPractitioner(email)) {
            safeNext = '/practitioners/portal';
          }
        }
      }
    } catch {
      // Best-effort routing fallback — never block auth on a lookup failure
    }
  }

  return NextResponse.redirect(`${origin}${safeNext}`);
}
