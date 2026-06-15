import Link from 'next/link';
import { InventoryImportClient } from './InventoryImportClient';

export const metadata = { title: 'Import inventory — Merit Admin' };
export const dynamic = 'force-dynamic';

export default function ImportInventoryPage() {
  return (
    <main className="max-w-[1240px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      <Link
        href="/admin/products"
        className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3 inline-block hover:underline underline-offset-4"
      >
        ← All products
      </Link>
      <h1 className="font-display font-black text-ink tracking-[-0.025em] text-3xl mb-2">
        Import inventory<span className="text-cobalt">.</span>
      </h1>
      <p className="text-sm text-ink-soft mb-6 leading-relaxed max-w-2xl">
        Upload your <strong>Inventory 6.14.xlsx</strong> directly &mdash; or a CSV export if you
        prefer. Maps SKU + Product + Vial Size to existing products, previews changes, and applies on confirm.
        Updates <strong>stock</strong>, <strong>retail price</strong>, <strong>physician price</strong>, and <strong>unit cost</strong>.
      </p>
      <div className="rounded-2xl border border-cobalt/15 bg-cobalt/[0.03] p-4 mb-6 text-xs text-ink-soft leading-relaxed">
        <p className="font-bold mb-1 text-cobalt">— Expected column layout</p>
        <p>
          Col A=SKU · B=Product · C=Vial Size · F=Units On Hand · G=Unit Cost · I=Physician Unit · K=Retail Unit.
          (Matches the Inventory 6.14 sheet as-is.) Header rows are auto-skipped.
        </p>
      </div>
      <InventoryImportClient />
    </main>
  );
}
