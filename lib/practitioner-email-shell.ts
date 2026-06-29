/**
 * Shared brand shell for every practitioner-facing email.
 *
 * One source of truth for the cream background + white card + cobalt
 * eyebrow + Merit logo header + signature footer. Approval, rejection,
 * deactivation, magic-link sign-in, and drip sequence emails all wrap
 * their body HTML in this shell so the inbox impression is consistent.
 *
 * Use `bodyHtml` (string) to drop in whatever paragraphs / buttons /
 * data tables the specific email needs. The shell handles everything
 * else: header band, body card, footer, replies-routed CTA.
 *
 *   const html = wrapPractitionerEmail({
 *     subject: 'Welcome',
 *     eyebrow: 'Practitioner Program · Approved',
 *     bodyHtml: '<p>...</p>' + btn('Sign in →', signInUrl),
 *   });
 */

import 'server-only';

const COBALT = '#2E4DDB';
const INK = '#0B0F1A';
const INK_SOFT = '#5C6378';
const CREAM = '#F4F1EA';
const CREAM_EDGE = '#E5E1D6';
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://meritsciences.com').replace(/\/$/, '');

export type PractitionerEmailShell = {
  /** Title tag (mostly cosmetic; clients render the subject not this) */
  subject: string;
  /** Small label above the headline. Example: "Practitioner Program · Approved" */
  eyebrow: string;
  /** Inner content — full HTML, no shell. Use `btn()` / `link()` helpers below. */
  bodyHtml: string;
  /** Optional footer override; defaults to Merit signature line */
  footerNote?: string;
  /** Optional unsubscribe link (drip sequences only) */
  unsubscribeUrl?: string;
};

export function wrapPractitionerEmail(args: PractitionerEmailShell): string {
  const {
    subject,
    eyebrow,
    bodyHtml,
    footerNote = 'Merit Sciences &middot; Dallas, TX',
    unsubscribeUrl,
  } = args;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${CREAM};font-family:${SANS};color:${INK};">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${CREAM};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden;">

        <!-- Logo + brand strip -->
        <tr><td style="padding:24px 32px 0;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
              <td style="vertical-align:middle;width:36px;">
                <img src="${SITE_URL}/icon.png" alt="" width="28" height="28" style="display:block;width:28px;height:28px;border-radius:6px;border:0;" />
              </td>
              <td style="vertical-align:middle;padding-left:10px;">
                <span style="font-size:13px;font-weight:900;letter-spacing:-0.01em;color:${INK};font-family:${SANS};">Merit Sciences</span>
              </td>
            </tr>
          </table>
        </td></tr>

        <!-- Eyebrow + body -->
        <tr><td style="padding:18px 32px 8px;">
          <p style="margin:0;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${COBALT};font-weight:700;">— ${escapeHtml(eyebrow)}</p>
        </td></tr>
        <tr><td style="padding:8px 32px 28px;font-size:15px;line-height:23px;color:${INK};">
          ${bodyHtml}
        </td></tr>

        <!-- Footer band -->
        <tr><td style="padding:18px 32px;background:${CREAM};border-top:1px solid ${CREAM_EDGE};font-size:11px;line-height:18px;color:${INK_SOFT};">
          ${footerNote}<br>
          <a href="mailto:info@meritpeptides.com" style="color:${INK_SOFT};text-decoration:underline;">Reply directly</a>
          ${unsubscribeUrl ? ` &middot; <a href="${escapeHtml(unsubscribeUrl)}" style="color:${INK_SOFT};text-decoration:underline;">Unsubscribe</a>` : ''}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/** Cobalt pill CTA. */
export function btn(label: string, href: string): string {
  return `<p style="margin:18px 0 4px;"><a href="${escapeHtml(href)}" style="display:inline-block;background:${COBALT};color:#fff;padding:11px 22px;border-radius:8px;text-decoration:none;font-weight:700;letter-spacing:0.04em;font-size:13px;">${label}</a></p>`;
}

/** Inline cobalt text link. */
export function link(label: string, href: string): string {
  return `<a href="${escapeHtml(href)}" style="color:${COBALT};text-decoration:underline;">${label}</a>`;
}

/** Quiet, single-line context note under a CTA. */
export function note(text: string): string {
  return `<p style="margin:6px 0 0;font-size:12px;line-height:18px;color:${INK_SOFT};">${text}</p>`;
}

/** Heading inside the body — big serif-equivalent for "Welcome" lines. */
export function heading(text: string): string {
  return `<h2 style="margin:0 0 14px;font-size:22px;line-height:1.15;letter-spacing:-0.02em;font-weight:900;font-family:${SANS};color:${INK};">${text}</h2>`;
}

/** Standard body paragraph. */
export function p(html: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:23px;color:${INK};">${html}</p>`;
}

/** Cobalt-tinted highlight box — for proof, codes, spec callouts. */
export function calloutBox(html: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:4px 0 18px;"><tr><td style="background:#F3F5FF;border:1px solid #DBE2FF;border-radius:10px;padding:16px 18px;font-size:14px;line-height:22px;color:${INK};">${html}</td></tr></table>`;
}

/** Hairline divider. */
export function divider(): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:8px 0 18px;"><tr><td style="border-top:1px solid ${CREAM_EDGE};font-size:0;line-height:0;height:1px;">&nbsp;</td></tr></table>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
