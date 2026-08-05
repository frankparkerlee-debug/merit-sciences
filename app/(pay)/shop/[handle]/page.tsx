import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { SupplyHeader, SupplyFooter } from '@/components/SupplyShell';
import { SupplyProductCard } from '@/components/SupplyProductCard';
import { SupplyAddToCart } from '@/components/SupplyAddToCart';
import { getSupplyProduct, relatedSupplyProducts } from '@/lib/supply';
import { categoryLabel, money, perUnit } from '@/lib/supply-shared';

/**
 * Product detail, medical-device register.
 *
 * The buyer here is evaluating a substitution against something they already
 * stock, so the spec table is the page — not a tab, not an accordion. Product
 * photograph left, specs and buy box right, everything above the fold.
 */

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const p = await getSupplyProduct(handle);
  return { title: p ? `${p.title} — Merit Clinical` : 'Product' };
}

export default async function SupplyPDP({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const p = await getSupplyProduct(handle);
  if (!p) notFound();

  const related = await relatedSupplyProducts(p.handle, p.brand, p.category);
  const unit = perUnit(p.priceCents, p.unitsPerBox);

  return (
    <div className="bg-paper">
      <SupplyHeader />

      <div className="mx-auto max-w-[1280px] px-6 py-10">
        <nav className="mb-8 flex items-center gap-2 text-[12px] text-ink-muted">
          <Link href="/shop" className="transition-colors hover:text-ink">Catalog</Link>
          <span aria-hidden>/</span>
          <Link href={`/shop?category=${p.category}`} className="transition-colors hover:text-ink">
            {categoryLabel(p.category)}
          </Link>
          <span aria-hidden>/</span>
          <span className="text-ink-soft">{p.title}</span>
        </nav>

        <div className="grid gap-px border border-line bg-line lg:grid-cols-[1.1fr_1fr]">
          {/* ── Image ── */}
          <div className="flex items-center justify-center bg-white p-10">
            {p.imageUrl ? (
              <img
                src={p.imageUrl}
                alt={p.title}
                width={1024}
                height={1024}
                className="block h-auto w-full max-w-[480px]"
              />
            ) : (
              <div className="aspect-square w-full max-w-[480px] bg-paper" />
            )}
          </div>

          {/* ── Detail ── */}
          <div className="bg-white p-8 sm:p-10">
            <div className="flex items-start justify-between gap-4">
              {p.eyebrow && (
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                  {p.eyebrow}
                </p>
              )}
              {p.rxOnly && (
                <span className="shrink-0 border border-ink/25 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.12em] text-ink-soft">
                  Rx only
                </span>
              )}
            </div>

            <h1 className="mt-3 font-display text-[30px] font-bold leading-[1.15] tracking-[-0.03em] text-ink">
              {p.title}
            </h1>
            <p className="mt-4 text-[14.5px] leading-[1.65] text-ink-soft">{p.oneLiner}</p>
            {p.description && (
              <p className="mt-3 text-[14.5px] leading-[1.65] text-ink-soft">{p.description}</p>
            )}

            {/* Spec table — the page, not a tab. */}
            <dl className="mt-8 border-t border-line text-[13.5px]">
              <Spec label="REF" value={p.sku} mono />
              <Spec label="HCPCS" value={p.hcpcsCode} mono />
              <Spec label="Size" value={p.size} />
              <Spec label="Units per box" value={p.unitsPerBox ? String(p.unitsPerBox) : null} />
              <Spec label="Sterility" value={p.sterile ? 'Sterile, single use' : 'Non-sterile'} />
              {p.manufacturer && <Spec label="Manufacturer" value={p.manufacturer} />}
            </dl>

            {/* Buy */}
            <div className="mt-8 border border-line bg-paper p-6">
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-[28px] font-semibold tracking-[-0.03em] tabular-nums text-ink">
                  {money(p.priceCents)}
                </p>
                <p className="text-right text-[12px] tabular-nums text-ink-muted">
                  {p.unitsPerBox && p.unitsPerBox > 1 ? `Box of ${p.unitsPerBox}` : 'Each'}
                  {unit && (
                    <>
                      <br />
                      {unit} per piece
                    </>
                  )}
                </p>
              </div>

              <div className="mt-5">
                <SupplyAddToCart
                  handle={p.handle}
                  title={p.title}
                  priceCents={p.priceCents}
                  unitsPerBox={p.unitsPerBox}
                  imageUrl={p.imageUrl}
                />
              </div>

              <p className="mt-4 text-[11.5px] leading-relaxed text-ink-muted">
                Free shipping over $300 · $9.99 flat otherwise · US shipping only
              </p>
            </div>

            {p.hcpcsCode && (
              <p className="mt-5 text-[11.5px] leading-relaxed text-ink-muted">
                HCPCS {p.hcpcsCode} is listed for reference only. Coverage, medical-necessity
                criteria, and payment vary by payer and plan — verify against the current policy
                before billing.
              </p>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-5 border-b border-line pb-4 text-[18px] font-semibold tracking-[-0.02em] text-ink">
              {p.brand ? 'Related products' : `More ${categoryLabel(p.category).toLowerCase()}`}
            </h2>
            <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
              {related.map((r) => (
                <SupplyProductCard key={r.handle} p={r} />
              ))}
            </div>
          </section>
        )}
      </div>

      <SupplyFooter />
    </div>
  );
}

function Spec({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-line py-3">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </dt>
      <dd className={mono ? 'font-mono text-[13px] text-ink' : 'text-[13.5px] text-ink'}>
        {value}
      </dd>
    </div>
  );
}
