import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { EditDiscountForm } from './EditDiscountForm';

export const metadata = { title: 'Edit discount — Merit Admin' };
export const dynamic = 'force-dynamic';

export default async function EditDiscountPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: codeParam } = await params;
  const code = decodeURIComponent(codeParam).toLowerCase();
  const discount = await prisma.discount.findUnique({ where: { code } });
  if (!discount) notFound();

  // Convert stored basis-points / cents back to user-friendly values
  // so the form pre-fills with what the operator originally typed.
  const valueInput =
    discount.type === 'PERCENT'
      ? (discount.value / 100).toString()        // 10000 → "100"
      : discount.type === 'FIXED_AMOUNT'
      ? (discount.value / 100).toFixed(2)         // 500 → "5.00"
      : '';                                       // FREE_SHIPPING

  const minPurchaseInput = discount.minPurchaseCents
    ? (Number(discount.minPurchaseCents) / 100).toFixed(2)
    : '';

  return (
    <main className="max-w-[920px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      <Link
        href={`/admin/discounts/${encodeURIComponent(code)}`}
        className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3 inline-block hover:underline underline-offset-4"
      >
        ← Discount detail
      </Link>
      <h1 className="font-display font-black text-ink tracking-[-0.025em] text-3xl mb-2">
        Edit <span className="font-mono uppercase">{discount.code}</span>
        <span className="text-cobalt">.</span>
      </h1>
      <p className="text-sm text-ink-soft mb-6">
        The code itself can&rsquo;t change &mdash; create a new one if you need a different
        string. Everything else is editable.
      </p>
      <EditDiscountForm
        discount={{
          code: discount.code,
          title: discount.title ?? '',
          type: discount.type,
          method: discount.method,
          valueInput,
          minPurchaseInput,
          minQuantity: discount.minQuantity,
          maxUses: discount.maxUses,
          oncePerCustomer: discount.oncePerCustomer,
          customerEmail: discount.customerEmail ?? '',
          startsAt: discount.startsAt,
          endsAt: discount.endsAt,
        }}
      />
    </main>
  );
}
