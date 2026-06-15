import { NextResponse } from 'next/server';
import { isShipStationAuthValid, handleDeliveryNotify } from '@/lib/shipstation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * ShipStation delivery webhook.
 *
 * Configured separately from the Custom Store endpoint because
 * ShipStation's Custom Store spec only covers `shipnotify` (label
 * printed) — delivery events ride a different webhook channel.
 *
 * Auth: HTTP Basic with same SHIPSTATION_USERNAME / SHIPSTATION_PASSWORD
 * env vars used by the Custom Store endpoint. Reusing one credential
 * pair keeps operator setup simple.
 *
 * Accepts BOTH JSON body AND query string so the same endpoint works
 * regardless of how ShipStation (or any source) formats the call.
 * Recognized fields:
 *   - tracking_number (preferred — most reliable lookup key)
 *   - order_number    (fallback)
 *   - delivered_at    (optional ISO date or MM/dd/yyyy)
 *
 * Idempotent — re-firing returns 200 OK without double-recording the
 * timeline event.
 */
export async function POST(req: Request) {
  // ── Auth ──
  const auth = req.headers.get('authorization');
  if (!isShipStationAuthValid(auth)) {
    return new NextResponse('Unauthorized', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Merit Sciences"' },
    });
  }

  // ── Pull params from JSON body OR query string ──
  const url = new URL(req.url);
  let body: Record<string, any> = {};
  const contentType = req.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) {
      body = await req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const form = await req.formData();
      for (const [k, v] of form.entries()) body[k] = String(v);
    }
  } catch {
    // Bad body is OK — query string might have what we need
  }

  // Read either snake_case or camelCase keys (different systems use different conventions)
  const trackingNumber =
    String(body.tracking_number ?? body.trackingNumber ?? url.searchParams.get('tracking_number') ?? url.searchParams.get('trackingNumber') ?? '').trim() || null;
  const orderNumber =
    String(body.order_number ?? body.orderNumber ?? url.searchParams.get('order_number') ?? url.searchParams.get('orderNumber') ?? '').trim() || null;
  const deliveredAt =
    String(body.delivered_at ?? body.deliveredAt ?? url.searchParams.get('delivered_at') ?? url.searchParams.get('deliveredAt') ?? '').trim() || null;

  if (!trackingNumber && !orderNumber) {
    return NextResponse.json(
      { ok: false, error: 'tracking_number or order_number required' },
      { status: 400 },
    );
  }

  const result = await handleDeliveryNotify({
    tracking_number: trackingNumber,
    order_number: orderNumber,
    delivered_at: deliveredAt,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 404 });
  }
  return NextResponse.json({ ok: true, orderId: result.orderId });
}

/**
 * GET fallback — same logic via query params. Lets you test the webhook
 * from a browser or curl without crafting a POST body, e.g.:
 *
 *   curl -u merit-store:PASSWORD \
 *     "https://merit-sciences.onrender.com/api/shipstation/delivery-webhook?tracking_number=1Z..."
 */
export async function GET(req: Request) {
  return POST(req);
}
