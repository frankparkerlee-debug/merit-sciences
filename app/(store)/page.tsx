import Image from 'next/image';
import Link from 'next/link';
import { getProduct, listProducts, money } from '@/lib/catalog';
import { prisma } from '@/lib/db';

// Force-dynamic until Supabase pooling is moved to transaction mode
// (port 6543 + ?pgbouncer=true). With session mode capped at 15
// connections, build-time prerender of 46+ pages exhausts the pool
// and crashes the deploy. Dynamic rendering queries one request at
// a time, well under the cap.
export const dynamic = 'force-dynamic';

/* Homepage-specific social + SERP impression. The layout default is written
   generically because it also rides on the /access ad gate; the homepage can
   afford to lead with the locked positioning line. */
export const metadata = {
  title: { absolute: 'Merit Sciences — Same Stack. Better Source.' },
  description:
    'Research compounds compounded to USP <797> in a licensed US facility, independently assayed, with the certificate published for every lot. Ships 48hr from San Antonio.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Merit Sciences — Same Stack. Better Source.',
    description:
      'Compounded to USP <797>, assayed by an independent laboratory, certificate published on every lot. Ships 48 hours from San Antonio.',
    url: 'https://meritsciences.com',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Merit Sciences — Same Stack. Better Source. Research compounds, ≥99% HPLC purity, USP <797> compounded, every lot assayed, 48-hour dispatch from San Antonio.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Merit Sciences — Same Stack. Better Source.',
    description:
      'USP <797> compounded, independently assayed, certificate published on every lot. Ships 48hr from San Antonio.',
    images: ['/og-image.jpg'],
  },
};

/* ─────────────────────────────────────────────────────────────────────────
   HOMEPAGE — locked with Parker 2026-08-11 ("This is it.").

   Ported from app/(store)/concepts/b (rev 2). The register:

   · Dark object cinema — full-bleed scenes, monumental type, objects only.
     People imply human use; there are none anywhere on the page.
   · Hero: "SAME STACK. BETTER SOURCE." over the Merit vial wall pushed
     into photographic depth-of-field (defocus baked into the asset — at
     this blur only the real "Merit." wordmark survives, so nothing
     illegible-but-wrong can be read). Type only: the COA sheet was tried
     here and floated awkwardly at tall/narrow viewports — the certificate
     evidence lives in §04's live receipt panel and on /coa instead.
   · NO grade framing anywhere: "pharmacy-grade" implies dispensing to
     people and was dropped on the team's compliance concern;
     "reference-grade" was obscure. The page sells proof and price.
   · Product art: the CURRENT 45×20mm print label files (public/brand/
     labels/, from Labels/Research/PNG at press) as lit specimen tags.
   · Claims discipline: every claim is about what Merit DID to the vial
     (compounded, tested, published), never what the vial does to anyone.

   The previous iterations are preserved: PCAC/athlete page at
   _archive/pcac-homepage.tsx; the receipt-led draft superseded by this
   port lives in git history.
   ───────────────────────────────────────────────────────────────────────── */

const LIME = '#B9FF66';

// Featured shelf. Handles verified against production; label art is the
// current print file for that SKU. If a handle disappears, the card drops
// out via .filter(Boolean) rather than rendering a broken tile.
const FEATURED_HANDLES: { handle: string; label: string }[] = [
  { handle: 'retatrutide-10mg', label: '/brand/labels/retatrutide.webp' },
  { handle: 'tirzepatide-10mg', label: '/brand/labels/tirzepatide.webp' },
  { handle: 'bpc-10mg-tb-10mg-wolverine-20mg', label: '/brand/labels/wolverine.webp' },
  { handle: 'nad-500mg', label: '/brand/labels/nad.webp' },
];

const CHECKS = [
  ['01', 'Identity', 'Confirmed against a reference standard'],
  ['02', 'Purity', 'HPLC main-peak %, published verbatim'],
  ['03', 'Heavy metals', 'ICP-MS to trace thresholds'],
  ['04', 'Sterility', 'Endotoxin + sterility screened'],
  ['05', 'Fentanyl', 'Immunoassay, result on the certificate'],
  ['06', 'Provenance', 'Lot number resolves to its report'],
];

/** $/mg from the vial-size string — the honest comparison axis. Null for
 *  non-mg formats (e.g. bacteriostatic water in ml). */
function perMg(priceCents: number, vialSize: string): string | null {
  const m = /([\d.]+)\s*mg/i.exec(vialSize);
  if (!m) return null;
  const mg = parseFloat(m[1]);
  if (!isFinite(mg) || mg <= 0) return null;
  return `$${(priceCents / 100 / mg).toFixed(2)}/mg`;
}

