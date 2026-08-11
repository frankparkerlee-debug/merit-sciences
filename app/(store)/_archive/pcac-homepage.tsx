/* ══════════════════════════════════════════════════════════════════════
   ARCHIVED — NOT ROUTED, NOT LIVE.
   Next.js ignores folders prefixed with "_", so nothing here is reachable
   or crawlable. Kept intact and portable rather than deleted.

   This was the meritsciences.com homepage until 2026-08-10. It was pulled
   for two compliance reasons, both raised by the team:

   1. FDA FRAMING. The page led with the July 2026 PCAC vote recommending
      six peptides for the 503A bulks list. Every caveat was present —
      "recommended" never "approved", rulemaking-into-2027, RUO throughout —
      but the page's overall impression was that a federal body had endorsed
      what Merit sells. Impression is the standard FDA and FTC actually
      apply, not the footnotes.

   2. HUMAN PERFORMANCE IMAGERY. Athletes on a research-use-only storefront
      imply human use, which is the one inference an RUO seller cannot
      invite. A disclaimer does not offset a photograph.

   Neither problem is intrinsic to the design, which is why this is kept.
   On a brand that is actually cleared for human use — a telehealth or
   consumer-supplement property — both the PCAC hook and the athlete
   photography are assets rather than liabilities.

   To reuse: copy this file to app/(store)/page.tsx in the target repo,
   along with public/brand/hero-pair.webp and lane-o-*.webp, and the
   font-poster token in tailwind.config.ts.
   ══════════════════════════════════════════════════════════════════════ */

import Image from 'next/image';
import Link from 'next/link';
import { getProduct, listProducts, money } from '@/lib/catalog';
import { productImage } from '@/lib/product-types';
import { prisma } from '@/lib/db';

// Force-dynamic until Supabase pooling is moved to transaction mode
// (port 6543 + ?pgbouncer=true). With session mode capped at 15
// connections, build-time prerender of 46+ pages exhausts the pool
// and crashes the deploy. Dynamic rendering queries one request at
// a time, well under the cap.
export const dynamic = 'force-dynamic';

/* ─────────────────────────────────────────────────────────────────────────
   THE SIX — the peptides FDA's Pharmacy Compounding Advisory Committee
   voted to recommend for the 503A bulks list on 24 July 2026.

   Copy rules, non-negotiable:
     · "recommended", never "approved" — rulemaking runs into 2027.
     · Body copy describes each peptide's PUBLISHED LITERATURE. It never
       says or implies what a Merit vial does. That distinction is the
       whole reason this section can exist on an RUO storefront.
     · `facts` are structural properties of the molecule (length, origin,
       date). Safe to state flatly because they are chemistry, not outcomes.

   `handle` is an explicit, verified catalog handle — deliberately NOT a
   fuzzy title match. Substring matching on "bpc" resolves to whichever
   blend the query happens to return first (GLOW, KLOW, Wolverine) instead
   of the standalone vial, which would quietly point "BPC-157" at the wrong
   product. TB-500 and KPV are null because Merit stocks them only inside
   blends today; those rows fall back to a catalog search rather than
   implying a standalone SKU exists. Any handle that stops resolving also
   falls back, so a pulled SKU never becomes a dead link.
   ───────────────────────────────────────────────────────────────────────── */
