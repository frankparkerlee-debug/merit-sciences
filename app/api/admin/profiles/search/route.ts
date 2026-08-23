/**
 * GET /api/admin/profiles/search?q=<term>
 *
 * Admin-gated typeahead behind the manual-order form's profile picker.
 * Searches BOTH kinds of buyer profile in one call:
 *
 *   - customers (name / email contains) — with the ship-to from their most
 *     recent order so selecting a repeat buyer prefills the whole form;
 *   - APPROVED practitioners (practice / provider / email contains) — with
 *     their pricing terms (basis, % off retail, per-SKU overrides) so the
 *     form can quote THEIR prices as products are added.
 *
 * The picker is a convenience: whatever the admin submits is still validated
 * and (for practitioner linkage) re-derived server-side in createManualOrder.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const q = (new URL(req.url).searchParams.get('q') ?? '').trim();
  if (q.length < 2) return NextResponse.json({ customers: [], practitioners: [] });

  const contains = { contains: q, mode: 'insensitive' as const };

  const [customers, practitioners] = await Promise.all([
    prisma.customer.findMany({
      where: { OR: [{ name: contains }, { email: contains }] },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        name: true,
        email: true,
        phone: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            shippingFullName: true,
            shippingLine1: true,
            shippingLine2: true,
            shippingCity: true,
            shippingState: true,
            shippingZip: true,
          },
        },
      },
    }),
    prisma.practitionerApplication.findMany({
      where: {
        status: 'APPROVED',
        OR: [{ practiceName: contains }, { providerName: contains }, { email: contains }],
      },
      orderBy: { reviewedAt: 'desc' },
      take: 6,
      select: {
        id: true,
        practiceName: true,
        providerName: true,
        email: true,
        phone: true,
        pricingBasis: true,
        retailDiscountBps: true,
        priceOverrides: { select: { productHandle: true, priceCents: true } },
      },
    }),
  ]);

  return NextResponse.json({
    customers: customers.map((c) => ({
      name: c.name,
      email: c.email,
      phone: c.phone,
      lastShipping: c.orders[0] ?? null,
    })),
    practitioners: practitioners.map((p) => ({
      applicationId: p.id,
      practiceName: p.practiceName,
      providerName: p.providerName,
      email: p.email,
      phone: p.phone,
      pricingBasis: p.pricingBasis,
      retailDiscountBps: p.retailDiscountBps,
      overrides: Object.fromEntries(
        p.priceOverrides
          .filter((o) => o.priceCents > 0)
          .map((o) => [o.productHandle, o.priceCents]),
      ),
    })),
  });
}
