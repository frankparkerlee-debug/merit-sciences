import Link from 'next/link';
import { prisma } from '@/lib/db';
import { BulkProductTable } from './BulkProductTable';

export const metadata = { title: 'Bulk edit products — Merit Admin' };
export const dynamic = 'force-dynamic';

export default async function BulkProductsPage() {
  // Pull everything in one shot — the table is the whole point of this
  // page, so paging would defeat it. ~70 products is well within limits.
  const products = await prisma.product.findMany({
    orderBy: [{ status: 'asc' }, { compound: 'asc' }, { vialSize: 'asc' }],
    select: {
      handle: true,
      title: true,
      compound: true,
      vialSize: true,
      status: true,
      stockQty: true,
      priceCents: true,
      physicianPriceCents: true,
      costCents: true,
      imageUrl: true,
    },
  });

  return (
    <main className="max-w-[1600px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      <Link
        href="/admin/products"
        className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3 inline-block hover:underline underline-offset-4"
      >
        ← All products
      </Link>
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-black text-ink tracking-[-0.025em] text-3xl mb-1">
            Bulk edit<span className="text-cobalt">.</span>
          </h1>
          <p className="text-sm text-ink-soft leading-relaxed max-w-2xl">
            Spreadsheet-style editing of <strong>status</strong>, <strong>stock</strong>,{' '}
            <strong>retail price</strong>, <strong>physician price</strong>,{' '}
            <strong>unit cost</strong>, and <strong>image URL</strong> for every product. Edit any
            cell, then hit Save to commit all changes at once.
          </p>
        </div>
      </div>
      <BulkProductTable products={products} />
    </main>
  );
}
