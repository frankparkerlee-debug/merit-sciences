import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { SupplyHeader, SupplyFooter } from '@/components/SupplyShell';
import { ShopClient } from './ShopClient';
import { listSupplyProducts, SUPPLY_CATEGORIES } from '@/lib/supply';
import type { SupplyCategory } from '@/lib/generated/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Shop clinical supply',
};

const VALID = new Set(SUPPLY_CATEGORIES.map((c) => c.key));

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const sp = await searchParams;
  // Validate against the enum rather than passing the raw param to Prisma —
  // an unknown value would otherwise throw at the query rather than simply
  // showing everything.
  const raw = (sp.category ?? '').toUpperCase() as SupplyCategory;
  const active = VALID.has(raw) ? raw : undefined;

  const products = await listSupplyProducts({ category: active });

  // An empty catalog means there is no store — 404 rather than render a
  // branded shell around nothing. See the note in ../supply/page.tsx: this
  // used to be a feature flag, and the flag disagreed with reality.
  if (products.length === 0 && !active) notFound();

  const heading = active
    ? SUPPLY_CATEGORIES.find((c) => c.key === active)?.label ?? 'Products'
    : 'All products';

  return (
    <>
      <SupplyHeader />

      <div className="mx-auto max-w-[1240px] px-5 py-10">
        {/* Category lives in the URL (shareable, linked from the homepage
            tiles); search and family facets are client-side. */}
        <nav className="mb-7 flex flex-wrap gap-2">
          <FilterPill href="/shop" label="All" active={!active} />
          {SUPPLY_CATEGORIES.map((c) => (
            <FilterPill
              key={c.key}
              href={`/shop?category=${c.key}`}
              label={c.label}
              active={active === c.key}
            />
          ))}
        </nav>

        <ShopClient products={products} heading={heading} />

        <p className="mt-10 text-[12px] leading-relaxed text-ink-muted">
          Priced per box · free shipping over $300 · US shipping only
        </p>
      </div>

      <SupplyFooter />
    </>
  );
}

function FilterPill({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={
        active
          ? 'rounded-full bg-ink px-4 py-1.5 text-[12px] font-bold uppercase tracking-wider text-white'
          : 'rounded-full border border-ink/15 px-4 py-1.5 text-[12px] font-bold uppercase tracking-wider text-ink-soft transition hover:border-ink/40 hover:text-ink'
      }
    >
      {label}
    </Link>
  );
}
