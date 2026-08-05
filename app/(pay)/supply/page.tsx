import Link from 'next/link';
import type { Metadata } from 'next';
import { SupplyHeader, SupplyFooter } from '@/components/SupplyShell';
import { SupplyProductCard } from '@/components/SupplyProductCard';
import { listSupplyProducts } from '@/lib/supply';
import { SUPPLY_CATEGORIES, money } from '@/lib/supply-shared';
import PayHomePage from '../pay-home/page';

/**
 * Supply storefront home. Reached by middleware rewriting `/` on the checkout
 * host, so the visible URL stays meritcheckout.com/.
 *
 * Medical-device register throughout: cool near-white, hairline rules, square
 * corners, no shadows, colour reserved for interaction. The prior pass used
 * warm cream and deep radii, which reads apothecary — wrong for a supplier
 * whose buyer is comparing against Molnlycke and Solventum catalogs.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Merit Clinical — advanced wound care & supply',
};

export default async function SupplyHome() {
  const products = await listSupplyProducts();

  // NO CATALOG → this is a payment domain, not a store. Gated on the data
  // rather than a feature flag: a switch a human must remember to flip can
  // disagree with reality, and it did — an empty branded store went public.
  if (products.length === 0) return <PayHomePage />;

  const featured = products.filter((p) => p.category === 'COLLAGEN').slice(0, 4);
  const cheapest = Math.min(...products.map((p) => p.priceCents));

  return (
    <div className="bg-paper">
      <SupplyHeader />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-[1280px] px-6 py-20 sm:py-28">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink-muted">
              Advanced wound care
            </p>
            <h1 className="mt-5 font-display text-[40px] font-bold leading-[1.06] tracking-[-0.035em] text-ink sm:text-[56px]">
              Clinical supply,
              <br />
              sourced direct.
            </h1>
            <p className="mt-6 max-w-lg text-[16px] leading-[1.65] text-ink-soft">
              Collagen, alginates, foams, gels, and securement — supplied by the box to
              clinicians and healthcare facilities. Every item lists its REF number and HCPCS
              code so it can be matched against what you already order.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link
                href="/shop"
                className="border border-ink bg-ink px-7 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-85"
              >
                View catalog
              </Link>
              <Link
                href="/shop?category=COLLAGEN"
                className="border border-line bg-white px-7 py-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink transition-colors hover:border-ink/40"
              >
                Collagen
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Spec strip ───────────────────────────────────────────────────── */}
      <section className="border-b border-line bg-white">
        <div className="mx-auto grid max-w-[1280px] grid-cols-2 divide-x divide-line border-x border-line px-0 lg:grid-cols-4">
          {[
            ['Catalog', `${products.length} SKUs`],
            ['Pricing', `From ${money(cheapest)} per box`],
            ['Coding', 'HCPCS listed per item'],
            ['Shipping', 'Free over $300 · US only'],
          ].map(([label, value]) => (
            <div key={label} className="px-6 py-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                {label}
              </p>
              <p className="mt-2 text-[15px] font-medium tracking-[-0.01em] text-ink">{value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1280px] px-6 py-16">
        <div className="grid gap-px border border-line bg-line sm:grid-cols-3">
          {SUPPLY_CATEGORIES.map((c) => {
            const count = products.filter((p) => p.category === c.key).length;
            if (!count) return null;
            return (
              <Link
                key={c.key}
                href={`/shop?category=${c.key}`}
                className="group bg-white p-8 transition-colors hover:bg-paper"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-ink">
                    {c.label}
                  </h2>
                  <span className="text-[11px] tabular-nums text-ink-muted">{count}</span>
                </div>
                <p className="mt-2.5 text-[13px] leading-relaxed text-ink-soft">{c.blurb}</p>
                <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink transition-transform group-hover:translate-x-0.5">
                  Browse →
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Featured ─────────────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-[1280px] px-6 pb-20">
          <div className="mb-6 flex items-baseline justify-between border-b border-line pb-4">
            <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-ink">Collagen</h2>
            <Link
              href="/shop?category=COLLAGEN"
              className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-soft transition-colors hover:text-ink"
            >
              All collagen →
            </Link>
          </div>
          <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p) => (
              <SupplyProductCard key={p.handle} p={p} />
            ))}
          </div>
        </section>
      )}

      <SupplyFooter />
    </div>
  );
}
