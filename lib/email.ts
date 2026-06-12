/**
 * Transactional email sender — Resend backend.
 *
 * All transactional email (order confirmations, shipment notifications,
 * order-lookup magic links) flows through `sendEmail()`. Keeping it
 * single-entry means swapping providers (Resend → Klaviyo, etc.) is
 * a one-file change.
 *
 * Env:
 *   RESEND_API_KEY  — required for actual sends. If missing, sendEmail()
 *                     no-ops and logs (lets local dev / preview work).
 *   EMAIL_FROM      — `Merit Sciences <hello@meritsciences.com>` (configure
 *                     after Resend domain verification). Defaults to a
 *                     Resend sandbox sender if unset.
 *   EMAIL_REPLY_TO  — optional Reply-To (e.g. support@meritsciences.com)
 */

import 'server-only';
import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Merit Sciences <onboarding@resend.dev>';
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || undefined;

let _client: Resend | null = null;
function client(): Resend | null {
  if (!RESEND_API_KEY) return null;
  if (!_client) _client = new Resend(RESEND_API_KEY);
  return _client;
}

export type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;       // plain-text fallback
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
};

export type EmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const c = client();
  if (!c) {
    console.warn('[email] RESEND_API_KEY not set — would send:', {
      to: payload.to,
      subject: payload.subject,
    });
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }

  try {
    const result = await c.emails.send({
      from: EMAIL_FROM,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      replyTo: payload.replyTo ?? EMAIL_REPLY_TO,
      tags: payload.tags,
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