const SIX = [
  {
    n: '01',
    category: 'Repair',
    compound: 'BPC-157',
    handle: 'bpc-157-10mg',
    facts: ['15 amino acids', 'Gastric-juice derived', 'Studied since 1991'],
    body:
      'A pentadecapeptide sequence originally isolated from human gastric juice, and the most heavily published compound of the six. Three decades of preclinical literature examine it in tendon, ligament, muscle and gastrointestinal injury models — much of the foundational work coming out of Sikirić’s group in Zagreb.',
  },
  {
    n: '02',
    category: 'Recovery',
    compound: 'TB-500',
    handle: null, // stocked only inside blends today
    facts: ['7 amino acids', 'Thymosin β4 fragment', 'Actin-binding domain'],
    body:
      'The synthetic fragment corresponding to the active actin-binding region of thymosin beta-4, a protein present in nearly every human cell and in wound fluid. The research literature centers on cell migration, tissue regeneration and flexibility following injury.',
  },
  {
    n: '03',
    category: 'Inflammation',
    compound: 'KPV',
    handle: null, // stocked only inside blends today
    facts: ['3 amino acids', 'α-MSH C-terminal', 'Lys-Pro-Val'],
    body:
      'The C-terminal tripeptide of alpha-melanocyte-stimulating hormone — lysine, proline, valine. Studied primarily in models of intestinal and cutaneous inflammation, where the interest is that it appears to carry the anti-inflammatory activity of the parent hormone without its pigmentary effects.',
  },
  {
    n: '04',
    category: 'Metabolic',
    compound: 'MOTS-c',
    handle: 'mots-c',
    facts: ['16 amino acids', 'Mitochondrial-encoded', 'Identified 2015'],
    body:
      'One of a small class of peptides encoded by mitochondrial rather than nuclear DNA, identified at USC in 2015. Research examines its role in metabolic regulation and exercise capacity. It is the youngest literature on this list — which cuts both ways.',
  },
  {
    n: '05',
    category: 'Longevity',
    compound: 'Epitalon',
    handle: 'epitalon',
    facts: ['4 amino acids', 'Pineal-derived', 'Khavinson, 1980s'],
    body:
      'A tetrapeptide developed from pineal gland extract by Vladimir Khavinson’s group in St. Petersburg. Published work spans telomerase activity and circadian regulation, including long-running Russian cohort studies that Western literature has not replicated at scale.',
  },
  {
    n: '06',
    category: 'Cognitive',
    compound: 'Semax',
    handle: 'semax-30mg',
    facts: ['7 amino acids', 'ACTH(4-10) analog', 'Russian registry drug'],
    body:
      'A heptapeptide analog of ACTH fragment 4-10, developed in Russia where it has been on the national registry of medicines for decades. Research addresses cognition, attention and neuroprotection — a substantial body of work, most of it published in Russian.',
  },
] as const;

// Where the six stand in the actual 503A process. This is the reason to come
// back: the state changes, and Merit is the only one tracking it publicly. It
// also turns the biggest liability — "recommended, not approved" — into
// something worth bookmarking. Update `state` as each stage lands.
const RULEMAKING = [
  { title: 'Nominated', detail: 'Complete · 2025', state: 'done' },
  { title: 'PCAC vote', detail: '6 recommended · Jul 24 2026', state: 'done' },
  { title: 'Proposed rule', detail: 'Pending · FDA', state: 'now' },
  { title: 'Final rule', detail: 'Expected 2027', state: 'next' },
] as const;

/** Newest published lot — drives the proof section. Never invent lab values
 *  on a page whose entire argument is that the numbers are real.
 *
 *  Bacteriostatic water is excluded deliberately. It is released on a USP
 *  sterility + preservative-content assay, not HPLC, so its `purity` column
 *  holds the benzyl alcohol content (~0.9%) rather than a purity. Rendered
 *  under a "Purity (HPLC)" heading that reads as "this product is 0.85%
 *  pure" — which is both false and the worst possible number to headline.
 *  Anything measured on a different assay has no business in this slot. */
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
    return null; // DB blip — section degrades to the QR + lookup, which still work.
  }
}

