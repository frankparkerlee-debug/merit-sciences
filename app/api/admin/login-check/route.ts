import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * POST /api/admin/login-check
 * Body: { email }
 * Returns: { authorized: boolean }
 *
 * Verifies an email is on the ADMIN_EMAILS allowlist before we
 * trigger Supabase's magic-link send. Prevents random visitors from
 * creating Supabase Auth users by submitting our admin form.
 */
export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!email) return NextResponse.json({ authorized: false });

  const allowed = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return NextResponse.json({ authorized: allowed.includes(email) });
}
