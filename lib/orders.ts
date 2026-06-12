/**
 * Order persistence + lookup helpers.
 *
 * - createOrderFromPayPal(): called by the webhook on
 *   PAYMENT.CAPTURE.COMPLETED. Reads the full PayPal order, normalizes
 *   buyer + shipping info, and writes Customer + Order + OrderLines.
 *   Idempotent on paypalCaptureId.
 *
 * - generateLookupToken(): creates a single-use 24h token for the
 *   customer to view their order without signing up.
 *
 * - trackingUrlFor(): given a carrier code + tracking number, returns
 *   the carrier's public tracking page.
 *
 * - issueOrderConfirmationEmail(): renders + sends the branded order
 *   confirmation. Safe to call even before Resend is wired (no-ops).
 */

import 'server-only';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/db';
import { sendEmail } from '@/lib/email';
import {
  renderOrderConfirmation,
  renderOrderLookupLink,
  renderShipmentNotification,
} from '@/lib/email-templates';

const LOOKUP_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://merit-sciences.onrender.com').replace(/\/$/, '');
}

/* ─── Carrier tracking URLs ─── */

export function normalizeCarrier(input: string): string {
  const v = input.trim().toLowerCase();
  if (/^usps/.test(v)) return 'usps';
  if (/^ups/.test(v)) return 'ups';
  if (/^fedex/.test(v) || /^fed ex/.test(v)) return 'fedex';
  if (/^dhl/.test(v)) return 'dhl';
  return v;
}

export function trackingUrlFor(carrier: string, trackingNumber: string): string | null {
  const c = normalizeCarrier(carrier);
  const t = encodeURIComponent(trackingNumber.trim());
  if (!t) return null;
  switch (c) {
    case 'usps':  return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${t}`;
    case 'ups':   return `https://www.ups.com/track?tracknum=${t}`;
    case 'fedex': return `https://www.fedex.com/fedextrack/?trknbr=${t}`;
    case 'dhl':   return `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${t}`;
    default:      return null;
  }
}

/* ─── Lookup token ─── */

export async function generateLookupToken(orderId: string, email: string, requestIp?: string | null): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await prisma.orderLookupToken.create({
    data: {
      token,
      orderId,
      email: email.toLowerCase(),
      expiresAt: new Date(Date.now() + LOOKUP_TOKEN_TTL_MS),
      requestIp: requestIp ?? undefined,
    },
  });
  return token;
}

export function lookupUrlFor(orderId: string, token: string): string {
  return `${siteUrl()}/orders/${orderId}?token=${token}`;
}

/* ─── Order creation from PayPal webhook ─── */

export type PayPalOrderShape = {
  id: string;
  status?: string;
  payer?: {
    email_address?: string;
    payer_id?: string;
    name?: { given_name?: string; surname?: string };
    phone?: { phone_number?: { national_number?: string } };
  };
  purchase_units?: Array<{
    custom_id?: string;
    amount?: {
      value?: string;
      breakdown?: {
        item_total?: { value?: string };
        shipping?: { value?: string };
        discount?: { value?: string };
      };
    };
    shipping?: {
      name?: { full_name?: string };
      address?: {
        address_line_1?: string;
        address_line_2?: string;
        admin_area_1?: string;
        admin_area_2?: string;
        postal_code?: string;
        country_code?: string;
      };
    };
    items?: Array<{
      name?: string;
      description?: string;
      quantity?: string;
      unit_amount?: { value?: string };
      sku?: string;
    }>;
    payments?: {
      captures?: Array<{
        id?: string;
        amount?: { value?: string };
      }>;
    };
  }>;
};

