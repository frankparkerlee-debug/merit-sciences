import Link from 'next/link';
import { CustomerImportClient } from './CustomerImportClient';

export const metadata = { title: 'Import customers — Merit Admin' };
export const dynamic = 'force-dynamic';

export default function ImportCustomersPage() {
  return (
    <main className="max-w-[1240px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      <Link
        href="/admin/customers"
        className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3 inline-block hover:underline underline-offset-4"
      >
        ← All customers
      </Link>
      <h1 className="font-display font-black text-ink tracking-[-0.025em] text-3xl mb-2">
        Import customers<span className="text-cobalt">.</span>
      </h1>
      <p className="text-sm text-ink-soft mb-6 leading-relaxed max-w-2xl">
        Upload a Shopify <strong>customers_export.csv</strong> file. We&rsquo;ll automatically
        categorize each row: real buyers go to <strong>Customers</strong>, BixGrow rows are
        skipped (manage in <Link href="/admin/affiliates" className="text-cobalt underline">Affiliates</Link>),
        and newsletter-only signups are skipped (will be imported separately when the
        newsletter table is built).
      </p>
      <CustomerImportClient />
    </main>
  );
}
