import Image from 'next/image';
import Link from 'next/link';
import { getProduct, money } from '@/lib/catalog';

export default function HomePage() {
  // Curated picks — drive imagery + featured compounds
  const wolverine = getProduct('bpc-157-tb-500');
  const tirz      = getProduct('ly3298176');
  const reta      = getProduct('ly3437943');
  const nad       = getProduct('nad-500mg');
  const klow      = getProduct('klow');
  const selank    = getProduct('selank');

  // §03 featured order: Retatrutide + Wolverine visible first, KLOW + Tirzepatide
  // revealed by horizontal scroll.
  const featured = [reta, wolverine, klow, tirz].filter(Boolean) as NonNullable<ReturnType<typeof getProduct>>[];

  // Family labels: simple chemistry categories (no human outcomes). Each
  // lane gets its own labeled transparent vial PNG, a per-card tilt angle,
  // and a per-card halo color so the four cards read as a family but with
  // visual distinction.
  const lanes = [
    {
      eyebrow: 'PEPTIDES',
      title: 'BPC + TB',
      compounds: ['BPC-157', 'TB-500', 'Wolverine'],
      desc: 'The pentadecapeptide-class compounds.',
      img: '/brand/lane-bpc-transparent.png',
      alt: 'Merit BPC + TB vial — transparent label, lyophilized',
      tiltDeg: -6,
      // Cobalt (Merit core)
      halo: {
        inner: 'rgba(80,120,255,0.38)',
        mid: 'rgba(46,77,219,0.20)',
        outer: 'rgba(46,77,219,0.06)',
      },
    },
    {
      eyebrow: 'COFACTORS',
      title: 'NAD+ Family',
      compounds: ['NAD⁺', 'GHK-Cu', 'MOTS-c'],
      desc: 'Coenzymes and signaling peptides.',
      img: '/brand/lane-nad-transparent.png',
      alt: 'Merit NAD+ vial — transparent label, lyophilized',
      tiltDeg: 5,
      // Amber (metabolic warmth)
      halo: {
        inner: 'rgba(255,185,90,0.42)',
        mid: 'rgba(201,140,60,0.22)',
        outer: 'rgba(160,110,50,0.06)',
      },
    },
    {
      eyebrow: 'NEUROPEPTIDES',
      title: 'Selank + Semax',
      compounds: ['Selank', 'Semax'],
      desc: 'Russian-derived synthetic neuropeptides.',
      img: '/brand/lane-selank-transparent.png',
      alt: 'Merit Selank vial — transparent label, lyophilized',
      tiltDeg: -8,
      // Violet (cognitive)
      halo: {
        inner: 'rgba(160,120,255,0.40)',
        mid: 'rgba(107,91,192,0.22)',
        outer: 'rgba(80,60,160,0.06)',
      },
    },
    {
      eyebrow: 'BLENDS',
      title: 'Multi-Compound Vials',
      compounds: ['KLOW', 'GLOW', 'CJC + Ipa'],
      desc: 'Multiple molecules co-formulated in one vial.',
      img: '/brand/lane-blends-transparent.png',
      alt: 'Merit KLOW vial — transparent label, lyophilized',
      tiltDeg: 7,
      // Emerald (multi-pathway)
      halo: {
        inner: 'rgba(110,220,160,0.38)',
        mid: 'rgba(60,150,110,0.22)',
        outer: 'rgba(40,110,80,0.06)',
      },
    },
  ];

  return (
    <>
      {/* ════════════════ §01 · HERO — CSS COMPOSITE (PLAN B) ════════════════
          HTML type ("MADE IN AMERICA.") + transparent vial PNG overlay.
          Zero baked text in the image, so type is fully responsive, can be
          re-copy-edited without regen, and the vial position is pixel-controlled
          via absolute positioning over the right portion of the type.
          Full-bleed cream — page bg flows edge to edge.
       */}
      {/* CSS COMPOSITE HERO — content-height + padding (no forced 70vh).
          Section is as tall as content needs, so the lanes section peeks
          through naturally below without artificial empty space. */}
      <section id="hero" className="relative bg-cream overflow-hidden">
        <div className="max-w-[1400px] mx-auto w-full px-6 lg:px-12 pt-8 lg:pt-10 pb-12 lg:pb-16">
          {/* Eyebrow */}
          <p className="text-[10px] lg:text-[11px] tracking-[0.22em] uppercase text-cobalt font-semibold mb-6 lg:mb-8">
            Merit Sciences · Dallas, TX
          </p>

          {/* Type + vial composition. */}
          <div className="relative">
            <h1
              className="font-display font-black text-ink leading-[0.88] tracking-[-0.04em] relative z-0"
              style={{ fontSize: 'clamp(44px, 9vw, 156px)' }}
            >
              Same Stack.
              <br />
              Better Source<span className="text-cobalt">.</span>
            </h1>

            {/* Vial composition — tilted + cobalt halo behind for a
                "spotlit specimen" feel instead of just floating product.
                Outer container handles positioning. Halo sits behind via
                z-0, vial on top via z-10 with rotation. */}
            <div
              className="absolute pointer-events-none hidden sm:block"
              style={{
                right: '4%',
                top: '-4%',
                width: 'clamp(240px, 25vw, 400px)',
                aspectRatio: '1',
              }}
            >
              {/* Cobalt radial halo — brighter brand-color spotlight behind
                  the vial. Inner core uses a brighter electric-blue tint
                  (#5078FF) that fades through Merit cobalt out to transparent
                  cream. Scaled 1.5× so the glow bleeds past the vial. */}
              <div
                className="absolute inset-0 z-0"
                style={{
                  background:
                    'radial-gradient(ellipse 55% 60% at center, rgba(80,120,255,0.40) 0%, rgba(46,77,219,0.22) 40%, rgba(46,77,219,0.08) 65%, transparent 80%)',
                  transform: 'scale(1.5)',
                }}
              />
              {/* Vial tilted slightly counterclockwise + subtle float animation.
                  Reads as an editorial specimen breathing in place, not a
                  static catalog product. */}
              <div
                className="absolute inset-0 z-10 animate-float-vial"
                style={{ transformOrigin: 'center center' }}
              >
                <Image
                  src="/brand/merit-vial-transparent.png"
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 1400px) 25vw, 400px"
                  className="object-contain object-center"
                />
              </div>
            </div>
          </div>

          {/* Paragraph + CTA — inline flex */}
          <div className="flex flex-col md:flex-row md:items-end gap-5 md:gap-8 mt-5 lg:mt-7">
            <p className="text-[14px] lg:text-[16px] text-ink-soft max-w-[520px] leading-relaxed flex-1">
              Pharmacy-grade peptides, made by a US-licensed pharmacy team
              in Dallas. Verified per lot. Shipped in 48 hours.
            </p>
            <Link
              href="/catalog"
              className="inline-flex items-center justify-center px-7 py-3.5 bg-cobalt text-white font-semibold rounded-lg text-sm hover:opacity-90 transition whitespace-nowrap self-start md:self-auto"
            >
              Shop the catalog →
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════ CREDIBILITY MARQUEE ═════════════════════════════════
          Warm-orange Merit-vial pattern background with a darkening overlay
          so the scrolling white text + cobalt dot separators remain readable.
          The pattern is the editorial-credibility move; the text scrolls over
          it. Replaces the flat charcoal version. */}
      <section className="relative text-white border-y border-cobalt/30 overflow-hidden bg-[#C2410C]">
        {/* Background pattern image */}
        <Image
          src="/brand/scene-pattern-orange.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Overlay — slight darkening for text contrast. Lighter than the
            §05 process overlay because the marquee is shorter and the text
            needs to read at a glance, not be studied. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(120,40,10,0.55) 0%, rgba(120,40,10,0.45) 100%)',
          }}
        />
        <div className="relative py-4 lg:py-5">
          <div className="flex animate-marquee whitespace-nowrap will-change-transform">
            {[0, 1].map((dup) => (
              <div
                key={dup}
                className="flex items-center shrink-0 gap-12 lg:gap-16 pr-12 lg:pr-16"
                aria-hidden={dup === 1}
              >
                {[
                  'US-LICENSED PHARMACY TEAM',
                  'PHARMACY-VERIFIED PER LOT',
                  '503B OUTSOURCING FACILITY',
                  'ISO-CERTIFIED CLEANROOM',
                  'HPLC-TESTED PER LOT',
                  '≥99% PURITY',
                  'LOT-SPECIFIC COA WITH EVERY ORDER',
                  'MADE IN DALLAS, TX',
                  'SHIPPED IN 48 HOURS',
                ].map((item) => (
                  <span
                    key={`${dup}-${item}`}
                    className="flex items-center gap-12 lg:gap-16 text-[11px] lg:text-[13px] tracking-[0.22em] uppercase text-white font-black"
                  >
                    {item}
                    <span className="w-1.5 h-1.5 rounded-full bg-cobalt shrink-0" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════ §02 · CATALOG FAMILIES — minimal cards ═══════════
          Clean 4-up grid. Each card: white background, no corner brackets,
          no index numbers, no hover lift on the card. The VIAL inside each
          card floats softly (staggered delays so they don't sync).
          Promotional bar across the bottom for bundle pricing.
       */}
      <section id="lanes" className="bg-cream py-20 lg:py-28 px-6 lg:px-12">
        <div className="max-w-[1400px] mx-auto">
          {/* Section header */}
          <div className="flex flex-wrap items-end justify-between mb-10 lg:mb-14 gap-6">
            <div className="max-w-2xl">
              <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-semibold mb-4">
                — The Catalog
              </p>
              <h2
                className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95]"
                style={{ fontSize: 'clamp(36px, 5.5vw, 76px)' }}
              >
                Four families<span className="text-cobalt">.</span>
              </h2>
              <p className="mt-4 text-[14px] lg:text-[16px] text-ink-soft max-w-[520px] leading-relaxed">
                The Merit catalog, organized by compound class. Pick a
                family to see what we stock.
              </p>
            </div>
            <Link
              href="/catalog"
              className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-semibold hover:text-ink transition whitespace-nowrap"
            >
              View all 18 compounds →
            </Link>
          </div>

          {/* 4-up family grid — cream cards with cobalt backlight per vial.
              Each card uses the transparent Merit vial PNG so the cobalt
              halo shows through behind it (same treatment as the hero). */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
            {lanes.map((lane) => (
              <Link
                key={lane.title}
                href="/catalog"
                className="group block"
              >
                {/* Image area — cream tile, per-card colored backlight,
                    per-card tilted transparent vial. */}
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-cream border border-cobalt/10 group-hover:border-cobalt/35 transition-colors duration-300">
                  {/* Per-card backlight — color sourced from lane.halo so
                      each family reads with its own brand-accent glow. */}
                  <div
                    className="absolute inset-0 z-0"
                    style={{
                      background: `radial-gradient(ellipse 55% 60% at center, ${lane.halo.inner} 0%, ${lane.halo.mid} 40%, ${lane.halo.outer} 65%, transparent 82%)`,
                    }}
                  />
                  {/* Per-card vial — labeled with the compound name,
                      tilted slightly. Each card has a different tilt angle
                      so they don't all read identically. */}
                  <div
                    className="absolute inset-0 z-10 p-6 lg:p-8"
                    style={{
                      transform: `rotate(${lane.tiltDeg}deg)`,
                      transformOrigin: 'center center',
                    }}
                  >
                    <Image
                      src={lane.img}
                      alt={lane.alt}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-contain object-center"
                    />
                  </div>
                </div>

                {/* Text content — minimal, below the image */}
                <div className="pt-5 px-1">
                  <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-semibold mb-2">
                    {lane.eyebrow}
                  </p>
                  <h3 className="font-display text-lg lg:text-xl font-extrabold text-ink tracking-tight leading-tight">
                    {lane.title}<span className="text-cobalt">.</span>
                  </h3>

                  {/* Compound list — plain dotted text, no chip pills */}
                  <p className="mt-2.5 text-[12px] text-ink-soft leading-relaxed">
                    {lane.compounds.join(' · ')}
                  </p>

                  <p className="mt-4 text-[11px] tracking-[0.22em] uppercase text-cobalt font-semibold group-hover:text-ink transition-colors">
                    Browse →
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Promotional bar — cobalt band. Bundle / subscription pricing
              (RUO compliant — no individual-targeted discount codes). */}
          <div className="mt-8 lg:mt-10 bg-cobalt text-white rounded-2xl px-7 lg:px-10 py-5 lg:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span
                aria-hidden="true"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/15 border border-white/25 text-white text-lg"
              >
                ↻
              </span>
              <p className="text-[14px] lg:text-[15px] font-medium leading-snug">
                <span className="opacity-75 text-[11px] tracking-[0.22em] uppercase font-semibold block mb-0.5">
                  Bundle &amp; save
                </span>
                5% off 3-packs · 10% off 6-packs · 10% off subscribe &amp; save
              </p>
            </div>
            <Link
              href="/catalog"
              className="bg-white text-ink px-5 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition whitespace-nowrap"
            >
              See pricing →
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════ §03 · MOST-STOCKED — FEATURED COMPOUNDS ═══════════
          Reference-pattern layout: bold cobalt feature card on the LEFT
          (intro + master CTA), two cream product cards on the RIGHT showing
          actual featured molecules with prices + lot details + tags, and a
          shipping-promise bar across the BOTTOM. Section bg stays charcoal
          for the palette rhythm (cream lanes → charcoal featured → cream
          comparison).
       */}
      <section id="featured" className="bg-ink text-white py-20 lg:py-28 px-6 lg:px-12">
        <div className="max-w-[1400px] mx-auto">
          {/* Section header */}
          <div className="mb-10 lg:mb-12 max-w-2xl">
            <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt-soft font-semibold mb-4">
              — Most-Stocked
            </p>
            <h2
              className="font-display font-black tracking-[-0.035em] leading-[0.95]"
              style={{ fontSize: 'clamp(36px, 5.5vw, 76px)' }}
            >
              What researchers come back for<span className="text-cobalt">.</span>
            </h2>
          </div>

          {/* Feature card + 2 product cards */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-5 lg:gap-7">
            {/* LEFT — Feature card with cobalt-toned atmospheric BG image.
                Layer order (back→front):
                  1. <Image fill> — bg photo, absolute, no z-class
                  2. Overlay <div> — cobalt+charcoal wash for text contrast
                  3. Content wrapper — relative z-10, sits above both bg layers
            */}
            <div className="relative bg-cobalt rounded-2xl overflow-hidden flex flex-col min-h-[440px]">
              {/* Editorial cobalt vial pattern as background — diagonal grid
                  of Merit vials on saturated brand cobalt. Replaces the
                  abstract atmospheric mist. bg-cobalt on parent acts as
                  fallback if image fails. */}
              <Image
                src="/brand/scene-pattern-cobalt.png"
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 33vw"
                className="object-cover object-center"
                priority={false}
              />
              {/* Cobalt + charcoal wash overlay — provides white-text
                  contrast over the pattern. Slightly heavier than before
                  since the pattern image has more visual activity (vials,
                  shadows) than the previous atmospheric mist. */}
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(46,77,219,0.35) 0%, rgba(11,15,25,0.60) 100%)',
                }}
              />

              {/* Content wrapper — relative + z-10 so it stacks above the
                  bg image and overlay regardless of DOM-order quirks. */}
              <div className="relative z-10 text-white p-8 lg:p-10 flex flex-col flex-1">
                {/* Meta — top-right */}
                <div className="absolute top-0 right-0 text-[10px] tracking-[0.22em] uppercase text-white/80 font-semibold">
                  Top Sellers
                </div>

                {/* Eyebrow */}
                <p className="text-[10px] tracking-[0.22em] uppercase text-white/80 font-semibold mb-5">
                  — Restocked First
                </p>

                {/* Headline */}
                <h3
                  className="font-display font-black leading-[0.95] tracking-[-0.025em] mb-5"
                  style={{ fontSize: 'clamp(28px, 3vw, 44px)' }}
                >
                  Top-shelf molecules<span className="text-white/70">.</span>
                </h3>

                {/* Supporting copy */}
                <p className="text-[14px] lg:text-[15px] text-white/90 leading-relaxed max-w-md">
                  These are the compounds that get reordered first when supplies
                  run low — the molecules our researchers come back for, batch
                  after batch.
                </p>

                {/* CTA at bottom */}
                <Link
                  href="/catalog"
                  className="inline-flex items-center justify-center mt-auto pt-8 self-start"
                >
                  <span className="bg-white text-ink px-7 py-3.5 rounded-lg font-semibold text-sm hover:opacity-90 transition">
                    View all products →
                  </span>
                </Link>
              </div>
            </div>

            {/* RIGHT — horizontal-scroll product carousel.
                2 cards visible at a time on desktop (Retatrutide + Wolverine);
                horizontal scroll reveals KLOW + Tirzepatide. Scroll-snap
                keeps cards aligned. */}
            <div className="relative">
              <div className="overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide -mx-6 px-6 lg:mx-0 lg:px-0">
                <div className="flex gap-4 lg:gap-5">
                  {featured.map((p) => {
                const bestBundle = p.bundles?.find((b) => b.label.toLowerCase().includes('subscribe'))
                  ?? p.bundles?.[p.bundles.length - 1];
                const perVialSavings = bestBundle && bestBundle.vials > 0
                  ? Math.round((1 - (bestBundle.priceCents / bestBundle.vials) / p.priceCents) * 100)
                  : null;
                return (
                  <Link
                    key={p.handle}
                    href={`/products/${p.handle}`}
                    className="group block bg-cream text-ink rounded-2xl overflow-hidden border border-white/10 hover:border-cobalt/60 transition-colors snap-start shrink-0 w-[85vw] sm:w-[320px] lg:w-[calc(50%-0.625rem)]"
                  >
                    {/* Vial image area — cream tile with subtle warmth */}
                    <div className="relative aspect-square bg-gradient-to-br from-white to-[#EDE8DD]/40 overflow-hidden">
                      {p.imageUrl && (
                        <Image
                          src={p.imageUrl}
                          alt={p.title}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-contain p-7 lg:p-9 group-hover:scale-[1.04] transition-transform duration-500"
                        />
                      )}
                      {/* Pharmacy-verified badge — top-left */}
                      <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-sm border border-cobalt/20 text-[9px] font-bold tracking-widest uppercase text-cobalt px-2.5 py-1 rounded">
                        <span className="w-1.5 h-1.5 rounded-full bg-cobalt" />
                        Pharmacy-Verified
                      </span>
                    </div>

                    {/* Product details */}
                    <div className="p-6 lg:p-7">
                      {/* Eyebrow */}
                      <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-semibold mb-2">
                        {p.eyebrow.split('·')[0].trim()}
                      </p>

                      {/* Title */}
                      <h3 className="font-display text-xl lg:text-2xl font-extrabold text-ink tracking-tight leading-tight mb-1">
                        {p.title}
                      </h3>

                      {/* Vial size / format */}
                      <p className="text-[12px] text-ink-soft mb-4">
                        {p.vialSize} · {p.format}
                      </p>

                      {/* Price row */}
                      <div className="flex items-baseline gap-3 mb-4">
                        <span className="font-display text-2xl font-bold text-ink">{money(p.priceCents)}</span>
                        {perVialSavings !== null && perVialSavings > 0 && (
                          <span className="text-[11px] tracking-[0.16em] uppercase text-success font-semibold">
                            Save {perVialSavings}% on subscribe
                          </span>
                        )}
                      </div>

                      {/* Tag row at bottom — lot info, certifications */}
                      <div className="flex flex-wrap gap-1.5 pt-4 border-t border-ink/10">
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-white border border-cobalt/15 text-[10px] tracking-[0.08em] uppercase text-ink/70 font-medium">
                          ≥99% Purity
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-white border border-cobalt/15 text-[10px] tracking-[0.08em] uppercase text-ink/70 font-medium">
                          Lot COA
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-white border border-cobalt/15 text-[10px] tracking-[0.08em] uppercase text-ink/70 font-medium">
                          48hr Ship
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
                </div>
              </div>
              {/* Scroll hint — fades in below the carousel as a small UX cue
                  that more cards exist to the right. */}
              <p className="mt-4 text-[10px] tracking-[0.22em] uppercase text-cobalt-soft font-semibold flex items-center gap-2">
                <span aria-hidden="true" className="inline-block w-5 h-px bg-cobalt-soft" />
                Scroll for KLOW + Tirzepatide
                <span aria-hidden="true">→</span>
              </p>
            </div>
          </div>

          {/* Bottom shipping/dispatch promise bar — clock icon for the
              48hr dispatch promise (replaces the lightning-bolt cliché). */}
          <div className="mt-6 lg:mt-7 bg-white text-ink rounded-2xl px-7 lg:px-10 py-5 lg:py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Clock SVG — clean stroke icon, cobalt color, ties to the
                  48hr dispatch promise in the copy. */}
              <span
                aria-hidden="true"
                className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-cobalt/10 border border-cobalt/30 text-cobalt shrink-0"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="12 7 12 12 15.5 14" />
                </svg>
              </span>
              <p className="text-[14px] lg:text-[15px] font-medium leading-snug">
                <span className="opacity-75 text-[11px] tracking-[0.22em] uppercase font-semibold block mb-0.5 text-cobalt">
                  Ships fast
                </span>
                Free shipping over $100 · 48hr dispatch from Dallas, TX
              </p>
            </div>
            <Link
              href="/catalog"
              className="bg-cobalt text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:opacity-90 transition whitespace-nowrap"
            >
              Browse the catalog →
            </Link>
          </div>
        </div>
      </section>

      {/* ════════════════ §04 · MERIT vs MARKET — COMPARISON ═════════════════
          Kept verbatim per user feedback ("table comparison is really good").
          Only the wrapper container width is harmonized to the new 1400 grid.
       */}
      <section id="comparison" className="bg-cream py-20 lg:py-28 px-6 lg:px-12">
        <div className="max-w-[1400px] mx-auto">
          <div className="max-w-2xl mb-12 lg:mb-16">
            <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-semibold mb-4">
              — Merit vs Market
            </p>
            <h2
              className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95]"
              style={{ fontSize: 'clamp(36px, 5.5vw, 80px)' }}
            >
              There&apos;s no comparison<span className="text-cobalt">.</span>
            </h2>
            <p className="mt-6 text-base lg:text-lg text-ink-soft leading-relaxed">
              Most peptide sellers are resellers. Merit is the pharmacy.
              Here&apos;s what that actually gets you.
            </p>
          </div>

          {/* Comparison table.
              3 columns (Merit / Online Resellers / Influencer Brands), 6
              rows. Plain-English buyer-relevant claims — no jargon (no
              "503B", "HPLC", "COA" without context). Marks: cobalt ✓ for
              win, amber — for partial credit (honest calibration — resellers
              DO sometimes provide test results, so we don't zero them),
              muted ✗ for clear loss. */}
          <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-border-soft overflow-hidden">
            {/* Header row */}
            <div className="grid grid-cols-[1fr_72px_72px_72px] lg:grid-cols-[1fr_110px_110px_110px] gap-2 lg:gap-4 px-5 lg:px-8 py-5 border-b border-border-soft bg-cream/40">
              <div />
              <p className="font-display font-bold text-cobalt text-xs lg:text-sm text-center">Merit</p>
              <p className="font-display font-bold text-ink-muted text-xs lg:text-sm text-center leading-tight">
                Online<br className="lg:hidden" /> Resellers
              </p>
              <p className="font-display font-bold text-ink-muted text-xs lg:text-sm text-center leading-tight">
                Influencer<br className="lg:hidden" /> Brands
              </p>
            </div>

            {[
              {
                claim: 'Test results for your exact batch — in every shipment',
                merit: 'yes', ruo: 'partial', inf: 'no',
              },
              {
                claim: 'Lab-verified to ≥99% pure, every batch',
                merit: 'yes', ruo: 'partial', inf: 'no',
              },
              {
                claim: 'A US pharmacist signs off on every batch',
                merit: 'yes', ruo: 'no', inf: 'no',
              },
              {
                claim: 'Made in a federally-inspected US pharmacy',
                merit: 'yes', ruo: 'no', inf: 'no',
              },
              {
                claim: 'Your reorder price stays the same — forever',
                merit: 'yes', ruo: 'no', inf: 'no',
              },
              {
                claim: 'Ships from Texas in 2 business days',
                merit: 'yes', ruo: 'partial', inf: 'partial',
              },
            ].map((row, i, arr) => {
              const renderMark = (mark: string) => {
                if (mark === 'yes') {
                  return (
                    <span className="inline-flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-cobalt/10">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-cobalt">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  );
                }
                if (mark === 'partial') {
                  return (
                    <span
                      className="inline-flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded-full"
                      style={{ background: 'rgba(181, 143, 74, 0.14)' }}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#B58F4A' }}>
                        <line x1="6" y1="12" x2="18" y2="12" />
                      </svg>
                    </span>
                  );
                }
                return (
                  <span className="inline-flex items-center justify-center w-8 h-8 lg:w-9 lg:h-9 rounded-full bg-ink-muted/10">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-ink-muted">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </span>
                );
              };
              return (
                <div
                  key={row.claim}
                  className={`grid grid-cols-[1fr_72px_72px_72px] lg:grid-cols-[1fr_110px_110px_110px] gap-2 lg:gap-4 px-5 lg:px-8 py-4 lg:py-5 items-center ${i < arr.length - 1 ? 'border-b border-border-soft' : ''}`}
                >
                  <p className="text-sm lg:text-base text-ink leading-snug">{row.claim}</p>
                  <div className="flex justify-center">{renderMark(row.merit)}</div>
                  <div className="flex justify-center">{renderMark(row.ruo)}</div>
                  <div className="flex justify-center">{renderMark(row.inf)}</div>
                </div>
              );
            })}
          </div>

          {/* Mark legend — small caption below the table explaining the
              partial-credit indicator. Optional but it heads off the
              "what's the amber dash?" question. */}
          <div className="max-w-4xl mx-auto mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-ink-soft">
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-cobalt/10">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-cobalt">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              Verified
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full" style={{ background: 'rgba(181, 143, 74, 0.14)' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ color: '#B58F4A' }}>
                  <line x1="6" y1="12" x2="18" y2="12" />
                </svg>
              </span>
              Sometimes / inconsistent
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-ink-muted/10">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-ink-muted">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </span>
              No / not standard
            </span>
          </div>
        </div>
      </section>

      {/* ════════════════ §05 · HOW WE VERIFY — PROCESS WALKTHROUGH ════════
          Replaces the previous amber "Numbers" tiles. Adds NEW info — the
          actual steps between order and delivery. Background is the
          charcoal vial-grid pattern (cinematic, on-theme, lets cards
          breathe rather than competing). */}
      <section id="process" className="relative py-20 lg:py-28 px-6 lg:px-12 overflow-hidden bg-ink">
        {/* Charcoal vial-pattern background */}
        <Image
          src="/brand/scene-pattern-charcoal.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Darkening + cobalt overlay. The pattern source is already
            dark so we don't need a heavy wash — just enough to ensure
            text contrast and add the brand-color hint. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, rgba(11,15,25,0.62) 0%, rgba(11,15,25,0.48) 60%, rgba(46,77,219,0.42) 100%)',
          }}
        />

        <div className="relative max-w-[1400px] mx-auto text-white">
          {/* Header */}
          <div className="max-w-2xl mb-12 lg:mb-16">
            <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt-soft font-semibold mb-4">
              — The Process
            </p>
            <h2
              className="font-display font-black tracking-[-0.035em] leading-[0.95]"
              style={{ fontSize: 'clamp(36px, 5.5vw, 76px)' }}
            >
              Here&apos;s the work<span className="text-cobalt">.</span>
            </h2>
            <p className="mt-5 text-base lg:text-lg text-white/80 leading-relaxed max-w-xl">
              We made bold claims in the comparison above. These are the four
              steps that back them up — order, verification, release, dispatch.
            </p>
          </div>

          {/* 4 process step cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
            {[
              {
                num: '01',
                title: 'Your order arrives at the pharmacy',
                body: 'Orders go directly to our US-licensed pharmacy partner in Dallas — no middlemen, no resellers in between.',
              },
              {
                num: '02',
                title: 'A pharmacist signs off on your batch',
                body: 'A licensed pharmacist reviews the specific lot you\'ll receive. Lab-confirmed ≥99% pure before anything ships.',
              },
              {
                num: '03',
                title: 'Your batch passes quality release',
                body: 'The test data for your specific lot is logged and tied to your order — purity, identity, batch ID, all of it.',
              },
              {
                num: '04',
                title: 'Ships from Dallas in 2 business days',
                body: 'Tracked and insured. Your batch\'s lot number is on the vial — pull the COA any time using that number.',
              },
            ].map((step) => (
              <div
                key={step.num}
                className="relative rounded-2xl p-6 lg:p-7 bg-cream border border-cobalt/10 hover:border-cobalt/40 transition-colors duration-300"
              >
                {/* Step number — cobalt against cream */}
                <p
                  className="font-display font-black text-cobalt leading-none tracking-[-0.04em] mb-5"
                  style={{ fontSize: 'clamp(40px, 4vw, 56px)' }}
                >
                  {step.num}
                </p>
                {/* Title */}
                <h3 className="font-display text-base lg:text-lg font-extrabold text-ink tracking-tight leading-tight mb-3">
                  {step.title}
                </h3>
                {/* Body */}
                <p className="text-[13px] lg:text-[14px] text-ink-soft leading-relaxed">
                  {step.body}
                </p>
              </div>
            ))}
          </div>

          {/* Quiet footnote with link to sample COA */}
          <div className="mt-10 lg:mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-white/70">
            <span className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cobalt" />
              Lot number on every vial — pull the COA any time
            </span>
            <Link
              href="/coa-sample"
              className="text-[11px] tracking-[0.22em] uppercase text-cobalt-soft font-semibold hover:text-white transition"
            >
              See a sample COA →
            </Link>
          </div>
        </div>
      </section>

      {/* (Old §07 Featured Compounds was here — moved up to §03 right after
          hero so productization happens immediately, not at the bottom.) */}

      {/* ════════════════ §06 · NEWSLETTER BAND — SLIM COBALT ON CREAM ═══════
          Quiet finish. Single line, single input, single CTA.
       */}
      <section id="newsletter" className="bg-cream border-t border-cobalt/15 px-6 lg:px-12">
        <div className="max-w-[1400px] mx-auto py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 lg:gap-16 items-center">
            <div>
              <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-semibold mb-4">
                — Research Notes
              </p>
              <h2
                className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95]"
                style={{ fontSize: 'clamp(28px, 4vw, 56px)' }}
              >
                First access to new lots<span className="text-cobalt">.</span>
              </h2>
              <p className="mt-4 text-sm lg:text-base text-ink-soft max-w-md">
                A short note when there&apos;s something worth saying. No noise.
              </p>
            </div>
            <form className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto lg:min-w-[420px]" action="/api/newsletter" method="POST">
              <input
                type="email"
                name="email"
                required
                placeholder="you@research.email"
                className="flex-1 bg-white border border-border rounded-lg px-4 py-3.5 text-sm text-ink placeholder-ink-muted focus:outline-none focus:border-cobalt transition"
              />
              <button
                type="submit"
                className="bg-ink text-white px-6 py-3.5 rounded-lg text-sm font-semibold hover:bg-steel transition whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