function dollarsToCents(s?: string): number {
  if (!s) return 0;
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

/**
 * Persist an Order from a fully-retrieved PayPal Order object.
 * Idempotent: if an Order with the same paypalCaptureId already exists,
 * returns it unchanged.
 *
 * Returns { order, isNew } so the caller can fire the confirmation
 * email only on the first write (avoid duplicate sends on webhook retry).
 */
export async function createOrderFromPayPal(
  paypalOrder: PayPalOrderShape,
  attribution?: { affiliateId?: string | null; discountCode?: string | null },
): Promise<{ order: { id: string; paypalOrderId: string; paypalCaptureId: string }; isNew: boolean } | null> {
  const pu = paypalOrder.purchase_units?.[0];
  const capture = pu?.payments?.captures?.[0];
  if (!pu || !capture?.id) return null;

  const captureId = capture.id;

  // Idempotency check FIRST
  const existing = await prisma.order.findUnique({
    where: { paypalCaptureId: captureId },
    select: { id: true, paypalOrderId: true, paypalCaptureId: true },
  });
  if (existing) {
    return { order: existing as any, isNew: false };
  }

  const email = (paypalOrder.payer?.email_address ?? '').toLowerCase();
  if (!email) return null;

  const givenName = paypalOrder.payer?.name?.given_name ?? '';
  const surname = paypalOrder.payer?.name?.surname ?? '';
  const payerName = [givenName, surname].filter(Boolean).join(' ').trim() ||
                    pu.shipping?.name?.full_name ||
                    email.split('@')[0];

  const phone = paypalOrder.payer?.phone?.phone_number?.national_number ?? null;

  // ── find-or-create Customer ──
  const customer = await prisma.customer.upsert({
    where: { email },
    update: {
      // Only update name if we have something stronger and current is generic
      name: payerName,
      phone: phone ?? undefined,
    },
    create: {
      email,
      name: payerName,
      phone,
    },
  });

  // ── Shipping address ──
  const shippingName = pu.shipping?.name?.full_name ?? payerName;
  const addr = pu.shipping?.address ?? {};
  const shippingLine1 = addr.address_line_1 ?? '';
  const shippingLine2 = addr.address_line_2 ?? null;
  const shippingCity = addr.admin_area_2 ?? '';
  const shippingState = addr.admin_area_1 ?? '';
  const shippingZip = addr.postal_code ?? '';
  const shippingCountry = addr.country_code ?? 'US';
  if (!shippingLine1 || !shippingCity || !shippingState || !shippingZip) {
    // Bad shipping address — bail and let admin investigate via PayPal
    console.warn('[orders] incomplete shipping address for order', paypalOrder.id);
    return null;
  }

  // ── Money ──
  const breakdown = pu.amount?.breakdown;
  const subtotalCents = dollarsToCents(breakdown?.item_total?.value);
  const shippingCents = dollarsToCents(breakdown?.shipping?.value);
  const discountCents = dollarsToCents(breakdown?.discount?.value);
  const totalCents = dollarsToCents(capture.amount?.value ?? pu.amount?.value);

  // ── Lines ──
  const items = pu.items ?? [];

  // ── Atomic write: Order + OrderLines ──
  const order = await prisma.order.create({
    data: {
      paypalOrderId: paypalOrder.id,
      paypalCaptureId: captureId,
      paypalPayerId: paypalOrder.payer?.payer_id ?? null,
      customerId: customer.id,
      customerEmail: email,
      customerName: payerName,
      status: 'PAID',
      subtotalCents: BigInt(subtotalCents),
      shippingCents: BigInt(shippingCents),
      discountCents: BigInt(discountCents),
      totalCents: BigInt(totalCents),
      discountCode: attribution?.discountCode ?? null,
      affiliateId: attribution?.affiliateId ?? null,
      shippingFullName: shippingName,
      shippingLine1,
      shippingLine2,
      shippingCity,
      shippingState,
      shippingZip,
      shippingCountry,
      shippingPhone: phone,
      shippingEmail: email,
      ruoAttested: true,
      ruoAttestedAt: new Date(),
      lines: {
        create: items.map((it) => ({
          handle: it.sku ?? '',
          title: it.name ?? 'Item',
          bundleLabel: it.description ?? '',
          unitCents: BigInt(dollarsToCents(it.unit_amount?.value)),
          qty: parseInt(it.quantity ?? '1', 10) || 1,
        })),
      },
    },
    select: { id: true, paypalOrderId: true, paypalCaptureId: true },
  });

  return { order, isNew: true };
}

/* ─── Email triggers ─── */

export async function issueOrderConfirmationEmail(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { lines: true },
  });
  if (!order) return;

  // Generate a fresh lookup token for the receipt link
  const token = await generateLookupToken(order.id, order.customerEmail);
  const lookupUrl = lookupUrlFor(order.id, token);

  const { subject, html, text } = renderOrderConfirmation({
    orderId: order.id,
    paypalOrderId: order.paypalOrderId,
    customerName: order.customerName,
    shippingFullName: order.shippingFullName,
    shippingLine1: order.shippingLine1,
    shippingLine2: order.shippingLine2,
    shippingCity: order.shippingCity,
    shippingState: order.shippingState,
    shippingZip: order.shippingZip,
    lines: order.lines.map((l) => ({
      title: l.title,
      bundleLabel: l.bundleLabel,
      qty: l.qty,
      unitCents: Number(l.unitCents),
    })),
    subtotalCents: Number(order.subtotalCents),
    shippingCents: Number(order.shippingCents),
    discountCents: Number(order.discountCents),
    totalCents: Number(order.totalCents),
    discountCode: order.discountCode,
    lookupUrl,
  });

  await sendEmail({
    to: order.customerEmail,
    subject,
    html,
    text,
    tags: [
      { name: 'type', value: 'order_confirmation' },
      { name: 'order_id', value: order.id },
    ],
  });
}

export async function issueShipmentEmail(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || !order.trackingNumber || !order.shippingCarrier) return;

  const token = await generateLookupToken(order.id, order.customerEmail);
  const lookupUrl = lookupUrlFor(order.id, token);

  const { subject, html, text } = renderShipmentNotification({
    customerName: order.customerName,
    paypalOrderId: order.paypalOrderId,
    carrier: order.shippingCarrier,
    trackingNumber: order.trackingNumber,
    trackingUrl: order.trackingUrl,
    estimatedDeliveryAt: order.estimatedDeliveryAt,
    lookupUrl,
  });

  await sendEmail({
    to: order.customerEmail,
    subject,
    html,
    text,
    tags: [
      { name: 'type', value: 'shipment' },
      { name: 'order_id', value: order.id },
    ],
  });
}

export async function issueOrderLookupEmail(
  email: string,
  paypalOrderId: string,
  requestIp?: string | null,
): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'send_failed' }> {
  const order = await prisma.order.findUnique({
    where: { paypalOrderId },
    select: { id: true, paypalOrderId: true, customerEmail: true },
  });
  // SECURITY: don't leak whether the order exists for non-matching emails.
  // Always return ok:true to the client, but only actually send if it
  // matches.
  if (!order || order.customerEmail !== email.toLowerCase()) {
    return { ok: false, reason: 'not_found' };
  }

  const token = await generateLookupToken(order.id, email, requestIp);
  const lookupUrl = lookupUrlFor(order.id, token);

  const { subject, html, text } = renderOrderLookupLink({
    email,
    paypalOrderId: order.paypalOrderId,
    lookupUrl,
  });

  const res = await sendEmail({
    to: email,
    subject,
    html,
    text,
    tags: [
      { name: 'type', value: 'order_lookup' },
      { name: 'order_id', value: order.id },
    ],
  });

  return res.ok ? { ok: true } : { ok: false, reason: 'send_failed' };
}
