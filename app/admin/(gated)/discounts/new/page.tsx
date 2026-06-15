import Link from 'next/link';
import { DiscountForm } from './DiscountForm';

export const metadata = { title: 'Create discount — Merit Admin' };
export const dynamic = 'force-dynamic';

export default function CreateDiscountPage() {
  return (
    <main className="max-w-[920px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      <Link
        href="/admin/discounts"
        className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3 inline-block hover:underline underline-offset-4"
      >
        ← All discounts
      </Link>
      <h1 className="font-display font-black text-ink tracking-[-0.025em] text-3xl mb-2">
        Create discount<span className="text-cobalt">.</span>
      </h1>
      <p className="text-sm text-ink-soft mb-6">
        Set up a manual discount code that buyers enter at checkout, or an automatic discount that
        applies when conditions are met.
      </p>
      <DiscountForm />
    </main>
  );
}
