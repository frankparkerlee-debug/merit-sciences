import Image from 'next/image';
import Link from 'next/link';

/* ═════════════════════════════════════════════════════════════════════════
   CONCEPT A · "GALLERY" — light-key product worship, value-led.

   Thesis: the category's premium players all hide in the dark. A bright,
   gallery-white page with one monumental vial reads instantly as the
   opposite of gray-market — clean room, not back room. The conversion spine
   is VALUE stated like a luxury brand states provenance: price per mg, made
   in Dallas, certificate included.

   Register: enhanced-games type scale on a light ground. Cobalt is the only
   working color; everything else is ink on white. No people, no FDA, and
   the COA appears exactly once, as a small paper object — not a section.

   Standalone concept route — fixture data inline, noindex, deletable.
   ═════════════════════════════════════════════════════════════════════════ */

export const metadata = {
  title: 'Concept A — Gallery',
  robots: { index: false, follow: false },
};

// Product art: the CURRENT label artwork — the actual 45×20mm print files
// from Labels/Research/PNG (the run at press with JingHongSheng), not
// renders of an old label system and not AI vials. The label is the most
// honest product image available: it is literally what ships, it carries
// "RESEARCH USE ONLY" natively, and it can never imply a use case.
const FEATURED = [
  { handle: 'retatrutide-10mg', title: 'Retatrutide', size: '10 mg', price: '$99.99', rate: '$10.00/mg', img: '/brand/labels/retatrutide.webp' },
  { handle: 'tirzepatide-10mg', title: 'Tirzepatide', size: '10 mg', price: '$74.99', rate: '$7.50/mg', img: '/brand/labels/tirzepatide.webp' },
  { handle: 'bpc-10mg-tb-10mg-wolverine-20mg', title: 'Wolverine Blend', size: 'BPC + TB · 20 mg', price: '$99.99', rate: '$5.00/mg', img: '/brand/labels/wolverine.webp' },
  { handle: 'nad-500mg', title: 'NAD+', size: '500 mg', price: '$84.99', rate: '$0.17/mg', img: '/brand/labels/nad.webp' },
];

const TICKER = [
  'Retatrutide 10mg — $99.99', 'Tirzepatide 10mg — $74.99', 'Semaglutide 10mg — $64.99',
  'BPC-157 10mg — $60.99', 'NAD+ 500mg — $84.99', 'Wolverine 20mg — $99.99',
  'Klow 80mg — $174.99', 'MOTS-c 40mg — $137.99', 'Ipamorelin 10mg — $59.99',
  'GHK-Cu 100mg — $85.99', 'Epitalon 50mg — $114.99', 'Selank 10mg — $55.99',
];

