/**
 * ShipStation Custom Store integration.
 *
 * Pattern: ShipStation polls our endpoint on a schedule (~15 min) to
 * pull new orders. When a label gets printed and the order ships,
 * ShipStation POSTs back to us with the tracking info. We mark the
 * order SHIPPED and fire the customer notification email.
 *
 * Docs: https://www.shipstation.com/docs/integrations/custom-store/
 *
 * Auth: HTTP Basic. We set SHIPSTATION_USERNAME + SHIPSTATION_PASSWORD
 * in env; user pastes the same values into ShipStation's Custom Store
 * config.
 */

import 'server-only';
import { prisma } from '@/lib/db';
import { normalizeCarrier, trackingUrlFor, issueShipmentEmail } from '@/lib/orders';

const PAGE_SIZE = 100;

// ─── Auth ────────────────────────────────────────────────────────────

export function isShipStationAuthValid(authHeader: string | null): boolean {
  const username = process.env.SHIPSTATION_USERNAME;
  const password = process.env.SHIPSTATION_PASSWORD;
  if (!username || !password || !authHeader) return false;
  const expected = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  // Constant-time compare via timingSafeEqual? Overkill for sandbox.
  // Plain comparison is fine — Basic auth's threat model is HTTPS.
  return authHeader === expected;
}

// ─── XML utilities ───────────────────────────────────────────────────

function escapeXml(s: string | null | undefined): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * ShipStation's date format: MM/dd/yyyy HH:mm (Pacific time, but
 * UTC works too — they accept either consistently).
 */
function fmtDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}/${d.getUTCFullYear()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/**
 * Parse ShipStation's MM/dd/yyyy HH:mm date back to a UTC Date.
 * Returns null on parse failure.
 */
export function parseShipStationDate(s: string | null): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})$/);
  if (!m) {
    // Also try ISO format as fallback
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  const [, mm, dd, yyyy, hh, min] = m;
  return new Date(Date.UTC(+yyyy, +mm - 1, +dd, +hh, +min));
}

// ─── Order export ────────────────────────────────────────────────────

/**
 * Build the XML body ShipStation expects when it polls for new orders.
 *
 * We only export orders that are PAID or PROCESSING — once SHIPPED or
 * beyond, ShipStation already has the data and we don't want to
 * re-import (which would create duplicate rows).
 *
 * Date filtering: ShipStation passes start_date / end_date based on
 * the last-modified timestamp of orders. We map that to our
 * processingAt OR paidAt fields (whichever is newer for each order).
 */
