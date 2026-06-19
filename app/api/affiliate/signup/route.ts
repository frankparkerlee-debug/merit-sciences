import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  normalizeIdentifier,
  validateEmail,
  validateIdentifier,
  validateName,
} from '@/lib/affiliate';

export const runtime = 'nodejs';

/**
 * POST /api/affiliate/signup
 *
 * Open sign-up — no admin approval. Creates an ACTIVE Affiliate row
 * with the buyer-facing discount code the user picked. On conflicts
 * (email/slug/code already taken) returns 409 with which field clashed
 * so the form can highlight the right input.
 *
 * Future: send magic-link email confirmation via Supabase Auth. For
 * now we trust the address (we'll need it to deliver payouts later
 * anyway — bogus addresses self-select out).
 */
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validation — keep error messages user-actionable
  const emailCheck = validateEmail(body.email ?? '');
  if (!emailCheck.ok) return NextResponse.json({ error: emailCheck.reason, field: 'email' }, { status: 400 });

  const nameCheck = validateName(body.name ?? '');
  if (!nameCheck.ok) return NextResponse.json({ error: nameCheck.reason, field: 'name' }, { status: 400 });

  const slugCheck = validateIdentifier(body.slug ?? '', 'Referral handle');
  if (!slugCheck.ok) return NextResponse.json({ error: slugCheck.reason, field: 'slug' }, { status: 400 });

  const codeCheck = validateIdentifier(body.discountCode ?? '', 'Discount code');
  if (!codeCheck.ok) return NextResponse.json({ error: codeCheck.reason, field: 'discountCode' }, { status: 400 });

  // Slug ≠ code — keep them distinct so we don't double-credit on cookie + code
  const slug = normalizeIdentifier(body.slug);
  const discountCode = normalizeIdentifier(body.discountCode);
  if (slug === discountCode) {
    return NextResponse.json(
      { error: 'Referral handle and discount code must be different', field: 'discountCode' },
      { status: 400 },
    );
  }

  // Optional fields — sanitize, don't reject
  const email = body.email.trim().toLowerCase();
  const name = body.name.trim();
  const socialUrl: string | null = body.socialUrl
    ? String(body.socialUrl).trim().slice(0, 500) || null
    : null;
  const audienceSize: number | null =
    body.audienceSize && Number.isFinite(Number(body.audienceSize))
      ? Math.max(0, Math.min(1_000_000_000, Math.floor(Number(body.audienceSize))))
      : null;
  const pitch: string | null = body.pitch
    ? String(body.pitch).trim().slice(0, 2000) || null
    : null;

  // Create — handle the three unique-conflict cases with field-specific feedback
  try {
    const affiliate = await prisma.affiliate.create({
      data: {
        email,
        name,
        slug,
        discountCode,
        socialUrl,
        audienceSize,
        pitch,
      },
      select: { id: true, name: true, slug: true, discountCode: true, email: true },
    });

    // Discount code is live immediately — it's validated server-side from
    // our DB at checkout (lib/discount.ts), no external sync needed.
    return NextResponse.json({ ok: true, affiliate }, { status: 201 });
  } catch (e: any) {
    // P2002 = unique constraint violation. e.meta.target tells us which.
    if (e?.code === 'P2002') {
      const target: string[] = e.meta?.target ?? [];
      if (target.includes('email')) {
        return NextResponse.json(
          { error: 'An affiliate with this email already exists. Sign in instead.', field: 'email' },
          { status: 409 },
        );
      }
      if (target.includes('slug')) {
        return NextResponse.json(
          { error: `Referral handle "${slug}" is already taken — try another.`, field: 'slug' },
          { status: 409 },
        );
      }
      if (target.includes('discountCode')) {
        return NextResponse.json(
          { error: `Discount code "${discountCode}" is already taken — try another.`, field: 'discountCode' },
          { status: 409 },
        );
      }
    }
    console.error('affiliate signup failed:', e);
    return NextResponse.json({ error: 'Server error — please try again.' }, { status: 500 });
  }
}
