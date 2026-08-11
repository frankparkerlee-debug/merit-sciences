import Image from 'next/image';
import Link from 'next/link';

/* ═════════════════════════════════════════════════════════════════════════
   CONCEPT B · rev 2 — dark object cinema carrying Concept A's copy.

   Direction locked with Parker 2026-08-11:
   · Register: the enhanced-games treatment — full-bleed dark scenes,
     monumental type — with OBJECTS, never people.
   · Copy: Concept A's value-led conversion language.
   · NO grade framing anywhere. "Pharmacy-grade" implies dispensing to
     humans; "reference-grade" was obscure. The page leads with proof and
     price instead: every lot gets a receipt, and the receipt is cheap to
     verify and expensive to fake.
   · Product art: the CURRENT 45×20mm print label files — real, at press,
     natively "RESEARCH USE ONLY" — presented as specimen tags on dark.

   Standalone concept route — fixture data inline, noindex, deletable.
   ═════════════════════════════════════════════════════════════════════════ */

export const metadata = {
  title: 'Concept B — After Hours rev 2',
  robots: { index: false, follow: false },
};

const LIME = '#B9FF66';

const FEATURED = [
  { handle: 'retatrutide-10mg', title: 'Retatrutide', size: '10 mg', price: '$99.99', rate: '$10.00/mg', img: '/brand/labels/retatrutide.webp' },
  { handle: 'tirzepatide-10mg', title: 'Tirzepatide', size: '10 mg', price: '$74.99', rate: '$7.50/mg', img: '/brand/labels/tirzepatide.webp' },
  { handle: 'bpc-10mg-tb-10mg-wolverine-20mg', title: 'Wolverine Blend', size: 'BPC + TB · 20 mg', price: '$99.99', rate: '$5.00/mg', img: '/brand/labels/wolverine.webp' },
  { handle: 'nad-500mg', title: 'NAD+', size: '500 mg', price: '$84.99', rate: '$0.17/mg', img: '/brand/labels/nad.webp' },
];

const CHECKS = [
  ['01', 'Identity', 'Confirmed against a reference standard'],
  ['02', 'Purity', 'HPLC main-peak %, published verbatim'],
  ['03', 'Heavy metals', 'ICP-MS to trace thresholds'],
  ['04', 'Sterility', 'Endotoxin + sterility screened'],
  ['05', 'Fentanyl', 'Immunoassay, result on the certificate'],
  ['06', 'Provenance', 'Lot number resolves to its report'],
];

