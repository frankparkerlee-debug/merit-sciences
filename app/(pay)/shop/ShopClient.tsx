'use client';

import { useMemo, useState } from 'react';
import { SupplyProductCard } from '@/components/SupplyProductCard';
import type { SupplyListItem } from '@/lib/supply-shared';

/**
 * Catalog filtering for the clinic storefront.
 *
 * Client-side over the full list rather than URL params and round trips: at 50
 * SKUs the entire catalog is a few KB, so every keystroke can filter instantly.
 * A supply buyer works down a reorder list — they type a REF, scan, add, and
 * type the next one. A page reload between each is the whole friction.
 *
 * Search deliberately matches REF and HCPCS as well as the name. That is how
 * this buyer actually searches: they are holding an invoice or a chart note
 * with "A6196" or "MA-0433CA" on it, not thinking in product names.
 */

type Props = { products: SupplyListItem[]; heading: string };

type Sort = 'curated' | 'price-asc' | 'price-desc' | 'name';

export function ShopClient({ products, heading }: Props) {
  const [q, setQ] = useState('');
  const [families, setFamilies] = useState<string[]>([]);
  const [sort, setSort] = useState<Sort>('curated');
  const [rxOnly, setRxOnly] = useState(false);

  // Families come from the data, so adding a product category to the catalog
  // adds its filter automatically — no second list to keep in sync.
  const allFamilies = useMemo(() => {
    const seen = new Map<string, number>();
    for (const p of products) {
      const f = p.eyebrow?.trim();
      if (f) seen.set(f, (seen.get(f) ?? 0) + 1);
    }
    return [...seen.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [products]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = products.filter((p) => {
      if (rxOnly && !p.rxOnly) return false;
      if (families.length && !families.includes(p.eyebrow ?? '')) return false;
      if (!needle) return true;
      return (
        p.title.toLowerCase().includes(needle) ||
        (p.sku ?? '').toLowerCase().includes(needle) ||
        (p.hcpcsCode ?? '').toLowerCase().includes(needle) ||
        (p.size ?? '').toLowerCase().includes(needle) ||
        p.oneLiner.toLowerCase().includes(needle)
      );
    });

    if (sort === 'price-asc') out = [...out].sort((a, b) => a.priceCents - b.priceCents);
    else if (sort === 'price-desc') out = [...out].sort((a, b) => b.priceCents - a.priceCents);
    else if (sort === 'name') out = [...out].sort((a, b) => a.title.localeCompare(b.title));
    return out;
  }, [products, q, families, sort, rxOnly]);

  const toggleFamily = (f: string) =>
    setFamilies((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  const clear = () => {
    setQ('');
    setFamilies([]);
    setRxOnly(false);
    setSort('curated');
  };

  const dirty = q !== '' || families.length > 0 || rxOnly || sort !== 'curated';

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="relative min-w-[240px] flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, REF, HCPCS, or size…"
            aria-label="Search products"
            className="w-full border border-line bg-white py-2.5 pl-10 pr-3 text-[13.5px] text-ink placeholder:text-ink-muted focus:border-ink/40 focus:outline-none"
          />
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="9" cy="9" r="6" />
            <path d="m14 14 4 4" strokeLinecap="round" />
          </svg>
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label="Sort products"
          className="border border-line bg-white px-3 py-2.5 text-[12.5px] font-medium text-ink-soft focus:border-ink/40 focus:outline-none"
        >
          <option value="curated">Sort: Curated</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="name">Name A–Z</option>
        </select>

        <label className="flex cursor-pointer select-none items-center gap-2 border border-line bg-white px-3.5 py-2.5 text-[12.5px] font-medium text-ink-soft">
          <input
            type="checkbox"
            checked={rxOnly}
            onChange={(e) => setRxOnly(e.target.checked)}
            className="h-3 w-3 accent-ink"
          />
          Rx only
        </label>
      </div>

      <div className="mb-7 flex flex-wrap gap-1.5">
        {allFamilies.map(([f, n]) => {
          const on = families.includes(f);
          return (
            <button
              key={f}
              onClick={() => toggleFamily(f)}
              aria-pressed={on}
              className={
                on
                  ? 'border border-ink bg-ink px-3 py-1.5 text-[11.5px] font-medium text-white'
                  : 'border border-line bg-white px-3 py-1.5 text-[11.5px] font-medium text-ink-soft transition-colors hover:border-ink/40 hover:text-ink'
              }
            >
              {f} <span className={on ? 'ml-1 opacity-60 tabular-nums' : 'ml-1 text-ink-muted tabular-nums'}>{n}</span>
            </button>
          );
        })}
      </div>

      <div className="mb-5 flex items-baseline justify-between gap-4 border-b border-line pb-4">
        <h1 className="text-[24px] font-semibold tracking-[-0.025em] text-ink">{heading}</h1>
        <p className="text-[12.5px] tabular-nums text-ink-muted">
          {filtered.length} of {products.length}
          {dirty && (
            <button onClick={clear} className="ml-3 font-medium text-ink underline underline-offset-2 hover:no-underline">
              Clear
            </button>
          )}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-line bg-white p-14 text-center">
          <p className="text-[15px] font-semibold text-ink">No products match.</p>
          <p className="mt-1 text-[13px] text-ink-soft">
            Try a REF number, a HCPCS code, or{' '}
            <button onClick={clear} className="font-medium text-ink underline underline-offset-2 hover:no-underline">
              clear the filters
            </button>
            .
          </p>
        </div>
      ) : (
        <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => (
            <SupplyProductCard key={p.handle} p={p} />
          ))}
        </div>
      )}
    </>
  );
}
