import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { codeReferencesFor, resolveHandle } from '@/lib/handle-aliases';
import { ProductForm } from './ProductForm';

export const metadata = { title: 'Edit product — Merit Admin' };
export const dynamic = 'force-dynamic';

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ renamed?: string }>;
}) {
  const { handle: handleParam } = await params;
  const { renamed } = await searchParams;
  const handle = decodeURIComponent(handleParam);
  const product = await prisma.product.findUnique({ where: { handle } });
  if (!product) {
    // A bookmarked admin URL for a renamed product lands on its new page.
    const current = await resolveHandle(handle);
    if (current !== handle) redirect(`/admin/products/${current}`);
    notFound();
  }

  const aliases = await prisma.productHandleAlias.findMany({
    where: { newHandle: product.handle },
    orderBy: { createdAt: 'asc' },
    select: { oldHandle: true, redirect: true },
  });

  return (
    <main className="max-w-[1240px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      <Link
        href="/admin/products"
        className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3 inline-block hover:underline underline-offset-4"
      >
        ← All products
      </Link>
      <div className="flex items-baseline justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="font-display font-black text-ink tracking-[-0.025em] text-2xl sm:text-3xl">
            {product.title}
          </h1>
          <p className="text-xs text-ink-soft font-mono mt-1">/{product.handle}</p>
        </div>
        <Link
          href={`/products/${product.handle}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold tracking-wider uppercase text-cobalt hover:underline underline-offset-4"
        >
          View on storefront ↗
        </Link>
      </div>

      {renamed && (
        <div className="mb-6 rounded-xl border border-emerald-600/30 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Handle changed from <span className="font-mono">/{renamed}</span> to{' '}
          <span className="font-mono">/{product.handle}</span>. Old links and carts forward here automatically.
        </div>
      )}

      <ProductForm
        handleInfo={{ aliases, codeRefs: codeReferencesFor(product.handle) }}
        product={{
          handle: product.handle,
          title: product.title,
          compound: product.compound,
          eyebrow: product.eyebrow,
          vialSize: product.vialSize,
          format: product.format.toLowerCase() as 'lyophilized' | 'reconstituted',
          oneLiner: product.oneLiner,
          priceCents: product.priceCents,
          compareAtCents: product.compareAtCents,
          physicianPriceCents: product.physicianPriceCents,
          costCents: product.costCents,
          stockQty: product.stockQty,
          bundlesJson: product.bundles ? JSON.stringify(product.bundles, null, 2) : '',
          specCas: product.specCas,
          specMw: product.specMw,
          specFormula: product.specFormula,
          specSequence: product.specSequence,
          specAminoAcids: product.specAminoAcids,
          lotId: product.lotId,
          lotPurity: product.lotPurity,
          lotTestedDate: product.lotTestedDate,
          lotBud: product.lotBud,
          lotCoaUrl: product.lotCoaUrl,
          segment: product.segment.toLowerCase() as 'biohacker' | 'clinic' | 'aesthetic' | 'athletic' | 'researcher',
          channel: product.channel.toLowerCase() as 'rua' | 'clinic' | 'both',
          shopifySuspended: product.shopifySuspended,
          status: product.status.toLowerCase() as 'active' | 'draft',
          imageUrl: product.imageUrl,
          images: product.images,
        }}
      />
    </main>
  );
}
