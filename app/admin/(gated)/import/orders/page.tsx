import Link from 'next/link';
import { OrderImportClient } from './OrderImportClient';

export const metadata = { title: 'Import orders — Merit Admin' };
export const dynamic = 'force-dynamic';

export default function ImportOrdersPage() {
  return (
    <main className="max-w-[1240px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      <Link
        href="/admin/orders"
        className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3 inline-block hover:underline underline-offset-4"
      >
        ← All orders
      </Link>
      <h1 className="font-display font-black text-ink tracking-[-0.025em] text-3xl mb-2">
        Import orders<span className="text-cobalt">.</span>
      </h1>
      <p className="text-sm text-ink-soft mb-6 leading-relaxed max-w-2xl">
        Upload a Shopify <strong>orders_export.csv</strong> file. Multi-line orders are grouped
        automatically. Each Shopify order becomes one row in our Order table with status mapped
        from financial + fulfillment status.
      </p>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-6 text-xs text-amber-900 leading-relaxed">
        <p className="font-bold mb-1">— Important caveats</p>
        <ul className="list-disc list-inside space-y-1">
          <li>
            Imported orders have <code>shopify:</code> prefix on their PayPal Order ID field so
            they don&rsquo;t collide with real PayPal orders.
          </li>
          <li>
            <strong>Refunds via the admin won&rsquo;t work</strong> on imported orders &mdash;
            we don&rsquo;t have the original PayPal capture ID to call the API. Refund manually
            in Shopify or PayPal admin if needed.
          </li>
          <li>
            No customer emails fire on import (we don&rsquo;t want to re-send shipped notifications).
          </li>
        </ul>
      </div>
      <OrderImportClient />
    </main>
  );
}
