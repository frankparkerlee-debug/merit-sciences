import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { ProductForm } from './ProductForm';

export const metadata = { title: 'Edit product — Merit Admin' };
export const dynamic = 'force-dynamic';

export default async function EditProductPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle: handleParam } = await params;
  const handle = decodeURIComponent(handleParam);
  const product = await prisma.product.findUnique({ where: { handle } });
  if (!product) notFound();

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

      <ProductForm
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