export async function exportOrdersXml(opts: {
  start: Date;
  end: Date;
  page: number;
}): Promise<string> {
  const skip = (Math.max(1, opts.page) - 1) * PAGE_SIZE;

  // Match orders whose most-recent state change falls in the date range
  const where = {
    status: { in: ['PAID', 'PROCESSING'] as any },
    OR: [
      { processingAt: { gte: opts.start, lte: opts.end } },
      { AND: [
        { processingAt: null },
        { paidAt: { gte: opts.start, lte: opts.end } },
      ] },
    ],
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { lines: true },
      orderBy: { paidAt: 'asc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.order.count({ where }),
  ]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const orderXmls = orders.map(serializeOrder).join('\n');

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Orders pages="${pages}">
${orderXmls}
</Orders>`;
}

function serializeOrder(o: any): string {
  const items = o.lines.map((l: any) => `      <Item>
        <SKU>${escapeXml(l.handle)}</SKU>
        <Name>${escapeXml(`${l.title} — ${l.bundleLabel}`)}</Name>
        <Quantity>${l.qty}</Quantity>
        <UnitPrice>${(Number(l.unitCents) / 100).toFixed(2)}</UnitPrice>
        <Weight>0</Weight>
        <WeightUnits>Ounces</WeightUnits>
      </Item>`).join('\n');

  // Pack discount + affiliate context into CustomField1 so it shows
  // up in the ShipStation order detail (handy for warehouse notes)
  const customField1 = [
    o.discountCode ? `Code: ${o.discountCode}` : null,
    o.affiliateId ? `Aff: ${o.affiliateId}` : null,
  ].filter(Boolean).join(' · ');

  return `  <Order>
    <OrderID>${escapeXml(o.id)}</OrderID>
    <OrderNumber>${escapeXml(o.paypalOrderId)}</OrderNumber>
    <OrderDate>${fmtDate(o.paidAt ?? o.createdAt)}</OrderDate>
    <OrderStatus>paid</OrderStatus>
    <LastModified>${fmtDate(o.processingAt ?? o.paidAt ?? o.createdAt)}</LastModified>
    <ShippingMethod>Standard Shipping</ShippingMethod>
    <PaymentMethod>PayPal</PaymentMethod>
    <OrderTotal>${(Number(o.totalCents) / 100).toFixed(2)}</OrderTotal>
    <TaxAmount>0.00</TaxAmount>
    <ShippingAmount>${(Number(o.shippingCents) / 100).toFixed(2)}</ShippingAmount>
    <CustomerNotes></CustomerNotes>
    <InternalNotes>${escapeXml(o.internalNotes ?? '')}</InternalNotes>
    <Gift>false</Gift>
    ${customField1 ? `<CustomField1>${escapeXml(customField1)}</CustomField1>` : ''}
    <Customer>
      <CustomerCode>${escapeXml(o.customerEmail)}</CustomerCode>
      <BillTo>
        <Name>${escapeXml(o.customerName)}</Name>
        <Email>${escapeXml(o.customerEmail)}</Email>
      </BillTo>
      <ShipTo>
        <Name>${escapeXml(o.shippingFullName)}</Name>
        <Address1>${escapeXml(o.shippingLine1)}</Address1>
        <Address2>${escapeXml(o.shippingLine2 ?? '')}</Address2>
        <City>${escapeXml(o.shippingCity)}</City>
        <State>${escapeXml(o.shippingState)}</State>
        <PostalCode>${escapeXml(o.shippingZip)}</PostalCode>
        <Country>${escapeXml(o.shippingCountry || 'US')}</Country>
        <Phone>${escapeXml(o.shippingPhone ?? '')}</Phone>
      </ShipTo>
    </Customer>
    <Items>
${items}
    </Items>
  </Order>`;
}

// ─── Shipment notification (ShipStation → us) ────────────────────────

/**
 * Process ShipStation's POST when a label gets printed.
 * Form fields: order_number, carrier, service, tracking_number,
 *              notify_customer, notify_other, [xml=<ShipNotice>]
 *
 * Marks the matching Order as SHIPPED + sets tracking, fires the
 * customer's branded shipment notification email.
 */
export async function handleShipNotify(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const orderNumber = String(formData.get('order_number') ?? '').trim();
  const carrier = String(formData.get('carrier') ?? '').trim();
  const trackingNumber = String(formData.get('tracking_number') ?? '').trim();

  if (!orderNumber) return { ok: false, error: 'order_number required' };
  if (!trackingNumber) return { ok: false, error: 'tracking_number required' };

  // We exported paypalOrderId as OrderNumber, so look up by that
  const order = await prisma.order.findUnique({ where: { paypalOrderId: orderNumber } });
  if (!order) return { ok: false, error: `order not found: ${orderNumber}` };

  // Don't down-grade status if already past SHIPPED
  if (order.status === 'DELIVERED' || order.status === 'REFUNDED' || order.status === 'CANCELED') {
    return { ok: true }; // ack but no-op
  }

  const carrierCode = normalizeCarrier(carrier || 'unknown');
  const trackingUrl = trackingUrlFor(carrierCode, trackingNumber);

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'SHIPPED',
      shippingCarrier: carrierCode,
      trackingNumber,
      trackingUrl,
      shippedAt: new Date(),
    },
  });

  // Fire customer notification email asynchronously
  issueShipmentEmail(order.id).catch((err) => {
    console.error('[shipstation/shipnotify] email failed', err);
  });

  return { ok: true };
}
