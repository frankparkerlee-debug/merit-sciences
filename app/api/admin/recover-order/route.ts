import { NextResponse } from 'next/server';
import { getPayPalOrder } from '@/lib/paypal';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/recover-order?orderId=<paypal order id>
 *
 * Recovery tool for "ghost" wallet orders whose line items were lost (the
 * PayPal-wallet path built the order from the thin capture response, which
 * omits items — so the order landed with 0 lines). The real line items are
 * still on the PayPal ORDER (we sent them at create time), retrievable via
 * GET /v2/checkout/orders/{id} even though PayPal's dashboard shows only the
 * generic "Dietary supplement" descriptor.
 *
 * This reads those items server-side (live PayPal creds) and decodes each
 * line's unit price to a catalog product+bundle. Read-only — it does not
 * write anything.
 *
 * Auth: a signed-in admin (requireAdmin) OR the x-recover-secret header set
 * to CRON_SECRET (so ops/tooling can call it without a session).
 */

// Storefront bundle multipliers (Single / 3-Pack / 6-Pack / Subscribe-10%).
// A line's unit_amount on PayPal equals the cart line's unit price = the
// bundle's total price, so we match unit_amount against these.
const BUNDLES: Array<{ label: string; mult: number }> = [
  { label: 'Single', mult: 1 },
  { label: '3-Pack', mult: 2.85 },
  { label: '6-Pack', mult: 5.4 },
  { label: 'Subscribe & Save 10%', mult: 0.9 },
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = req.headers.get('x-recover-secret');
  const authed = (await requireAdmin()) !== null || (!!secret && secret === process.env.CRON_SECRET);
  if (!authed) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const orderId = url.searchParams.get('orderId')?.trim();
  if (!orderId) {
    return NextResponse.json({ error: 'orderId required' }, { status: 400 });
  }

  let paypalOrder: any;
  try {
    paypalOrder = await getPayPalOrder(orderId);
  } catch (e: any) {
    // 403 here = the live creds don't own this order (captured on another
    // PayPal account). Surface it plainly so we know to switch accounts.
    return NextResponse.json(
      { error: 'paypal_fetch_failed', detail: String(e?.message ?? e) },
      { status: 502 },
    );
  }

  const pu = paypalOrder?.purchase_units?.[0] ?? {};
  const rawItems = (pu.items ?? []) as Array<{
    name?: string; quantity?: string; unit_amount?: { value?: string }; sku?: string;
  }>;
  const breakdown = pu.amount?.breakdown ?? {};

  // Build a unit-price → product+bundle decoder from the live catalog.
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: { handle: true, title: true, vialSize: true, priceCents: true },
  });
  const decode = (unitCents: number) => {
    const hits: Array<{ title: string; vialSize: string | null; bundle: string; handle: string }> = [];
    for (const p of products) {
      for (const b of BUNDLES) {
        if (Math.round(p.priceCents * b.mult) === unitCents) {
          hits.push({ title: p.title, vialSize: p.vialSize, bundle: b.label, handle: p.handle });
        }
      }
    }
    return hits;
  };

  const items = rawItems.map((it) => {
    const unitCents = Math.round(parseFloat(it.unit_amount?.value ?? '0') * 100);
    return {
      unit: it.unit_amount?.value ?? null,
      unitCents,
      qty: Number(it.quantity ?? 1),
      candidates: decode(unitCents),
    };
  });

  return NextResponse.json({
    orderId,
    paypalStatus: paypalOrder.status ?? null,
    payerEmail: paypalOrder.payer?.email_address ?? null,
    breakdown: {
      item_total: breakdown.item_total?.value ?? null,
      discount: breakdown.discount?.value ?? null,
      shipping: breakdown.shipping?.value ?? null,
      total: pu.amount?.value ?? null,
    },
    items,
  });
}
