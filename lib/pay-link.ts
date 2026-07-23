/**
 * Pay links — signed, stateless links that let a customer pay an order the
 * admin created manually (wholesale / quote / phone order), with no manual
 * PayPal invoice.
 *
 *   buildPayToken(orderId)   →  "<orderId>.<sig>"
 *   verifyPayToken(token)    →  orderId | null
 *   payUrlFor(orderId)       →  https://…/pay/<token>
 *
 * The token is an HMAC over the order id (context-prefixed so it can't be
 * replayed against the reorder / unsubscribe flows that share the secret).
 * Non-expiring by design: an invoice link a customer opens next week must
 * still work. It is safe to be long-lived because the ONLY thing the token
 * authorizes is PAYING the order — the amount and items come from the DB, not
 * the link, so a leaked token cannot be tampered into a different charge, and
 * an already-paid order rejects further payment.
 */
import 'server-only';
import crypto from 'crypto';

const SECRET = process.env.UNSUB_SECRET || process.env.CRON_SECRET || 'merit-unsub-fallback';

function sig(orderId: string): string {
  return crypto.createHmac('sha256', SECRET).update(`paylink:${orderId}`).digest('base64url').slice(0, 32);
}

export function buildPayToken(orderId: string): string {
  return `${orderId}.${sig(orderId)}`;
}

export function verifyPayToken(token: string): string | null {
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const orderId = token.slice(0, dot);
  const given = token.slice(dot + 1);
  if (!orderId || orderId.length > 64 || given.length !== 32) return null;
  const a = Buffer.from(given);
  const b = Buffer.from(sig(orderId));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return orderId;
}

export function payUrlFor(orderId: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://meritsciences.com').replace(/\/$/, '');
  return `${base}/pay/${buildPayToken(orderId)}`;
}
