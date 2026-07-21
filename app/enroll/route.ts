/**
 * Signed one-click sequence enrollment — the target of the self-segmentation
 * email's lane buttons (and on-site interest links).
 *
 *   GET /enroll?seq=seq-<handle>&e=<email>&t=<token>
 *
 * `t` is the SAME email-bound HMAC used by the unsubscribe link
 * (unsubToken), so no new secret or token scheme. On valid token we enroll
 * (idempotent) and 302 to the compound's PDP with the promo code riding
 * along (DiscountCodeCapture applies it at checkout). Invalid/again → still
 * bounce to a sensible page; never surface an error wall for an email click.
 *
 * Lives at /enroll (not /api) so it's a normal navigable GET that redirects
 * a human's browser; middleware ignores /api but /enroll is fine — it sets
 * no store chrome and immediately redirects.
 */
import { NextResponse } from 'next/server';
import { unsubToken } from '@/lib/prospect-journey';
import { enrollInSequence } from '@/lib/sequence-journey';
import { sequenceExists, redirectHandleFor } from '@/lib/sequences-registry';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://meritsciences.com').replace(/\/$/, '');
const CODE = 'WELCOME20';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const seq = (url.searchParams.get('seq') || '').trim();
  const email = (url.searchParams.get('e') || '').trim().toLowerCase();
  const token = (url.searchParams.get('t') || '').trim();

  const handle = redirectHandleFor(seq); // compound self, or category hero PDP

  // Bad params → send them to the catalog rather than an error page.
  if (!sequenceExists(seq) || !handle || !email || !token) {
    return NextResponse.redirect(`${SITE}/catalog?code=${CODE}`, 302);
  }

  const dest = `${SITE}/products/${handle}?code=${CODE}`;

  // Verify the email-bound token (constant-time).
  let valid = false;
  try {
    valid = crypto.timingSafeEqual(Buffer.from(token), Buffer.from(unsubToken(email)));
  } catch {
    valid = false;
  }
  // Even on a bad token, land them on the relevant PDP (never an error wall) —
  // we just don't enroll.
  if (!valid) return NextResponse.redirect(dest, 302);

  // Idempotent enroll (never blocks the redirect on failure).
  await enrollInSequence(email, seq, 'interest-picker').catch(() => {});

  return NextResponse.redirect(dest, 302);
}
