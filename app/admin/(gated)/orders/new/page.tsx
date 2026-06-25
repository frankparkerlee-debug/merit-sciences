import Link from 'next/link';
import { prisma } from '@/lib/db';
import { NewOrderForm } from './NewOrderForm';

export const metadata = { title: 'New order — Merit Admin' };
export const dynamic = 'force-dynamic';

export default async function NewOrderPage() {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { title: 'asc' },
    select: { handle: true, title: true, priceCents: true },
  });

  return (
    <main className="max-w-[860px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      <Link
        href="/admin/orders"
        className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3 inline-block hover:underline underline-offset-4"
      >
        ← All orders
      </Link>

      <div className="mb-6">
        <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">— New order</p>
        <h1 className="font-display font-black text-ink tracking-[-0.025em] text-3xl sm:text-4xl">
          Create manual order<span className="text-cobalt">.</span>
        </h1>
        <p className="text-sm text-ink-soft mt-2">
          Orders created here bypass PayPal. Use for replacements, comps, corrections, or phone orders.
        </p>
      </div>

      <NewOrderForm products={products} />
    </main>
  );
}
