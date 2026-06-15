import { Fragment } from 'react';
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
import { getResearchData } from '@/lib/research-data';
import { ProductBuyBox } from './ProductBuyBox';
import { PdpStackAddButton } from './PdpStackAddButton';

type Props = { params: { handle: string } };

export async function generateStaticParams() {
  return (await listProducts()).map((p) => ({ handle: p.handle }));
}

export async function generateMetadata({ params }: Props) {
  const p = await getProduct(params.handle);
  return {
    title: p ? `${p.title} · ${p.vialSize} · Merit Sciences` : 'Product',
    // PPC-safer fallback description — drops "pharmacy-verified" pharma
    // language; explicit "not for human or veterinary use" satisfies
    // Meta/Google ad reviewers' RUO documentation expectation.
    description:
      p?.oneLiner
      || `${p?.title}, research compound. HPLC-verified ≥99% purity, lot-documented. Ships 48hr from Dallas. Research use only — not for human or veterinary use.`,
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProduct(params.handle);
  if (!product) return notFound();

  const family = getFamily(product.handle);
  const pharmacistNote = PHARMACIST_NOTES[product.handle] ?? null;
  const restock = RESTOCK_SIGNALS[product.handle] ?? null;
  const research = getResearchData(product.handle);

  // A chromatogram image is sometimes present at images[1] (Shopify
  // CDN naming convention: chromatogram-{handle}_*.png). Render the
  // Lab Analysis section only when it's there.
  const chromatogramImage = product.images?.find((url) =>
    url.toLowerCase().includes('chromatogram'),
  ) ?? null;

  // Related products — same family, exclude self
  const allProducts = await listProducts({ status: 'active' });
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

      {/* "What Ships" section removed — its three cards duplicated
          content shown elsewhere: card 1 (vial format) → The Chemistry
          spec sheet; card 3 (verification trail) → Lab Analysis. The
          unique content from card 2 (storage / shelf-life) now lives
          as rows in The Chemistry table. */}

      {/* ═══════════════ ABOUT THIS COMPOUND ═══════════════
          Academic-style narrative — what the compound is, where it
          came from, what compound class it sits in. RUO framing
          throughout. Falls back to a "verification pending" panel
          when no research data exists yet. */}
      <section className="bg-white border-y border-cobalt/10">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-12 py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8 lg:gap-14">
            <div>
              <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
                — About this compound
              </p>
              <h2
                className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95] mb-5"
                style={{ fontSize: 'clamp(24px, 3.5vw, 44px)' }}
              >
                {product.title}<span className="text-cobalt">.</span>
              </h2>
              {research?.compoundClass && (
                <p className="text-[11px] tracking-[0.18em] uppercase text-cobalt font-bold mb-3 leading-snug">
                  Class · {research.compoundClass}
                </p>
              )}
              {research?.discovery && (
                <p className="text-[13px] text-ink-soft leading-relaxed">
                  <span className="font-bold text-ink">Origin. </span>
                  {research.discovery}
                </p>
              )}
            </div>

            <div className="space-y-4">
              {research?.description ? (
                research.description.map((para, i) => (
                  <p key={i} className="text-base text-ink leading-relaxed">
                    {para}
                  </p>
                ))
              ) : (
                <div className="p-6 bg-cream/60 border-l-2 border-cobalt/40 rounded-r-xl">
                  <p className="text-[11px] tracking-[0.18em] uppercase text-cobalt font-bold mb-2">
                    Research data verification in progress
                  </p>
                  <p className="text-sm text-ink-soft leading-relaxed">
                    Our pharmacy team is validating the published research
                    record for this compound. For detailed mechanism,
                    research applications, or citation requests, email{' '}
                    <a
                      href={`mailto:rx@meritsciences.com?subject=Research data: ${product.title}`}
                      className="text-cobalt font-bold underline-offset-2 hover:underline"
                    >
                      rx@meritsciences.com
                    </a>
                    .
                  </p>
                </div>
              )}

              {research?.researchApplications && research.researchApplications.length > 0 && (
                <div className="pt-2">
                  <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
                    — Common research applications
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {research.researchApplications.map((app) => (
                      <li
                        key={app}
                        className="inline-flex items-center text-[12px] font-semibold text-ink bg-cream border border-cobalt/15 rounded-full px-3 py-1.5"
                      >
                        {app}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ MECHANISM OF ACTION ═══════════════
          Conditional — only renders when research data includes a
          mechanism string. Editorial dark-card treatment so the
          density-heavy content has visual breathing room. */}
      {research?.mechanism && (
        <section className="bg-ink text-white">
          <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-12 py-10 lg:py-14">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8 lg:gap-14">
              <div>
                <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt-soft font-bold mb-3">
                  — Mechanism
                </p>
                <h2
                  className="font-display font-black tracking-[-0.035em] leading-[0.95]"
                  style={{ fontSize: 'clamp(24px, 3.5vw, 44px)' }}
                >
                  How it&apos;s been studied<span className="text-cobalt">.</span>
                </h2>
              </div>
              <div className="space-y-4">
                <p className="text-base text-white/85 leading-relaxed">
                  {research.mechanism}
                </p>
                {/* Half-life and solubility moved to the Chemistry table
                    below — keeps research-handling specs in one place. */}
                <p className="text-[11px] text-white/45 italic pt-2">
                  Mechanism descriptions reflect findings reported in the
                  preclinical and basic-research literature. They are not
                  clinical conclusions and not statements of therapeutic effect.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ THE CHEMISTRY (spec sheet) ═══════════════
          Single source of truth for handling/chemistry numbers. Pulls
          half-life + solubility from research-data when present, plus
          the static spec fields from the product record. Empty cells
          render as em-dash so the grid stays visually balanced. */}
      <section className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-12 py-10 lg:py-14">
        <div className="max-w-2xl mb-6 lg:mb-8">
          <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2.5">
            — The Chemistry
          </p>
          <h2
            className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95]"
            style={{ fontSize: 'clamp(24px, 3.5vw, 44px)' }}
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
            ['Half-life', research?.halfLife],
            ['Solubility', research?.solubility],
          ].map(([label, value]) => (
            <div key={String(label)} className="bg-white p-4 lg:p-5">
              <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">
                {label}
              </p>
              <p className="font-display text-sm lg:text-base font-bold text-ink break-words leading-snug">
                {value ?? '—'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════ LAB ANALYSIS — chromatogram + methodology ═══════════════
          Renders only when an HPLC chromatogram image exists in
          product.images. Provides the "proof of identity" that
          separates a research supplier from a reseller. */}
      {chromatogramImage && (
        <section className="bg-white border-y border-cobalt/10">
          <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-12 py-10 lg:py-14">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-8 lg:gap-12">
              {/* Caption + COA request */}
              <div>
                <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2.5">
                  — Lab analysis
                </p>
                <h2
                  className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95] mb-4"
                  style={{ fontSize: 'clamp(24px, 3.5vw, 44px)' }}
                >
                  Proof of identity<span className="text-cobalt">.</span>
                </h2>
                <p className="text-sm text-ink-soft leading-relaxed mb-5">
                  Independent HPLC-UV{product.spec.mw ? '/MS' : ''} verification
                  on every batch. The chromatogram shown is the actual analysis
                  for the lot currently shipping —
                  {product.lot.id !== 'TBD' && <> lot <span className="font-bold text-ink">{product.lot.id}</span>,</>}
                  {' '}{product.lot.purity || '≥99% purity'}, released after
                  US-pharmacist sign-off.
                </p>
                <p className="text-[12px] text-ink-muted">
                  Need the COA for a specific lot? Email{' '}
                  <a
                    href={`mailto:rx@meritsciences.com?subject=COA request: lot ${product.lot.id}`}
                    className="text-cobalt font-bold underline-offset-2 hover:underline"
                  >
                    rx@meritsciences.com
                  </a>{' '}
                  with the lot number from your vial label.
                </p>
              </div>

              {/* Chromatogram image */}
              <div className="relative">
                <div className="relative w-full aspect-[4/3] bg-white border border-cobalt/10 rounded-2xl overflow-hidden">
                  <Image
                    src={chromatogramImage}
                    alt={`HPLC chromatogram for ${product.title} lot ${product.lot.id}`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-contain p-4"
                  />
                </div>
                <p className="text-[10px] tracking-[0.18em] uppercase text-ink-muted font-bold text-center mt-3">
                  HPLC chromatogram · lot {product.lot.id} · {product.lot.purity || '≥99% purity'}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ WHY MERIT — mid-scroll differentiation ═══════════════
          Sits after the buyer has seen proof of identity (Lab Analysis)
          but before the deeper literature (References). This is where
          comparison-shoppers decide: "yes, this is the supplier I want".
          3-column comparison vs the two realistic alternatives the
          research-peptide buyer is choosing between. */}
      <section className="bg-ink text-white border-y border-cobalt/30">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-12 py-10 lg:py-14">
          <div className="max-w-2xl mb-8 lg:mb-10">
            <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt-soft font-bold mb-2.5">
              — Why Merit
            </p>
            <h2
              className="font-display font-black tracking-[-0.035em] leading-[0.95]"
              style={{ fontSize: 'clamp(24px, 3.5vw, 44px)' }}
            >
              The supplier difference<span className="text-cobalt">.</span>
            </h2>
            <p className="mt-3 text-[13px] text-white/70 leading-relaxed max-w-xl">
              How Merit compares to the two alternatives most research
              buyers consider for {product.title}.
            </p>
          </div>

          {/* Comparison rows. Each row: criterion + 3 status columns. */}
          <div className="grid grid-cols-[1.2fr_1fr_1fr_1fr] gap-px bg-white/10 rounded-2xl overflow-hidden text-[11px] sm:text-[12px] lg:text-[13px]">
            {/* Header row */}
            <div className="bg-ink/80 px-3 sm:px-5 py-3 sm:py-4 font-bold tracking-[0.05em] uppercase text-[10px] text-white/60">
              Criterion
            </div>
            <div className="bg-cobalt/15 px-3 sm:px-5 py-3 sm:py-4 text-center">
              <span className="font-display font-black text-white block leading-none">Merit</span>
              <span className="text-[9px] text-cobalt-soft tracking-[0.12em] uppercase font-bold">503B + ISO</span>
            </div>
            <div className="bg-ink/80 px-3 sm:px-5 py-3 sm:py-4 text-center">
              <span className="font-bold text-white/85 block leading-none">Online Resellers</span>
              <span className="text-[9px] text-white/40 tracking-[0.12em] uppercase font-bold">RUO only</span>
            </div>
            <div className="bg-ink/80 px-3 sm:px-5 py-3 sm:py-4 text-center">
              <span className="font-bold text-white/85 block leading-none">Compounding Rx</span>
              <span className="text-[9px] text-white/40 tracking-[0.12em] uppercase font-bold">503A</span>
            </div>

            {/* Rows */}
            {[
              {
                criterion: 'HPLC chromatogram per lot',
                merit: 'yes',
                resellers: 'sometimes',
                compounding: 'on request',
              },
              {
                criterion: 'US-pharmacist sign-off before release',
                merit: 'yes',
                resellers: 'no',
                compounding: 'yes',
              },
              {
                criterion: 'Lot ID printed on the vial label',
                merit: 'yes',
                resellers: 'rarely',
                compounding: 'yes',
              },
              {
                criterion: 'Ships from a 503B/ISO facility in the US',
                merit: 'yes',
                resellers: 'no',
                compounding: 'varies',
              },
              {
                criterion: 'Same reorder price — no markup over time',
                merit: 'yes',
                resellers: 'varies',
                compounding: 'no',
              },
              {
                criterion: '48-hour dispatch',
                merit: 'yes',
                resellers: 'no',
                compounding: 'no',
              },
            ].map((row) => (
              <Fragment key={row.criterion}>
                <div className="bg-ink/95 px-3 sm:px-5 py-2.5 sm:py-3 text-white/85 leading-snug">
                  {row.criterion}
                </div>
                <CompareCell value={row.merit} emphasis />
                <CompareCell value={row.resellers} />
                <CompareCell value={row.compounding} />
              </Fragment>
            ))}
          </div>

          <p className="text-[11px] text-white/45 italic mt-4 max-w-2xl">
            Comparison reflects published facility status and standard
            industry practice. Compounding pharmacy availability of
            research peptides varies by jurisdiction.
          </p>
        </div>
      </section>

      {/* ═══════════════ HOW A MERIT LOT IS MADE ═══════════════
          Supply-chain transparency — the conversion lever brands without
          social proof use to close the trust gap (Allbirds, Patagonia,
          AG1 patterns). Five documented steps, every one verifiable.
          Sits after Why Merit (where the buyer has seen "yes, Merit is
          different") and before References (where they go technical). */}
      <section className="bg-cream/40 border-y border-cobalt/10">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-12 py-12 lg:py-16">
          {/* Header */}
          <div className="max-w-2xl mb-10 lg:mb-14">
            <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2.5">
              — How it&apos;s made
            </p>
            <h2
              className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95]"
              style={{ fontSize: 'clamp(24px, 3.5vw, 44px)' }}
            >
              From compound to your shelf<span className="text-cobalt">.</span>
            </h2>
            <p className="mt-3 text-sm text-ink-soft leading-relaxed max-w-xl">
              Every Merit lot follows the same documented path. Five steps,
              every one verifiable.
            </p>
          </div>

          {/* Steps — vertical sequence with connector line through the
              numbered badges. ol+li for semantic ordering. */}
          <ol className="relative space-y-8 lg:space-y-10">
            {/* Connector line — runs through the centers of the number badges */}
            <div
              className="absolute left-[23px] sm:left-[31px] top-12 bottom-12 w-px bg-gradient-to-b from-cobalt/30 via-cobalt/15 to-cobalt/30"
              aria-hidden="true"
            />

            {[
              {
                num: '01',
                eyebrow: 'Sourcing',
                headline: 'Compound starts as a research-grade API.',
                description:
                  'Active pharmaceutical ingredient sourced from FDA-registered manufacturers. Identity confirmed against reference standard before any compounding begins.',
                facts: [
                  'API from FDA-registered manufacturers',
                  'Identity verified against reference standard',
                  'Chain of custody documented',
                ],
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 2v7.31" />
                    <path d="M14 9.3V1.99" />
                    <path d="M8.5 2h7" />
                    <path d="M14 9.3a6.5 6.5 0 1 1-4 0" />
                  </svg>
                ),
              },
              {
                num: '02',
                eyebrow: 'Compounding',
                headline: 'Sterile-filled at a 503B facility.',
                description:
                  'Lyophilized in a cleanroom at our 503B outsourcing facility. The powder format gives ≥24 months sealed stability — no cold-chain shipping required.',
                facts: [
                  '503B outsourcing facility, FDA-registered',
                  'ISO-certified manufacturing process',
                  'Lyophilized powder for transit stability',
                ],
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 2h6v3h-1v3l3.5 8a3 3 0 0 1-2.8 4.1H7.3A3 3 0 0 1 4.5 16L8 8V5H7V2z" />
                  </svg>
                ),
              },
              {
                num: '03',
                eyebrow: 'Verification',
                headline: 'Every batch HPLC-tested.',
                description:
                  'Reverse-phase HPLC-UV (UV/MS for higher-MW peptides) confirms identity and purity for every lot before it leaves the lab. The chromatogram is archived.',
                facts: [
                  'Reverse-phase HPLC, per-lot',
                  '≥99% purity floor — every batch',
                  'Chromatogram archived for every lot',
                ],
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 17 9 11 13 15 21 7" />
                    <polyline points="14 7 21 7 21 14" />
                  </svg>
                ),
              },
              {
                num: '04',
                eyebrow: 'Sign-off',
                headline: 'A US-licensed pharmacist releases the lot.',
                description:
                  'No batch ships without a pharmacist reviewing the chromatogram, identity report, and lot documentation. The pharmacist holds the release authority.',
                facts: [
                  'US-licensed pharmacist on every lot',
                  'Pharmacist holds release authority',
                  'No batch ships unsigned — ever',
                ],
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <polyline points="9 15 11 17 15 13" />
                  </svg>
                ),
              },
              {
                num: '05',
                eyebrow: 'Dispatch',
                headline: 'Ships from Dallas in 48 hours.',
                description:
                  'Vials labeled with lot ID, tested date, and CAS. Order before 2pm CT Monday–Thursday for same-day dispatch. UPS Ground, tracked + insured.',
                facts: [
                  '48hr dispatch from Dallas, TX',
                  'Lot ID printed on every vial label',
                  'UPS Ground, tracked + insured',
                ],
                icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                ),
              },
            ].map((step) => (
              <li
                key={step.num}
                className="relative grid grid-cols-[48px_1fr] sm:grid-cols-[64px_1fr] gap-4 sm:gap-8 items-start"
              >
                {/* Number badge — cobalt circle with white number + icon */}
                <div className="relative z-10 w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-cobalt text-white flex flex-col items-center justify-center shadow-sm ring-4 ring-cream/40">
                  <span className="font-display font-black text-[11px] sm:text-[12px] tabular-nums tracking-tight leading-none">
                    {step.num}
                  </span>
                  <span className="mt-0.5 sm:mt-1 opacity-80">{step.icon}</span>
                </div>

                {/* Content */}
                <div className="pt-1 sm:pt-2 min-w-0">
                  <p className="text-[10px] sm:text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-1.5">
                    {step.eyebrow}
                  </p>
                  <h3 className="font-display text-lg sm:text-xl lg:text-2xl font-extrabold text-ink tracking-tight leading-tight mb-2.5">
                    {step.headline}
                  </h3>
                  <p className="text-[13px] sm:text-sm text-ink-soft leading-relaxed mb-3">
                    {step.description}
                  </p>
                  {/* Concrete-facts list */}
                  <ul className="space-y-1.5">
                    {step.facts.map((fact) => (
                      <li
                        key={fact}
                        className="flex items-start gap-2 text-[12px] sm:text-[13px] text-ink leading-snug"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.6"
                          className="text-cobalt flex-shrink-0 mt-0.5"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>

          {/* Footnote */}
          <p className="text-[11px] text-ink-muted italic mt-10 lg:mt-12 max-w-2xl">
            Every step above can be verified for any specific lot by emailing{' '}
            <a
              href="mailto:rx@meritsciences.com"
              className="text-cobalt font-bold not-italic underline-offset-2 hover:underline"
            >
              rx@meritsciences.com
            </a>{' '}
            with the lot number from your vial label.
          </p>
        </div>
      </section>

      {/* ═══════════════ RESEARCH REFERENCES ═══════════════
          Citation cards with DOI / PubMed links. The verify flag is
          NOT rendered to the buyer — it lives in the data file so the
          pharmacy team can find unvalidated citations to check before
          launch (grep for `verify: true`). */}
      {research?.references && research.references.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-12 py-10 lg:py-14">
          <div className="max-w-2xl mb-6 lg:mb-8">
            <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2.5">
              — Research references
            </p>
            <h2
              className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95]"
              style={{ fontSize: 'clamp(24px, 3.5vw, 44px)' }}
            >
              The published record<span className="text-cobalt">.</span>
            </h2>
            <p className="mt-3 text-[13px] text-ink-soft leading-relaxed max-w-xl">
              Peer-reviewed work cited in the public scientific literature.
              Links resolve to PubMed or the publisher of record.
            </p>
          </div>

          <ol className="space-y-2">
            {research.references.map((ref, i) => (
              <li
                key={`${ref.doi || ref.pubmedId || ref.title}`}
                className="bg-white border border-cobalt/10 rounded-xl p-4 lg:p-5 hover:border-cobalt/30 transition-colors"
              >
                <div className="flex items-start gap-3 lg:gap-4">
                  <span className="font-display text-base lg:text-lg font-black text-cobalt/40 tabular-nums leading-none w-6 lg:w-7 flex-shrink-0 mt-1">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-[14px] lg:text-base font-extrabold text-ink leading-snug mb-1.5">
                      {ref.title}
                    </p>
                    <p className="text-[12px] text-ink-soft leading-snug mb-2.5">
                      {ref.authors} · <span className="italic">{ref.journal}</span> · {ref.year}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {ref.pubmedId && (
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] tracking-[0.12em] uppercase text-cobalt font-bold border border-cobalt/30 rounded-full px-2.5 py-1 hover:bg-cobalt hover:text-white transition"
                        >
                          PMID {ref.pubmedId} →
                        </a>
                      )}
                      {ref.doi && (
                        <a
                          href={`https://doi.org/${ref.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] tracking-[0.12em] uppercase text-ink-soft font-bold border border-cobalt/15 rounded-full px-2.5 py-1 hover:border-cobalt/40 hover:text-ink transition"
                        >
                          DOI →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>

          <p className="text-[11px] text-ink-muted italic mt-4 max-w-2xl">
            Inclusion of a reference does not constitute a clinical claim or
            recommendation.
          </p>
        </section>
      )}

      {/* ═══════════════ THE PHARMACIST'S SEAL ═══════════════
          Was a small italic note; rebuilt as a formal expert
          endorsement block. Pharmacist endorsements convert hard for
          pharma-adjacent buyers because they signal "a credentialed
          professional reviewed this and stands behind it". Even the
          composite-anonymous attribution is more credible than the
          generic "our team" framing because the credential is named. */}
      {pharmacistNote && (
        <section className="bg-cream/70 border-y border-cobalt/10">
          <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-12 py-10 lg:py-14">
            <div className="max-w-3xl mx-auto">
              <div className="bg-white border border-cobalt/15 rounded-2xl p-6 sm:p-8 lg:p-10 relative">
                {/* Decorative quote mark — top-left */}
                <span
                  aria-hidden="true"
                  className="absolute top-3 left-4 sm:top-5 sm:left-6 font-display font-black text-cobalt/15 leading-none select-none"
                  style={{ fontSize: 'clamp(60px, 8vw, 110px)' }}
                >
                  &ldquo;
                </span>

                {/* Eyebrow */}
                <p className="relative text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-4">
                  — The Pharmacist&apos;s Seal
                </p>

                {/* The note itself */}
                <blockquote
                  className="relative font-display text-ink tracking-[-0.025em] leading-[1.25] mb-6"
                  style={{ fontSize: 'clamp(20px, 2.6vw, 32px)' }}
                >
                  {pharmacistNote}
                </blockquote>

                {/* Signature block */}
                <div className="relative flex items-center gap-4 pt-5 border-t border-cobalt/10">
                  {/* Pharmacist avatar — generic cobalt seal until we have
                      a real photo. The named-credential is the trust
                      signal that matters; the photo is decorative. */}
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-cobalt flex items-center justify-center text-white flex-shrink-0 shadow-sm"
                    aria-hidden="true"
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 7h-3V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v3H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM12 11v6M9 14h6" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm sm:text-base font-extrabold text-ink leading-tight">
                      Merit Sciences Pharmacy Team
                    </p>
                    <p className="text-[11px] sm:text-[12px] text-ink-soft mt-0.5">
                      US-licensed pharmacist · 503B outsourcing facility · Dallas, TX
                    </p>
                  </div>
                  {/* Verified seal — top-right of signature block */}
                  <div className="hidden sm:inline-flex items-center gap-1.5 text-[10px] tracking-[0.16em] uppercase text-cobalt font-bold border border-cobalt/25 rounded-full px-2.5 py-1">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Lot signed
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ PAIRS WELL WITH (stacks) ═══════════════ */}
      {stacks.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-12 py-10 lg:py-14">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-8 lg:mb-10">
            <div>
              <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
                — Pairs Well With
              </p>
              <h2
                className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95]"
                style={{ fontSize: 'clamp(24px, 3.5vw, 44px)' }}
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
                    <Link
                      href={`/stacks/${stack.slug}`}
                      className="font-display text-2xl font-bold text-ink hover:text-cobalt transition"
                    >
                      ${(stack.discountedCents / 100).toFixed(2)}
                    </Link>
                    <p className="text-[11px] text-ink-soft">
                      <span className="line-through">${(stack.sumCents / 100).toFixed(2)}</span>
                      {' · '}save {stack.bundleDiscountPct}%
                    </p>
                  </div>
                  <PdpStackAddButton stack={stack} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════ FAQ ═══════════════ */}
      <section className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-12 py-10 lg:py-14 border-t border-cobalt/10">
        <div className="max-w-2xl mb-8 lg:mb-10">
          <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
            — Common Questions
          </p>
          <h2
            className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95]"
            style={{ fontSize: 'clamp(24px, 3.5vw, 44px)' }}
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
          <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-12 py-10 lg:py-14">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8 lg:mb-10">
              <div>
                <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
                  — Same Family
                </p>
                <h2
                  className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95]"
                  style={{ fontSize: 'clamp(22px, 3vw, 38px)' }}
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
// CompareCell — one column-cell in the Why Merit comparison row
// ─────────────────────────────────────────────────────────────────────────

function CompareCell({ value, emphasis = false }: { value: string; emphasis?: boolean }) {
  const isYes = value === 'yes';
  const isNo = value === 'no';
  const cellBg = emphasis ? 'bg-cobalt/15' : 'bg-ink/95';
  const valColor =
    isYes ? (emphasis ? 'text-cobalt-soft' : 'text-white/85')
    : isNo ? 'text-white/40'
    : 'text-white/70';
  return (
    <div className={`${cellBg} px-3 sm:px-5 py-2.5 sm:py-3 text-center flex items-center justify-center`}>
      {isYes ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={emphasis ? 'text-cobalt-soft' : 'text-white/70'}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : isNo ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" className="text-white/30">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      ) : (
        <span className={`font-semibold ${valColor} leading-tight`}>{value}</span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Product Gallery — left side of hero
// ─────────────────────────────────────────────────────────────────────────

function ProductGallery({
  product,
  family,
}: {
  product: Awaited<ReturnType<typeof getProduct>>;
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
