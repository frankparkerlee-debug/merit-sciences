import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getProduct, listProducts } from '@/lib/catalog';
import {
  getFamily,
  familyLabel,
  PHARMACIST_NOTES,
  RESTOCK_SIGNALS,
  stacksContaining,
  FAMILY_BY_HANDLE,
  type Family,
} from '@/lib/catalog-meta';
import { ProductBuyBox } from './ProductBuyBox';

type Props = { params: { handle: string } };

export async function generateStaticParams() {
  return listProducts().map((p) => ({ handle: p.handle }));
}

export async function generateMetadata({ params }: Props) {
  const p = getProduct(params.handle);
  return {
    title: p ? `${p.title} · ${p.vialSize} · Merit Sciences` : 'Product',
    description: p?.oneLiner || `${p?.title} — pharmacy-verified, lot-tested, shipped from Dallas in 48 hours.`,
  };
}

export default function ProductPage({ params }: Props) {
  const product = getProduct(params.handle);
  if (!product) return notFound();

  const family = getFamily(product.handle);
  const pharmacistNote = PHARMACIST_NOTES[product.handle] ?? null;
  const restock = RESTOCK_SIGNALS[product.handle] ?? null;

  // Related products — same family, exclude self
  const allProducts = listProducts({ status: 'active' });
  const related = family
    ? allProducts
        .filter((p) => p.handle !== product.handle && FAMILY_BY_HANDLE[p.handle] === family)
        .slice(0, 4)
    : [];

  // Stacks that contain this product
  const stacks = stacksContaining(product.handle, allProducts);

  return (
    // Bottom padding on mobile reserves space for the sticky add-to-cart bar
    <main className="bg-cream min-h-screen pb-24 lg:pb-0">
      {/* Breadcrumbs */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 pt-4 pb-2 text-xs text-ink-muted overflow-x-auto whitespace-nowrap">
        <Link href="/" className="hover:text-ink transition">Home</Link>
        {' · '}
        <Link href="/catalog" className="hover:text-ink transition">Catalog</Link>
        {' · '}
        {family && (
          <>
            <Link href={`/catalog?family=${family}`} className="hover:text-ink transition">
              {familyLabel(family)}
            </Link>
            {' · '}
          </>
        )}
        <span className="text-ink">{product.title}</span>
      </div>

      {/* ═══════════════ HERO — image + buybox ═══════════════ */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-12 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-14">
          {/* LEFT — image gallery with trust badges */}
          <ProductGallery product={product} family={family} />

          {/* RIGHT — buybox */}
          <ProductBuyBox
            product={product}
            family={family}
            pharmacistNote={pharmacistNote}
            restock={restock}
          />
        </div>
      </section>

      {/* ═══════════════ TRUST STRIP ═══════════════ */}
      <section className="bg-ink text-white border-y border-cobalt/30 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-4 flex flex-wrap items-center justify-between gap-3 text-[12px] lg:text-[13px]">
          <div className="flex flex-wrap gap-6 lg:gap-8 font-black tracking-[0.18em] uppercase text-[10px] lg:text-[11px]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cobalt" />
              Pharmacy-Verified
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cobalt" />
              ≥99% Purity
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cobalt" />
              503B Facility · ISO-Certified
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cobalt" />
              48hr Dispatch from Dallas
            </span>
          </div>
        </div>
      </section>

      {/* ═══════════════ WHAT SHIPS — editorial substance below the fold ═══════════════
          Answers the implicit "what am I actually getting" question that
          chemistry/specs don't. Three columns: the vial, storage, verification. */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-12 pt-12 lg:pt-16 pb-6 lg:pb-8">
        <div className="max-w-2xl mb-8 lg:mb-10">
          <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
            — What ships
          </p>
          <h2
            className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95]"
            style={{ fontSize: 'clamp(28px, 4vw, 52px)' }}
          >
            What you actually receive<span className="text-cobalt">.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
          {/* COL 1 — the vial itself */}
          <div className="bg-white border border-cobalt/10 rounded-2xl p-6 lg:p-7 flex flex-col">
            <div className="w-10 h-10 rounded-full bg-cobalt/10 flex items-center justify-center text-cobalt mb-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M9 2h6v3h-1v3l3.5 8a3 3 0 0 1-2.8 4.1H7.3A3 3 0 0 1 4.5 16L8 8V5H7V2z" />
              </svg>
            </div>
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">
              The vial
            </p>
            <h3 className="font-display text-lg font-extrabold text-ink mb-2 leading-tight">
              {product.vialSize} · lyophilized
            </h3>
            <p className="text-sm text-ink-soft leading-relaxed">
              Sealed glass vial, sterile-filled at a 503B outsourcing facility.
              Lyophilized powder format — significantly longer sealed stability
              than pre-reconstituted alternatives. Label carries CAS, lot, and
              tested date.
            </p>
          </div>

          {/* COL 2 — storage & shelf life */}
          <div className="bg-white border border-cobalt/10 rounded-2xl p-6 lg:p-7 flex flex-col">
            <div className="w-10 h-10 rounded-full bg-cobalt/10 flex items-center justify-center text-cobalt mb-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <line x1="12" y1="2" x2="12" y2="22" />
                <path d="M5 8a7 7 0 1 0 14 0" />
                <path d="M5 16a7 7 0 1 1 14 0" />
              </svg>
            </div>
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">
              Storage & shelf-life
            </p>
            <h3 className="font-display text-lg font-extrabold text-ink mb-2 leading-tight">
              ≥24 mo. sealed at -20°C
            </h3>
            <p className="text-sm text-ink-soft leading-relaxed">
              Ships at ambient — lyophilized powder is stable in transit and
              does not require cold-chain shipping. Once reconstituted with
              bacteriostatic water, refrigerate at 2–8°C; use within 30 days.
            </p>
          </div>

          {/* COL 3 — verification trail */}
          <div className="bg-white border border-cobalt/10 rounded-2xl p-6 lg:p-7 flex flex-col">
            <div className="w-10 h-10 rounded-full bg-cobalt/10 flex items-center justify-center text-cobalt mb-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">
              Verification trail
            </p>
            <h3 className="font-display text-lg font-extrabold text-ink mb-2 leading-tight">
              Lot {product.lot.id !== 'TBD' ? product.lot.id : 'on label'} · COA on demand
            </h3>
            <p className="text-sm text-ink-soft leading-relaxed">
              Every batch HPLC-verified to {product.lot.purity || '≥99% purity'} and
              signed off by a US-licensed pharmacist before release. Lot number
              on the label — pull the matching COA anytime from your dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════ THE CHEMISTRY (spec sheet) ═══════════════ */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-12 py-12 lg:py-16">
        <div className="max-w-2xl mb-8 lg:mb-10">
          <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
            — The Chemistry
          </p>
          <h2
            className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95]"
            style={{ fontSize: 'clamp(28px, 4vw, 52px)' }}
          >
            The numbers, plainly<span className="text-cobalt">.</span>
          </h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-cobalt/10 rounded-2xl overflow-hidden divide-x divide-y divide-cobalt/10">
          {[
            ['CAS', product.spec.cas],
            ['Molecular weight', product.spec.mw],
            ['Formula', product.spec.formula],
            ['Sequence', product.spec.sequence],
            ['Format', product.format === 'lyophilized' ? 'Lyophilized powder' : 'Reconstituted'],
            ['Vial dose', product.vialSize],
            ['Purity (HPLC)', product.lot.purity],
            ['Amino acids', product.spec.aminoAcids ?? undefined],
          ].map(([label, value]) => (
            <div key={String(label)} className="bg-white p-5 lg:p-6">
              <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">
                {label}
              </p>
              <p className="font-display text-sm lg:text-base font-bold text-ink break-words">
                {value ?? '—'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════ PHARMACIST'S NOTE (if present) ═══════════════ */}
      {pharmacistNote && (
        <section className="bg-cream/70 border-y border-cobalt/10">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-10 lg:py-14">
            <div className="max-w-3xl">
              <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
                — The Pharmacist&apos;s Note
              </p>
              <blockquote
                className="font-display text-ink tracking-[-0.025em] leading-[1.2] italic"
                style={{ fontSize: 'clamp(22px, 2.8vw, 36px)' }}
              >
                &ldquo;{pharmacistNote}&rdquo;
              </blockquote>
              <p className="mt-5 text-[12px] text-ink-soft">
                — Our US-licensed pharmacy team, on {product.title}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ PAIRS WELL WITH (stacks) ═══════════════ */}
      {stacks.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-6 lg:px-12 py-12 lg:py-16">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8 lg:mb-10">
            <div>
              <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
                — Pairs Well With
              </p>
              <h2
                className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95]"
                style={{ fontSize: 'clamp(28px, 4vw, 52px)' }}
              >
                Researchers stack this with<span className="text-cobalt">.</span>
              </h2>
            </div>
            <Link
              href="/catalog"
              className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold hover:text-ink transition"
            >
              See all stacks →
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
            {stacks.map((stack) => (
              <div
                key={stack.slug}
                className="bg-white rounded-2xl border border-cobalt/10 p-6 lg:p-7 hover:border-cobalt/30 transition-colors"
              >
                <span className="inline-block text-[9px] font-bold tracking-[0.18em] uppercase text-cobalt mb-3 px-2 py-0.5 rounded bg-cobalt/10 border border-cobalt/20">
                  Pre-built stack
                </span>
                <h3 className="font-display text-xl font-extrabold text-ink mb-1">{stack.name}</h3>
                <p className="text-[12px] text-ink-soft uppercase tracking-[0.12em] mb-3">{stack.subtitle}</p>
                <p className="text-sm text-ink-soft mb-5 leading-relaxed">{stack.description}</p>
                <div className="text-[11px] tracking-[0.1em] uppercase text-cobalt font-bold mb-4">
                  {stack.items.map((p) => p.title).join(' + ')}
                </div>
                <div className="flex items-baseline justify-between pt-4 border-t border-cobalt/10">
                  <div>
                    <p className="font-display text-2xl font-bold text-ink">
                      ${(stack.discountedCents / 100).toFixed(2)}
                    </p>
                    <p className="text-[11px] text-ink-soft">
                      <span className="line-through">${(stack.sumCents / 100).toFixed(2)}</span>
                      {' · '}save {stack.bundleDiscountPct}%
                    </p>
                  </div>
                  <button
                    type="button"
                    className="bg-cobalt text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition"
                  >
                    Add stack →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════ FAQ ═══════════════ */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-12 py-12 lg:py-16 border-t border-cobalt/10">
        <div className="max-w-2xl mb-8 lg:mb-10">
          <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
            — Common Questions
          </p>
          <h2
            className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95]"
            style={{ fontSize: 'clamp(28px, 4vw, 52px)' }}
          >
            Got questions<span className="text-cobalt">.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* FAQ accordion */}
          <div className="lg:col-span-2 space-y-3">
            {[
              {
                q: 'Why does Merit ship lyophilized?',
                a: 'Lyophilized format gives ≥24 months sealed stability at -20°C — significantly longer than pre-reconstituted, which has a 30-day shelf life once in solution. You reconstitute at the moment of use, when potency is at its peak.',
              },
              {
                q: 'How do I verify my lot\'s COA?',
                a: 'Your vial label carries the lot number. Use that number to pull the COA on our site at any time — the COA for your specific batch lives at /coa/[lot-id] and stays accessible for the life of the product.',
              },
              {
                q: 'What does "pharmacy-verified" actually mean?',
                a: 'A US-licensed pharmacist on our team reviews every batch before release. They sign off on the lot\'s purity, identity, and release. No batch ships without that sign-off — and that\'s what separates Merit from a reseller catalog.',
              },
              {
                q: 'Will my bank flag this purchase?',
                a: 'Statements show as Merit Sciences LLC. Standard merchant descriptor — does not trigger category-code flags. All major cards via Stripe; PayPal accepted at checkout.',
              },
              {
                q: 'How fast does it ship?',
                a: '48 hours from order to dispatch, Monday through Thursday. UPS Ground, tracked + insured. From Dallas, TX, most US addresses receive within 3-5 business days.',
              },
            ].map((item, i) => (
              <details
                key={item.q}
                className="group bg-white border border-cobalt/10 rounded-xl overflow-hidden"
                open={i === 0}
              >
                <summary className="cursor-pointer p-5 lg:p-6 font-semibold text-ink text-sm lg:text-base flex items-center justify-between gap-4 list-none">
                  {item.q}
                  <span className="text-cobalt transition-transform group-open:rotate-45 text-2xl leading-none font-light">+</span>
                </summary>
                <p className="px-5 lg:px-6 pb-5 lg:pb-6 text-sm text-ink-soft leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>

          {/* Talk to a pharmacist callout */}
          <div className="bg-ink text-white rounded-2xl p-6 lg:p-7 flex flex-col h-fit">
            <div className="w-10 h-10 rounded-full bg-white/15 border border-white/25 flex items-center justify-center mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
            </div>
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt-soft font-bold mb-2">
              — Talk to a Pharmacologist
            </p>
            <h3 className="font-display text-xl lg:text-2xl font-extrabold mb-3 leading-tight">
              Question we didn&apos;t answer?
            </h3>
            <p className="text-[13px] text-white/80 mb-5 leading-relaxed flex-1">
              Our team answers compound questions, lot questions, and
              protocol questions — same business day. No bots, no tickets.
            </p>
            <a
              href={`mailto:rx@meritsciences.com?subject=Question about ${product.title}`}
              className="inline-flex items-center justify-center bg-white text-ink px-5 py-3 rounded-lg font-bold text-sm hover:opacity-90 transition"
            >
              Email the team →
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════ RELATED COMPOUNDS ═══════════════ */}
      {related.length > 0 && (
        <section className="bg-white border-t border-cobalt/10">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-12 lg:py-16">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8 lg:mb-10">
              <div>
                <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
                  — Same Family
                </p>
                <h2
                  className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95]"
                  style={{ fontSize: 'clamp(26px, 3.5vw, 44px)' }}
                >
                  More {family && familyLabel(family).toLowerCase()}<span className="text-cobalt">.</span>
                </h2>
              </div>
              <Link
                href="/catalog"
                className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold hover:text-ink transition"
              >
                Browse all compounds →
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
              {related.map((p) => (
                <Link
                  key={p.handle}
                  href={`/products/${p.handle}`}
                  className="group block bg-cream rounded-2xl overflow-hidden border border-cobalt/8 hover:border-cobalt/30 transition-colors"
                >
                  <div className="relative aspect-square bg-cream overflow-hidden">
                    {p.imageUrl && (
                      <Image
                        src={p.imageUrl}
                        alt={p.title}
                        fill
                        sizes="(max-width: 640px) 50vw, 25vw"
                        className="object-contain p-7 group-hover:scale-[1.04] transition-transform duration-500"
                      />
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-display text-base lg:text-lg font-extrabold text-ink mb-1 tracking-tight leading-tight">
                      {p.title}
                    </h3>
                    <p className="text-[11px] text-ink-soft mb-3">{p.vialSize}</p>
                    <p className="font-display text-base font-bold text-ink">
                      ${(p.priceCents / 100).toFixed(2)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Product Gallery — left side of hero
// ─────────────────────────────────────────────────────────────────────────

function ProductGallery({
  product,
  family,
}: {
  product: ReturnType<typeof getProduct>;
  family: Family | null;
}) {
  if (!product) return null;
  return (
    <div className="relative">
      {/* Main image with cream tile + cobalt halo behind.
          Mobile: aspect-[4/3] + max-h-[45vh] — keeps the image compact
          so the buybox below has fold room for bundle/subscribe.
          sm+: aspect-square + no height cap (desktop layout). */}
      <div className="relative w-full overflow-hidden rounded-2xl bg-cream border border-cobalt/10 aspect-[4/3] sm:aspect-square max-h-[45vh] sm:max-h-none">
        {/* Cobalt halo behind */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 55% 60% at center, rgba(80,120,255,0.30) 0%, rgba(46,77,219,0.14) 40%, transparent 75%)',
          }}
        />
        {product.imageUrl && (
          <Image
            src={product.imageUrl}
            alt={product.title}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain p-5 sm:p-10 lg:p-14 relative z-10"
          />
        )}
        {/* On-image badges + "Pharmacy Verified" stamp removed — they were
            competing with the vial. The same trust signals live in:
            - The buybox stars-row + family eyebrow (right column)
            - The charcoal trust strip below the hero
            - The benefit-badge grid below this image (on tablet+) */}
      </div>

      {/* Thumbnail row — only renders if product has multiple images.
          Mobile shows nothing (no extra images yet), saving vertical space.
          Desktop shows the placeholder row. */}
      {product.images && product.images.length > 1 && (
        <div className="grid grid-cols-5 gap-2 mt-3 lg:mt-4">
          {product.images.slice(0, 5).map((img, i) => (
            <div
              key={i}
              className={`aspect-square rounded-lg overflow-hidden bg-cream border ${
                i === 0 ? 'border-cobalt/40' : 'border-cobalt/8'
              } relative`}
            >
              <Image
                src={img}
                alt=""
                fill
                sizes="100px"
                className="object-contain p-2"
              />
            </div>
          ))}
        </div>
      )}

      {/* Bottom benefit badges — Merit's RUO-safe equivalents.
          Hidden on mobile (eats fold space; same info repeats in the
          trust strip below + the trust pills in the buybox). Tablet+ shows. */}
      <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3 mt-3 lg:mt-4">
        {[
          { label: 'Lot-Documented', icon: 'doc' },
          { label: 'HPLC-Verified', icon: 'flask' },
          { label: 'US Pharmacist', icon: 'check' },
          { label: 'Same Reorder Price', icon: 'refresh' },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-white border border-cobalt/10 rounded-xl px-3 py-3 flex flex-col items-center text-center"
          >
            <div className="w-7 h-7 rounded-full bg-cobalt/10 flex items-center justify-center mb-2 text-cobalt">
              {item.icon === 'doc' && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              )}
              {item.icon === 'flask' && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <path d="M10 2v7.31" />
                  <path d="M14 9.3V1.99" />
                  <path d="M8.5 2h7" />
                  <path d="M14 9.3a6.5 6.5 0 1 1-4 0" />
                </svg>
              )}
              {item.icon === 'check' && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {item.icon === 'refresh' && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                  <polyline points="23 4 23 10 17 10" />
                  <polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              )}
            </div>
            <p className="text-[9px] lg:text-[10px] font-bold tracking-[0.05em] text-ink leading-tight">
              {item.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
