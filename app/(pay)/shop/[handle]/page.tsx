import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { SupplyHeader, SupplyFooter } from '@/components/SupplyShell';
import { SupplyProductCard } from '@/components/SupplyProductCard';
import { SupplyAddToCart } from '@/components/SupplyAddToCart';
import {
  getSupplyProduct,
  relatedSupplyProducts,
  categoryLabel,
  money,
  perUnit,
} from '@/lib/supply';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const p = await getSupplyProduct(handle);
  return { title: p ? p.title : 'Product' };
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
    <>
      <SupplyHeader />

      <div className="mx-auto max-w-5xl px-5 py-10">
        <nav className="text-[12px] font-semibold text-ink-muted">
          <Link href="/shop" className="hover:text-ink">Shop</Link>
          <span className="mx-2">/</span>
          <Link href={`/shop?category=${p.category}`} className="hover:text-ink">
            {categoryLabel(p.category)}
          </Link>
        </nav>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_360px]">
          <div>
            {p.imageUrl && (
              <div className="mb-8 overflow-hidden rounded-2xl border border-ink/10 bg-white">
                <img
                  src={p.imageUrl}
                  alt={p.title}
                  width={640}
                  height={640}
                  className="block h-auto w-full max-w-[420px]"
                />
              </div>
            )}
            {p.brand && (
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-cobalt">
                {p.brand}
              </p>
            )}
            <h1 className="mt-2 text-[32px] font-extrabold leading-tight tracking-tight text-ink">
              {p.title}
            </h1>
            <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft">{p.oneLiner}</p>

            {p.description && (
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft">
                {p.description}
              </p>
            )}

            {/* Spec table — the part a clinic buyer actually reads. */}
            <dl className="mt-8 divide-y divide-ink/10 border-y border-ink/10 text-[14px]">
              <Spec label="REF number" value={p.sku} mono />
              <Spec label="HCPCS" value={p.hcpcsCode} mono />
              <Spec label="Size" value={p.size} />
              <Spec
                label="Units per box"
                value={p.unitsPerBox ? String(p.unitsPerBox) : null}
              />
              <Spec label="Sterile" value={p.sterile ? 'Yes' : 'No'} />
              {p.manufacturer && <Spec label="Manufacturer" value={p.manufacturer} />}
            </dl>

            {p.hcpcsCode && (
              <p className="mt-4 max-w-xl text-[12px] leading-relaxed text-ink-muted">
                HCPCS code shown for reference only. Coverage, medical-necessity criteria, and
                payment vary by payer and plan — verify against the current policy before billing.
              </p>
            )}
          </div>

          {/* Buy box */}
          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-2xl border border-ink/10 bg-white p-6 shadow-sm">
              <p className="text-[30px] font-extrabold tracking-tight text-ink">
                {money(p.priceCents)}
              </p>
              <p className="mt-1 text-[13px] text-ink-muted">
                {p.unitsPerBox && p.unitsPerBox > 1 ? `Box of ${p.unitsPerBox}` : 'Each'}
                {unit && ` · ${unit} per piece`}
              </p>

              {p.rxOnly && (
                <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] font-semibold text-amber-900">
                  Rx only — sold to licensed clinicians.
                </p>
              )}

              <div className="mt-5">
                <SupplyAddToCart
                  handle={p.handle}
                  title={p.title}
                  priceCents={p.priceCents}
                  unitsPerBox={p.unitsPerBox}
                  imageUrl={p.imageUrl}
                />
              </div>

              <p className="mt-4 text-[12px] leading-relaxed text-ink-muted">
                Free shipping over $300 · $9.99 flat otherwise · US shipping only
              </p>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="mb-5 text-[20px] font-extrabold tracking-tight text-ink">
              {p.brand ? `More from ${p.brand}` : `More ${categoryLabel(p.category).toLowerCase()}`}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((r) => (
                <SupplyProductCard key={r.handle} p={r} />
              ))}
            </div>
          </section>
        )}
      </div>

      <SupplyFooter />
    </>
  );
}

function Spec({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-6 py-2.5">
      <dt className="font-semibold text-ink-soft">{label}</dt>
      <dd className={mono ? 'font-mono text-ink' : 'text-ink'}>{value}</dd>
    </div>
  );
}
