import Link from 'next/link';

/* ═════════════════════════════════════════════════════════════════════════
   CONCEPT C · "THE INDEX" — brutalist catalog-as-homepage, speed-led.

   Thesis: the highest-intent visitor already knows the compound they want,
   so the fastest-converting homepage IS the price list — designed like a
   Swiss timetable, not a spreadsheet. Typography and four class colors do
   all the visual work; there is not a single photograph on the page, which
   also means nothing to imply human use and nothing that dates.

   The conversion spine is SPEED AND CANDOR: prices above the fold, $/mg on
   every row, the whole catalog two taps away. COA appears once, as a
   single ledger line with a lookup.

   Standalone concept route — fixture data inline, noindex, deletable.
   ═════════════════════════════════════════════════════════════════════════ */

export const metadata = {
  title: 'Concept C — The Index',
  robots: { index: false, follow: false },
};

// Real production prices. Class colors: GLP cobalt / blend orange /
// cofactor violet / neuro green — the "disciplined joy" register: paper and
// ink everywhere, color only where it encodes meaning.
const INDEX = [
  { handle: 'retatrutide-10mg', name: 'Retatrutide', size: '10 mg', price: '$99.99', rate: '$10.00/mg', cls: 'GLP', c: '#2D6BE4' },
  { handle: 'tirzepatide-10mg', name: 'Tirzepatide', size: '10 mg', price: '$74.99', rate: '$7.50/mg', cls: 'GLP', c: '#2D6BE4' },
  { handle: 'semaglutide-10mg', name: 'Semaglutide', size: '10 mg', price: '$64.99', rate: '$6.50/mg', cls: 'GLP', c: '#2D6BE4' },
  { handle: 'bpc-157-10mg', name: 'BPC-157', size: '10 mg', price: '$60.99', rate: '$6.10/mg', cls: 'Peptide', c: '#FF5C00' },
  { handle: 'bpc-10mg-tb-10mg-wolverine-20mg', name: 'Wolverine', size: 'BPC+TB · 20 mg', price: '$99.99', rate: '$5.00/mg', cls: 'Blend', c: '#FF5C00' },
  { handle: 'bpc157-ghk-cu-50-tb500-kpv-klow-80mg', name: 'Klow', size: '4-peptide · 80 mg', price: '$174.99', rate: '$2.19/mg', cls: 'Blend', c: '#FF5C00' },
  { handle: 'nad-500mg', name: 'NAD+', size: '500 mg', price: '$84.99', rate: '$0.17/mg', cls: 'Cofactor', c: '#7C3AED' },
  { handle: 'glutathione-1500mg', name: 'Glutathione', size: '1500 mg', price: '$84.99', rate: '$0.06/mg', cls: 'Cofactor', c: '#7C3AED' },
  { handle: 'ipamorelin-10mg', name: 'Ipamorelin', size: '10 mg', price: '$59.99', rate: '$6.00/mg', cls: 'Peptide', c: '#16A34A' },
  { handle: 'selank', name: 'Selank', size: '10 mg', price: '$55.99', rate: '$5.60/mg', cls: 'Neuro', c: '#16A34A' },
];

const CLASSES = [
  { label: 'GLPs', q: 'GLP', count: 7, c: '#2D6BE4', blurb: 'Incretin-class & metabolic' },
  { label: 'Blends', q: 'BPC', count: 5, c: '#FF5C00', blurb: 'Co-formulated multi-peptide' },
  { label: 'Cofactors', q: 'NAD', count: 4, c: '#7C3AED', blurb: 'Coenzymes & pathways' },
  { label: 'Neuro', q: 'Selank', count: 5, c: '#16A34A', blurb: 'Short-chain CNS-active' },
];

