'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-session';
import { parseCsvWithHeaders } from '../csv-util';
import type { OrderStatus } from '@/lib/generated/prisma/index.js';

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export type ParsedOrder = {
  // External identity from Shopify
  shopifyName: string;            // e.g. "MS#21017" or "#1009"
  // Customer
  customerEmail: string;
  customerName: string;
  // Money (all stored as cents)
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  discountCents: number;
  discountCode: string | null;
  refundedCents: number;
  // Shipping
  shippingFullName: string;
  shippingLine1: string;
  shippingLine2: string | null;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  shippingCountry: string;
  shippingPhone: string | null;
  // Lifecycle
  status: OrderStatus;
  createdAt: Date;
  paidAt: Date | null;
  fulfilledAt: Date | null;
  canceledAt: Date | null;
  // Items
  lines: Array<{
    title: string;
    qty: number;
    unitCents: number;
    sku: string;
  }>;
  // Notes
  paymentMethod: string;
  paymentReference: string | null;
};

export type OrderDiff = {
  rows: Array<{
    order: ParsedOrder;
    action: 'create' | 'skip-exists' | 'skip-invalid';
    reason?: string;
  }>;
  totalOrders: number;
  toCreate: number;
  skipped: number;
};

export async function parseOrdersCsv(_prev: any, formData: FormData): Promise<OrderDiff | { error: string }> {
  const admin = await requireAdmin();
  if (!admin) return { error: 'Unauthorized' };

  const file = formData.get('csv');
  if (!(file instanceof File)) return { error: 'No file uploaded' };
  if (file.size === 0) return { error: 'File is empty' };
  if (file.size > 10 * 1024 * 1024) return { error: 'File too large (max 10MB)' };

  const text = await file.text();
  const rows = parseCsvWithHeaders(text);
  if (rows.length === 0) return { error: 'No data rows found' };

  // Group multi-line orders by Name (first row of each order has all the
  // header fields; subsequent rows are extra line items with empty headers)
  const grouped = new Map<string, Record<string, string>[]>();
  for (const row of rows) {
    const name = (row['Name'] ?? '').trim();
    if (!name) continue;
    if (!grouped.has(name)) grouped.set(name, []);
    grouped.get(name)!.push(row);
  }

  const parsed: ParsedOrder[] = [];
  for (const [name, group] of grouped) {
    const head = group[0]; // first row has the customer + money + shipping info
    const email = (head['Email'] ?? '').trim().toLowerCase();
    if (!email) continue;

    // Collect every line item across all rows for this order
    const lines = group
      .map((r) => ({
        title: (r['Lineitem name'] ?? '').trim(),
        qty: parseInt(r['Lineitem quantity'] ?? '1', 10) || 1,
        unitCents: dollarsToCents(r['Lineitem price']),
        sku: (r['Lineitem sku'] ?? '').trim(),
      }))
      .filter((l) => l.title);

    const status = mapStatus(head['Financial Status'], head['Fulfillment Status'], head['Cancelled at']);

    parsed.push({
      shopifyName: name,
      customerEmail: email,
      customerName: (head['Shipping Name'] ?? head['Billing Name'] ?? '').trim() || email.split('@')[0],
      subtotalCents: dollarsToCents(head['Subtotal']),
      shippingCents: dollarsToCents(head['Shipping']),
      totalCents: dollarsToCents(head['Total']),
      discountCents: dollarsToCents(head['Discount Amount']),
      discountCode: emptyToNull(head['Discount Code']),
      refundedCents: dollarsToCents(head['Refunded Amount']),
      shippingFullName: (head['Shipping Name'] ?? head['Billing Name'] ?? '').trim() || email,
      shippingLine1: (head['Shipping Address1'] ?? head['Billing Address1'] ?? '').trim(),
      shippingLine2: emptyToNull(head['Shipping Address2'] ?? head['Billing Address2']),
      shippingCity: (head['Shipping City'] ?? head['Billing City'] ?? '').trim(),
      shippingState: (head['Shipping Province'] ?? head['Billing Province'] ?? '').trim(),
      shippingZip: (head['Shipping Zip'] ?? head['Billing Zip'] ?? '').trim(),
      shippingCountry: (head['Shipping Country'] ?? head['Billing Country'] ?? 'US').trim(),
      shippingPhone: emptyToNull(head['Shipping Phone'] ?? head['Billing Phone'] ?? head['Phone']),
      status,
      createdAt: new Date(head['Created at'] ?? Date.now()),
      paidAt: head['Paid at'] ? new Date(head['Paid at']) : null,
      fulfilledAt: head['Fulfilled at'] ? new Date(head['Fulfilled at']) : null,
      canceledAt: head['Cancelled at'] ? new Date(head['Cancelled at']) : null,
      lines,
      paymentMethod: (head['Payment Method'] ?? '').trim(),
      paymentReference: emptyToNull(head['Payment Reference']),
    });
  }

  // Skip orders that already exist by paypalOrderId (using shopifyName as the external ref)
  const existing = await prisma.order.findMany({
    where: { paypalOrderId: { in: parsed.map((o) => `shopify:${o.shopifyName}`) } },
    select: { paypalOrderId: true },
  });
  const existingNames = new Set(existing.map((o) => o.paypalOrderId.replace(/^shopify:/, '')));

  const diff: OrderDiff = {
    rows: [],
    totalOrders: parsed.length,
    toCreate: 0,
    skipped: 0,
  };

  for (const order of parsed) {
    if (existingNames.has(order.shopifyName)) {
      diff.rows.push({ order, action: 'skip-exists', reason: 'Already imported' });
      diff.skipped++;
      continue;
    }
    if (!order.shippingLine1 || !order.shippingCity) {
      diff.rows.push({ order, action: 'skip-invalid', reason: 'Missing shipping address' });
      diff.skipped++;
      continue;
    }
    diff.rows.push({ order, action: 'create' });
    diff.toCreate++;
  }

  return diff;
}