export default async function HomePage() {
  const [featuredRaw, allProducts, lot] = await Promise.all([
    Promise.all([
      getProduct('retatrutide-10mg'),
      getProduct('bpc-10mg-tb-10mg-wolverine-20mg'),
      getProduct('bpc157-ghk-cu-50-tb500-kpv-klow-80mg'),
      getProduct('tirzepatide-10mg'),
    ]),
    listProducts({ status: 'active' }),
    latestLot(),
  ]);

  const featured = featuredRaw.filter(Boolean) as NonNullable<
    Awaited<ReturnType<typeof getProduct>>
  >[];

  // Link to the PDP only when that exact handle is actually live; otherwise
  // send the reader to a catalog search. Never render a dead product link.
  const live = new Set(allProducts.map((p) => p.handle));
  const hrefFor = (handle: string | null, compound: string) =>
    handle && live.has(handle)
      ? `/products/${handle}`
      : `/catalog?q=${encodeURIComponent(compound)}`;

  return (
    <>
      {/* ════════════════ §01 · HERO ═══════════════════════════════════════
          Cinematic, near-black, type integrated into the image. The photo is
          lit from the right and falls to black on the left, so the headline
          sits in real darkness rather than on a scrim.
       */}
      <section className="relative isolate flex min-h-[92svh] items-end overflow-hidden bg-black text-white">
        {/* Two figures, equal height and equal rim light, neither in front of
            the other. The previous hero was a single man; the page reads as
            male-centred when one body carries the whole brand. Framed at 62%
            so the pair sits right-of-centre and the headline keeps its black
            column on the left. */}
        <Image
          src="/brand/hero-pair.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[62%_30%]"
        />
        {/* Two gradients, not one: the horizontal keeps the left column black
            for the headline, the vertical seats the section into the page. */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.30) 46%, rgba(0,0,0,0) 72%), linear-gradient(180deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0.94) 100%)',
          }}
        />
        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 lg:px-12 pb-16 lg:pb-20">
          <p className="font-mono text-[11px] lg:text-[12px] tracking-[0.14em] uppercase text-[#B9FF66] mb-5">
            FDA PCAC · Voted Jul 24 2026
          </p>
          <h1
            className="font-poster font-black uppercase leading-[0.82] tracking-[-0.055em]"
            style={{ fontSize: 'clamp(52px, 11vw, 190px)' }}
          >
            The
            <br />
            research
            <br />
            <span
              className="text-transparent"
              style={{ WebkitTextStroke: '2px rgba(255,255,255,0.62)' }}
            >
              caught up.
            </span>
          </h1>
          <div className="mt-9 lg:mt-11 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <p className="max-w-[46ch] text-[15px] leading-[1.62] text-white/70">
              Six peptides —{' '}
              <b className="font-semibold text-white">
                BPC-157, TB-500, KPV, MOTS-c, epitalon, semax
              </b>{' '}
              — just earned a federal advisory committee’s recommendation for pharmacy
              compounding. We’ve been compounding and assaying every one of them for years.
              Receipts public.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link
                href="/catalog"
                className="bg-white text-black px-9 py-4 text-center text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-cobalt transition"
              >
                Shop the six
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

      {/* ════════════════ §02 · STATEMENT BAND ═════════════════════════════ */}
      <section className="bg-white text-ink border-y border-ink/10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 lg:py-20">
          <h2
            className="font-poster font-black uppercase leading-[0.96] tracking-[-0.04em]"
            style={{ fontSize: 'clamp(30px, 5.2vw, 80px)' }}
          >
            Pharmacy-grade.
            <br />
            Not <span className="text-cobalt">“trust me bro”</span>-grade.
          </h2>
          <p className="mt-6 max-w-[60ch] text-[15px] leading-[1.6] text-ink-soft">
            The gray market got there first and poisoned the well. Merit exists for the other
            path: licensed compounding, independent assays, a published certificate for every lot —
            on the exact
            six compounds the committee just named.
          </p>
        </div>
      </section>

      {/* ════════════════ §03 · THE SIX — ACCORDION ════════════════════════
          Native <details>, so every panel's prose is in the DOM at load and
          crawlable with zero JS. Closed state is one compact row per compound,
          which keeps six entries to roughly one screen instead of six.
       */}
      <section id="the-six" className="bg-white text-ink">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 lg:py-24">
          <p className="font-mono text-[11px] lg:text-[12px] tracking-[0.14em] uppercase text-cobalt mb-5">
            The Six · Recommended Jul 24 2026
          </p>
          <h2
            className="font-poster font-black uppercase leading-[0.96] tracking-[-0.04em] max-w-[20ch] mb-10 lg:mb-12"
            style={{ fontSize: 'clamp(28px, 4.4vw, 62px)' }}
          >
            Named by the committee. Stocked by Merit.
          </h2>

          <div className="border-t border-ink/15">
            {SIX.map((c, i) => (
              <details key={c.compound} open={i === 0} className="group border-b border-ink/15">
                <summary className="grid grid-cols-[34px_1fr_30px] lg:grid-cols-[64px_1fr_auto_auto_44px] items-center gap-x-3 lg:gap-x-6 gap-y-1 py-4 lg:py-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-cobalt/15 transition-colors">
                  <span className="font-mono text-[12px] text-ink-muted lg:pl-1">{c.n}</span>
                  <span
                    className="font-poster font-black uppercase leading-none tracking-[-0.035em]"
                    style={{ fontSize: 'clamp(21px, 2.6vw, 38px)' }}
                  >
                    {c.category}.
                  </span>
                  <span className="font-mono text-[12px] lg:text-[13px] font-bold tracking-[0.08em] text-cobalt col-start-2 lg:col-start-auto">
                    {c.compound.toUpperCase()}
                  </span>
                  <span className="hidden lg:inline-flex font-mono text-[10px] tracking-[0.1em] uppercase text-success border border-success/40 px-2.5 py-1 whitespace-nowrap">
                    PCAC ✓
                  </span>
                  <span
                    aria-hidden="true"
                    className="row-span-2 lg:row-span-1 justify-self-end self-center text-[22px] font-normal text-ink-muted transition-transform group-open:rotate-45 group-open:text-cobalt lg:pr-2"
                  >
                    +
                  </span>
                </summary>

                <div className="pb-6 lg:pb-7 lg:pl-[88px] max-w-[70ch]">
                  <p className="text-[14.5px] leading-[1.66] text-ink-soft">{c.body}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {c.facts.map((f) => (
                      <span
                        key={f}
                        className="font-mono text-[10px] lg:text-[10.5px] tracking-[0.08em] uppercase text-ink-muted border border-ink/15 px-2.5 py-1.5"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={hrefFor(c.handle, c.compound)}
                    className="inline-block mt-5 text-[11px] font-poster font-black tracking-[0.16em] uppercase border-b border-ink/30 pb-1 hover:text-cobalt hover:border-cobalt transition"
                  >
                    View {c.compound} →
                  </Link>
                </div>
              </details>
            ))}
          </div>

          <p className="mt-6 font-mono text-[11px] leading-[1.7] text-ink-muted max-w-[86ch]">
            A PCAC recommendation is not FDA approval; rulemaking runs into 2027. All Merit
            compounds are research-use-only. Category terms describe each peptide’s published
            literature — not our products.
          </p>
        </div>
      </section>

      {/* ════════════════ §04 · RULEMAKING WATCH ═══════════════════════════ */}
      <section className="bg-white text-ink border-t border-ink/10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-12 lg:py-16">
          <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted mb-8">
            Rulemaking watch · <b className="text-success font-bold">Live</b> · What has to
            happen before these are 503A-legal
          </p>
          <ol className="relative grid grid-cols-2 lg:grid-cols-4 gap-y-7">
            {/* Rail sits behind the dots; hidden on mobile where the grid wraps. */}
            <span
              aria-hidden="true"
              className="hidden lg:block absolute left-0 right-0 top-[5px] h-px bg-white/20"
            />
            {RULEMAKING.map((s) => (
              <li key={s.title} className="relative pt-6 pr-4">
                <span
                  aria-hidden="true"
                  className={`absolute top-0 left-0 w-[11px] h-[11px] rounded-full border ${
                    s.state === 'done'
                      ? 'bg-success border-success'
                      : s.state === 'now'
                        ? 'bg-cobalt border-cobalt ring-4 ring-cobalt/20'
                        : 'bg-white border-ink/30'
                  }`}
                />
                <p className="text-[13px] font-bold tracking-[0.06em] uppercase mb-1.5">
                  {s.title}
                </p>
                <p
                  className={`font-mono text-[10.5px] tracking-[0.08em] uppercase ${
                    s.state === 'done'
                      ? 'text-success'
                      : s.state === 'now'
                        ? 'text-cobalt'
                        : 'text-ink-muted'
                  }`}
                >
                  {s.detail}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ════════════════ §05 · MOST-STOCKED — REAL PRODUCTS ═══════════════
          The commerce layer. Live prices and PDP links straight from the DB.
       */}
      {featured.length > 0 && (
        <section id="featured" className="bg-white text-ink border-t border-ink/10">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 lg:py-24">
            <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted mb-5">
              Most-stocked
            </p>
            <h2
              className="font-poster font-black uppercase leading-[0.96] tracking-[-0.04em] mb-10 lg:mb-12"
              style={{ fontSize: 'clamp(28px, 4.4vw, 62px)' }}
            >
              What researchers come back for.
            </h2>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {featured.map((p) => (
                <Link
                  key={p.handle}
                  href={`/products/${p.handle}`}
                  className="group border border-ink/10 hover:border-cobalt transition-colors bg-white flex flex-col"
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
                    </p>
                    <p className="font-poster font-black text-[20px] lg:text-[22px] mt-auto pt-4">
                      {money(p.priceCents)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            <div className="mt-6 lg:mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-ink/10 px-6 lg:px-8 py-5">
              <p className="font-mono text-[11px] lg:text-[12px] tracking-[0.08em] uppercase text-ink-soft">
                Free shipping over $300 · 48hr dispatch from Dallas, TX
              </p>
              <Link
                href="/catalog"
                className="bg-ink text-white px-7 py-3 text-center text-[11px] font-poster font-black tracking-[0.16em] uppercase hover:bg-cobalt transition whitespace-nowrap"
              >
                Browse the catalog →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ════════════════ §06 · PROOF — THE QR IS ON THE LABEL ═════════════
          Values come from the newest published COA. If the DB is unreachable
          the numbers drop out and the QR + lookup still stand on their own.
       */}
      <section className="bg-white text-ink border-t border-ink/10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-10 lg:gap-16 items-center">
            <div>
              {lot && (
                <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted mb-5">
                  Lot {lot.lotId}
                  {lot.testedDate ? ` · tested ${lot.testedDate}` : ''}
                </p>
              )}
              <h2
                className="font-poster font-black uppercase leading-[0.96] tracking-[-0.04em] max-w-[16ch]"
                style={{ fontSize: 'clamp(28px, 4.8vw, 68px)' }}
              >
                The receipt is printed on the label.
              </h2>
              <p className="mt-6 max-w-[52ch] text-[15px] leading-[1.62] text-ink-soft">
                Every vial label and every box carries a QR code. Scan it and that lot’s
                certificate of analysis opens — identity, purity, appearance — from the
                laboratory that ran it. No account. No request form.
              </p>
              <form
                action="/coa"
                method="get"
                className="mt-6 flex flex-col sm:flex-row max-w-[460px]"
              >
                <label htmlFor="lot" className="sr-only">
                  Lot number
                </label>
                <input
                  id="lot"
                  name="q"
                  placeholder="OR TYPE A LOT NUMBER"
                  className="flex-1 bg-white border border-ink/25 sm:border-r-0 px-4 py-3.5 font-mono text-[12px] tracking-[0.06em] text-ink placeholder-ink-muted focus:outline-none focus:border-cobalt transition"
                />
                <button
                  type="submit"
                  className="bg-ink text-white px-6 py-3.5 mt-2 sm:mt-0 text-[11px] font-poster font-black tracking-[0.16em] uppercase hover:bg-cobalt transition"
                >
                  Look up
                </button>
              </form>
            </div>

            <div className="border border-ink/15 p-5 lg:p-6 max-w-[260px] lg:max-w-none">
              <Image
                src="/brand/coa-qr.svg"
                alt="QR code linking to Merit lot certificates of analysis"
                width={260}
                height={260}
                className="w-full h-auto"
              />
              <p className="font-mono text-[10px] tracking-[0.1em] uppercase text-black text-center mt-3.5 leading-relaxed">
                Scan → <b className="text-cobalt">meritsciences.com/coa</b>
              </p>
            </div>
          </div>

          {lot && (
            <dl className="mt-12 lg:mt-14 grid grid-cols-2 lg:grid-cols-4 gap-px bg-ink/10 border border-ink/10">
              <div className="bg-white px-6 py-7">
                <dt className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-muted">
                  Purity (HPLC)
                </dt>
                <dd className="font-poster font-black tracking-[-0.03em] mt-3 text-[clamp(26px,3vw,42px)]">
                  {lot.purity}
                </dd>
              </div>
              <div className="bg-white px-6 py-7">
                <dt className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-muted">
                  Compound
                </dt>
                <dd className="font-poster font-black tracking-[-0.03em] mt-3 text-[clamp(17px,1.9vw,26px)] leading-tight">
                  {lot.compound}
                </dd>
              </div>
              <div className="bg-white px-6 py-7">
                <dt className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-muted">
                  Certificate
                </dt>
                <dd className="font-mono font-bold tracking-[-0.01em] mt-3 text-[clamp(13px,1.4vw,18px)] leading-tight break-all">
                  {lot.coaNumber ?? lot.lotId}
                </dd>
              </div>
              <div className="bg-white px-6 py-7">
                <dt className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-muted">
                  Dispatch
                </dt>
                <dd className="font-poster font-black tracking-[-0.03em] mt-3 text-[clamp(26px,3vw,42px)]">
                  48 HRS
                </dd>
              </div>
            </dl>
          )}
        </div>
      </section>

      {/* ════════════════ §07 · NEWSLETTER ═════════════════════════════════ */}
      <section id="newsletter" className="bg-white text-ink border-t border-ink/10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-10 lg:gap-16 items-center">
            <div>
              <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted mb-5">
                Research notes
              </p>
              <h2
                className="font-poster font-black uppercase leading-[0.96] tracking-[-0.04em]"
                style={{ fontSize: 'clamp(26px, 3.8vw, 52px)' }}
              >
                First access to new lots.
              </h2>
              <p className="mt-4 max-w-md text-[15px] text-ink-soft">
                A short note when there’s something worth saying. No noise.
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
                className="flex-1 bg-white border border-ink/25 px-4 py-3.5 text-sm text-ink placeholder-ink-muted focus:outline-none focus:border-cobalt transition"
              />
              <button
                type="submit"
                className="bg-ink text-white px-7 py-3.5 text-[11px] font-poster font-black tracking-[0.16em] uppercase hover:bg-cobalt transition whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ════════════════ §08 · CLOSE ══════════════════════════════════════ */}
      <section className="relative isolate flex min-h-[62svh] lg:min-h-[70svh] items-end overflow-hidden bg-black text-white border-t border-ink/10">
        <Image src="/brand/close-track.webp" alt="" fill sizes="100vw" className="object-cover" />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.90) 100%)',
          }}
        />
        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 lg:px-12 pb-16 lg:pb-20">
          <h2
            className="font-poster font-black uppercase leading-[0.86] tracking-[-0.05em] mb-8"
            style={{ fontSize: 'clamp(38px, 6.8vw, 116px)' }}
          >
            Stock what
            <br />
            the committee
            <br />
            <span
              className="text-transparent"
              style={{ WebkitTextStroke: '2px rgba(255,255,255,0.6)' }}
            >
              recommended.
            </span>
          </h2>
          <Link
            href="/catalog"
            className="inline-block bg-white text-black px-9 py-4 text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-cobalt transition"
          >
            Shop the catalog
          </Link>
        </div>
      </section>
    </>
  );
}
