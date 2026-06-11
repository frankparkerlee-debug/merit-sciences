import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * POST /api/affiliate/login-check
 * Body: { email: string }
 * Returns: { exists: boolean }
 *
 * Used by the login form before firing the magic link, so we don't
 * create ghost Supabase Auth users for random visitors who try to
 * sign in without first having an Affiliate row. Returns a generic
 * `exists` boolean only — we don't surface any other affiliate data.
 *
 * Rate limiting: not yet implemented. If we see abuse (email enum
 * probing) we'll add per-IP throttling here.
 */
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const email = String(body.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }
  const affiliate = await prisma.affiliate.findUnique({
    where: { email },
    select: { id: true, status: true },
  });
  // SUSPENDED affiliates can technically still log in — they just can't
  // earn. We show them their dashboard with a suspended banner so they
  // can see what's happening. So we return exists: true for them too.
  return NextResponse.json({ exists: !!affiliate });
}
