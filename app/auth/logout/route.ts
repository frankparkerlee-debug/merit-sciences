import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const runtime = 'nodejs';

/**
 * POST /auth/logout
 *
 * Tears down the Supabase Auth session — clears the cookies and
 * invalidates the refresh token server-side. Redirects to the
 * affiliate landing page.
 */
export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();

  // Build absolute redirect URL (Render-safe — see auth/callback)
  const url = new URL(req.url);
  const forwardedHost = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const forwardedProto = req.headers.get('x-forwarded-proto') ?? 'https';
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
    ?? (forwardedHost && !forwardedHost.startsWith('localhost')
        ? `${forwardedProto}://${forwardedHost}`
        : url.origin);

  return NextResponse.redirect(`${origin}/affiliate`, { status: 303 });
}