export async function applyOrdersCsv(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  const raw = String(formData.get('diff') ?? '');
  if (!raw) return { ok: false, error: 'Missing diff payload' };
  let diff: OrderDiff;
  try {
    diff = JSON.parse(raw) as OrderDiff;
  } catch {
    return { ok: false, error: 'Invalid diff payload' };
  }

  let created = 0;
  let errors = 0;

  for (const r of diff.rows) {
    if (r.action !== 'create') continue;
    try {
      // Find or create Customer
      const customer = await prisma.customer.upsert({
        where: { email: r.order.customerEmail },
        update: { name: r.order.customerName },
        create: { email: r.order.customerEmail, name: r.order.customerName, phone: r.order.shippingPhone },
      });

      // Create Order — use shopify:NAME as the external ref so it won't
      // collide with real PayPal orders (which start with paypal IDs)
      await prisma.order.create({
        data: {
          paypalOrderId: `shopify:${r.order.shopifyName}`,
          customerId: customer.id,
          customerEmail: r.order.customerEmail,
          customerName: r.order.customerName,
          status: r.order.status,
          subtotalCents: BigInt(r.order.subtotalCents),
          shippingCents: BigInt(r.order.shippingCents),
          discountCents: BigInt(r.order.discountCents),
          totalCents: BigInt(r.order.totalCents),
          refundedCents: BigInt(r.order.refundedCents),
          discountCode: r.order.discountCode,
          shippingFullName: r.order.shippingFullName,
          shippingLine1: r.order.shippingLine1,
          shippingLine2: r.order.shippingLine2,
          shippingCity: r.order.shippingCity,
          shippingState: r.order.shippingState,
          shippingZip: r.order.shippingZip,
          shippingCountry: r.order.shippingCountry,
          shippingPhone: r.order.shippingPhone,
          shippingEmail: r.order.customerEmail,
          ruoAttested: true,
          ruoAttestedAt: r.order.createdAt,
          createdAt: r.order.createdAt,
          paidAt: r.order.paidAt ?? r.order.createdAt,
          shippedAt: r.order.fulfilledAt ?? undefined,
          canceledAt: r.order.canceledAt ?? undefined,
          refundedAt: r.order.refundedCents > 0 ? r.order.createdAt : null,
          internalNotes: `Imported from Shopify (${r.order.paymentMethod}, ref ${r.order.paymentReference ?? '—'})`,
          lines: {
            create: r.order.lines.map((l) => ({
              handle: l.sku || '',
              title: l.title,
              bundleLabel: '',
              unitCents: BigInt(l.unitCents),
              qty: l.qty,
            })),
          },
        },
      });

      // Record an event so the timeline reflects historical origin
      const order = await prisma.order.findUnique({
        where: { paypalOrderId: `shopify:${r.order.shopifyName}` },
        select: { id: true },
      });
      if (order) {
        await prisma.orderEvent.create({
          data: {
            orderId: order.id,
            kind: 'ORDER_PLACED',
            message: `Imported from Shopify (${r.order.shopifyName}, ${r.order.paymentMethod}).`,
            metadata: {
              source: 'shopify_csv_import',
              shopify_name: r.order.shopifyName,
              payment_reference: r.order.paymentReference,
            },
            actorEmail: null,
          },
        });
      }
      created++;
    } catch (err) {
      console.error('[order-import] failed', r.order.shopifyName, err);
      errors++;
    }
  }

  revalidatePath('/admin/orders');
  revalidatePath('/admin/customers');
  const errorTail = errors > 0 ? ` ⚠ ${errors} failed (see Render logs).` : '';
  return { ok: true, message: `Imported ${created} order(s).${errorTail}` };
}

/* ─── Helpers ─── */

function mapStatus(financial: string, fulfillment: string, canceledAt: string): OrderStatus {
  const fin = (financial ?? '').toLowerCase();
  const fulf = (fulfillment ?? '').toLowerCase();
  if (canceledAt) return 'CANCELED' as OrderStatus;
  if (fin === 'refunded') return 'REFUNDED' as OrderStatus;
  if (fin === 'partially_refunded') return 'PARTIALLY_REFUNDED' as OrderStatus;
  if (fulf === 'fulfilled') return 'SHIPPED' as OrderStatus;
  if (fin === 'paid') return 'PAID' as OrderStatus;
  return 'PENDING_PAYMENT' as OrderStatus;
}

function dollarsToCents(s: string | undefined | null): number {
  const str = (s ?? '').trim();
  if (!str) return 0;
  const cleaned = str.replace(/[$,\s]/g, '');
  const n = parseFloat(cleaned);
  if (!isFinite(n)) return 0;
  return Math.round(n * 100);
}

function emptyToNull(s: string | undefined | null): string | null {
  const trimmed = (s ?? '').trim();
  return trimmed === '' ? null : trimmed;
}
