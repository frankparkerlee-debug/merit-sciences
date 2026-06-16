import { NextResponse } from 'next/server';
import { isApprovedPractitioner } from '@/lib/practitioner-session';

export const runtime = 'nodejs';

/**
 * POST /api/practitioners/login-check
 * Body: { email: string }
 *
 * Tells the login form whether this email belongs to an approved
 * practitioner before firing the magic-link. Prevents random visitors
 * from harvesting that the form sends emails to anyone.
 */
export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ authorized: false }, { status: 400 });
  }
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ authorized: false }, { status: 400 });
  }
  const approved = await isApprovedPractitioner(email);
  return NextResponse.json({ authorized: approved });
}
