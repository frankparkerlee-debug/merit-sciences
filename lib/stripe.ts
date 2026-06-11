// Server-only Stripe client.
//
// Lazy-initialized so the build doesn't fail when STRIPE_SECRET_KEY
// isn't set (e.g. preview environments). The first API call throws if
// the env var is still missing.

import 'server-only';
import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function stripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY is required — set it in Render env / .env.local',
    );
  }
  _stripe = new Stripe(key, {
    // Pin to a known-good API version so behavior changes on Stripe's
    // side don't silently shift our integration.
    apiVersion: '2026-05-27.dahlia',
    typescript: true,
  });
  return _stripe;
}
