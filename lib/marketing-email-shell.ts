/**
 * Elevated brand shell for consumer marketing emails (the prospect drip).
 * Kept separate from the practitioner shell so we can push the design further
 * without touching B2B mail. Table-based + inline styles = renders in Gmail,
 * Apple Mail, and Outlook.
 *
 * Design: cream field · white card with a cobalt accent bar · wordmark ·
 * big display headline · generous body · one confident CTA. Helpers below
 * (proof, versus, stat, quiet) give each email a distinct visual beat.
 */
import 'server-only';

const COBALT = '#2E4DDB';
const COBALT_DEEP = '#1B2F9E';
const INK = '#0B0F1A';
const INK_SOFT = '#5C6378';
const INK_MUTE = '#8A90A2';
const CREAM = '#F4F1EA';
const CREAM_EDGE = '#E5E1D6';
const LINE = '#ECE9E1';
const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://meritsciences.com').replace(/\/$/, '');

export type MarketingShell = {
  subject: string;
  eyebrow: string;
  bodyHtml: string;
  unsubscribeUrl?: string;
};

export function wrapMarketingEmail({ subject, eyebrow, bodyHtml, unsubscribeUrl }: MarketingShell): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${CREAM};font-family:${SANS};color:${INK};-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(subject)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${CREAM};padding:34px 14px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid ${CREAM_EDGE};">

        <!-- cobalt accent bar -->
        <tr><td style="height:5px;background:${COBALT};font-size:0;line-height:0;">&nbsp;</td></tr>

        <!-- wordmark -->
        <tr><td style="padding:26px 36px 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
            <td style="vertical-align:middle;">
              <span style="font-size:17px;font-weight:900;letter-spacing:-0.02em;color:${INK};">Merit Sciences</span>
            </td>
            <td align="right" style="vertical-align:middle;">
              <span style="font-size:10px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:${INK_MUTE};">Research-grade</span>
            </td>
          </tr></table>
        </td></tr>

        <!-- eyebrow -->
        <tr><td style="padding:22px 36px 0;">
          <p style="margin:0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${COBALT};font-weight:800;">${esc(eyebrow)}</p>
        </td></tr>

        <!-- body -->
        <tr><td style="padding:10px 36px 30px;">
          ${bodyHtml}
        </td></tr>

        <!-- footer -->
        <tr><td style="padding:22px 36px;background:${CREAM};border-top:1px solid ${CREAM_EDGE};">
          <p style="margin:0 0 6px;font-size:12px;line-height:19px;color:${INK_SOFT};font-weight:700;">Merit Sciences &middot; Dallas, TX</p>
          <p style="margin:0;font-size:11px;line-height:18px;color:${INK_MUTE};">
            <a href="mailto:info@meritpeptides.com" style="color:${INK_MUTE};text-decoration:underline;">Reply anytime</a>${
              unsubscribeUrl ? ` &nbsp;&middot;&nbsp; <a href="${esc(unsubscribeUrl)}" style="color:${INK_MUTE};text-decoration:underline;">Unsubscribe</a>` : ''
            }
          </p>
          <p style="margin:10px 0 0;font-size:10px;line-height:16px;color:${INK_MUTE};">For research use only. Not for human or veterinary use. Not FDA-approved.</p>
        </td></tr>
      </table>
      <p style="max-width:600px;margin:16px auto 0;font-size:11px;color:${INK_MUTE};text-align:center;">You're getting this because you joined the Merit list.</p>
    </td></tr>
  </table>
</body></html>`;
}

// ── Body helpers ────────────────────────────────────────────────────────────

/** Big display headline — the hero line of the email. */
export function h(text: string): string {
  return `<h1 style="margin:6px 0 14px;font-size:28px;line-height:1.12;letter-spacing:-0.03em;font-weight:900;color:${INK};">${text}</h1>`;
}

/** Body paragraph. */
export function p(html: string): string {
  return `<p style="margin:0 0 15px;font-size:16px;line-height:25px;color:${INK};">${html}</p>`;
}

/** Confident cobalt CTA button. */
export function cta(label: string, href: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:22px 0 6px;"><tr><td style="border-radius:10px;background:${COBALT};">
    <a href="${esc(href)}" style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:800;letter-spacing:0.01em;color:#ffffff;text-decoration:none;border-radius:10px;">${label}</a>
  </td></tr></table>`;
}

/** Quiet one-liner under a CTA. */
export function quiet(html: string): string {
  return `<p style="margin:8px 0 0;font-size:13px;line-height:20px;color:${INK_SOFT};">${html}</p>`;
}

/** Cobalt-tinted proof / code callout. */
export function proof(html: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:6px 0 18px;"><tr><td style="background:#F2F4FF;border:1px solid #D9E0FF;border-left:4px solid ${COBALT};border-radius:10px;padding:16px 18px;font-size:15px;line-height:24px;color:${INK};">${html}</td></tr></table>`;
}

/** Discount-code chip — monospace, unmissable. */
export function codeChip(code: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:4px 0 18px;"><tr><td style="background:${INK};border-radius:10px;padding:12px 20px;">
    <span style="font-size:12px;font-weight:800;letter-spacing:0.12em;text-transform:uppercase;color:${INK_MUTE};">Your code &nbsp;</span>
    <span style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:17px;font-weight:800;letter-spacing:0.08em;color:#fff;">${esc(code)}</span>
    <span style="font-size:12px;color:${INK_MUTE};"> &nbsp;— 20% off #1</span>
  </td></tr></table>`;
}

/** Two-column "them vs us" comparison. rows = [label, them, us]. */
export function versus(themLabel: string, usLabel: string, rows: [string, string, string][]): string {
  const body = rows
    .map(
      ([label, them, us]) => `<tr>
        <td style="padding:9px 12px;border-top:1px solid ${LINE};font-size:13px;color:${INK_SOFT};width:34%;">${label}</td>
        <td style="padding:9px 12px;border-top:1px solid ${LINE};border-left:1px solid ${LINE};font-size:13px;color:${INK_SOFT};">${them}</td>
        <td style="padding:9px 12px;border-top:1px solid ${LINE};border-left:1px solid ${LINE};font-size:13px;color:${INK};font-weight:700;">${us}</td>
      </tr>`,
    )
    .join('');
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:8px 0 20px;border:1px solid ${LINE};border-radius:12px;overflow:hidden;">
    <tr>
      <td style="padding:10px 12px;background:${CREAM};font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:${INK_MUTE};width:34%;">&nbsp;</td>
      <td style="padding:10px 12px;background:${CREAM};border-left:1px solid ${LINE};font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:${INK_MUTE};">${esc(themLabel)}</td>
      <td style="padding:10px 12px;background:#EEF1FF;border-left:1px solid ${LINE};font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:${COBALT_DEEP};">${esc(usLabel)}</td>
    </tr>
    ${body}
  </table>`;
}

/** Big single statistic with a caption. */
export function stat(value: string, caption: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:6px 0 18px;"><tr><td align="center" style="background:${CREAM};border-radius:12px;padding:22px 18px;">
    <div style="font-size:40px;line-height:1;font-weight:900;letter-spacing:-0.03em;color:${COBALT};">${esc(value)}</div>
    <div style="margin-top:8px;font-size:13px;color:${INK_SOFT};">${caption}</div>
  </td></tr></table>`;
}

/** Inline cobalt link. */
export function a(label: string, href: string): string {
  return `<a href="${esc(href)}" style="color:${COBALT};text-decoration:underline;font-weight:700;">${label}</a>`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export const SITE = SITE_URL;
