/**
 * Transactional email sender — Resend backend.
 *
 * All outbound email (order confirmations, shipment notifications,
 * order-lookup magic links, drip campaigns) flows through `sendEmail()`.
 * Keeping it single-entry means swapping providers is a one-file change.
 *
 * ── Two streams, two subdomains ──────────────────────────────────────
 * Receipts and marketing do NOT share a sending identity. They used to:
 * one `EMAIL_FROM` on the apex sent everything, and over a 30-day window
 * that was 1,989 messages against 113 orders. Roughly four in five were
 * drip, so the list's complaint rate (0.10%, exactly Gmail's ceiling) set
 * the reputation that order confirmations inherited, and receipts started
 * landing in spam.
 *
 * Mailbox reputation is scored per DOMAIN, so a different mailbox on the
 * same domain fixes nothing. Each stream gets its own subdomain, its own
 * DKIM key, and therefore its own reputation:
 *
 *   transactional → orders.meritsciences.com  (receipts, shipping,
 *                   refunds, magic links, admin alerts)
 *   marketing     → news.meritsciences.com    (drip, sequences,
 *                   abandoned cart, Lab Report, newsletter)
 *
 * The apex stays for human Google Workspace mail.
 *
 * Env:
 *   RESEND_API_KEY        — required for actual sends. If missing, sendEmail()
 *                           no-ops and logs (lets local dev / preview work).
 *   EMAIL_FROM            — transactional sender,
 *                           `Merit Sciences <orders@orders.meritsciences.com>`
 *   EMAIL_MARKETING_FROM  — marketing sender,
 *                           `Merit Sciences <hello@news.meritsciences.com>`.
 *                           Falls back to EMAIL_FROM when unset, so the split
 *                           goes live by setting an env var once the
 *                           subdomain verifies, not by shipping code.
 *   EMAIL_REPLY_TO        — optional Reply-To (e.g. info@meritsciences.com)
 */

import 'server-only';
import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Merit Sciences <onboarding@resend.dev>';
const EMAIL_MARKETING_FROM = process.env.EMAIL_MARKETING_FROM || EMAIL_FROM;
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || undefined;

let _client: Resend | null = null;
function client(): Resend | null {
  if (!RESEND_API_KEY) return null;
  if (!_client) _client = new Resend(RESEND_API_KEY);
  return _client;
}

/**
 * Which reputation this message spends.
 *
 * `transactional` is mail a specific person asked for by doing something
 * (ordering, requesting a login link). `marketing` is anything sent to a
 * list on our schedule rather than theirs — and it is the only stream that
 * carries unsubscribe headers, because it is the only one a recipient can
 * opt out of.
 */
export type MailStream = 'transactional' | 'marketing';

export type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;       // plain-text fallback
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
  /** Defaults to 'transactional' — the safe side, since it never adds
   *  unsubscribe headers to mail that isn't a list. */
  stream?: MailStream;
  /** Marketing only: the recipient's signed unsubscribe URL. Produces the
   *  List-Unsubscribe pair Gmail and Yahoo expect from bulk senders. */
  unsubscribeUrl?: string;
  headers?: Record<string, string>;
};

export type EmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/**
 * RFC 8058 one-click unsubscribe.
 *
 * The header URL must point at the POST endpoint, never at the page: a page
 * that unsubscribes on GET will be triggered by the link-prefetching security
 * scanners that sit in front of corporate inboxes, silently unsubscribing
 * people who never clicked. `/api/unsubscribe` only acts on POST and redirects
 * a GET to the confirmation page, so both behaviours are safe.
 */
function oneClickUrl(unsubscribeUrl: string): string | null {
  try {
    const u = new URL(unsubscribeUrl);
    u.pathname = '/api/unsubscribe';
    return u.toString();
  } catch {
    return null;
  }
}

function listHeaders(unsubscribeUrl?: string): Record<string, string> {
  if (!unsubscribeUrl) return {};
  const oneClick = oneClickUrl(unsubscribeUrl);
  if (!oneClick) return {};
  return {
    'List-Unsubscribe': `<${oneClick}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const c = client();
  if (!c) {
    console.warn('[email] RESEND_API_KEY not set — would send:', {
      to: payload.to,
      subject: payload.subject,
    });
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }

  const stream: MailStream = payload.stream ?? 'transactional';
  const headers = {
    ...(stream === 'marketing' ? listHeaders(payload.unsubscribeUrl) : {}),
    ...payload.headers,
  };

  try {
    const result = await c.emails.send({
      from: stream === 'marketing' ? EMAIL_MARKETING_FROM : EMAIL_FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      replyTo: payload.replyTo ?? EMAIL_REPLY_TO,
      tags: payload.tags,
      ...(Object.keys(headers).length ? { headers } : {}),
    });

    if (result.error) {
      console.error('[email] Resend error:', result.error);
      return { ok: false, error: result.error.message ?? 'Send failed' };
    }
    return { ok: true, id: result.data?.id ?? 'unknown' };
  } catch (err: any) {
    console.error('[email] send threw:', err);
    return { ok: false, error: err?.message ?? 'Unknown error' };
  }
}
