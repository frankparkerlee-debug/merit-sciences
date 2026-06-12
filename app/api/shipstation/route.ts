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
 * GET or POST /api/shipstation?action=shipnotify&order_number=...
 *           &carrier=...&service=...&tracking_number=...
 *   → records the shipment + fires the customer email
 *   ShipStation sends shipnotify with all params in the query string
 *   (production behavior). We also accept POST with form body for
 *   future-proofing.
 *
 * Auth: HTTP Basic. Set SHIPSTATION_USERNAME + SHIPSTATION_PASSWORD
 * in Render env; ShipStation Config Profile pastes the same values.
 *
 * Polling cadence: ShipStation polls every ~15 minutes by default.
 */

function unauthorizedXml() {
  return new NextResponse(
    '<?xml version="1.0" encoding="UTF-8"?><Error>Unauthorized</Error>',
    {
      status: 401,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'WWW-Authenticate': 'Basic realm="Merit Sciences"',
      },
    },
  );
}

/**
 * Pull a parameter from either the query string or, if absent, the form
 * body. ShipStation has varied between these over time.
 */
function pullParam(url: URL, form: FormData | null, key: string): string | null {
  const q = url.searchParams.get(key);
  if (q !== null && q !== '') return q;
  if (form) {
    const v = form.get(key);
    if (typeof v === 'string' && v !== '') return v;
  }
  return null;
}

async function handle(req: Request): Promise<Response> {
  if (!isShipStationAuthValid(req.headers.get('authorization'))) {
    return unauthorizedXml();
  }

  const url = new URL(req.url);

  // For POST, also try to read form body for params (ShipStation has
  // varied over time)
  let form: FormData | null = null;
  if (req.method === 'POST') {
    try {
      form = await req.formData();
    } catch {
      // Body may not be form-encoded; that's ok
      form = null;
    }
  }

  const action = pullParam(url, form, 'action');

  // ─── EXPORT ───
  if (action === 'export') {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const start = parseShipStationDate(pullParam(url, form, 'start_date')) ?? sevenDaysAgo;
    const end = parseShipStationDate(pullParam(url, form, 'end_date')) ?? new Date();
    const page = parseInt(pullParam(url, form, 'page') ?? '1', 10) || 1;
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

  // ─── SHIPNOTIFY ───
  if (action === 'shipnotify') {
    try {
      const result = await handleShipNotify({
        order_number: pullParam(url, form, 'order_number'),
        carrier: pullParam(url, form, 'carrier'),
        tracking_number: pullParam(url, form, 'tracking_number'),
        service: pullParam(url, form, 'service'),
      });
      if (!result.ok) {
        return new NextResponse(result.error ?? 'Failed', { status: 400 });
      }
      return new NextResponse('OK', { status: 200 });
    } catch (err: any) {
      console.error('[shipstation/shipnotify] failed', err);
      return new NextResponse(err?.message ?? 'Server error', { status: 500 });
    }
  }

  return new NextResponse(`Unknown action: ${action ?? '(none)'}`, { status: 400 });
}

export async function GET(req: Request) { return handle(req); }
export async function POST(req: Request) { return handle(req); }
