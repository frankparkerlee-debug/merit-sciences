/**
 * POST /api/checkout/handoff
 * Body: { lines: CartLine[], welcomeCode?: string }
 * →     { url: string }
 *
 * Called on the STOREFRONT origin when the buyer starts checkout. Bundles the
 * cart (from localStorage, sent by the client) together with the affiliate and
 * attribution cookies (readable only here, server-side, because they're
 * HttpOnly) into a single-use handoff row, and returns the absolute URL of the
 * checkout domain.
 *
 * When CHECKOUT_ORIGIN is unset this returns "/checkout" and writes nothing —
 * so the storefront behaves exactly as it does today until the split domain
 * is switched on.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHandoff, type HandoffLine } from '@/lib/checkout-handoff';
import { ATTR_COOKIE } from '@/lib/attribution';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const REF_COOKIE = 'merit_ref';
const MAX_LINES = 50;

/** Trust nothing from the client: prices are re-resolved server-side at
 *  create-order time, so this only has to be shape-safe and bounded. */
function sanitizeLines(raw: unknown): HandoffLine[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_LINES).flatMap((l: any) => {
    const handle = String(l?.handle ?? '').slice(0, 200);
    const qty = Number(l?.qty);
    if (!handle || !Number.isFinite(qty) || qty < 1) return [];
    return [{
      handle,
      title: String(l?.title ?? '').slice(0, 300),
      bundleLabel: String(l?.bundleLabel ?? '').slice(0, 100),
      unitCents: Math.max(0, Math.round(Number(l?.unitCents) || 0)),
      qty: Math.min(999, Math.round(qty)),
      imageUrl: typeof l?.imageUrl === 'string' ? l.imageUrl.slice(0, 500) : undefined,
      componentHandles: Array.isArray(l?.componentHandles)
        ? l.componentHandles.slice(0, 20).map((h: any) => String(h).slice(0, 200))
        : undefined,
    }];
  });
}

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const lines = sanitizeLines(body?.lines);
  if (lines.length === 0) {
    return NextResponse.json({ error: 'Cart is empty.' }, { status: 422 });
  }

  // HttpOnly cookies — the client can't read these, which is exactly why the
  // handoff has to be minted server-side.
  const jar = cookies();
  const refSlug = jar.get(REF_COOKIE)?.value ?? null;
  const attr = jar.get(ATTR_COOKIE)?.value ?? null;

  const welcomeCode =
    typeof body?.welcomeCode === 'string' && body.welcomeCode.trim()
      ? body.welcomeCode.trim().slice(0, 40)
      : null;

  try {
    const url = await createHandoff({ lines, refSlug, attr, welcomeCode });
    return NextResponse.json({ url });
  } catch (err) {
    console.error('[checkout/handoff] failed', err);
    // Never strand the buyer: fall back to same-origin checkout.
    return NextResponse.json({ url: '/checkout' });
  }
}
