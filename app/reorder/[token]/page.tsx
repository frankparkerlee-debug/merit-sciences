import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { verifyReorderToken } from '@/lib/reorder';
import { listProducts } from '@/lib/catalog';
import { getStack } from '@/lib/catalog-meta';
import { deriveBundles, productDisplayName, productImage } from '@/lib/product-types';
import type { CartLine } from '@/lib/cart';
import { ReorderCart } from './ReorderCart';

/**
 * One-click reorder landing — /reorder/<signed-token> from a post-purchase or
 * replenishment email. Rebuilds the referenced order's cart AT CURRENT CATALOG
 * PRICES (create-order trusts line prices for retail buyers, so restoring the
 * old snapshot cents would silently honor stale pricing), then a client
 * component hydrates the localStorage cart and bounces to /checkout — the
 * same pattern as the abandoned-cart recovery flow.
 *
 * Lines whose product (or stack) is no longer active are dropped; if nothing
 * survives, we show a friendly fallback instead of an empty checkout.
 */

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Rebuilding your order…',
  robots: { index: false, follow: false },
};

type Props = { params: { token: string } };

export default async function ReorderPage({ params }: Props) {
  const orderId = verifyReorderToken(params.token?.trim() || '');
  if (!orderId) notFound();

  const order = await prisma.order
    .findUnique({ where: { id: orderId }, include: { lines: true } })
    .catch(() => null);
  if (!order) notFound();

  // Current active catalog — resilient ([] on DB blip → fallback UI below).
  let products: Awaited<ReturnType<typeof listProducts>> = [];
  try {
    products = await listProducts({ status: 'active' });
  } catch {
    products = [];
  }
  const byHandle = new Map(products.map((p) => [p.handle, p]));

  const fresh: CartLine[] = [];
  for (const l of order.lines) {
    if (l.handle.startsWith('stack:')) {
      // Stack line — recompute the bundle from the CURRENT template + prices.
      const slug = l.handle.slice('stack:'.length);
      const stack = getStack(slug);
      if (!stack) continue;
      const items = stack.handles.map((h) => byHandle.get(h));
      if (items.some((p) => !p)) continue;
      const sum = items.reduce((a, p) => a + p!.priceCents, 0);
      fresh.push({
        handle: l.handle,
        title: stack.name,
        bundleLabel: `${stack.handles.length} compounds · save ${stack.bundleDiscountPct}%`,
        unitCents: Math.round(sum * (1 - stack.bundleDiscountPct / 100)),
        qty: l.qty,
        imageUrl: l.imageUrl ?? undefined,
        components: stack.handles,
      });
      continue;
    }

    const p = byHandle.get(l.handle);
    if (!p) continue; // discontinued / drafted — drop
    // Reprice at the current bundle ladder; unknown legacy labels fall back
    // to a Single at today's price.
    const bundles = deriveBundles(p.priceCents);
    const bundle = bundles.find((b) => b.label === l.bundleLabel) ?? bundles[0];
    fresh.push({
      handle: p.handle,
      title: productDisplayName(p),
      bundleLabel: bundle.label,
      unitCents: bundle.priceCents,
      qty: l.qty,
      imageUrl: productImage(p.imageUrl),
    });
  }

  if (fresh.length === 0) {
    return (
      <main className="bg-cream min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">— Reorder</p>
          <h1 className="font-display font-black text-ink text-2xl tracking-tight mb-3">
            That lineup has changed<span className="text-cobalt">.</span>
          </h1>
          <p className="text-sm text-ink-soft leading-relaxed mb-6">
            The items from that order aren&rsquo;t in the current catalog. The good news: every lot in
            the catalog today ships with the same per-lot COA and ≥99% HPLC verification.
          </p>
          <Link
            href="/catalog"
            className="inline-block rounded-xl bg-cobalt px-6 py-3 text-sm font-bold text-white hover:opacity-90"
          >
            Browse the current catalog →
          </Link>
        </div>
      </main>
    );
  }

  return <ReorderCart lines={fresh} />;
}
