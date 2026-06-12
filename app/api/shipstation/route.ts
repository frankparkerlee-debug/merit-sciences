import { NextResponse } from 'next/server';
import {
  isShipStationAuthValid,
  exportOrdersXml,
  parseShipStationDate,
  handleShipNotify,
} from '@/lib/shipstation';

export const runtime = 'nodejs';

/**
 * ShipStation Custom Store endpoint.
 *
 * GET  /api/shipstation?action=export&start_date=...&end_date=...&page=N
 *   → returns XML of orders for ShipStation to import
 *
 * POST /api/shipstation
 *   (form data with action=shipnotify, order_number, carrier,
 *    service, tracking_number)
 *   → records the shipment + fires the customer email
 *
 * Auth: HTTP Basic. Set SHIPSTATION_USERNAME + SHIPSTATION_PASSWORD
 * in Render env; ShipStation Config Profile pastes the same values.
 *
 * Polling cadence: ShipStation polls every ~15 minutes by default.
 * Configure how far back it asks for in ShipStation's Custom Store
 * settings (default: last 24 hours).
 */

function unauthorizedXml() {
  return new NextResponse(
    '<?xml version="1.0" encoding="UTF-8"?><Error>Unauthorized</Error>',
    { status: 401, headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
}

export async function GET(req: Request) {
  if (!isShipStationAuthValid(req.headers.get('authorization'))) {
    return unauthorizedXml();
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action');

  if (action !== 'export') {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Error>Invalid action: ${action}</Error>`,
      { status: 400, headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
    );
  }

  // Default date range: last 7 days if unspecified
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const start = parseShipStationDate(url.searchParams.get('start_date')) ?? sevenDaysAgo;
  const end = parseShipStationDate(url.searchParams.get('end_date')) ?? new Date();
  const page = parseInt(url.searchParams.get('page') ?? '1', 10) || 1;

  try {
    const xml = await exportOrdersXml({ start, end, page });
    return new NextResponse(xml, {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
  } catch (err: any) {
    console.error('[shipstation/export] failed', err);
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><Error>${err?.message ?? 'Server error'}</Error>`,
      { status: 500, headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
    );
  }
}

export async function POST(req: Request) {
  if (!isShipStationAuthValid(req.headers.get('authorization'))) {
    return unauthorizedXml();
  }

  const url = new URL(req.url);
  const queryAction = url.searchParams.get('action');

  // ShipStation can send the action in the query string or form body
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return new NextResponse('Bad request', { status: 400 });
  }
  const action = queryAction ?? String(formData.get('action') ?? '');

  if (action !== 'shipnotify') {
    return new NextResponse(`Invalid action: ${action}`, { status: 400 });
  }

  try {
    const result = await handleShipNotify(formData);
    if (!result.ok) {
      return new NextResponse(result.error ?? 'Failed', { status: 400 });
    }
    return new NextResponse('OK', { status: 200 });
  } catch (err: any) {
    console.error('[shipstation/shipnotify] failed', err);
    return new NextResponse(err?.message ?? 'Server error', { status: 500 });
  }
}
