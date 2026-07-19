/**
 * Render health-check endpoint (render.yaml healthCheckPath: /api/health).
 *
 * Lives under /api so the middleware matcher never touches it — the
 * onrender.com→meritsciences.com host redirect in middleware.ts would
 * otherwise 301 the health probe and mark every deploy unhealthy.
 * Deliberately DB-free: a Supabase blip must not restart the web service.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ ok: true });
}
