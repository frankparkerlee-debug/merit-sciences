import Link from 'next/link';
import { NewProductForm } from './NewProductForm';

export const metadata = { title: 'New product — Merit Admin' };
export const dynamic = 'force-dynamic';

export default function NewProductPage() {
  return (
    <main className="max-w-[680px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      <Link
        href="/admin/products"
        className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3 inline-block hover:underline underline-offset-4"
      >
        ← All products
      </Link>
      <h1 className="font-display font-black text-ink tracking-[-0.025em] text-3xl mb-2">
        New product<span className="text-cobalt">.</span>
      </h1>
      <p className="text-sm text-ink-soft mb-6">
        Start with a handle + title — saved as <strong>Draft</strong>. You&rsquo;ll fill in pricing,
        spec, and media on the next screen.
      </p>
      <NewProductForm />
    </main>
  );
}
