import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * POST /api/affiliate/track-click
 *
 * Internal endpoint — fire-and-forget called by the storefront middleware
 * after it detects `?ref=SLUG` and sets the merit_ref cookie.
 *
 * Writes a Click row for analytics / fraud detection. Never reveals
 * whether a given slug exists or is active (always returns 200).
 */
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  // Re-validate the slug server-side. The middleware validated it too,
  // but we never trust input that crossed the wire.
  const slug =
    typeof body.slug === 'string'
      ? body.slug.trim().toLowerCase()
      : null;
  if (!slug || !/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/.test(slug)) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  try {
    const affiliate = await prisma.affiliate.findUnique({
      where: { slug },
      select: { id: true, status: true },
    });

    // Silently 200 if the slug isn't an active affiliate. We don't want
    // to leak which slugs are real.
    if (!affiliate || affiliate.status !== 'ACTIVE') {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    await prisma.click.create({
      data: {
        affiliateId: affiliate.id,
        // Random UUID — used to correlate this click row to a future
        // purchase if we ever add per-click attribution beyond the
        // cookie-level affiliate binding.
        cookieId: randomUUID(),
        ipAddress:
          typeof body.ipAddress === 'string' ? body.ipAddress.slice(0, 64) : null,
        userAgent:
          typeof body.userAgent === 'string' ? body.userAgent.slice(0, 500) : null,
        referrer:
          typeof body.referrer === 'string' ? body.referrer.slice(0, 500) : null,
        landingPath:
          typeof body.landingPath === 'string'
            ? body.landingPath.slice(0, 500)
            : null,
      },
    });
  } catch (e) {
    // Log + swallow. We never want a logging failure to break the
    // affiliate redirect flow that called us.
    console.error('track-click failed:', e);
  }

  return NextResponse.json({ ok: true });
}
