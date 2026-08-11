import Image from 'next/image';
import Link from 'next/link';
import { money } from '@/lib/catalog';
import { productImage } from '@/lib/product-types';
import { CertificateHero, CertificateHeroCaption, LOT } from '@/components/CertificateHero';

/* ─────────────────────────────────────────────────────────────────────────
   HOMEPAGE — built on the receipt, not on claims.

   The previous version (archived at _archive/pcac-homepage.tsx) led with an
   FDA advisory vote and athlete photography. Both were pulled: the first
   implied federal endorsement of an RUO product, the second implied human
   use. This version is designed so that neither failure mode is reachable.

   The organising rule: EVERY claim on this page is about what Merit DID to
   the vial, never about what the vial does to anyone. "Assayed by an
   independent laboratory" is a fact about a process. "Supports recovery" is
   a claim about a body. The first is defensible forever; the second is the
   thing that gets RUO sellers letters.

   ── STRUCTURE ────────────────────────────────────────────────────────────
   Ordered by the visitor's questions, not by the brand's talking points.
   Channel data says the best-converting visitors (AI-search referrals,
   affiliates' audiences, returning buyers) arrive ALREADY knowing what they
   want — so the page answers in this order:

     "Is this legit?"        §01 hero — the real signed certificate
     "Do they have mine?"    §03 shop — products + class chips, ONE scroll in
     "Why here vs cheaper?"  §04 statement + §05 protocol
     "Can I verify that?"    §05 proof desk — lot lookup + newest lot data
     stay in touch / close   §06 + §07

   Grounds alternate dark → light → dark → light → cream → dark, and the
   product grid is the ONLY card grid on the page — the protocol is a
   numbered accordion, the classes are chips — so no two sections share a
   silhouette. Both rules exist because breaking them is precisely what
   made an earlier draft read as a template.
   ───────────────────────────────────────────────────────────────────────── */


/** The data the view needs — page.tsx supplies it from Prisma/catalog; the
 *  temporary /home-preview route supplies a production snapshot because the
 *  local database credentials are stale. Keeping the view pure is what lets
 *  both render the SAME code, so a preview approval is an approval of the
 *  real page. */
export type HomeFeatured = {
  handle: string;
  title: string;
  vialSize: string;
  format: string;
  priceCents: number;
  imageUrl?: string | null;
};
export type HomeLot = {
  lotId: string;
  coaNumber: string | null;
  purity: string;
  compound: string;
  testedDate: string | null;
};

/** The release protocol, as a numbered index. This is the page's SEO body —
 *  native <details> keeps every panel's prose in the DOM at load, so it is
 *  crawlable with zero JS while closed rows keep six entries to one screen.
 *
 *  Every entry describes a MEASUREMENT, never an effect. That is not a
 *  limitation dressed up as a virtue: process facts are the only claims a
 *  research-use-only seller can make that hold up, and they happen to be
 *  the ones competitors can't copy without paying for the same testing. */
