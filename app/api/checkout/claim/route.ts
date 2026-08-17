/**
 * POST /api/checkout/claim
 * Body: { token: string }
 * →     { lines: CartLine[], welcomeCode: string | null }
 *
 * Runs on the CHECKOUT domain. Redeems the handoff minted by the storefront
 * and rebuilds the buyer's context on this origin:
 *
 *   · re-sets `merit_ref`  (affiliate attribution) as a first-party cookie
 *   · re-sets `merit_attr` (first-touch traffic attribution)
 *   · returns the cart + promo code for the client to load into its store
 *
 * Re-setting the COOKIES rather than threading the values through every
 * downstream call is deliberate: /api/paypal/create-order already reads both
 * cookies to resolve the affiliate and stamp attribution. Restoring them here
 * means the entire payment + commission path runs byte-identically on the
 * checkout domain, with zero changes to the money code.
 */
import { NextResponse } from 'next/server';
import { consumeHandoff, signPractitionerId, PRACTITIONER_COOKIE } from '@/lib/checkout-handoff';
import { ATTR_COOKIE, ATTR_COOKIE_MAX_AGE } from '@/lib/attribution';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REF_COOKIE = 'merit_ref';
const REF_MAX_AGE = 30 * 24 * 60 * 60; // 30 days — matches middleware.ts

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Never fail hard: a bad token, an expired row, or a DB blip must all
  // degrade to "no carried-over context" rather than a 500 that blocks the
  // buyer from paying. Checkout is the last place to be brittle.
  let payload = null;
  try {
    payload = await consumeHandoff(String(body?.token ?? ''));
  } catch (err) {
    console.error('[checkout/claim] lookup failed', err);
  }
  if (!payload) {
    return NextResponse.json({ lines: [], welcomeCode: null }, { status: 200 });
  }

  const res = NextResponse.json({
    lines: payload.lines,
    welcomeCode: payload.welcomeCode,
  });

  const secure = process.env.NODE_ENV === 'production';

  if (payload.refSlug) {
    res.cookies.set(REF_COOKIE, payload.refSlug, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: REF_MAX_AGE,
    });
  }
  // Same device as the affiliate cookies above: restore the practice on this
  // origin so priceCart() resolves account pricing here exactly as it does on
  // the storefront. Signed, because an unsigned id would let any buyer grant
  // themselves practitioner rates by typing a cookie.
  if (payload.practitionerApplicationId) {
    res.cookies.set(PRACTITIONER_COOKIE, signPractitionerId(payload.practitionerApplicationId), {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      // Short: it describes one checkout, not a login.
      maxAge: 2 * 60 * 60,
    });
  }

  if (payload.attr) {
    res.cookies.set(ATTR_COOKIE, payload.attr, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: ATTR_COOKIE_MAX_AGE,
    });
  }

  return res;
}
