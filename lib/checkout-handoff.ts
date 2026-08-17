/**
 * Cross-domain checkout handoff.
 *
 * PayPal requires checkout to run on a domain separate from the catalog. That
 * boundary silently destroys four things, because every one of them is
 * origin-scoped:
 *
 *   · the cart            — zustand persist → localStorage
 *   · `merit_ref`         — affiliate attribution cookie (HttpOnly)
 *   · `merit_attr`        — first-touch traffic attribution cookie
 *   · `merit_welcome_code`— auto-applied promo in localStorage
 *
 * Lose them and checkout still "works": the buyer just arrives with an empty
 * cart, no discount, and no affiliate credited — the last one being real money
 * owed to partners that never gets booked, with nothing in the logs to show it.
 *
 * So the storefront serialises all four into one short-lived, single-use row
 * and hands the checkout domain an opaque token. Only the token travels in the
 * URL; the payload is read back server-side.
 *
 * Deliberately NOT a signed/stateless token: the cart can be large, and a
 * DB row lets us enforce single-use (a token replayed after purchase can't
 * resurrect a stale cart).
 */
import 'server-only';
import { randomBytes } from 'crypto';
import { createHmac, timingSafeEqual } from 'crypto';
import { prisma } from './db';
import { checkoutOrigin } from './checkout-domain';

/** Handoffs are consumed seconds after issue; 30 min is generous slack. */
const TTL_MS = 30 * 60 * 1000;

export type HandoffLine = {
  handle: string;
  title: string;
  bundleLabel: string;
  unitCents: number;
  qty: number;
  imageUrl?: string;
  componentHandles?: string[];
};

export type HandoffPayload = {
  lines: HandoffLine[];
  refSlug: string | null;
  attr: string | null;
  welcomeCode: string | null;
  /** Approved practitioner id, resolved from the session server-side. */
  practitionerApplicationId?: string | null;
};

/**
 * Origin that serves checkout. Set CHECKOUT_ORIGIN in Render once the
 * separate domain's DNS is live (e.g. https://meritcheckout.com).
 *
 * UNSET = same-origin checkout, i.e. exactly today's behaviour. That's the
 * safety property that matters: this whole module ships dark and changes
 * nothing until the env var is set, so it can be deployed and verified before
 * the domain exists — and rolled back by clearing one variable.
 */
// Domain config lives in lib/checkout-domain.ts (no prisma / no `server-only`)
// so the edge middleware can import it too. Re-exported here for callers that
// already depend on this module.
export { checkoutOrigin, checkoutHost, isCheckoutHostname, isSplitCheckout } from './checkout-domain';

function newToken(): string {
  return randomBytes(24).toString('base64url'); // 32 chars, URL-safe
}

/**
 * Persist a handoff and return the absolute URL the buyer should be sent to.
 * When CHECKOUT_ORIGIN is unset this still returns a valid same-origin URL,
 * so callers need no branching.
 */
export async function createHandoff(payload: HandoffPayload): Promise<string> {
  const origin = checkoutOrigin();

  // Same-origin: nothing crosses a boundary, so skip the row entirely.
  if (!origin) return '/checkout';

  const token = newToken();
  await prisma.checkoutHandoff.create({
    data: {
      token,
      lines: payload.lines as unknown as object,
      refSlug: payload.refSlug,
      attr: payload.attr,
      welcomeCode: payload.welcomeCode,
      practitionerApplicationId: payload.practitionerApplicationId ?? null,
      expiresAt: new Date(Date.now() + TTL_MS),
    },
  });
  return `${origin}/checkout?c=${token}`;
}

/**
 * Read a handoff back on the checkout domain and burn it.
 *
 * Single-use, but NOT destructive-on-read: we stamp `consumedAt` and still
 * return the payload, so a buyer who refreshes the checkout page mid-session
 * doesn't lose their cart. Replay is bounded by expiresAt.
 */
export async function consumeHandoff(token: string): Promise<HandoffPayload | null> {
  const t = (token || '').trim();
  if (!t || t.length > 128) return null;

  const row = await prisma.checkoutHandoff.findUnique({ where: { token: t } });
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) return null;

  if (!row.consumedAt) {
    await prisma.checkoutHandoff
      .update({ where: { token: t }, data: { consumedAt: new Date() } })
      .catch(() => { /* stamping is best-effort — never block checkout on it */ });
  }

  return {
    lines: (row.lines as unknown as HandoffLine[]) ?? [],
    refSlug: row.refSlug,
    attr: row.attr,
    welcomeCode: row.welcomeCode,
    practitionerApplicationId: row.practitionerApplicationId,
  };
}

/**
 * Signed practitioner cookie for the checkout origin.
 *
 * The storefront's Supabase auth cookie is scoped to meritsciences.com, so on
 * meritcheckout.com getPractitionerSession() finds nothing and the cart prices
 * at full retail — a practice would browse at their rate and be charged list.
 *
 * /api/checkout/claim already re-establishes the affiliate cookies on this
 * origin so the money code runs identically; this is the same move for
 * pricing. It MUST be signed: an unsigned `id` cookie would let any buyer
 * type in a practitioner id and grant themselves account pricing.
 */
export const PRACTITIONER_COOKIE = 'merit_practitioner';
const PRACTITIONER_COOKIE_SECRET = process.env.CRON_SECRET || 'dev-secret';

export function signPractitionerId(applicationId: string): string {
  const mac = createHmac('sha256', PRACTITIONER_COOKIE_SECRET)
    .update(`practitioner:${applicationId}`)
    .digest('base64url')
    .slice(0, 32);
  return `${applicationId}.${mac}`;
}

/** Returns the application id only when the signature checks out. */
export function verifyPractitionerCookie(value: string | undefined): string | null {
  if (!value) return null;
  const i = value.lastIndexOf('.');
  if (i <= 0) return null;
  const id = value.slice(0, i);
  const expected = signPractitionerId(id);
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  return timingSafeEqual(a, b) ? id : null;
}

/** Housekeeping — drop expired rows. Safe to call from any cron. */
export async function purgeExpiredHandoffs(): Promise<number> {
  const res = await prisma.checkoutHandoff.deleteMany({
    where: { expiresAt: { lt: new Date(Date.now() - TTL_MS) } },
  });
  return res.count;
}
