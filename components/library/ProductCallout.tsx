import Link from 'next/link';
import type { ProductRef } from '@/lib/monographs';

/**
 * Conservative, trust-first product tie-in for a research article. Leads with
 * proof (purity / COA / facility / speed), price last. Renders from static
 * catalog facts — no DB dependency — so it survives a DB blip and previews
 * locally. Placed once per monograph; never a hard sell.
 */
export function ProductCallout({ title, product }: { title: string; product: ProductRef }) {
  const proof = [
    `${product.purity} HPLC purity`,
    'Third-party COA on every lot',
    'ISO-certified US facility',
    'Ships 48h from Dallas',
  ];
  return (
    <aside className="not-prose my-9 rounded-2xl border border-cobalt/15 bg-white overflow-hidden">
      <div className="px-5 sm:px-6 py-5 sm:flex sm:items-center sm:justify-between gap-6">
        <div className="min-w-0">
          <p className="text-[10px] tracking-[0.2em] uppercase font-bold text-cobalt">— Research-grade, from Merit</p>
          <p className="mt-1.5 font-display font-extrabold text-ink text-lg leading-tight">
            {title} · {product.vialSize}
          </p>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {proof.map((p) => (
              <li key={p} className="flex items-center gap-1.5 text-[12.5px] text-ink-soft">
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 flex-none text-cobalt" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M13 4.5 6.5 11 3 7.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4 sm:mt-0 flex-none flex items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
          <div className="leading-none">
            <span className="text-[11px] text-ink-muted">from </span>
            <span className="font-display font-black text-ink text-2xl tabular-nums">${product.fromPrice}</span>
          </div>
          <Link
            href={`/products/${product.handle}`}
            className="inline-flex items-center gap-1.5 rounded-lg bg-cobalt px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 transition whitespace-nowrap"
          >
            View {title.split(' ')[0]} <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
      <p className="px-5 sm:px-6 py-2.5 border-t border-cobalt/8 bg-cream/50 text-[11px] leading-relaxed text-ink-muted">
        Sold for research use only — not for human or veterinary use. Pricing shown is retail;
        practitioner pricing is available through the Practitioner Program.
      </p>
    </aside>
  );
}