export default function ConceptC() {
  return (
    <div className="bg-[#F6F5F1] text-ink">
      {/* ── §01 · MASTHEAD — numbers as the headline ───────────────────────── */}
      <section className="border-b-2 border-ink">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 pt-12 lg:pt-16 pb-8 lg:pb-10">
          <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 font-mono text-[10.5px] lg:text-[11px] tracking-[0.14em] uppercase text-ink-soft border-b border-ink/20 pb-4">
            <span>Merit Sciences · Dallas TX</span>
            <span>USP &lt;797&gt; compounded</span>
            <span>Third-party tested · every lot</span>
            <span>Vol. 29 compounds</span>
          </div>
          <h1
            className="font-poster font-black uppercase leading-[0.85] tracking-[-0.05em] mt-8"
            style={{ fontSize: 'clamp(42px, 8.4vw, 148px)' }}
          >
            The price list
            <br />
            <span className="text-transparent" style={{ WebkitTextStroke: '2.5px rgba(11,13,15,0.8)' }}>
              is the pitch.
            </span>
          </h1>
          <div className="mt-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <p className="max-w-[52ch] text-[15px] lg:text-[16px] leading-[1.6] text-ink-soft">
              Pharmacy-grade compounds at gray-market prices, with the lab report to prove the
              difference. No mystery tiers, no &ldquo;DM for pricing&rdquo; — the number on this
              page is the number at checkout.
            </p>
            <div className="flex gap-3 shrink-0">
              <Link
                href="/catalog"
                className="bg-ink text-white px-8 py-4 text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-[#FF5C00] transition"
              >
                Full catalog
              </Link>
              <a
                href="#index"
                className="border-2 border-ink px-8 py-4 text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-ink hover:text-white transition"
              >
                Jump to prices ↓
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── §02 · THE INDEX — the page's engine ────────────────────────────── */}
      <section id="index">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-12 lg:py-16">
          <div className="flex items-baseline justify-between gap-4 mb-6">
            <h2 className="font-mono text-[11px] tracking-[0.16em] uppercase text-ink-soft">
              Index · 10 of 29 · alphabetical by demand
            </h2>
            <p className="hidden sm:block font-mono text-[11px] tracking-[0.16em] uppercase text-ink-soft">
              $/mg = the honest axis
            </p>
          </div>

          <div className="border-t-2 border-ink">
            {INDEX.map((p, i) => (
              <Link
                key={p.handle}
                href={`/products/${p.handle}`}
                className="group grid grid-cols-[28px_1fr_auto] lg:grid-cols-[44px_minmax(0,1.2fr)_110px_minmax(0,0.5fr)_100px_120px_36px] items-baseline lg:items-center gap-x-3 lg:gap-x-6 border-b border-ink/25 py-4 lg:py-[18px] transition-colors hover:bg-white"
              >
                <span className="font-mono text-[11px] text-ink-muted">{String(i + 1).padStart(2, '0')}</span>
                <span
                  className="font-poster font-black uppercase leading-none tracking-[-0.03em] truncate"
                  style={{ fontSize: 'clamp(20px, 2.9vw, 44px)' }}
                >
                  {p.name}
                </span>
                <span className="hidden lg:flex items-center gap-2 font-mono text-[10px] tracking-[0.1em] uppercase">
                  <span aria-hidden="true" className="h-2.5 w-2.5" style={{ background: p.c }} />
                  {p.cls}
                </span>
                <span className="hidden lg:block font-mono text-[11.5px] text-ink-soft">{p.size}</span>
                <span className="hidden lg:block font-mono text-[11.5px] font-bold text-ink-soft">{p.rate}</span>
                <span className="font-poster font-black text-[17px] lg:text-[22px] tracking-[-0.02em] justify-self-end">{p.price}</span>
                <span
                  aria-hidden="true"
                  className="hidden lg:block font-mono text-[16px] text-ink-muted justify-self-end group-hover:translate-x-1 transition-transform"
                  style={{ color: p.c }}
                >
                  →
                </span>
                {/* Mobile second line: class dot + size + rate */}
                <span className="col-start-2 lg:hidden flex items-center gap-2.5 font-mono text-[10px] tracking-[0.08em] uppercase text-ink-soft">
                  <span aria-hidden="true" className="h-2 w-2" style={{ background: p.c }} />
                  {p.size} · {p.rate}
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="font-mono text-[11px] tracking-[0.1em] uppercase text-ink-soft">
              + 19 more · free shipping over $300 · ships 48 hrs
            </p>
            <Link
              href="/catalog"
              className="bg-ink text-white px-8 py-3.5 min-h-[44px] inline-flex items-center text-[11px] font-poster font-black tracking-[0.16em] uppercase hover:bg-[#FF5C00] transition"
            >
              See all 29 →
            </Link>
          </div>
        </div>
      </section>

      {/* ── §03 · CLASS BLOCKS — the only color fields on the page ────────── */}
      <section className="border-y-2 border-ink bg-[#F6F5F1]">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {CLASSES.map((f, i) => (
            <Link
              key={f.label}
              href={`/catalog?q=${encodeURIComponent(f.q)}`}
              className={`group relative overflow-hidden p-7 lg:p-9 min-h-[190px] lg:min-h-[230px] flex flex-col justify-between text-white transition-transform ${i < 3 ? 'sm:border-r-2 border-ink' : ''} border-b-2 sm:border-b-0 border-ink`}
              style={{ background: f.c }}
            >
              <div className="flex items-start justify-between">
                <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-white/75">{String(f.count).padStart(2, '0')} compounds</span>
                <span aria-hidden="true" className="font-mono text-[18px] group-hover:translate-x-1.5 transition-transform">→</span>
              </div>
              <div>
                <h3
                  className="font-poster font-black uppercase leading-[0.9] tracking-[-0.03em]"
                  style={{ fontSize: 'clamp(26px, 3vw, 44px)' }}
                >
                  {f.label}
                </h3>
                <p className="font-mono text-[10.5px] tracking-[0.08em] uppercase text-white/75 mt-2">{f.blurb}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── §04 · THE LEDGER LINE — COA in exactly one row ────────────────── */}
      <section>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-10 lg:py-12">
          <div className="border-2 border-ink bg-white grid grid-cols-1 lg:grid-cols-[1fr_auto] items-center">
            <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2 px-6 lg:px-8 py-5">
              <span className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-ink-muted">Latest receipt</span>
              <span className="font-mono text-[12.5px] font-bold">LOT2026-06-0001</span>
              <span className="font-poster font-black text-[22px] tracking-[-0.02em] text-[#2D6BE4]">99.13%</span>
              <span className="font-mono text-[11.5px] text-ink-soft">Retatrutide 10 mg · ILS Laboratories · signed</span>
            </div>
            <form action="/coa" method="get" className="flex border-t-2 lg:border-t-0 lg:border-l-2 border-ink">
              <input
                name="q"
                placeholder="VERIFY YOUR LOT"
                className="flex-1 lg:w-[240px] min-h-[52px] px-5 font-mono text-[11.5px] tracking-[0.06em] bg-white placeholder-ink-muted focus:outline-none"
              />
              <button
                type="submit"
                className="bg-ink text-white px-7 min-h-[52px] text-[11px] font-poster font-black tracking-[0.14em] uppercase hover:bg-[#2D6BE4] transition"
              >
                Verify
              </button>
            </form>
          </div>
          <p className="mt-3 font-mono text-[10px] tracking-[0.08em] uppercase text-ink-muted">
            Every vial carries this lookup as a QR · 14 certificates published
          </p>
        </div>
      </section>

      {/* ── §05 · STATEMENT — ink on paper, orange underline device ───────── */}
      <section className="border-t-2 border-ink">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 lg:py-24">
          <h2
            className="font-poster font-black uppercase leading-[0.92] tracking-[-0.045em]"
            style={{ fontSize: 'clamp(30px, 5.4vw, 88px)' }}
          >
            Pharmacy-grade.
            <br />
            Not{' '}
            <span className="relative inline-block">
              &ldquo;trust me bro&rdquo;
              <span aria-hidden="true" className="absolute left-0 right-0 bottom-[6%] h-[0.09em] bg-[#FF5C00]" />
            </span>
            -grade.
          </h2>
          <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-[1100px]">
            {[
              ['Compounded', 'Licensed US facility, USP <797> — the standard hospital pharmacies compound under.'],
              ['Tested', 'Identity, purity, metals, fentanyl — measured by an outside lab on every single lot.'],
              ['Published', 'The certificate posts before the lot can be bought. Read it first, then decide.'],
            ].map(([t, b], i) => (
              <div key={t} className="border-t-2 border-ink pt-4">
                <p className="font-mono text-[10.5px] tracking-[0.14em] uppercase text-ink-muted">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="font-poster font-black uppercase text-[20px] lg:text-[24px] tracking-[-0.02em] mt-1.5">{t}.</h3>
                <p className="text-[13.5px] leading-[1.6] text-ink-soft mt-2.5 max-w-[38ch]">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── §06 · CLOSE — full-ink band ────────────────────────────────────── */}
      <section className="bg-ink text-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 lg:py-24 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <h2
            className="font-poster font-black uppercase leading-[0.88] tracking-[-0.05em]"
            style={{ fontSize: 'clamp(34px, 6vw, 100px)' }}
          >
            Price it.
            <br />
            <span className="text-transparent" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.55)' }}>
              Prove it.
            </span>
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link
              href="/catalog"
              className="bg-white text-black px-10 py-4 text-center text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-[#FF5C00] hover:text-white transition"
            >
              Shop the catalog
            </Link>
            <Link
              href="/coa"
              className="border border-white/40 px-10 py-4 text-center text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-white hover:text-black transition"
            >
              Lot library
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