export default function ConceptB() {
  return (
    <div className="bg-[#08090A] text-white">
      {/* ── §01 · HERO — locked: "Same stack. Better source." The background
             is the Merit vial wall pushed fully out of focus (13px gaussian
             baked into the asset + darkened). Defocus is the fix for the
             AI-label problem: at this blur nothing is legible enough to be
             wrong, and the wall reads as photographic depth-of-field behind
             the one SHARP object — the real signed ILS certificate. A flat
             tiled-label composite was tried and looked like a watermark. ──── */}
      <section className="relative isolate flex min-h-[92svh] items-end overflow-hidden">
        <Image
          src="/brand/pattern-vials-dof.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Scrim: heavy left for type, lighter upper-right so the sheet sits
            in a lit pocket of the pattern rather than fighting it. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(8,9,10,0.86) 0%, rgba(8,9,10,0.62) 38%, rgba(8,9,10,0.18) 62%, rgba(8,9,10,0.34) 100%), linear-gradient(180deg, rgba(8,9,10,0.45) 0%, rgba(8,9,10,0.02) 36%, rgba(8,9,10,0.9) 100%)',
          }}
        />

        {/* The real certificate — page 1 of the signed ILS COA for lot
            LOT2026-06-0001, angled like a sheet lifted off the bench.
            Desktop gets the full document (object scale); mobile gets the
            readable band (compound · lot · 99.13% · PASS) instead, because a
            full letter page at 360px is texture, not evidence. */}
        <div
          aria-hidden="true"
          className="hidden lg:block absolute z-[1] right-[4%] top-[9%] w-[24%] max-w-[400px] bg-white"
          style={{
            transform: 'perspective(1700px) rotateY(-12deg) rotateZ(-2deg)',
            transformOrigin: 'right center',
            filter: 'drop-shadow(-32px 40px 72px rgba(0,0,0,0.85))',
          }}
        >
          <Image
            src="/brand/coa-document.webp"
            alt=""
            width={1400}
            height={2014}
            priority
            sizes="34vw"
            className="w-full h-auto"
          />
        </div>
        <div
          aria-hidden="true"
          className="lg:hidden absolute z-[1] left-[8%] right-[-12%] top-[13%] bg-white"
          style={{ transform: 'rotate(-2deg)', filter: 'drop-shadow(-10px 20px 40px rgba(0,0,0,0.75))' }}
        >
          <Image
            src="/brand/coa-document-detail.webp"
            alt=""
            width={1800}
            height={736}
            priority
            sizes="104vw"
            className="w-full h-auto"
          />
        </div>
        {/* The certificate's contents as real DOM text for crawlers + SR. */}
        <p className="sr-only">
          Certificate of analysis COA-2026-49Y4L7 issued by ILS Laboratories (ISO/IEC 17025
          accredited) for Retatrutide 10 mg, lot LOT2026-06-0001. Peptide purity 99.13% by HPLC.
          Identity confirmed. Fentanyl screen: not detected. Heavy metals: pass. Result: pass.
        </p>

        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 lg:px-12 pb-16 lg:pb-20">
          <p className="font-mono text-[11px] lg:text-[12px] tracking-[0.16em] uppercase mb-5" style={{ color: LIME }}>
            29 compounds in stock · Compounded in Dallas · Tested by ILS Laboratories
          </p>
          <h1
            className="font-poster font-black uppercase leading-[0.84] tracking-[-0.05em]"
            style={{ fontSize: 'clamp(42px, 7.6vw, 128px)' }}
          >
            Same stack.
            <br />
            <span className="text-transparent" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.6)' }}>
              Better source.
            </span>
          </h1>
          <div className="mt-9 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <p className="max-w-[48ch] text-[15px] leading-[1.62] text-white/70">
              The compounds you already source — compounded to USP &lt;797&gt; in a licensed US
              facility, tested by an outside laboratory on every lot, certificate published before
              you pay. From <b className="text-white font-semibold">$0.17 per mg</b>.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link
                href="/catalog"
                className="bg-white text-black px-9 py-4 text-center text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-[#B9FF66] transition"
              >
                Shop 29 compounds
              </Link>
              <Link
                href="/coa"
                className="border border-white/40 px-9 py-4 text-center text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-white hover:text-black transition"
              >
                Read a lab report
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── §02 · LIME TICKER — the one loud thing on the page ────────────── */}
      <section className="overflow-hidden border-y border-black/20" style={{ background: LIME }}>
        <div className="tickerB flex whitespace-nowrap py-3 text-black">
          {[0, 1].map((dup) => (
            <div key={dup} aria-hidden={dup === 1} className="flex shrink-0">
              {[
                'FREE SHIPPING OVER $300', 'SHIPS IN 48 HOURS FROM DALLAS', '≥99% HPLC PURITY',
                'FENTANYL-SCREENED EVERY LOT', 'RETATRUTIDE FROM $99.99', 'TIRZEPATIDE FROM $74.99',
                'THIRD-PARTY TESTED · ILS LABORATORIES', '14 CERTIFICATES PUBLISHED',
              ].map((t) => (
                <span key={`${dup}-${t}`} className="font-poster font-black text-[13px] tracking-[0.1em] px-8 flex items-center gap-8">
                  {t} <span aria-hidden="true" className="text-[10px]">◆</span>
                </span>
              ))}
            </div>
          ))}
        </div>
        <style>{`
          .tickerB { animation: conceptBTicker 38s linear infinite; }
          @keyframes conceptBTicker { from { transform: translateX(0) } to { transform: translateX(-50%) } }
          @media (prefers-reduced-motion: reduce) { .tickerB { animation: none } }
        `}</style>
      </section>

      {/* ── §03 · SHOP — current label art as specimen tags on dark ───────── */}
      <section>
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
            <Link href="/catalog" className="hidden sm:block font-mono text-[11px] tracking-[0.12em] uppercase text-white/50 hover:text-white transition pb-2">
              All 29 →
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/12 border border-white/12">
            {FEATURED.map((p) => (
              <Link
                key={p.handle}
                href={`/products/${p.handle}`}
                className="group bg-[#08090A] hover:bg-[#0E1013] transition-colors"
              >
                {/* The current print label as a lit specimen tag — the real
                    artwork at press, glowing against the dark tile. */}
                <div className="relative aspect-square overflow-hidden flex items-center px-5 lg:px-6">
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-[8%] top-[18%] aspect-square rounded-full"
                    style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 52%, rgba(8,9,10,0) 72%)' }}
                  />
                  <div className="relative w-full rotate-[-2deg] shadow-[0_26px_54px_rgba(0,0,0,0.75)] group-hover:rotate-0 group-hover:-translate-y-1.5 transition-transform duration-500">
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
                <div className="border-t border-white/12 p-4 lg:p-5">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-poster font-extrabold text-[15px] lg:text-[16px] tracking-[-0.02em]">{p.title}</h3>
                    <span className="font-poster font-black text-[16px] lg:text-[18px]" style={{ color: LIME }}>{p.price}</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2 mt-1">
                    <p className="font-mono text-[10px] text-white/40">{p.size}</p>
                    <p className="font-mono text-[10px] font-bold text-white/60">{p.rate}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/12 px-6 py-4">
            <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-white/50">
              Every order ships with its lot certificate · 48hr dispatch
            </p>
            <Link
              href="/catalog"
              className="bg-white text-black px-7 py-3 min-h-[44px] inline-flex items-center text-[11px] font-poster font-black tracking-[0.16em] uppercase hover:bg-[#B9FF66] transition"
            >
              Browse the catalog →
            </Link>
          </div>
        </div>
      </section>

      {/* ── §04 · WHY THE PRICE CAN STAY LOW — A's best section, dark.
             Flat black on purpose: the vial-wall pattern is the hero's ground
             now, and repeating it here would flatten both. ────────────────── */}
      <section className="relative isolate overflow-hidden bg-black border-y border-white/10">
        <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12 py-20 lg:py-28 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-20 items-center">
          <div>
            <p className="font-mono text-[11px] tracking-[0.16em] uppercase mb-5" style={{ color: LIME }}>
              Why the price can stay low
            </p>
            <h2
              className="font-poster font-black uppercase leading-[0.9] tracking-[-0.045em] max-w-[13ch]"
              style={{ fontSize: 'clamp(32px, 5.4vw, 86px)' }}
            >
              We spend on the lab, not the logo.
            </h2>
            <div className="mt-8 space-y-5 max-w-[54ch]">
              {[
                ['Compounded, not imported blind', 'Licensed US facility, compounded to USP <797> — the sterile-compounding standard, on every lot.'],
                ['Tested by an outside lab', 'Identity, purity, heavy metals, fentanyl screen — run by ILS Laboratories, not by us.'],
                ['Published before you pay', 'Scan the QR on any vial and that exact lot’s certificate opens. No account, no email chain.'],
              ].map(([t, b]) => (
                <div key={t} className="flex gap-4">
                  <span aria-hidden="true" className="mt-[7px] h-2 w-2 shrink-0" style={{ background: LIME }} />
                  <p className="text-[14.5px] leading-[1.6] text-white/60">
                    <b className="text-white font-semibold">{t}.</b> {b}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* The live receipt: current lot record + verify — one beat, not a
              section of its own. */}
          <div className="border border-white/15 bg-white/[0.03] backdrop-blur-[2px]">
            <div className="px-6 py-4 border-b border-white/15 font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: LIME }}>
              Newest receipt
            </div>
            {[
              ['Lot', 'LOT2026-06-0001'],
              ['Compound', 'Retatrutide 10 mg'],
              ['Purity (HPLC)', '99.13%'],
              ['Fentanyl', 'Not detected'],
              ['Laboratory', 'ILS · ISO/IEC 17025'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-6 py-3 border-b border-white/10 font-mono text-[11.5px]">
                <span className="text-white/40 uppercase tracking-[0.06em]">{k}</span>
                <span className="font-bold">{v}</span>
              </div>
            ))}
            <form action="/coa" method="get" className="flex p-4">
              <input
                name="q"
                placeholder="VERIFY A LOT NUMBER"
                className="flex-1 min-h-[44px] bg-white/[0.06] border border-white/25 border-r-0 px-4 font-mono text-[11.5px] tracking-[0.06em] text-white placeholder-white/35 focus:outline-none transition focus:border-[#B9FF66]"
              />
              <button
                type="submit"
                className="bg-white text-black px-6 min-h-[44px] text-[11px] font-poster font-black tracking-[0.14em] uppercase hover:bg-[#B9FF66] transition"
              >
                Verify
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ── §05 · THE CAKE — what actually ships ──────────────────────────── */}
      <section className="relative isolate overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-18 lg:py-24 pt-16 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="relative aspect-[3/2] overflow-hidden border border-white/10">
            <Image
              src="/brand/hero-cake.webp"
              alt="Sealed Merit vial of lyophilized compound"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div>
            <p className="font-mono text-[11px] tracking-[0.16em] uppercase mb-5" style={{ color: LIME }}>
              Sealed · Sterile · Lyophilized
            </p>
            <h2
              className="font-poster font-black uppercase leading-[0.92] tracking-[-0.04em] max-w-[14ch]"
              style={{ fontSize: 'clamp(28px, 4.2vw, 62px)' }}
            >
              Milligrams, not promises.
            </h2>
            <p className="mt-6 max-w-[50ch] text-[14.5px] leading-[1.65] text-white/60">
              What arrives is a sealed vial of lyophilized material with a lot number printed on
              the label. Six checks stand between compounding and release:
            </p>
            <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5 max-w-[560px]">
              {CHECKS.map(([n, t, b]) => (
                <div key={n} className="flex gap-3 items-baseline border-b border-white/10 pb-3">
                  <span className="font-mono text-[10px] text-white/35">{n}</span>
                  <p className="text-[13px] leading-[1.5] text-white/75">
                    <b className="font-semibold text-white">{t}.</b>{' '}
                    <span className="text-white/50">{b}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── §06 · CLOSE — the monolith ────────────────────────────────────── */}
      <section className="relative isolate flex min-h-[70svh] items-end overflow-hidden">
        <Image src="/brand/hero-monolith.webp" alt="" fill sizes="100vw" className="object-cover" />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(8,9,10,0.6) 0%, rgba(8,9,10,0.15) 40%, rgba(8,9,10,0.95) 100%)' }}
        />
        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 lg:px-12 pb-16 lg:pb-20">
          <h2
            className="font-poster font-black uppercase leading-[0.85] tracking-[-0.05em] mb-8"
            style={{ fontSize: 'clamp(34px, 6.2vw, 104px)' }}
          >
            Know what&rsquo;s
            <br />
            <span className="text-transparent" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.6)' }}>
              in the vial.
            </span>
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/catalog"
              className="bg-white text-black px-9 py-4 text-center text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-[#B9FF66] transition"
            >
              Shop the catalog
            </Link>
            <Link
              href="/coa"
              className="border border-white/40 px-9 py-4 text-center text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-white hover:text-black transition"
            >
              Lot library
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
