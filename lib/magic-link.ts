import 'server-only';
import { supabaseAdmin } from './supabase';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://meritsciences.com').replace(/\/$/, '');

/**
 * Mint a branded sign-in link pointed at OUR /auth/callback.
 *
 * Always uses the `hashed_token` (token_hash) shape, never Supabase's raw
 * `action_link`. Two reasons, both verified against production 2026-08-25:
 *
 *  1. `action_link` routes through Supabase's own /auth/v1/verify, which
 *     redirects back with the session in a URL **fragment**. Fragments are
 *     never sent to the server, so our route handler saw no credential and
 *     bounced every recipient to "That sign-in link looks incomplete."
 *     Every admin-sent welcome/invite email was dead on arrival.
 *  2. token_hash is verified server-side with verifyOtp, so it needs no
 *     browser-held PKCE verifier and works when the click happens in a
 *     different browser than the request — the normal case on mobile, where
 *     mail apps open links in their own in-app browser.
 *
 * Returns null if minting fails; callers fall back to the plain login page
 * rather than emailing a broken link.
 */
export async function mintSignInLink(args: {
  email: string;
  /** Internal path to land on after sign-in, e.g. '/practitioners/portal'. */
  next: string;
}): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin().auth.admin.generateLink({
      type: 'magiclink',
      email: args.email,
      options: { redirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(args.next)}` },
    });
    // The JS SDK nests these under `properties`; the REST API returns them
    // flat. Read both so a client-version change can't silently break auth.
    const hashed =
      (data as any)?.properties?.hashed_token ?? (data as any)?.hashed_token ?? null;
    if (error || !hashed) {
      console.error('[magic-link] mint failed', error);
      return null;
    }
    return (
      `${SITE_URL}/auth/callback?token_hash=${encodeURIComponent(hashed)}` +
      `&type=magiclink&next=${encodeURIComponent(args.next)}`
    );
  } catch (err) {
    console.error('[magic-link] mint threw', err);
    return null;
  }
}
