import Link from 'next/link';
import { SupplyAddToCart } from './SupplyAddToCart';
import { money, perUnit, type SupplyListItem } from '@/lib/supply-shared';

/**
 * Product card, medical-device register.
 *
 * The design brief here is restraint, not decoration. Suppliers in this
 * category — Molnlycke, Coloplast, Solventum — share a visual language: cool
 * neutrals, hairline rules, near-square corners, no shadows, no gradients, and
 * the product photograph doing the work. Consumer-commerce cues (deep radii,
 * warm cream, drop shadows, colour used for delight) read as unserious to a
 * clinical buyer and were the problem with the first pass.
 *
 * Colour is used for exactly two things: interactive state and the Rx flag.
 * REF and HCPCS are set in mono and given real weight, because they are the
 * identifiers a buyer is matching against a reorder sheet.
 */
export function SupplyProductCard({ p }: { p: SupplyListItem }) {
  const unit = perUnit(p.priceCents, p.unitsPerBox);
  const out = p.stockQty <= 0;

  return (
    <article className="group relative flex flex-col border border-line bg-white transition-colors hover:border-ink/25">
      {p.imageUrl && (
        <Link href={`/shop/${p.handle}`} className="block border-b border-line bg-white">
          <img
            src={p.imageUrl}
            alt={p.title}
            width={1024}
            height={1024}
            loading="lazy"
            className="block aspect-square h-auto w-full object-cover"
          />
        </Link>
      )}

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          {p.eyebrow && (
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              {p.eyebrow}
            </p>
          )}
          {p.rxOnly && (
            <span className="shrink-0 border border-ink/20 px-1.5 py-px text-[9px] font-bold uppercase tracking-[0.1em] text-ink-soft">
              Rx
            </span>
          )}
        </div>

        <h3 className="mt-2 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-ink">
          <Link href={`/shop/${p.handle}`} className="after:absolute after:inset-0">
            {p.title}
          </Link>
        </h3>

        <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-ink-soft">
          {p.oneLiner}
        </p>

        {/* Identifiers a buyer matches against a reorder sheet. */}
        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
          {p.sku && (
            <div className="flex gap-1.5">
              <dt className="uppercase tracking-[0.08em] text-ink-muted">Ref</dt>
              <dd className="font-mono font-medium text-ink-soft">{p.sku}</dd>
            </div>
          )}
          {p.hcpcsCode && (
            <div className="flex gap-1.5">
              <dt className="uppercase tracking-[0.08em] text-ink-muted">HCPCS</dt>
              <dd className="font-mono font-medium text-ink-soft">{p.hcpcsCode}</dd>
            </div>
          )}
        </dl>

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div>
            <p className="text-[17px] font-semibold tracking-[-0.02em] tabular-nums text-ink">
              {money(p.priceCents)}
            </p>
            <p className="mt-0.5 text-[11px] tabular-nums text-ink-muted">
              {p.unitsPerBox && p.unitsPerBox > 1 ? `Box / ${p.unitsPerBox}` : 'Each'}
              {unit && ` · ${unit} ea`}
            </p>
          </div>

          {/* Sits above the title's stretched link so the button stays clickable. */}
          <div className="relative z-10 w-[104px]">
            {out ? (
              <p className="py-2 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                Backordered
              </p>
            ) : (
              <SupplyAddToCart
                handle={p.handle}
                title={p.title}
                priceCents={p.priceCents}
                unitsPerBox={p.unitsPerBox}
                imageUrl={p.imageUrl}
                compact
              />
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
