import Image from 'next/image';

export const metadata = { title: 'Hero direction — B vs D' };

/**
 * Side-by-side hero comparison. Two finalist candidates:
 *   B — Typographic monument (cream bg, left-aligned baked type, vial on right)
 *   D — Horizon monument (cobalt sky + cream ground, left-aligned baked type, vial on right)
 *
 * Layout architecture:
 *   - Hero CARD is capped at max-width 1100px and max-height 600px so it can
 *     never "fill the whole screen" on wide monitors.
 *   - Inside the card: image at top (capped, object-top), then a cream block
 *     directly below holding the composited "Made for You." + subhead + CTA.
 *   - Image and overlay are SEPARATE blocks inside the card — no possibility
 *     of overlay crashing into baked type.
 *   - Together they read as a single editorial hero unit, the way Eight Sleep
 *     and Apple structure their hero modules.
 */
export default function HeroesComparePage() {
  return (
    <main className="bg-cream min-h-screen">
      {/* Page header */}
      <header className="px-8 py-10 max-w-container mx-auto">
        <p className="eyebrow text-cobalt mb-2">— HERO DIRECTION REVIEW</p>
        <h1 className="font-display text-4xl md:text-5xl font-extrabold tracking-tighter mb-3">
          B vs D — capped, no overlap.
        </h1>
        <p className="text-ink-soft max-w-2xl">
          Hero card now capped at 1100×600 max so it stops dominating the viewport.
          Overlay moved out of the image container into a flowing cream block
          directly below — eliminates the &quot;Made for You.&quot; / &quot;AMERICA.&quot;
          collision. Image + overlay read as one editorial unit.
        </p>
      </header>

      {/* DIRECTION B — Typographic monument (cream) */}
      <section className="mb-12 px-8">
        <div className="max-w-container mx-auto">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Direction B — Typographic monument
            </h2>
            <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink-muted">
              Cream · charcoal type · vial right
            </p>
          </div>
        </div>

        {/* Hero CARD — capped width and height. Image block + overlay block stacked, NEVER overlap. */}
        <div className="max-w-[1100px] mx-auto rounded-xl overflow-hidden shadow-[0_8px_32px_-12px_rgba(11,15,25,0.15)]">
          {/* Image block — capped at 480px tall */}
          <div
            className="relative w-full overflow-hidden"
            style={{ aspectRatio: '16 / 9', maxHeight: '480px', background: '#F4F1EA' }}
          >
            <Image
              src="/brand/hero-B-mono.png"
              alt="Merit Sciences — MADE IN AMERICA left-aligned typographic hero, vial bridging baseline at right"
              fill
              priority
              sizes="(max-width: 1100px) 100vw, 1100px"
              className="object-cover object-top"
            />
          </div>

          {/* Overlay block — flows below image, cream bg, no overlap possible */}
          {/* Overlay block — 12-col grid so the CTA can sit DIRECTLY UNDER
              the vial's horizontal column (vial is at ~75% horizontal in the
              image; CTA placed in cols 9-11 to match). */}
          <div className="bg-cream px-8 md:px-12 py-7 md:py-8">
            <div className="grid grid-cols-12 gap-5 md:gap-6 items-end">
              {/* Headline + subhead — left 7 cols */}
              <div className="col-span-12 md:col-span-7">
                <h2
                  className="font-display font-black tracking-[-0.03em] text-ink leading-[0.95] text-left"
                  style={{ fontSize: 'clamp(28px, 3.6vw, 52px)' }}
                >
                  Made for You<span style={{ color: '#2E4DDB' }}>.</span>
                </h2>
                <p className="mt-2.5 text-[13px] md:text-[14px] text-ink-soft max-w-[420px] text-left">
                  Pharmacy-grade peptides, verified per lot. Shipped from Dallas in
                  48 hours.
                </p>
              </div>
              {/* CTA — col-start 9, spans 3 cols, sits directly under the vial */}
              <a
                href="/catalog"
                className="col-span-12 md:col-start-9 md:col-span-3 inline-flex items-center justify-center px-6 py-3 bg-ink text-white font-semibold rounded-lg text-sm hover:bg-steel transition whitespace-nowrap justify-self-start md:justify-self-center"
              >
                Shop the catalog →
              </a>
            </div>
          </div>
        </div>

        {/* B — annotation */}
        <div className="max-w-[1100px] mx-auto mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-[12px] text-ink-soft">
          <p>
            <strong className="text-ink">Strength:</strong> typographically
            aggressive. Cream + charcoal is the cleanest, most editorial
            execution — magazine-cover energy with zero atmospheric noise.
          </p>
          <p>
            <strong className="text-ink">Tension:</strong> all-cream upper fold
            means the rest of the homepage has to do the heavy palette lifting
            (charcoal §03 credo, charcoal §04 lanes).
          </p>
          <p>
            <strong className="text-ink">Risk:</strong> baked type is locked at
            fixed scale — copy edits require regen. Plan B (CSS composite type)
            recommended for production wire-in.
          </p>
        </div>
      </section>

      {/* DIRECTION D — Horizon monument (cobalt sky + cream ground) */}
      <section className="mb-20 px-8">
        <div className="max-w-container mx-auto">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Direction D — Horizon monument
            </h2>
            <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink-muted">
              Cobalt sky · cream ground · vial right
            </p>
          </div>
        </div>

        {/* Hero CARD — same capped structure */}
        <div className="max-w-[1100px] mx-auto rounded-xl overflow-hidden shadow-[0_8px_32px_-12px_rgba(11,15,25,0.15)]">
          {/* Image block */}
          <div
            className="relative w-full overflow-hidden"
            style={{ aspectRatio: '16 / 9', maxHeight: '480px', background: '#2E4DDB' }}
          >
            <Image
              src="/brand/hero-D-blend.png"
              alt="Merit Sciences — MADE IN AMERICA left-aligned in cobalt sky, vial bridging horizon in right third"
              fill
              priority
              sizes="(max-width: 1100px) 100vw, 1100px"
              className="object-cover object-top"
            />
          </div>

          {/* Overlay block — cream bg continues the cream ground of the image */}
          {/* Overlay block — 12-col grid so the CTA can sit DIRECTLY UNDER
              the vial's horizontal column (vial is at ~75% horizontal in the
              image; CTA placed in cols 9-11 to match). */}
          <div className="bg-cream px-8 md:px-12 py-7 md:py-8">
            <div className="grid grid-cols-12 gap-5 md:gap-6 items-end">
              {/* Headline + subhead — left 7 cols */}
              <div className="col-span-12 md:col-span-7">
                <h2
                  className="font-display font-black tracking-[-0.03em] text-ink leading-[0.95] text-left"
                  style={{ fontSize: 'clamp(28px, 3.6vw, 52px)' }}
                >
                  Made for You<span style={{ color: '#2E4DDB' }}>.</span>
                </h2>
                <p className="mt-2.5 text-[13px] md:text-[14px] text-ink-soft max-w-[420px] text-left">
                  Pharmacy-grade peptides, verified per lot. Shipped from Dallas in
                  48 hours.
                </p>
              </div>
              {/* CTA — col-start 9, spans 3 cols, sits directly under the vial */}
              <a
                href="/catalog"
                className="col-span-12 md:col-start-9 md:col-span-3 inline-flex items-center justify-center px-6 py-3 bg-ink text-white font-semibold rounded-lg text-sm hover:bg-steel transition whitespace-nowrap justify-self-start md:justify-self-center"
              >
                Shop the catalog →
              </a>
            </div>
          </div>
        </div>

        {/* D — annotation */}
        <div className="max-w-[1100px] mx-auto mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-[12px] text-ink-soft">
          <p>
            <strong className="text-ink">Strength:</strong> emotional and warm.
            The horizon between cobalt sky and cream ground is a structural
            design device that the rest of the brand can echo. Most cinematic.
          </p>
          <p>
            <strong className="text-ink">Tension:</strong> cobalt sky commits us
            to a heavy color palette in the upper fold. Strong but assertive.
          </p>
          <p>
            <strong className="text-ink">Risk:</strong> same baked-type risk as
            B — fixed scale, regen on copy edits. Plan B (CSS composite) lifts
            this for production.
          </p>
        </div>
      </section>

      {/* Decision row */}
      <section className="bg-ink text-white px-8 py-14">
        <div className="max-w-container mx-auto">
          <p className="font-mono text-[11px] tracking-[0.22em] uppercase text-[#9DB1FF] mb-3">
            Pick to ship
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-extrabold tracking-tighter mb-2">
            B or D — and I rebuild the homepage.
          </h2>
          <p className="text-white/70 max-w-xl text-sm">
            Picking triggers the full 7-section overhaul: hero · credentials
            marquee · charcoal credo · vial-worship lanes · Merit-vs-market ·
            amber stat tiles · catalog + newsletter.
          </p>
        </div>
      </section>
    </main>
  );
}
