import Link from 'next/link';
import type { Metadata } from 'next';
import { SupplyHeader, SupplyFooter } from '@/components/SupplyShell';
import { SupplyProductCard } from '@/components/SupplyProductCard';
import { listSupplyProducts, SUPPLY_CATEGORIES, money } from '@/lib/supply';
import PayHomePage from '../pay-home/page';

/**
 * Supply storefront home. Reached by middleware rewriting `/` on the checkout
 * host, so the visible URL stays meritcheckout.com/ — the same technique the
 * old /pay-home used, which this replaces.
 *
 * Clinic-first by construction: the catalog is HCPCS-coded, boxed, and priced
 * wholesale, so the page leads with sourcing facts rather than lifestyle
 * copy. No photography is used because none exists yet, and placeholder
 * imagery on a medical catalog reads worse than none.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Clinical wound care & supply',
};

export default async function SupplyHome() {
  const products = await listSupplyProducts();

  // NO CATALOG → this is a payment domain, not a store.
  //
  // Gated on the data rather than a feature flag, deliberately. This started as
  // SUPPLY_STOREFRONT, which was the wrong shape: a switch a human has to
  // remember to flip can disagree with reality, and it did — meritcheckout.com
  // publicly served "Wound care supply, without the markup" with every category
  // reading zero, because the storefront shipped before the catalog decision was
  // made.
  //
  // The database already knows whether there is anything to sell. Load products
  // and the storefront appears; remove them and it goes back to being a payment
  // page. Nothing to configure, nothing to drift, and the failure mode of a DB
  // outage is the payment page — which is the safe direction.
  if (products.length === 0) return <PayHomePage />;

  const featured = products.filter((p) => p.category === 'COLLAGEN').slice(0, 3);
  const cheapest = products.length
    ? Math.min(...products.map((p) => p.priceCents))
    : 0;

  return (
    <>
      <SupplyHeader />

      <section className="border-b border-ink/10 bg-bone">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-cobalt">
            — Clinical supply
          </p>
          <h1 className="mt-3 max-w-3xl text-[38px] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-[52px]">
            Wound care supply,
            <br />
            without the markup.
          </h1>
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-ink-soft">
            Collagen, alginates, foams, and NPWT disposables — sold by the box, direct to your
            practice. Every product lists its REF number and HCPCS code so you can match what
            you already order.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/shop"
              className="rounded-xl bg-ink px-7 py-3.5 text-[13px] font-bold uppercase tracking-wider text-white shadow-sm transition hover:opacity-90"
            >
              Browse the catalog
            </Link>
            {cheapest > 0 && (
              <span className="text-[13px] text-ink-muted">
                From {money(cheapest)} per box · Free shipping over $300
              </span>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-4 sm:grid-cols-3">
          {SUPPLY_CATEGORIES.map((c) => {
            const count = products.filter((p) => p.category === c.key).length;
            return (
              <Link
                key={c.key}
                href={`/shop?category=${c.key}`}
                className="group rounded-2xl border border-ink/10 bg-white p-6 transition hover:border-ink/30"
              >
                <div className="flex items-baseline justify-between">
                  <h2 className="text-[17px] font-bold text-ink group-hover:underline">
                    {c.label}
                  </h2>
                  <span className="text-[12px] font-semibold text-ink-muted">{count}</span>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{c.blurb}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pb-16">
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="text-[22px] font-extrabold tracking-tight text-ink">Collagen</h2>
            <Link href="/shop?category=COLLAGEN" className="text-[13px] font-semibold text-cobalt hover:underline">
              View all →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((p) => (
              <SupplyProductCard key={p.handle} p={p} />
            ))}
          </div>
        </section>
      )}

      <SupplyFooter />
    </>
  );
}
