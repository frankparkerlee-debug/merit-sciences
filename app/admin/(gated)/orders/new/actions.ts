'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-session';
import { validateDiscountCode } from '@/lib/discount';

export type ManualOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string };

export async function createManualOrder(
  _prev: ManualOrderResult | null,
  formData: FormData,
): Promise<ManualOrderResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: 'Unauthorized' };

  // ── Customer ──────────────────────────────────────────────────────
  const customerName = String(formData.get('customerName') ?? '').trim();
  const customerEmail = String(formData.get('customerEmail') ?? '').trim().toLowerCase();
  const customerPhone = String(formData.get('customerPhone') ?? '').trim() || null;

  if (!customerName) return { ok: false, error: 'Customer name is required.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return { ok: false, error: 'Valid customer email is required.' };
  }

  // ── Shipping address ──────────────────────────────────────────────
  const shippingFullName = String(formData.get('shippingFullName') ?? '').trim() || customerName;
  const shippingLine1 = String(formData.get('shippingLine1') ?? '').trim();
  const shippingLine2 = String(formData.get('shippingLine2') ?? '').trim() || null;
  const shippingCity = String(formData.get('shippingCity') ?? '').trim();
  const shippingState = String(formData.get('shippingState') ?? '').trim().toUpperCase();
  const shippingZip = String(formData.get('shippingZip') ?? '').trim();
  const shippingCountry = String(formData.get('shippingCountry') ?? 'US').trim().toUpperCase() || 'US';

  if (!shippingLine1) return { ok: false, error: 'Shipping address line 1 is required.' };
  if (!shippingCity) return { ok: false, error: 'Shipping city is required.' };
  if (!/^[A-Z]{2}$/.test(shippingState)) return { ok: false, error: 'State must be a 2-letter code (e.g. TX).' };
  if (!shippingZip) return { ok: false, error: 'ZIP code is required.' };

  // ── Line items ────────────────────────────────────────────────────
  // Sent as JSON string from the client form
  const linesRaw = String(formData.get('lines') ?? '[]');
  let lines: Array<{
    handle: string;
    title: string;
    bundleLabel: string;
    unitCents: number;
    qty: number;
  }>;
  try {
    lines = JSON.parse(linesRaw);
  } catch {
    return { ok: false, error: 'Invalid line items.' };
  }

  if (!Array.isArray(lines) || lines.length === 0) {
    return { ok: false, error: 'At least one line item is required.' };
  }

  for (const line of lines) {
    if (!line.handle || !line.title || !line.unitCents || !line.qty) {
      return { ok: false, error: 'Each line item needs a product, price, and quantity.' };
    }
    if (line.unitCents < 0 || line.qty < 1) {
      return { ok: false, error: 'Line item prices and quantities must be positive.' };
    }
  }

  // ── Pricing ───────────────────────────────────────────────────────
  const subtotalCents = lines.reduce((sum, l) => sum + l.unitCents * l.qty, 0);
  const shippingCentsInput = String(formData.get('shippingCents') ?? '0').trim();
  const shippingCents = Math.max(0, Math.round(parseFloat(shippingCentsInput || '0') * 100));

  // Optional discount code
  const discountCodeInput = String(formData.get('discountCode') ?? '').trim();
  let discountCents = 0;
  let discountCode: string | null = null;

  if (discountCodeInput) {
    // Per-product line subtotals so product-specific codes (e.g. game rewards)
    // discount only their target product's lines.
    const lineSubtotalsByHandle: Record<string, number> = {};
    for (const l of lines) {
      if (!l.handle) continue;
      lineSubtotalsByHandle[l.handle] =
        (lineSubtotalsByHandle[l.handle] ?? 0) + l.unitCents * l.qty;
    }
    const v = await validateDiscountCode(discountCodeInput, {
      subtotalCents,
      buyerEmail: customerEmail,
      lineSubtotalsByHandle,
    });
    if (!v.ok) return { ok: false, error: `Discount: ${v.error}` };
    discountCents = v.discountCents;
    discountCode = v.code.toUpperCase();
  }

  const totalCents = Math.max(0, subtotalCents - discountCents + shippingCents);

  // ── Order metadata ────────────────────────────────────────────────
  const statusInput = String(formData.get('status') ?? 'PAID').trim();
  const validStatuses = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELED'];
  const status = validStatuses.includes(statusInput) ? statusInput : 'PAID';
  const internalNotes = String(formData.get('internalNotes') ?? '').trim() || null;

  // ── Write to DB ───────────────────────────────────────────────────
  const customer = await prisma.customer.upsert({
    where: { email: customerEmail },
    update: { name: customerName, phone: customerPhone ?? undefined },
    create: { email: customerEmail, name: customerName, phone: customerPhone },
  });

  // Synthetic PayPal order ID for manual orders
  const syntheticOrderId = `manual_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;

  const order = await prisma.order.create({
    data: {
      paypalOrderId: syntheticOrderId,
      customerId: customer.id,
      customerEmail,
      customerName,
      status: status as any,
      subtotalCents: BigInt(subtotalCents),
      shippingCents: BigInt(shippingCents),
      discountCents: BigInt(discountCents),
      totalCents: BigInt(totalCents),
      discountCode,
      shippingFullName,
      shippingLine1,
      shippingLine2,
      shippingCity,
      shippingState,
      shippingZip,
      shippingCountry,
      shippingPhone: customerPhone,
      shippingEmail: customerEmail,
      internalNotes,
      ruoAttested: true,
      ruoAttestedAt: new Date(),
      paidAt: new Date(),
      lines: {
        create: lines.map((l) => ({
          handle: l.handle,
          title: l.title,
          bundleLabel: l.bundleLabel || 'Single',
          unitCents: BigInt(l.unitCents),
          qty: l.qty,
        })),
      },
      events: {
        create: {
          kind: 'ADMIN_COMMENT',
          message: `Manual order created by ${admin.email ?? 'admin'}.`,
          actorEmail: admin.email ?? null,
        },
      },
    },
    select: { id: true },
  });

  redirect(`/admin/orders/${order.id}`);
}
