/**
 * One-click reorder links — signed, stateless deep links that rebuild a past
 * order's cart and drop the customer at /checkout.
 *
 *   buildReorderToken(orderId)  →  "<orderId>.<sig>"
 *   verifyReorderToken(token)   →  orderId | null
 *   reorderUrlFor(orderId)      →  https://…/reorder/<token>
 *
 * The token is an HMAC over the order id (context-prefixed so it can never be
 * replayed against the unsubscribe or lookup flows that share the secret
 * chain). Stateless + non-expiring by design: a reorder button in a months-old
 * email should still work, and the worst a leaked token can do is prefill a
 * cart with that order's items — no PII is exposed and payment still runs
 * through the normal checkout.
 */
import 'server-only';
import crypto from 'crypto';

const SECRET = process.env.UNSUB_SECRET || process.env.CRON_SECRET || 'merit-unsub-fallback';

function sig(orderId: string): string {
  return crypto.createHmac('sha256', SECRET).update(`reorder:${orderId}`).digest('base64url').slice(0, 32);
}

export function buildReorderToken(orderId: string): string {
  return `${orderId}.${sig(orderId)}`;
}

export function verifyReorderToken(token: string): string | null {
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const orderId = token.slice(0, dot);
  const given = token.slice(dot + 1);
  if (!orderId || orderId.length > 64 || given.length !== 32) return null;
  const expected = sig(orderId);
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return orderId;
}

export function reorderUrlFor(orderId: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://meritsciences.com').replace(/\/$/, '');
  return `${base}/reorder/${buildReorderToken(orderId)}`;
}