const PROTOCOL = [
  {
    n: '01',
    title: 'Identity',
    method: 'Reference standard',
    body: 'Before a lot is released, its material is confirmed against a reference standard for the compound named on the label. This is the check that answers the only question that matters first — is this actually the molecule it says it is. No substitutions, no near-neighbours, no "close enough" on a sequence that differs by one residue.',
    facts: ['Confirmed per lot', 'Reference standard', 'Pre-release gate'],
  },
  {
    n: '02',
    title: 'Purity',
    method: 'HPLC',
    body: 'High-performance liquid chromatography separates the sample and measures the main peak as a percentage of total peak area. That percentage is the purity figure — and the figure Merit publishes is the figure the laboratory measured, not a rounded marketing number, not a specification we hope the lot met.',
    facts: ['Main-peak area %', 'Per-lot result', 'Published verbatim'],
  },
  {
    n: '03',
    title: 'Elemental impurities',
    method: 'ICP-MS',
    body: 'Inductively coupled plasma mass spectrometry screens for heavy-metal and elemental contamination down to trace concentrations. Contamination in this category typically enters through synthesis reagents or upstream handling rather than the peptide itself, which is why it has to be measured on the finished lot instead of assumed from a supplier document.',
    facts: ['Heavy metals', 'Trace-level detection', 'Finished-lot testing'],
  },
  {
    n: '04',
    title: 'Sterility & endotoxin',
    method: 'USP screening',
    body: 'Lots are screened for bacterial endotoxin and for sterility against research-grade thresholds. Lyophilized material is sealed under conditions intended to hold that state through shipping, which is why vials arrive sealed and why a broken seal is a reason to reject a vial rather than a cosmetic complaint.',
    facts: ['Endotoxin screen', 'Sterility screen', 'Sealed on release'],
  },
  {
    n: '05',
    title: 'Adulterant screen',
    method: 'Immunoassay',
    body: 'Every lot on the current panel is screened by immunoassay for fentanyl, and the result is printed on the certificate itself rather than kept in an internal file. Gray-market supply chains in this category have been documented carrying contaminants that have nothing to do with the advertised compound. Screening for it is cheap; not screening for it is indefensible.',
    facts: ['Fentanyl screen', 'Printed on certificate', 'Every panel lot'],
  },
  {
    n: '06',
    title: 'Provenance',
    method: 'Lot number → certificate',
    body: 'The lot number on the vial in your hand resolves to a published certificate for that exact batch — not a representative sample, not last quarter’s report. Scan the QR on the label or type the number into the lookup below. No account, no request form, no waiting on an email from a sales rep who may or may not send it.',
    facts: ['QR on every label', 'Batch-specific', 'No account required'],
  },
];

// Catalog entry points, organised by chemistry. Deliberately NOT by use case:
// "Repair" and "Recovery" are outcome words, and a category label is a claim
// like any other. Class names are chemistry, and chemistry is a fact.
const FAMILIES = [
  { label: 'GLPs', q: 'GLP' },
  { label: 'Peptide blends', q: 'BPC' },
  { label: 'Cofactors', q: 'NAD' },
  { label: 'Neuropeptides', q: 'Selank' },
];

/** $/mg for the card meta line — the honest value axis in a category where
 *  identical-looking vials differ 3× on it. Mirrors the catalog page's badge
 *  so the two surfaces price the same way. Null when vialSize isn't in mg. */
function perMg(vialSize: string, priceCents: number): string | null {
  const m = /([\d.]+)\s*mg/i.exec(vialSize);
  if (!m) return null;
  const mg = parseFloat(m[1]);
  if (!isFinite(mg) || mg <= 0) return null;
  return `$${(priceCents / 100 / mg).toFixed(2)}/mg`;
}