export default function ConceptA() {
  return (
    <div className="bg-white text-ink">
      {/* ── §01 · HERO — the product photographed, the price as the headline.
             The image is the branded studio mockup (real Merit label, warm
             ivory ground) presented as a full-height plate on the right —
             the ivory block against the white page reads as a gallery mat,
             so the two grounds are a composition rather than a clash. ── */}
      <section className="relative isolate overflow-hidden bg-white">
        <div className="relative max-w-[1400px] mx-auto px-6 lg:px-12 pt-14 lg:pt-20 pb-10 lg:pb-14 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center min-h-[86svh]">
          <div className="relative z-10">
            <p className="font-mono text-[11px] lg:text-[12px] tracking-[0.16em] uppercase text-cobalt mb-6">
              Research compounds · Compounded in Dallas · Tested by ILS Laboratories
            </p>
            {/* "Reference-grade": reference standards are the most expensive,
                most-documented form any compound is sold in — the exact
                quality/price contrast we want, with zero human-use
                implication. Replaces "pharmacy-grade", which the team flagged
                (a pharmacy exists to dispense to people). */}
            <h1
              className="font-poster font-black uppercase leading-[0.85] tracking-[-0.05em]"
              style={{ fontSize: 'clamp(44px, 7.6vw, 128px)' }}
            >
              Reference-
              <br />
              grade.
              <br />
              <span
                className="text-transparent"
                style={{ WebkitTextStroke: '2.5px rgba(11,13,15,0.85)' }}
              >
                Not reference-
                <br />
                priced.
              </span>
            </h1>
            <p className="mt-8 max-w-[46ch] text-[15.5px] lg:text-[16.5px] leading-[1.6] text-ink-soft">
              Compounded to USP &lt;797&gt;, assayed by an independent laboratory on every lot, and
              the certificate is published before you pay — from{' '}
              <b className="text-ink font-semibold">$0.17 per mg</b>. The documentation is the
              expensive part. The price isn&rsquo;t.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <Link
                href="/catalog"
                className="bg-ink text-white px-9 py-4 text-center text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-cobalt transition"
              >
                Shop 29 compounds
              </Link>
              <Link
                href="/coa"
                className="border-2 border-ink px-9 py-4 text-center text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-ink hover:text-white transition"
              >
                Read a lab report
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-7 gap-y-2 font-mono text-[10.5px] tracking-[0.1em] uppercase text-ink-muted">
              <span>≥99% HPLC purity</span>
              <span>Ships in 48 hrs</span>
              <span>Free shipping $300+</span>
            </div>
          </div>

          {/* The plate: the CURRENT print labels, straight off the press run —
              two real 45×20mm artworks fanned like proofs on a light table.
              This is the product's actual face, it is unmistakably now, and a
              printed label cannot imply a use the way a photograph can. */}
          <div className="relative z-10 hidden lg:block" aria-label="Current Merit print labels">
            <div className="relative aspect-[4/5]">
              <p className="absolute top-0 left-1 font-mono text-[10px] tracking-[0.16em] uppercase text-ink-muted">
                On press · 29 SKUs · 45×20 mm BOPP
              </p>
              <div className="absolute top-[12%] right-[-4%] w-[88%] rotate-[3.5deg] shadow-[0_18px_44px_rgba(11,13,15,0.14)] ring-1 ring-ink/10">
                <Image
                  src="/brand/labels/tirzepatide.webp"
                  alt=""
                  width={1124}
                  height={524}
                  priority
                  sizes="38vw"
                  className="w-full h-auto"
                />
              </div>
              <div className="absolute top-[36%] left-[-3%] w-[94%] rotate-[-2.5deg] shadow-[0_30px_70px_rgba(11,13,15,0.2)] ring-1 ring-ink/10">
                <Image
                  src="/brand/labels/retatrutide.webp"
                  alt="Current Merit Retatrutide 10 mg vial label — Research Use Only"
                  width={1124}
                  height={524}
                  priority
                  sizes="40vw"
                  className="w-full h-auto"
                />
              </div>
              {/* Spec tag — the number behind the label's lot. */}
              <div className="absolute bottom-[6%] left-[4%] bg-white border border-ink/15 px-4 py-3 shadow-[0_12px_32px_rgba(11,13,15,0.12)]">
                <p className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-ink-muted">Lot LOT2026-06-0001 · ILS verified</p>
                <p className="font-poster font-black text-[22px] tracking-[-0.02em] mt-0.5">99.13% <span className="text-[12px] font-mono font-bold text-cobalt align-middle">HPLC</span></p>
              </div>
            </div>
          </div>

          {/* Mobile: single label plate under the copy. */}
          <div className="relative z-10 lg:hidden">
            <div className="rotate-[-1.5deg] shadow-[0_20px_48px_rgba(11,13,15,0.16)] ring-1 ring-ink/10">
              <Image
                src="/brand/labels/retatrutide.webp"
                alt="Current Merit Retatrutide 10 mg vial label — Research Use Only"
                width={1124}
                height={524}
                priority
                sizes="100vw"
                className="w-full h-auto"
              />
            </div>
            <div className="mt-4 inline-block bg-white border border-ink/15 px-3.5 py-2.5">
              <p className="font-mono text-[9px] tracking-[0.14em] uppercase text-ink-muted">Lot LOT2026-06-0001 · ILS verified</p>
              <p className="font-poster font-black text-[18px] tracking-[-0.02em]">99.13% <span className="text-[10.5px] font-mono font-bold text-cobalt align-middle">HPLC</span></p>
            </div>
          </div>
        </div>

        {/* Price ticker — live-inventory energy, zero JS. */}
        <div className="relative border-y border-ink/10 overflow-hidden bg-white">
          <div className="ticker-track flex whitespace-nowrap py-3.5">
            {[0, 1].map((dup) => (
              <div key={dup} aria-hidden={dup === 1} className="flex shrink-0">
                {TICKER.map((t) => (
                  <span key={`${dup}-${t}`} className="font-mono text-[11.5px] tracking-[0.08em] uppercase text-ink-soft px-7 border-r border-ink/10">
                    {t}
                  </span>
                ))}
              </div>
            ))}
          </div>
          <style>{`
            .ticker-track { animation: conceptATicker 46s linear infinite; }
            @keyframes conceptATicker { from { transform: translateX(0) } to { transform: translateX(-50%) } }
            @media (prefers-reduced-motion: reduce) { .ticker-track { animation: none } }
          `}</style>
        </div>
      </section>

      {/* ── §02 · SHOP — gallery plinths, halo per compound ────────────────── */}
      <section className="bg-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-18 lg:py-24 pt-16">
          <div className="flex items-end justify-between gap-6 mb-10">
            <h2
              className="font-poster font-black uppercase leading-[0.94] tracking-[-0.04em]"
              style={{ fontSize: 'clamp(28px, 4.6vw, 70px)' }}
            >
              What researchers
              <br />
              reorder.
            </h2>
            <Link href="/catalog" className="hidden sm:block font-mono text-[11px] tracking-[0.12em] uppercase text-cobalt hover:text-ink transition pb-2">
              All 29 →
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {FEATURED.map((p) => (
              <Link
                key={p.handle}
                href={`/products/${p.handle}`}
                className="group relative border border-ink/10 hover:border-ink transition-colors bg-white"
              >
                {/* The card is the label — the real print file on a light
                    table, not a rendering of packaging we no longer use. */}
                <div className="relative aspect-square overflow-hidden bg-[#F4F2EC] flex items-center px-4 lg:px-5">
                  <div className="w-full rotate-[-2deg] shadow-[0_14px_34px_rgba(11,13,15,0.16)] ring-1 ring-ink/10 group-hover:rotate-0 group-hover:-translate-y-1 transition-transform duration-500">
                    <Image
                      src={p.img}
                      alt={`Current Merit ${p.title} vial label — Research Use Only`}
                      width={1124}
                      height={524}
                      sizes="(max-width: 1024px) 46vw, 22vw"
                      className="w-full h-auto"
                    />
                  </div>
                </div>
                <div className="border-t border-ink/10 p-4 lg:p-5">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-poster font-extrabold text-[15px] lg:text-[17px] tracking-[-0.02em]">{p.title}</h3>
                    <span className="font-poster font-black text-[16px] lg:text-[18px]">{p.price}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2 mt-1">
                    <p className="font-mono text-[10px] text-ink-muted">{p.size}</p>
                    <p className="font-mono text-[10px] font-bold text-cobalt">{p.rate}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-ink/10 px-6 py-4">
            <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-ink-soft">
              Every order ships with its lot certificate · 48hr dispatch
            </p>
            <Link
              href="/catalog"
              className="bg-ink text-white px-7 py-3 min-h-[44px] inline-flex items-center text-[11px] font-poster font-black tracking-[0.16em] uppercase hover:bg-cobalt transition"
            >
              Browse the catalog →
            </Link>
          </div>
        </div>
      </section>

      {/* ── §03 · THE DIFFERENCE — split, paper object carries the proof ──── */}
      <section className="bg-cream border-y border-ink/10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div>
            <p className="font-mono text-[11px] tracking-[0.16em] uppercase text-cobalt mb-5">
              Why the price can stay low
            </p>
            <h2
              className="font-poster font-black uppercase leading-[0.92] tracking-[-0.04em] max-w-[14ch]"
              style={{ fontSize: 'clamp(28px, 4.2vw, 62px)' }}
            >
              We spend on the lab, not the logo.
            </h2>
            <div className="mt-8 space-y-5 max-w-[52ch]">
              {[
                ['Compounded, not imported blind', 'Licensed US facility, compounded to USP <797> — the sterile-compounding standard, on every lot.'],
                ['Tested by an outside lab', 'Identity, purity, heavy metals, fentanyl screen — run by ILS Laboratories, not by us.'],
                ['Published before you pay', 'Scan the QR on any vial and that exact lot’s certificate opens. No account, no email chain.'],
              ].map(([t, b]) => (
                <div key={t} className="flex gap-4">
                  <span aria-hidden="true" className="mt-[7px] h-2 w-2 shrink-0 bg-cobalt" />
                  <p className="text-[14.5px] leading-[1.6] text-ink-soft">
                    <b className="text-ink font-semibold">{t}.</b> {b}
                  </p>
                </div>
              ))}
            </div>
            <form action="/coa" method="get" className="mt-9 flex max-w-[420px]">
              <input
                name="q"
                placeholder="LOOK UP A LOT NUMBER"
                className="flex-1 min-h-[44px] bg-white border border-ink/25 border-r-0 px-4 font-mono text-[11.5px] tracking-[0.06em] placeholder-ink-muted focus:outline-none focus:border-cobalt transition"
              />
              <button
                type="submit"
                className="bg-ink text-white px-6 min-h-[44px] text-[11px] font-poster font-black tracking-[0.14em] uppercase hover:bg-cobalt transition"
              >
                Verify
              </button>
            </form>
          </div>

          {/* The certificate as a small paper object on the table — present,
              credible, and deliberately not the show. */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative w-[min(88%,460px)] rotate-[-2deg] shadow-[0_32px_72px_rgba(11,13,15,0.18)]">
              <Image
                src="/brand/coa-document-detail.webp"
                alt="ILS Laboratories certificate of analysis for Merit lot LOT2026-06-0001 — 99.13% purity, PASS"
                width={1800}
                height={736}
                className="w-full h-auto bg-white"
              />
              <div className="absolute -bottom-4 -right-3 bg-cobalt text-white px-4 py-2 rotate-2">
                <p className="font-mono text-[10px] tracking-[0.12em] uppercase">14 lots published</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── §04 · COBALT BAND — the promise, stated once, huge ────────────── */}
      <section className="relative isolate overflow-hidden bg-cobalt text-white">
        <Image
          src="/brand/scene-pattern-cobalt.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-30 mix-blend-luminosity"
        />
        <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12 py-20 lg:py-28">
          <h2
            className="font-poster font-black uppercase leading-[0.9] tracking-[-0.045em]"
            style={{ fontSize: 'clamp(32px, 5.8vw, 92px)' }}
          >
            Every lot,
            <br />
            on the record.
          </h2>
          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/25 border border-white/25 max-w-[980px]">
            {[
              ['29', 'compounds stocked'],
              ['≥99%', 'HPLC purity'],
              ['100%', 'lots third-party tested'],
              ['48 hrs', 'to dispatch'],
            ].map(([n, l]) => (
              <div key={l} className="bg-cobalt px-5 py-5">
                <p className="font-poster font-black text-[26px] lg:text-[34px] tracking-[-0.03em] leading-none">{n}</p>
                <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-white/70 mt-2">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── §05 · CLOSE ────────────────────────────────────────────────────── */}
      <section className="bg-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-20 lg:py-28 text-center">
          <h2
            className="font-poster font-black uppercase leading-[0.9] tracking-[-0.045em]"
            style={{ fontSize: 'clamp(30px, 5vw, 76px)' }}
          >
            Stock the shelf.
          </h2>
          <p className="mt-5 text-[15px] text-ink-soft max-w-[46ch] mx-auto">
            29 compounds, certificates included, free shipping over $300.
          </p>
          <Link
            href="/catalog"
            className="inline-block mt-8 bg-ink text-white px-10 py-4 text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-cobalt transition"
          >
            Shop the catalog
          </Link>
        </div>
      </section>
    </div>
  );
}