/** Newest published lot — drives the receipt panel. Never invent lab values
 *  on a page whose entire argument is that the numbers are real.
 *
 *  Bacteriostatic water is excluded deliberately: it is released on a USP
 *  sterility + preservative-content assay, not HPLC, so its `purity` column
 *  holds benzyl alcohol content (~0.9%). Rendered under "Purity (HPLC)" it
 *  reads as "this product is 0.85% pure" — false, and the worst possible
 *  number to publish. Anything on a different assay stays out of this slot. */
async function latestLot() {
  try {
    return await prisma.coa.findFirst({
      where: {
        NOT: [
          { compound: { contains: 'water', mode: 'insensitive' } },
          { compound: { contains: 'bacteriostatic', mode: 'insensitive' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      select: { lotId: true, coaNumber: true, purity: true, compound: true, testedDate: true },
    });
  } catch {
    return null; // DB blip — the panel degrades to the verify form, which still works.
  }
}

export default async function HomePage() {
  const [featuredRaw, allProducts, lot, lotCount] = await Promise.all([
    Promise.all(FEATURED_HANDLES.map((f) => getProduct(f.handle).catch(() => null))),
    listProducts({ status: 'active' }).catch(() => []),
    latestLot(),
    prisma.coa.count().catch(() => 0),
  ]);

  const featured = FEATURED_HANDLES.map((f, i) => {
    const p = featuredRaw[i];
    return p ? { ...p, labelArt: f.label } : null;
  }).filter(Boolean) as (NonNullable<Awaited<ReturnType<typeof getProduct>>> & {
    labelArt: string;
  })[];

  const productCount = allProducts.length || 29;

  // Ticker facts — live prices where we have them, standing facts otherwise.
  const ticker = [
    'FREE SHIPPING OVER $300',
    'SHIPS IN 48 HOURS FROM DALLAS',
    '≥99% HPLC PURITY',
    'FENTANYL-SCREENED EVERY LOT',
    ...featured.slice(0, 2).map((p) => `${p.title.toUpperCase()} FROM ${money(p.priceCents)}`),
    'THIRD-PARTY TESTED · ILS LABORATORIES',
    ...(lotCount > 0 ? [`${lotCount} CERTIFICATES PUBLISHED`] : []),
  ];

  return (
    <>
      {/* ════════════════ §01 · HERO ═══════════════════════════════════════ */}
      <section className="relative isolate flex h-[92svh] min-h-[560px] max-h-[880px] items-end overflow-hidden bg-[#08090A] text-white">
        <Image
          src="/brand/pattern-vials-dof.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Scrim: heavy left for type, easing right so the defocused wall
            stays perceptible across the frame. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(8,9,10,0.86) 0%, rgba(8,9,10,0.60) 40%, rgba(8,9,10,0.24) 70%, rgba(8,9,10,0.30) 100%), linear-gradient(180deg, rgba(8,9,10,0.5) 0%, rgba(8,9,10,0.05) 36%, rgba(8,9,10,0.9) 100%)',
          }}
        />

        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 lg:px-12 pb-16 lg:pb-20">
          <p className="font-mono text-[11px] lg:text-[12px] tracking-[0.16em] uppercase mb-5" style={{ color: LIME }}>
            {productCount} compounds in stock · Compounded in Dallas · Tested by ILS Laboratories
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
                className="bg-white text-black px-9 py-4 text-center text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-[#B9FF66] hover:text-black transition"
              >
                Shop {productCount} compounds
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

      {/* ════════════════ §02 · LIME TICKER ════════════════════════════════
          The one loud thing on the page. Zero-JS marquee; reduced-motion
          gets a static strip. */}
      <section className="overflow-hidden border-y border-black/20 text-black" style={{ background: LIME }}>
        <div className="home-ticker flex whitespace-nowrap py-3">
          {[0, 1].map((dup) => (
            <div key={dup} aria-hidden={dup === 1} className="flex shrink-0">
              {ticker.map((t) => (
                <span key={`${dup}-${t}`} className="font-poster font-black text-[13px] tracking-[0.1em] px-8 flex items-center gap-8">
                  {t} <span aria-hidden="true" className="text-[10px]">◆</span>
                </span>
              ))}
            </div>
          ))}
        </div>
        <style>{`
          .home-ticker { animation: homeTicker 38s linear infinite; }
          @keyframes homeTicker { from { transform: translateX(0) } to { transform: translateX(-50%) } }
          @media (prefers-reduced-motion: reduce) { .home-ticker { animation: none } }
        `}</style>
      </section>

      {/* ════════════════ §03 · THE SHELF ══════════════════════════════════
          Current print labels as lit specimen tags on dark — real artwork,
          live prices, $/mg on every card. */}
      {featured.length > 0 && (
        <section className="bg-[#08090A] text-white">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 lg:py-24">
            <div className="flex items-end justify-between gap-6 mb-10">
              <h2
                className="font-poster font-black uppercase leading-[0.94] tracking-[-0.04em]"
                style={{ fontSize: 'clamp(28px, 4.6vw, 70px)' }}
              >
                What researchers
                <br />
                reorder.
              </h2>
              <Link
                href="/catalog"
                className="hidden sm:block font-mono text-[11px] tracking-[0.12em] uppercase text-white/50 hover:text-white transition pb-2"
              >
                All {productCount} →
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/12 border border-white/12">
              {featured.map((p) => (
                <Link
                  key={p.handle}
                  href={`/products/${p.handle}`}
                  className="group bg-[#08090A] hover:bg-[#0E1013] transition-colors"
                >
                  <div className="relative aspect-square overflow-hidden flex items-center px-5 lg:px-6">
                    <div
                      aria-hidden="true"
                      className="absolute inset-x-[8%] top-[18%] aspect-square rounded-full"
                      style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 52%, rgba(8,9,10,0) 72%)' }}
                    />
                    <div className="relative w-full rotate-[-2deg] shadow-[0_26px_54px_rgba(0,0,0,0.75)] group-hover:rotate-0 group-hover:-translate-y-1.5 transition-transform duration-500">
                      <Image
                        src={p.labelArt}
                        alt={`Merit ${p.title} vial label — Research Use Only`}
                        width={1124}
                        height={524}
                        sizes="(max-width: 1024px) 46vw, 22vw"
                        className="w-full h-auto"
                      />
                    </div>
                  </div>
                  <div className="border-t border-white/12 p-4 lg:p-5">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-poster font-extrabold text-[15px] lg:text-[16px] tracking-[-0.02em]">
                        {p.title}
                      </h3>
                      <span className="font-poster font-black text-[16px] lg:text-[18px]" style={{ color: LIME }}>
                        {money(p.priceCents)}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2 mt-1">
                      <p className="font-mono text-[10px] text-white/40">{p.vialSize}</p>
                      <p className="font-mono text-[10px] font-bold text-white/60">
                        {perMg(p.priceCents, p.vialSize) ?? p.format}
                      </p>
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
      )}

      {/* ════════════════ §04 · WHY THE PRICE CAN STAY LOW ═════════════════
          Flat black on purpose — the vial wall is the hero's ground, and
          repeating it here would flatten both. The receipt panel is LIVE:
          newest published lot from the COA table, degrading to just the
          verify form if the DB blips. */}
      <section className="relative isolate overflow-hidden bg-black text-white border-y border-white/10">
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

          <div className="border border-white/15 bg-white/[0.03]">
            <div className="px-6 py-4 border-b border-white/15 font-mono text-[10px] tracking-[0.16em] uppercase" style={{ color: LIME }}>
              Newest receipt
            </div>
            {lot ? (
              <>
                {(
                  [
                    ['Lot', lot.lotId],
                    ['Compound', lot.compound],
                    ['Purity (HPLC)', lot.purity],
                    ...(lot.testedDate ? [['Tested', lot.testedDate] as [string, string]] : []),
                    ['Laboratory', 'ILS · ISO/IEC 17025'],
                  ] as [string, string][]
                ).map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-6 py-3 border-b border-white/10 font-mono text-[11.5px]">
                    <span className="text-white/40 uppercase tracking-[0.06em]">{k}</span>
                    <span className="font-bold text-right">{v}</span>
                  </div>
                ))}
                <div className="px-6 py-3 border-b border-white/10">
                  <Link
                    href={`/coa/${encodeURIComponent(lot.lotId)}`}
                    className="font-mono text-[11px] tracking-[0.08em] uppercase hover:text-white transition"
                    style={{ color: LIME }}
                  >
                    View the certificate →
                  </Link>
                </div>
              </>
            ) : (
              <p className="px-6 py-4 border-b border-white/10 font-mono text-[11.5px] text-white/50">
                {lotCount > 0 ? `${lotCount} certificates published.` : 'Certificates publish per lot.'}{' '}
                Look yours up below.
              </p>
            )}
            <form action="/coa" method="get" className="flex p-4">
              <label htmlFor="home-lot" className="sr-only">
                Lot number
              </label>
              <input
                id="home-lot"
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

      {/* ════════════════ §05 · WHAT SHIPS ═════════════════════════════════ */}
      <section className="bg-[#08090A] text-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
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
            <p className="mt-6 max-w-[60ch] font-mono text-[10.5px] leading-[1.7] text-white/40">
              Merit publishes what the laboratory measured and makes no claim about what any
              compound does. For research use only — not for human or veterinary use.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════ §06 · CLOSE ══════════════════════════════════════ */}
      <section className="relative isolate flex h-[70svh] min-h-[480px] max-h-[760px] items-end overflow-hidden bg-black text-white">
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
    </>
  );
}
