/**
 * Branded HTML email templates for Merit Sciences transactional mail.
 *
 * All templates use the same shell (dark Ink header bar, white card,
 * cream wrapper, cobalt accent) so they read as one consistent brand.
 * Table-based for client compatibility (Gmail, Outlook, Apple Mail).
 */

import 'server-only';

const COLOR_INK = '#0B0F1A';
const COLOR_COBALT = '#2E4DDB';
const COLOR_COBALT_SOFT = '#6B8AFF';
const COLOR_CREAM = '#F4F1EA';
const COLOR_BORDER = '#E2E5EB';
const COLOR_TEXT_SOFT = '#5C6378';

const SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';
const MONO = 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace';

function fmtMoney(cents: number | bigint): string {
  const n = typeof cents === 'bigint' ? Number(cents) : cents;
  const sign = n < 0 ? '-' : '';
  return `${sign}$${(Math.abs(n) / 100).toFixed(2)}`;
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─── Shell wrapper ─── */

type ShellArgs = {
  preheader: string;
  eyebrow: string;
  body: string;
};

function shell({ preheader, eyebrow, body }: ShellArgs): string {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${escapeHtml(eyebrow)}</title>
  <style>
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .px-32 { padding-left: 22px !important; padding-right: 22px !important; }
      .py-36 { padding-top: 26px !important; padding-bottom: 26px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${COLOR_CREAM};font-family:${SANS};color:${COLOR_INK};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${COLOR_CREAM};">
    <tr>
      <td align="center" style="padding:30px 12px;">

        <!-- Brand bar -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="max-width:600px;width:100%;background-color:${COLOR_INK};border-radius:16px 16px 0 0;">
          <tr>
            <td style="padding:18px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td align="left" style="font-size:15px;font-weight:900;letter-spacing:-0.02em;color:#ffffff;font-family:${SANS};">Merit Sciences</td>
                  <td align="right" style="font-size:10px;letter-spacing:0.22em;text-transform:uppercase;font-weight:700;color:${COLOR_COBALT_SOFT};font-family:${SANS};">${escapeHtml(eyebrow)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Body card -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:0 0 16px 16px;">
          <tr>
            <td class="px-32 py-36" style="padding:36px 40px;">
              ${body}
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="max-width:600px;width:100%;">
          <tr>
            <td align="center" style="padding:24px 12px 0;">
              <p style="margin:0;font-size:11px;line-height:18px;color:${COLOR_TEXT_SOFT};letter-spacing:0.02em;">
                <strong style="color:${COLOR_INK};font-weight:900;letter-spacing:-0.01em;">MERIT SCIENCES</strong>
              </p>
              <p style="margin:4px 0 0;font-size:11px;line-height:18px;color:${COLOR_TEXT_SOFT};font-style:italic;">Pharmacy-grade. Not pharmacy-priced.</p>
              <p style="margin:14px 0 0;font-size:11px;line-height:18px;color:${COLOR_TEXT_SOFT};">
                Dallas, TX &middot; <a href="mailto:info@meritsciences.com" style="color:${COLOR_COBALT};text-decoration:none;">info@meritsciences.com</a>
              </p>
              <p style="margin:14px 0 0;font-size:11px;line-height:18px;color:${COLOR_TEXT_SOFT};">
                <a href="https://merit-sciences.onrender.com/catalog" style="color:${COLOR_TEXT_SOFT};text-decoration:underline;">Catalog</a>
                &nbsp;&middot;&nbsp;
                <a href="https://merit-sciences.onrender.com/policies/shipping" style="color:${COLOR_TEXT_SOFT};text-decoration:underline;">Shipping</a>
                &nbsp;&middot;&nbsp;
                <a href="https://merit-sciences.onrender.com/policies/returns" style="color:${COLOR_TEXT_SOFT};text-decoration:underline;">Returns</a>
                &nbsp;&middot;&nbsp;
                <a href="https://merit-sciences.onrender.com/policies/privacy" style="color:${COLOR_TEXT_SOFT};text-decoration:underline;">Privacy</a>
              </p>
              <p style="margin:16px 0 0;font-size:10px;line-height:16px;color:${COLOR_TEXT_SOFT};max-width:480px;">
                Research compounds for laboratory use only. Not for human or veterinary consumption.
              </p>
              <p style="margin:14px 0 0;font-size:10px;line-height:16px;color:${COLOR_TEXT_SOFT};">
                You received this because you placed an order or signed up at Merit Sciences.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ─── Headline ─── */

function headline(text: string, accentDot = true): string {
  return `<h1 style="margin:0 0 18px 0;font-size:30px;line-height:34px;font-weight:900;letter-spacing:-0.035em;color:${COLOR_INK};font-family:${SANS};">${escapeHtml(text)}${accentDot ? `<span style="color:${COLOR_COBALT};">.</span>` : ''}</h1>`;
}

/* ─── CTA button ─── */

function ctaButton(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center" style="padding:12px 0;">
    <a href="${escapeHtml(url)}" style="display:inline-block;background-color:${COLOR_COBALT};color:#ffffff;text-decoration:none;padding:16px 32px;border-radius:10px;font-size:14px;font-weight:700;letter-spacing:0.01em;font-family:${SANS};">${escapeHtml(label)} &rarr;</a>
  </td></tr></table>`;
}

/* ─── Order confirmation ─── */

export type OrderConfirmationData = {
  orderId: string;             // our internal cuid (for lookup URL)
  paypalOrderId: string;       // PayPal-side reference shown to buyer
  customerName: string;
  shippingFullName: string;
  shippingLine1: string;
  shippingLine2?: string | null;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  lines: Array<{
    title: string;
    bundleLabel: string;
    qty: number;
    unitCents: number | bigint;
  }>;
  subtotalCents: number | bigint;
  shippingCents: number | bigint;
  discountCents: number | bigint;
  totalCents: number | bigint;
  discountCode?: string | null;
  lookupUrl: string;           // /orders/[id]?token=... full URL
};

export function renderOrderConfirmation(d: OrderConfirmationData): { subject: string; html: string; text: string } {
  const firstName = d.customerName.split(/\s+/)[0] || 'there';

  const lineRows = d.lines.map((l) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid ${COLOR_BORDER};font-size:14px;line-height:20px;color:${COLOR_INK};">
        <strong>${escapeHtml(l.title)}</strong><br />
        <span style="color:${COLOR_TEXT_SOFT};font-size:12px;">${escapeHtml(l.bundleLabel)} &middot; Qty ${l.qty}</span>
      </td>
      <td align="right" style="padding:12px 0;border-bottom:1px solid ${COLOR_BORDER};font-size:14px;color:${COLOR_INK};font-weight:700;white-space:nowrap;vertical-align:top;">
        ${fmtMoney(Number(l.unitCents) * l.qty)}
      </td>
    </tr>
  `).join('');

  const discountRow = Number(d.discountCents) > 0 ? `
    <tr>
      <td style="padding:6px 0;font-size:13px;color:#1A8B3F;">Discount${d.discountCode ? ` (${escapeHtml(d.discountCode)})` : ''}</td>
      <td align="right" style="padding:6px 0;font-size:13px;color:#1A8B3F;font-weight:700;">-${fmtMoney(d.discountCents)}</td>
    </tr>
  ` : '';

  const body = `
    ${headline(`Thanks, ${firstName}`)}
    <p style="margin:0 0 22px 0;font-size:15px;line-height:23px;color:${COLOR_TEXT_SOFT};">
      Your order is in. We&rsquo;ll send you a tracking link the moment it ships from our Dallas facility &mdash; usually within 24 hours.
    </p>

    <!-- Order ref -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:20px;background-color:${COLOR_CREAM};border-radius:10px;">
      <tr>
        <td style="padding:14px 18px;font-size:12px;line-height:18px;color:${COLOR_TEXT_SOFT};">
          <strong style="color:${COLOR_INK};">Order reference</strong><br />
          <span style="font-family:${MONO};font-size:13px;color:${COLOR_INK};">${escapeHtml(d.paypalOrderId)}</span>
        </td>
      </tr>
    </table>

    ${ctaButton('Track your order', d.lookupUrl)}

    <!-- Line items -->
    <h3 style="margin:30px 0 8px 0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-weight:700;color:${COLOR_TEXT_SOFT};font-family:${SANS};">— What ships</h3>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      ${lineRows}
    </table>

    <!-- Totals -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:14px;">
      <tr><td style="padding:4px 0;font-size:13px;color:${COLOR_TEXT_SOFT};">Subtotal</td><td align="right" style="padding:4px 0;font-size:13px;color:${COLOR_INK};">${fmtMoney(d.subtotalCents)}</td></tr>
      ${discountRow}
      <tr><td style="padding:4px 0;font-size:13px;color:${COLOR_TEXT_SOFT};">Shipping</td><td align="right" style="padding:4px 0;font-size:13px;color:${COLOR_INK};">${Number(d.shippingCents) === 0 ? 'Free' : fmtMoney(d.shippingCents)}</td></tr>
      <tr><td style="padding:10px 0 4px 0;font-size:15px;font-weight:700;color:${COLOR_INK};border-top:1px solid ${COLOR_BORDER};">Total</td><td align="right" style="padding:10px 0 4px 0;font-size:18px;font-weight:900;color:${COLOR_INK};border-top:1px solid ${COLOR_BORDER};">${fmtMoney(d.totalCents)}</td></tr>
    </table>

    <!-- Ship to -->
    <h3 style="margin:28px 0 6px 0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-weight:700;color:${COLOR_TEXT_SOFT};font-family:${SANS};">— Ships to</h3>
    <p style="margin:0;font-size:13px;line-height:19px;color:${COLOR_INK};">
      ${escapeHtml(d.shippingFullName)}<br />
      ${escapeHtml(d.shippingLine1)}${d.shippingLine2 ? `<br />${escapeHtml(d.shippingLine2)}` : ''}<br />
      ${escapeHtml(d.shippingCity)}, ${escapeHtml(d.shippingState)} ${escapeHtml(d.shippingZip)}
    </p>

    <!-- What's next -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:28px;background-color:${COLOR_CREAM};border-radius:10px;">
      <tr>
        <td style="padding:18px;font-size:13px;line-height:20px;color:${COLOR_TEXT_SOFT};">
          <strong style="color:${COLOR_INK};">Next:</strong> Our pharmacist signs off on every lot before release. You&rsquo;ll get a tracking link within 24 hours and your CoA (Certificate of Analysis) attached when it ships.
        </td>
      </tr>
    </table>
  `;

  const text = `Order confirmed — Merit Sciences

Hi ${firstName},

Your order is in. We'll send a tracking link the moment it ships from Dallas (usually within 24 hours).

Order reference: ${d.paypalOrderId}

Track your order: ${d.lookupUrl}

Total: ${fmtMoney(d.totalCents)}
Ships to: ${d.shippingFullName}, ${d.shippingLine1}, ${d.shippingCity}, ${d.shippingState} ${d.shippingZip}

— Merit Sciences`;

  return {
    subject: `Order confirmed — ${d.paypalOrderId}`,
    html: shell({
      preheader: `Your order is in. We'll send tracking within 24 hours. Total ${fmtMoney(d.totalCents)}.`,
      eyebrow: 'Order confirmed',
      body,
    }),
    text,
  };
}

/* ─── Shipment notification ─── */

export type ShipmentData = {
  customerName: string;
  paypalOrderId: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string | null;
  estimatedDeliveryAt?: Date | null;
  lookupUrl: string;
};

export function renderShipmentNotification(d: ShipmentData): { subject: string; html: string; text: string } {
  const firstName = d.customerName.split(/\s+/)[0] || 'there';
  const eta = d.estimatedDeliveryAt
    ? d.estimatedDeliveryAt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : null;

  const body = `
    ${headline('On the way')}
    <p style="margin:0 0 22px 0;font-size:15px;line-height:23px;color:${COLOR_TEXT_SOFT};">
      ${firstName}, your order shipped from Dallas. Track it below.
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:18px;background-color:${COLOR_CREAM};border-radius:10px;">
      <tr>
        <td style="padding:18px;">
          <p style="margin:0 0 4px 0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;color:${COLOR_TEXT_SOFT};">Carrier</p>
          <p style="margin:0 0 14px 0;font-size:15px;color:${COLOR_INK};font-weight:700;">${escapeHtml(d.carrier.toUpperCase())}</p>
          <p style="margin:0 0 4px 0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;color:${COLOR_TEXT_SOFT};">Tracking number</p>
          <p style="margin:0;font-size:15px;color:${COLOR_INK};font-family:${MONO};">${escapeHtml(d.trackingNumber)}</p>
          ${eta ? `<p style="margin:14px 0 0 0;font-size:13px;color:${COLOR_TEXT_SOFT};">Estimated delivery: <strong style="color:${COLOR_INK};">${escapeHtml(eta)}</strong></p>` : ''}
        </td>
      </tr>
    </table>

    ${d.trackingUrl ? ctaButton('Track package', d.trackingUrl) : ''}
    <p style="margin:18px 0 0 0;font-size:13px;color:${COLOR_TEXT_SOFT};line-height:19px;">
      Order reference: <span style="font-family:${MONO};color:${COLOR_INK};">${escapeHtml(d.paypalOrderId)}</span>
    </p>
    <p style="margin:18px 0 0 0;font-size:13px;color:${COLOR_TEXT_SOFT};">
      <a href="${escapeHtml(d.lookupUrl)}" style="color:${COLOR_COBALT};text-decoration:none;font-weight:700;">View order details &rarr;</a>
    </p>
  `;

  const text = `Your order is on the way

Hi ${firstName},

Your order shipped from Dallas.

Carrier: ${d.carrier.toUpperCase()}
Tracking: ${d.trackingNumber}
${eta ? `Estimated delivery: ${eta}` : ''}
${d.trackingUrl ? `Track: ${d.trackingUrl}` : ''}

Order: ${d.paypalOrderId}
Details: ${d.lookupUrl}

— Merit Sciences`;

  return {
    subject: `On the way — ${d.paypalOrderId}`,
    html: shell({
      preheader: `${d.carrier.toUpperCase()} ${d.trackingNumber}. ${eta ? `Arrives ${eta}.` : ''}`,
      eyebrow: 'Shipment',
      body,
    }),
    text,
  };
}

/* ─── Order lookup magic link ─── */

export type LookupLinkData = {
  email: string;
  paypalOrderId: string;
  lookupUrl: string;
};

export function renderOrderLookupLink(d: LookupLinkData): { subject: string; html: string; text: string } {
  const body = `
    ${headline('View your order')}
    <p style="margin:0 0 22px 0;font-size:15px;line-height:23px;color:${COLOR_TEXT_SOFT};">
      Someone (hopefully you) requested a link to view order <span style="font-family:${MONO};color:${COLOR_INK};">${escapeHtml(d.paypalOrderId)}</span>. Tap the button below &mdash; this link expires in 24 hours.
    </p>

    ${ctaButton('View order details', d.lookupUrl)}

    <p style="margin:24px 0 0 0;font-size:12px;line-height:18px;color:${COLOR_TEXT_SOFT};">
      Didn&rsquo;t request this? You can safely ignore this email.
    </p>
  `;

  const text = `View your Merit Sciences order

Tap to view order ${d.paypalOrderId}: ${d.lookupUrl}

Expires in 24 hours.`;

  return {
    subject: `View your Merit Sciences order — ${d.paypalOrderId}`,
    html: shell({
      preheader: `View order ${d.paypalOrderId}. Link expires in 24 hours.`,
      eyebrow: 'Order lookup',
      body,
    }),
    text,
  };
}

/* ─── Refund issued (full or partial) ─── */

export type RefundData = {
  customerName: string;
  paypalOrderId: string;
  refundedCents: number | bigint;
  totalCents: number | bigint;     // original order total (for context)
  isFull: boolean;                  // true = full refund, false = partial
  reason?: string | null;           // optional admin-entered note
  lookupUrl: string;
};

export function renderRefundIssued(d: RefundData): { subject: string; html: string; text: string } {
  const firstName = d.customerName.split(/\s+/)[0] || 'there';
  const refundedMoney = fmtMoney(d.refundedCents);
  const totalMoney = fmtMoney(d.totalCents);
  const eyebrow = d.isFull ? 'Refund issued' : 'Partial refund issued';
  const headlineText = d.isFull ? 'Refund on its way' : 'Partial refund on its way';

  const body = `
    ${headline(headlineText)}
    <p style="margin:0 0 22px 0;font-size:15px;line-height:23px;color:${COLOR_TEXT_SOFT};">
      ${firstName}, we issued ${d.isFull ? 'a full refund' : `a partial refund of <strong style="color:${COLOR_INK};">${refundedMoney}</strong>`} on order <span style="font-family:${MONO};color:${COLOR_INK};">${escapeHtml(d.paypalOrderId)}</span>.
    </p>

    <!-- Amount panel -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:22px;background-color:${COLOR_CREAM};border-radius:10px;">
      <tr>
        <td style="padding:20px;">
          <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;color:${COLOR_TEXT_SOFT};">Refund amount</p>
          <p style="margin:0;font-size:32px;line-height:36px;font-weight:900;letter-spacing:-0.02em;color:${COLOR_INK};font-family:${SANS};">
            ${refundedMoney}
          </p>
          ${!d.isFull ? `<p style="margin:8px 0 0 0;font-size:12px;color:${COLOR_TEXT_SOFT};">of ${totalMoney} order total</p>` : ''}
        </td>
      </tr>
    </table>

    ${d.reason ? `
      <h3 style="margin:0 0 8px 0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-weight:700;color:${COLOR_TEXT_SOFT};font-family:${SANS};">— Note from Merit</h3>
      <p style="margin:0 0 22px 0;font-size:14px;line-height:21px;color:${COLOR_INK};">${escapeHtml(d.reason)}</p>
    ` : ''}

    <!-- What's next -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;border:1px solid ${COLOR_BORDER};border-radius:10px;">
      <tr>
        <td style="padding:18px;font-size:13px;line-height:20px;color:${COLOR_TEXT_SOFT};">
          <strong style="color:${COLOR_INK};">Money returns to your original payment method</strong> in 5&ndash;10 business days. The same card or PayPal account used at checkout will receive it.
        </td>
      </tr>
    </table>

    ${ctaButton('View order details', d.lookupUrl)}

    <p style="margin:24px 0 0 0;font-size:13px;line-height:20px;color:${COLOR_TEXT_SOFT};">
      Questions? Reply to this email or write us at <a href="mailto:info@meritsciences.com" style="color:${COLOR_COBALT};text-decoration:none;font-weight:700;">info@meritsciences.com</a>.
    </p>
  `;

  const text = `${headlineText} — Merit Sciences

Hi ${firstName},

We issued ${d.isFull ? 'a full refund' : `a partial refund of ${refundedMoney}`} on order ${d.paypalOrderId}.

Refund amount: ${refundedMoney}${!d.isFull ? ` (of ${totalMoney} total)` : ''}
${d.reason ? `Note: ${d.reason}\n` : ''}
Money returns to your original payment method in 5-10 business days.

Order details: ${d.lookupUrl}

Questions? info@meritsciences.com

— Merit Sciences`;

  return {
    subject: d.isFull
      ? `Refund issued — ${refundedMoney} — ${d.paypalOrderId}`
      : `Partial refund — ${refundedMoney} — ${d.paypalOrderId}`,
    html: shell({
      preheader: `${d.isFull ? 'Full' : 'Partial'} refund of ${refundedMoney} on its way. Returns in 5-10 business days.`,
      eyebrow,
      body,
    }),
    text,
  };
}

/* ─── Order canceled ─── */

export type CancellationData = {
  customerName: string;
  paypalOrderId: string;
  reason?: string | null;
  wasPaid: boolean;                 // true if money was charged + will be refunded
  lookupUrl: string;
};

export function renderOrderCanceled(d: CancellationData): { subject: string; html: string; text: string } {
  const firstName = d.customerName.split(/\s+/)[0] || 'there';

  const body = `
    ${headline('Order canceled')}
    <p style="margin:0 0 22px 0;font-size:15px;line-height:23px;color:${COLOR_TEXT_SOFT};">
      ${firstName}, we canceled order <span style="font-family:${MONO};color:${COLOR_INK};">${escapeHtml(d.paypalOrderId)}</span>. ${d.wasPaid ? 'A full refund will arrive separately.' : 'No charge was made.'}
    </p>

    ${d.reason ? `
      <h3 style="margin:0 0 8px 0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-weight:700;color:${COLOR_TEXT_SOFT};font-family:${SANS};">— Reason</h3>
      <p style="margin:0 0 22px 0;font-size:14px;line-height:21px;color:${COLOR_INK};">${escapeHtml(d.reason)}</p>
    ` : ''}

    ${d.wasPaid ? `
      <!-- Refund context -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;background-color:${COLOR_CREAM};border-radius:10px;">
        <tr>
          <td style="padding:18px;font-size:13px;line-height:20px;color:${COLOR_TEXT_SOFT};">
            <strong style="color:${COLOR_INK};">Your refund is on its way.</strong> Money returns to your original payment method in 5&ndash;10 business days &mdash; same card or PayPal account used at checkout.
          </td>
        </tr>
      </table>
    ` : ''}

    ${ctaButton('Browse the catalog', 'https://merit-sciences.onrender.com/catalog')}

    <p style="margin:24px 0 0 0;font-size:13px;line-height:20px;color:${COLOR_TEXT_SOFT};">
      If this cancellation was unexpected or you&rsquo;d like to place a new order, reply to this email or write us at <a href="mailto:info@meritsciences.com" style="color:${COLOR_COBALT};text-decoration:none;font-weight:700;">info@meritsciences.com</a> &mdash; we&rsquo;re happy to help.
    </p>
  `;

  const text = `Order canceled — Merit Sciences

Hi ${firstName},

We canceled order ${d.paypalOrderId}.
${d.wasPaid ? 'A full refund will arrive in 5-10 business days to your original payment method.\n' : 'No charge was made.\n'}
${d.reason ? `Reason: ${d.reason}\n` : ''}
Browse the catalog: https://merit-sciences.onrender.com/catalog

Questions? info@meritsciences.com

— Merit Sciences`;

  return {
    subject: `Order canceled — ${d.paypalOrderId}`,
    html: shell({
      preheader: `Order ${d.paypalOrderId} canceled. ${d.wasPaid ? 'Refund in 5-10 days.' : 'No charge made.'}`,
      eyebrow: 'Order canceled',
      body,
    }),
    text,
  };
}

/* ─── Abandoned cart recovery ─── */

export type AbandonedCartData = {
  customerName: string;             // may be empty; we fall back to "there"
  lines: Array<{
    title: string;
    bundleLabel: string;
    qty: number;
    unitCents: number | bigint;
    imageUrl?: string | null;
  }>;
  subtotalCents: number | bigint;
  recoveryUrl: string;              // back to checkout with cart prefilled
  discountCode?: string | null;     // optional incentive (e.g. WELCOME10)
  discountPercent?: number | null;  // 10 for 10%
};

export function renderAbandonedCart(d: AbandonedCartData): { subject: string; html: string; text: string } {
  const firstName = (d.customerName || '').split(/\s+/)[0] || 'there';

  const lineRows = d.lines.map((l) => `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid ${COLOR_BORDER};font-size:14px;line-height:20px;color:${COLOR_INK};vertical-align:top;">
        <strong>${escapeHtml(l.title)}</strong><br />
        <span style="color:${COLOR_TEXT_SOFT};font-size:12px;">${escapeHtml(l.bundleLabel)} &middot; Qty ${l.qty}</span>
      </td>
      <td align="right" style="padding:14px 0;border-bottom:1px solid ${COLOR_BORDER};font-size:14px;color:${COLOR_INK};font-weight:700;white-space:nowrap;vertical-align:top;">
        ${fmtMoney(Number(l.unitCents) * l.qty)}
      </td>
    </tr>
  `).join('');

  const incentive = d.discountCode && d.discountPercent ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;background-color:${COLOR_INK};border-radius:10px;">
      <tr>
        <td style="padding:24px;text-align:center;">
          <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;font-weight:700;color:${COLOR_COBALT_SOFT};">A small nudge</p>
          <p style="margin:0 0 8px 0;font-size:24px;line-height:28px;font-weight:900;letter-spacing:-0.02em;color:#ffffff;font-family:${SANS};">${d.discountPercent}% off if you finish today</p>
          <p style="margin:0 0 4px 0;font-size:11px;color:${COLOR_COBALT_SOFT};">Apply code at checkout</p>
          <p style="margin:0;font-family:${MONO};font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.08em;">${escapeHtml(d.discountCode.toUpperCase())}</p>
        </td>
      </tr>
    </table>
  ` : '';

  const body = `
    ${headline('Still thinking?', false)}
    <p style="margin:0 0 22px 0;font-size:15px;line-height:23px;color:${COLOR_TEXT_SOFT};">
      ${firstName}, your selections are waiting at Merit. We held them for you &mdash; same lots, same purity, same price${d.discountCode ? '&hellip; plus a small thank-you below' : ''}.
    </p>

    <h3 style="margin:0 0 6px 0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-weight:700;color:${COLOR_TEXT_SOFT};font-family:${SANS};">— Your cart</h3>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      ${lineRows}
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:10px;margin-bottom:24px;">
      <tr>
        <td style="padding:10px 0 0 0;font-size:15px;font-weight:900;letter-spacing:-0.01em;color:${COLOR_INK};">Subtotal</td>
        <td align="right" style="padding:10px 0 0 0;font-size:18px;font-weight:900;color:${COLOR_INK};">${fmtMoney(d.subtotalCents)}</td>
      </tr>
    </table>

    ${incentive}

    ${ctaButton('Complete your order', d.recoveryUrl)}

    <!-- Trust block -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:28px;background-color:${COLOR_CREAM};border-radius:10px;">
      <tr>
        <td style="padding:18px;font-size:12px;line-height:18px;color:${COLOR_TEXT_SOFT};">
          <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;color:${COLOR_INK};">— Why Merit</p>
          &ge;99% HPLC-verified purity &middot; 503B outsourcing facility, ISO-certified &middot; Lot-documented &middot; Ships 48hr from Dallas
        </td>
      </tr>
    </table>
  `;

  const text = `Still thinking? Your cart is waiting at Merit.

Hi ${firstName},

We held your selections — same lots, same purity, same price.

${d.lines.map((l) => `  · ${l.title} · ${l.bundleLabel} · Qty ${l.qty} · ${fmtMoney(Number(l.unitCents) * l.qty)}`).join('\n')}

Subtotal: ${fmtMoney(d.subtotalCents)}

${d.discountCode && d.discountPercent ? `Use code ${d.discountCode.toUpperCase()} for ${d.discountPercent}% off today.\n` : ''}
Complete your order: ${d.recoveryUrl}

— Merit Sciences`;

  return {
    subject: d.discountCode
      ? `Still thinking? ${d.discountPercent}% off today.`
      : 'Your selections are still at Merit',
    html: shell({
      preheader: `Your cart is waiting. ${d.discountCode ? `${d.discountPercent}% off today with ${d.discountCode.toUpperCase()}.` : 'Same lots, same purity, same price.'}`,
      eyebrow: 'Cart reminder',
      body,
    }),
    text,
  };
}

/* ─── Welcome / newsletter signup ─── */

export type WelcomeData = {
  firstName?: string | null;
  discountCode?: string | null;
  discountPercent?: number | null;
  catalogUrl: string;
};

export function renderWelcome(d: WelcomeData): { subject: string; html: string; text: string } {
  const name = (d.firstName || 'there').trim();

  const incentive = d.discountCode && d.discountPercent ? `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px 0;background-color:${COLOR_INK};border-radius:10px;">
      <tr>
        <td style="padding:28px;text-align:center;">
          <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;font-weight:700;color:${COLOR_COBALT_SOFT};">— Welcome gift</p>
          <p style="margin:0 0 10px 0;font-size:28px;line-height:32px;font-weight:900;letter-spacing:-0.02em;color:#ffffff;font-family:${SANS};">${d.discountPercent}% off your first order</p>
          <p style="margin:0 0 4px 0;font-size:11px;color:${COLOR_COBALT_SOFT};">Apply at checkout</p>
          <p style="margin:0;font-family:${MONO};font-size:20px;font-weight:700;color:#ffffff;letter-spacing:0.08em;">${escapeHtml(d.discountCode.toUpperCase())}</p>
        </td>
      </tr>
    </table>
  ` : '';

  const body = `
    ${headline(`Welcome, ${name}`)}
    <p style="margin:0 0 22px 0;font-size:15px;line-height:23px;color:${COLOR_TEXT_SOFT};">
      You&rsquo;re in. Merit is built on a simple premise: pharmacy-grade research compounds shouldn&rsquo;t cost pharmacy prices. Every lot we ship is HPLC-verified to &ge;99% purity, compounded in a 503B outsourcing facility with ISO certifications, and signed off by a US-licensed pharmacist before release.
    </p>

    ${incentive}

    <h3 style="margin:0 0 8px 0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-weight:700;color:${COLOR_TEXT_SOFT};font-family:${SANS};">— Where to start</h3>
    <p style="margin:0 0 22px 0;font-size:14px;line-height:21px;color:${COLOR_INK};">
      Browse the catalog, or jump straight to one of our most-shopped lanes:<br />
      &middot; <a href="https://merit-sciences.onrender.com/catalog?family=peptides" style="color:${COLOR_COBALT};text-decoration:none;font-weight:700;">Peptides</a> (BPC-157, TB-500, Wolverine Blend)<br />
      &middot; <a href="https://merit-sciences.onrender.com/catalog?family=glp1" style="color:${COLOR_COBALT};text-decoration:none;font-weight:700;">GLP-1s</a> (Tirzepatide, Retatrutide)<br />
      &middot; <a href="https://merit-sciences.onrender.com/catalog?family=growth" style="color:${COLOR_COBALT};text-decoration:none;font-weight:700;">Growth</a> (IGF-1 LR3, Sermorelin, MOTS-c)
    </p>

    ${ctaButton('Explore the catalog', d.catalogUrl)}

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:28px;background-color:${COLOR_CREAM};border-radius:10px;">
      <tr>
        <td style="padding:18px;font-size:13px;line-height:20px;color:${COLOR_TEXT_SOFT};">
          <strong style="color:${COLOR_INK};">A note on what we are.</strong> Merit ships research compounds &mdash; intended for laboratory use only, not for human or veterinary consumption. We don&rsquo;t do dosing protocols, medical advice, or human-outcome claims. We just ship clean lots, on time, at fair prices.
        </td>
      </tr>
    </table>
  `;

  const text = `Welcome to Merit Sciences

Hi ${name},

You're in. Merit is built on a simple premise: pharmacy-grade research compounds shouldn't cost pharmacy prices.

Every lot we ship:
  · HPLC-verified ≥99% purity
  · Compounded in a 503B outsourcing facility (ISO-certified)
  · Signed off by a US-licensed pharmacist
  · Ships 48hr from Dallas

${d.discountCode && d.discountPercent ? `Welcome gift: ${d.discountPercent}% off your first order with code ${d.discountCode.toUpperCase()}\n` : ''}
Explore the catalog: ${d.catalogUrl}

— Merit Sciences

Research compounds for laboratory use only. Not for human or veterinary consumption.`;

  return {
    subject: d.discountCode
      ? `Welcome to Merit — ${d.discountPercent}% off inside`
      : 'Welcome to Merit Sciences',
    html: shell({
      preheader: d.discountCode
        ? `${d.discountPercent}% off your first order with code ${d.discountCode.toUpperCase()}.`
        : 'Pharmacy-grade. Not pharmacy-priced. Welcome to Merit.',
      eyebrow: 'Welcome',
      body,
    }),
    text,
  };
}

/* ─── Post-delivery follow-up ─── */

export type PostDeliveryData = {
  customerName: string;
  paypalOrderId: string;
  primaryProductTitle: string;      // first item in the order, for personalization
  lookupUrl: string;
  catalogUrl: string;
};

export function renderPostDeliveryFollowUp(d: PostDeliveryData): { subject: string; html: string; text: string } {
  const firstName = d.customerName.split(/\s+/)[0] || 'there';

  const body = `
    ${headline('Arrived?')}
    <p style="margin:0 0 22px 0;font-size:15px;line-height:23px;color:${COLOR_TEXT_SOFT};">
      ${firstName}, your <strong style="color:${COLOR_INK};">${escapeHtml(d.primaryProductTitle)}</strong> shipment should have landed by now. We wanted to check in.
    </p>

    <!-- Honest CTA strip -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;border:1px solid ${COLOR_BORDER};border-radius:10px;">
      <tr>
        <td style="padding:20px;font-size:14px;line-height:21px;color:${COLOR_INK};">
          <p style="margin:0 0 12px 0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-weight:700;color:${COLOR_TEXT_SOFT};">— A few things we&rsquo;ll do for you</p>
          <p style="margin:0 0 8px 0;">
            &middot; Re-share the <strong>Certificate of Analysis</strong> for this lot &mdash; reply with "CoA" and we&rsquo;ll send the PDF.
          </p>
          <p style="margin:0 0 8px 0;">
            &middot; Help with <strong>reconstitution math</strong> if you&rsquo;re working through it &mdash; reply with your vial size + target.
          </p>
          <p style="margin:0;">
            &middot; Anything looking off? Reply and we&rsquo;ll make it right.
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 22px 0;font-size:14px;line-height:21px;color:${COLOR_TEXT_SOFT};">
      We don&rsquo;t do dosing advice or human-outcome claims &mdash; refer to your own literature. We just make sure the compound itself is exactly what the label says.
    </p>

    ${ctaButton('Browse related compounds', d.catalogUrl)}

    <p style="margin:24px 0 0 0;font-size:13px;line-height:20px;color:${COLOR_TEXT_SOFT};">
      Order reference: <span style="font-family:${MONO};color:${COLOR_INK};">${escapeHtml(d.paypalOrderId)}</span>
      &nbsp;&middot;&nbsp;
      <a href="${escapeHtml(d.lookupUrl)}" style="color:${COLOR_COBALT};text-decoration:none;font-weight:700;">View details</a>
    </p>
  `;

  const text = `How's your Merit lot? — Merit Sciences

Hi ${firstName},

Your ${d.primaryProductTitle} shipment should have arrived. Checking in.

If you need:
  · The Certificate of Analysis (CoA) re-sent — reply "CoA"
  · Help with reconstitution math — reply with vial size + target
  · Anything looking off — reply and we'll make it right

We don't do dosing advice or human-outcome claims. We just ship clean lots.

Order: ${d.paypalOrderId}
Details: ${d.lookupUrl}

Browse related: ${d.catalogUrl}

— Merit Sciences`;

  return {
    subject: `How's your ${d.primaryProductTitle} lot?`,
    html: shell({
      preheader: `Quick check-in on your ${d.primaryProductTitle} order. Reply if you need CoA, reconstitution help, or anything else.`,
      eyebrow: 'Follow-up',
      body,
    }),
    text,
  };
}
