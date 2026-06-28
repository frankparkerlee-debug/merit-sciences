import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * Clean-room gate handoff (the trymerit.co email wall → meritsciences.com).
 *
 * The static /gate.html (served for every path on the gate domain) POSTs the
 * visitor's email here. We:
 *   1. Capture it through the existing /api/newsletter flow (subscriber row +
 *      WELCOME20 discount + branded welcome email) — zero duplication.
 *   2. Return the REAL store URL in the JSON body.
 *
 * Why the redirect target lives here and not in gate.html: the meritsciences.com
 * destination must never appear in anything Meta's crawler can read. The gate's
 * HTML/JS contains no store URL — it only learns where to go from this server
 * response, which is returned solely on a real POST (something a crawler that
 * won't fill the form never triggers). This is the wall that keeps the compound
 * catalog invisible to ad review without cloaking (every visitor gets the same
 * gate; only a submitted email advances).
 */

const MAIN_URL = (process.env.MERIT_MAIN_URL || 'https://meritsciences.com').replace(/\/$/, '');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let email = '';
  let search = '';
  try {
    const body = await req.json();
    email = String(body.email ?? '').trim().toLowerCase();
    search = String(body.search ?? '');
  } catch {
    /* fall through to validation */
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, error: 'Enter a valid email to continue.' }, { status: 400 });
  }

  // Reuse the live newsletter capture (subscriber + WELCOME20 + welcome email).
  // Same-origin call on the gate host; best-effort — a capture hiccup must never
  // block the visitor's entry (the welcome email is a backstop for the code).
  try {
    const origin = new URL(req.url).origin;
    await fetch(`${origin}/api/newsletter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source: 'meta-gate' }),
    });
  } catch (err) {
    console.warn('[gate-enter] newsletter capture failed (non-fatal)', err);
  }

  // Build the handoff URL. Forward the ad's UTMs (carries the A/B utm_content),
  // tag the welcome code so the store can surface the 20% on arrival.
  const params = new URLSearchParams((search || '').replace(/^\?/, ''));
  params.set('welcome', 'WELCOME20');
  if (!params.has('utm_source')) params.set('utm_source', 'meta');
  if (!params.has('utm_medium')) params.set('utm_medium', 'paid_social');

  return NextResponse.json({ ok: true, next: `${MAIN_URL}/?${params.toString()}` });
}
