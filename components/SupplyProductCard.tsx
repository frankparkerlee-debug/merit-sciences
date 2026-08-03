import Link from 'next/link';
import { SupplyAddToCart } from './SupplyAddToCart';
import { money, perUnit, type SupplyListItem } from '@/lib/supply';

/**
 * Clinic-facing product card: SKU, size, and HCPCS are surfaced rather than
 * buried, because that is what a buyer matches against what they already
 * order. Consumer-style cards hide those behind a click; here they are the
 * identifying information.
 */
export function SupplyProductCard({ p }: { p: SupplyListItem }) {
  const unit = perUnit(p.priceCents, p.unitsPerBox);

  return (
    <div className="flex flex-col rounded-2xl border border-ink/10 bg-white p-4 transition hover:border-ink/25">
      <Link href={`/shop/${p.handle}`} className="group flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {p.brand && (
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cobalt">
                {p.brand}
              </p>
            )}
            <h3 className="mt-1 text-[15px] font-bold leading-snug text-ink group-hover:underline">
              {p.title}
            </h3>
          </div>
          {p.rxOnly && (
            <span className="shrink-0 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
              Rx
            </span>
          )}
        </div>

        <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-soft">{p.oneLiner}</p>

        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-muted">
          {p.sku && (
            <div className="flex gap-1">
              <dt className="font-semibold">REF</dt>
              <dd className="font-mono">{p.sku}</dd>
            </div>
          )}
          {p.hcpcsCode && (
            <div className="flex gap-1">
              <dt className="font-semibold">HCPCS</dt>
              <dd className="font-mono">{p.hcpcsCode}</dd>
            </div>
          )}
        </dl>
      </Link>

      <div className="mt-4 flex items-end justify-between gap-3 border-t border-ink/10 pt-3">
        <div>
          <p className="text-[17px] font-extrabold tracking-tight text-ink">
            {money(p.priceCents)}
          </p>
          <p className="text-[11px] text-ink-muted">
            {p.unitsPerBox && p.unitsPerBox > 1 ? `Box of ${p.unitsPerBox}` : 'Each'}
            {unit && ` · ${unit}/ea`}
          </p>
        </div>
        <div className="w-28">
          <SupplyAddToCart
            handle={p.handle}
            title={p.title}
            priceCents={p.priceCents}
            unitsPerBox={p.unitsPerBox}
            imageUrl={p.imageUrl}
            compact
          />
        </div>
      </div>
    </div>
  );
}