export function HomeView({
  featured,
  allCount,
  lot,
  lotCount,
}: {
  featured: HomeFeatured[];
  allCount: number;
  lot: HomeLot | null;
  lotCount: number;
}) {
  return (
    <>
      {/* ════════════════ §01 · HERO ═══════════════════════════════════════
          The real certificate, not a photograph. Three reasons it beats a
          picture of a vial here:

          · It cannot be copied. Every seller in this category can license the
            same dark stock vial; none of them can show an accredited lab's
            signed report on their own lot, because they don't have one.
          · It is the argument. The page's claim is "the receipt is the
            product", so the receipt is the picture — the image proves the
            headline instead of decorating it.
          · It cannot imply human use. A document is neutral by construction,
            which is the whole constraint this page runs on.

          The dark object photographs are kept in public/brand/ (hero-bench,
          hero-cake, hero-monolith, hero-row) if a photographic fold is ever
          wanted back — but the headline is written to the certificate, so
          swap both together.
       */}
      <section className="relative isolate flex min-h-[88svh] items-end overflow-hidden bg-[#08090A] text-white">
        {/* Faint grid — a surface for the sheet to sit on, so the black reads
            as a lit bench rather than an empty div. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
        <CertificateHero />
        <div
          aria-hidden="true"
          className="absolute inset-0 z-[2]"
          style={{
            background:
              'linear-gradient(90deg, rgba(8,9,10,0.97) 0%, rgba(8,9,10,0.90) 34%, rgba(8,9,10,0.34) 58%, rgba(8,9,10,0.06) 76%), linear-gradient(180deg, rgba(8,9,10,0.45) 0%, rgba(8,9,10,0) 30%, rgba(8,9,10,0.94) 100%)',
          }}
        />
        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 lg:px-12 pb-20 lg:pb-24">
          <p className="font-mono text-[11px] lg:text-[12px] tracking-[0.14em] uppercase text-[#B9FF66] mb-5">
            Certificate {LOT.coaNumber} · {LOT.lab} · {LOT.accreditation}
          </p>
          <h1
            className="font-poster font-black uppercase leading-[0.82] tracking-[-0.055em]"
            style={{ fontSize: 'clamp(48px, 9.6vw, 168px)' }}
          >
            The receipt is
            <br />
            <span
              className="text-transparent"
              style={{ WebkitTextStroke: '2px rgba(255,255,255,0.62)' }}
            >
              the product.
            </span>
          </h1>
          <CertificateHeroCaption />
          <div className="mt-9 lg:mt-11 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <p className="max-w-[48ch] text-[15px] leading-[1.62] text-white/70">
              That is the real report for lot {LOT.lotId} — {LOT.purity} purity by HPLC, fentanyl
              screen not detected, signed by the lab that ran it. Anyone can sell a vial. Merit
              publishes the paperwork that proves what is in it.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link
                href="/catalog"
                className="bg-white text-black px-9 py-4 text-center text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-cobalt hover:text-white transition"
              >
                Shop the catalog
              </Link>
              <Link
                href="/coa"
                className="border border-white/40 px-9 py-4 text-center text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-white hover:text-black transition"
              >
                View lab results
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ §02 · STAT RAIL ══════════════════════════════════
          A single hairline strip rather than a section — it closes the hero
          rather than starting a new beat, which is what keeps the fold
          feeling like one composition instead of two stacked blocks.
       */}
      <section className="bg-ink text-white border-y border-white/10">
        <div className="max-w-[1400px] mx-auto grid grid-cols-2 lg:grid-cols-4">
          {[
            ['≥99%', 'HPLC purity'],
            ['USP <797>', 'compounded'],
            ['Every lot', 'third-party assayed'],
            ['48 hrs', 'dispatch from Dallas'],
          ].map(([big, small], i) => (
            <div
              key={big}
              className={`px-6 lg:px-12 py-5 lg:py-6 border-white/10 ${
                i < 2 ? 'border-b lg:border-b-0' : ''
              } ${i % 2 === 0 ? 'border-r' : ''} lg:border-r lg:last:border-r-0`}
            >
              <span className="font-poster font-black text-[17px] lg:text-[21px] tracking-[-0.03em]">
                {big}
              </span>{' '}
              <span className="font-mono text-[10px] lg:text-[11px] tracking-[0.12em] uppercase text-white/50">
                {small}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════ §03 · SHOP ═══════════════════════════════════════
          One scroll from the fold, on purpose. The best-converting visitors
          arrive already knowing what they want; making them scroll past
          three screens of persuasion to reach a price is how an earlier
          draft buried its own conversion. The kicker line keeps the trust
          frame attached to the commerce block, and this is the only card
          grid on the page.
       */}
      {featured.length > 0 && (
        <section id="featured" className="bg-white text-ink">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-20 lg:py-28">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8 lg:mb-10">
              <div>
                <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted mb-4">
                  Most-stocked · every vial ships under a published lot certificate
                </p>
                <h2
                  className="font-poster font-black uppercase leading-[0.94] tracking-[-0.04em]"
                  style={{ fontSize: 'clamp(30px, 5vw, 78px)' }}
                >
                  What researchers reorder.
                </h2>
              </div>
              <Link
                href="/catalog"
                className="hidden lg:inline-flex font-mono text-[11px] tracking-[0.12em] uppercase text-cobalt hover:text-ink transition shrink-0 lg:pb-3"
              >
                All {allCount || ''} compounds →
              </Link>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {featured.map((p) => {
                const rate = perMg(p.vialSize, p.priceCents);
                return (
                  <Link
                    key={p.handle}
                    href={`/products/${p.handle}`}
                    className="group border border-ink/10 hover:border-cobalt transition-colors flex flex-col bg-white"
                  >
                    <div className="relative aspect-square bg-cream overflow-hidden">
                      <Image
                        src={productImage(p.imageUrl)}
                        alt={p.title}
                        fill
                        sizes="(max-width: 1024px) 50vw, 25vw"
                        className="object-contain p-5 lg:p-7 group-hover:scale-[1.04] transition-transform duration-500"
                      />
                    </div>
                    <div className="p-4 lg:p-5 border-t border-ink/10 flex-1 flex flex-col">
                      <h3 className="font-poster font-extrabold text-[15px] lg:text-[17px] tracking-[-0.02em] leading-tight">
                        {p.title}
                      </h3>
                      <p className="font-mono text-[10.5px] text-ink-muted mt-1.5">
                        {p.vialSize} · {p.format}
                        {rate ? ` · ${rate}` : ''}
                      </p>
                      <p className="font-poster font-black text-[20px] lg:text-[22px] mt-auto pt-4">
                        {money(p.priceCents)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Class chips + the catch-all bar. Chemistry names, not outcome
                names — a category label is a claim like any other. */}
            <div className="mt-6 lg:mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-ink/10 px-5 lg:px-8 py-4 lg:py-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-ink-muted mr-1">
                  By class
                </span>
                {FAMILIES.map((f) => (
                  <Link
                    key={f.label}
                    href={`/catalog?q=${encodeURIComponent(f.q)}`}
                    className="inline-flex items-center min-h-[36px] px-4 border border-ink/20 font-mono text-[11px] tracking-[0.06em] uppercase hover:border-cobalt hover:text-cobalt transition"
                  >
                    {f.label}
                  </Link>
                ))}
              </div>
              <Link
                href="/catalog"
                className="bg-ink text-white px-7 py-3 min-h-[44px] inline-flex items-center justify-center text-[11px] font-poster font-black tracking-[0.16em] uppercase hover:bg-cobalt transition whitespace-nowrap"
              >
                Browse all {allCount || ''} →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ════════════════ §04 · STATEMENT — DARK BREAK ═════════════════════
          The locked hook as a full-bleed cinematic beat between the two
          working sections. It is a claim about SOURCING — where material
          comes from and how it is released — never about what it does.
       */}
      <section className="relative isolate bg-black text-white overflow-hidden">
        <Image
          src="/brand/scene-pattern-charcoal.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-[0.22]"
        />
        <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12 py-16 lg:py-24">
          <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-white/40 mb-5">
            Why Merit exists
          </p>
          <h2
            className="font-poster font-black uppercase leading-[0.92] tracking-[-0.04em]"
            style={{ fontSize: 'clamp(28px, 4.4vw, 72px)' }}
          >
            Pharmacy-grade.
            <br />
            Not{' '}
            <span
              className="text-transparent"
              style={{ WebkitTextStroke: '2px rgba(255,255,255,0.55)' }}
            >
              &ldquo;trust me bro&rdquo;
            </span>
            -grade.
          </h2>
          <p className="mt-8 max-w-[62ch] text-[15px] lg:text-[16px] leading-[1.62] text-white/60">
            Most of this category asks you to take its word. Merit compounds in a licensed US
            facility, sends every lot to an outside laboratory, and publishes what comes back —
            including the lots that are unremarkable.
          </p>
        </div>
      </section>

      {/* ════════════════ §05 · PROTOCOL + PROOF DESK ══════════════════════
          The depth section: how release works, then the tools to check it.
          The desk (black panel) absorbs what used to be a whole separate
          receipt section — the lookup form and the newest lot's numbers —
          because "here is the process" and "verify it yourself" are one
          thought, and the hero already owns the receipt imagery.
       */}
      <section id="protocol" className="bg-white text-ink">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-20 lg:py-28">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10 lg:mb-14">
            <h2
              className="font-poster font-black uppercase leading-[0.94] tracking-[-0.04em] max-w-[16ch]"
              style={{ fontSize: 'clamp(30px, 5vw, 78px)' }}
            >
              Six checks before a lot ships.
            </h2>
            <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted shrink-0 lg:pb-3">
              The release protocol
            </p>
          </div>

          <div className="border-t border-ink/15">
            {PROTOCOL.map((p, i) => (
              <details key={p.n} open={i === 0} className="group border-b border-ink/15">
                <summary className="grid grid-cols-[30px_1fr_30px] lg:grid-cols-[64px_1fr_auto_44px] items-center gap-x-3 lg:gap-x-6 gap-y-1 py-4 lg:py-6 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-cobalt/[0.07] transition-colors">
                  <span className="font-mono text-[12px] text-ink-muted lg:pl-1">{p.n}</span>
                  <span
                    className="font-poster font-black uppercase leading-none tracking-[-0.035em]"
                    style={{ fontSize: 'clamp(21px, 2.8vw, 42px)' }}
                  >
                    {p.title}.
                  </span>
                  <span className="font-mono text-[11px] lg:text-[12px] font-bold tracking-[0.08em] uppercase text-cobalt col-start-2 lg:col-start-auto">
                    {p.method}
                  </span>
                  <span
                    aria-hidden="true"
                    className="row-span-2 lg:row-span-1 justify-self-end self-center text-[22px] font-normal text-ink-muted transition-transform group-open:rotate-45 group-open:text-cobalt lg:pr-2"
                  >
                    +
                  </span>
                </summary>

                <div className="pb-7 lg:pb-8 lg:pl-[88px] max-w-[72ch]">
                  <p className="text-[15px] leading-[1.68] text-ink-soft">{p.body}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {p.facts.map((f) => (
                      <span
                        key={f}
                        className="font-mono text-[10px] lg:text-[10.5px] tracking-[0.08em] uppercase text-ink-muted border border-ink/15 px-2.5 py-1.5"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </details>
            ))}
          </div>

          {/* THE PROOF DESK — a dark panel inside the light section: echoes
              the page's dark/light rhythm at panel scale and gives the
              verification tools a bench of their own. */}
          <div className="mt-10 lg:mt-14 bg-ink text-white p-6 lg:p-10">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,420px)_1fr] gap-8 lg:gap-14 items-start">
              <div>
                <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-[#B9FF66] mb-4">
                  Verify any lot
                </p>
                <p className="text-[14.5px] leading-[1.62] text-white/60 max-w-[44ch]">
                  Scan the QR on any vial or box, or type the lot number here.
                  {lotCount > 0 ? ` ${lotCount} certificates published and counting.` : ''} No
                  account, no request form.
                </p>
                <form action="/coa" method="get" className="mt-5 flex flex-col sm:flex-row">
                  <label htmlFor="lot" className="sr-only">
                    Lot number
                  </label>
                  <input
                    id="lot"
                    name="q"
                    placeholder="LOOK UP A LOT NUMBER"
                    className="flex-1 min-h-[44px] bg-white/[0.06] border border-white/25 sm:border-r-0 px-4 py-3.5 font-mono text-[12px] tracking-[0.06em] text-white placeholder-white/40 focus:outline-none focus:border-[#B9FF66] transition"
                  />
                  <button
                    type="submit"
                    className="bg-white text-black px-6 py-3.5 mt-2 sm:mt-0 min-h-[44px] text-[11px] font-poster font-black tracking-[0.16em] uppercase hover:bg-cobalt hover:text-white transition"
                  >
                    Look up
                  </button>
                </form>
              </div>

              {lot && (
                <dl className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/15 border border-white/15 self-stretch">
                  <div className="bg-ink px-5 py-5 lg:py-6 flex flex-col justify-center">
                    <dt className="font-mono text-[9.5px] tracking-[0.16em] uppercase text-white/40">
                      Newest lot
                    </dt>
                    <dd className="font-mono font-bold mt-2 text-[clamp(12px,1.2vw,15px)] break-all">
                      {lot.lotId}
                    </dd>
                  </div>
                  <div className="bg-ink px-5 py-5 lg:py-6 flex flex-col justify-center">
                    <dt className="font-mono text-[9.5px] tracking-[0.16em] uppercase text-white/40">
                      Compound
                    </dt>
                    <dd className="font-poster font-black tracking-[-0.02em] mt-2 text-[clamp(15px,1.5vw,20px)] leading-tight">
                      {lot.compound}
                    </dd>
                  </div>
                  <div className="bg-ink px-5 py-5 lg:py-6 flex flex-col justify-center">
                    <dt className="font-mono text-[9.5px] tracking-[0.16em] uppercase text-white/40">
                      Purity (HPLC)
                    </dt>
                    <dd className="font-poster font-black tracking-[-0.03em] mt-2 text-[clamp(22px,2.4vw,34px)] text-[#B9FF66]">
                      {lot.purity}
                    </dd>
                  </div>
                  <div className="bg-ink px-5 py-5 lg:py-6 flex flex-col justify-center">
                    <dt className="font-mono text-[9.5px] tracking-[0.16em] uppercase text-white/40">
                      Certificate
                    </dt>
                    <dd className="font-mono font-bold mt-2 text-[clamp(12px,1.2vw,15px)] break-all">
                      {lot.coaNumber ?? lot.lotId}
                    </dd>
                  </div>
                </dl>
              )}
            </div>
          </div>

          <p className="mt-7 font-mono text-[11px] leading-[1.75] text-ink-muted max-w-[86ch]">
            Merit publishes what the laboratory measured and makes no claim about what any compound
            does. All products are for research use only — not for human or veterinary use.
          </p>
        </div>
      </section>

      {/* ════════════════ §06 · NEWSLETTER ═════════════════════════════════ */}
      <section id="newsletter" className="bg-cream text-ink border-t border-ink/10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 lg:gap-16 items-center">
            <div>
              <h2
                className="font-poster font-black uppercase leading-[0.96] tracking-[-0.04em]"
                style={{ fontSize: 'clamp(24px, 3.4vw, 46px)' }}
              >
                New lot reports as they post.
              </h2>
              <p className="mt-3 max-w-md text-[14.5px] text-ink-soft">
                A short note when a new certificate publishes. No noise.
              </p>
            </div>
            <form
              className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto lg:min-w-[420px]"
              action="/api/newsletter"
              method="POST"
            >
              {/* Honeypot: humans never see or fill this; the API silently drops any submit that does. */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />
              <input
                type="email"
                name="email"
                required
                placeholder="you@research.email"
                className="flex-1 min-h-[44px] bg-white border border-ink/25 px-4 py-3.5 text-sm text-ink placeholder-ink-muted focus:outline-none focus:border-cobalt transition"
              />
              <button
                type="submit"
                className="bg-ink text-white px-7 py-3.5 min-h-[44px] text-[11px] font-poster font-black tracking-[0.16em] uppercase hover:bg-cobalt transition whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ════════════════ §07 · CLOSE ══════════════════════════════════════
          The lab bench, not a body. Same cinematic register as the hero,
          same constraint: an object scene makes no implicit promise.
       */}
      <section className="relative isolate flex min-h-[58svh] lg:min-h-[66svh] items-end overflow-hidden bg-black text-white">
        <Image src="/brand/scene-lab.webp" alt="" fill sizes="100vw" className="object-cover" />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.3) 40%, rgba(0,0,0,0.92) 100%)',
          }}
        />
        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 lg:px-12 pb-16 lg:pb-20">
          <h2
            className="font-poster font-black uppercase leading-[0.86] tracking-[-0.05em] mb-8"
            style={{ fontSize: 'clamp(36px, 6.8vw, 116px)' }}
          >
            Every lot,
            <br />
            <span
              className="text-transparent"
              style={{ WebkitTextStroke: '2px rgba(255,255,255,0.6)' }}
            >
              on the record.
            </span>
          </h2>
          <Link
            href="/catalog"
            className="inline-block bg-white text-black px-9 py-4 text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-cobalt hover:text-white transition"
          >
            Shop the catalog
          </Link>
        </div>
      </section>
    </>
  );
}
