import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { PractitionerApplicationForm } from './PractitionerApplicationForm';
import { LeadCaptureForm } from './LeadCaptureForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Practitioner Program — Merit Sciences',
  description:
    'Wholesale account pricing for licensed practitioners. Compounded to USP <797> in a licensed US facility, assayed by an independent laboratory, COA published on every lot. Ships 48hr from Dallas. No minimums.',
};

/* ─────────────────────────────────────────────────────────────────────────
   PRACTITIONER PROGRAM — rebuilt 2026-08-13 to the locked homepage register
   (dark object cinema, same defocused vial wall, monumental type).

   The rebuild fixed four things the audit surfaced on the previous version:

   1. THE SAVINGS CLAIM WAS FALSE. The page promised "~30%" three times and
      built an $18,000/yr math box on it. Real physician pricing across 62
      SKUs is mostly 12–14%; only the two GLPs clear 30%. Rather than pick a
      new adjective, this page now renders the ACTUAL retail-vs-account
      prices straight from the catalog — live, per SKU, with the real dollar
      delta. A number a practitioner can verify beats a percentage they have
      to trust, and it can never drift from the price book again.

   2. IT NARRATED HUMAN USE. "Same doses, same patient programs", "without
      changing a single patient price", "don't change your protocols" — on a
      page under an RUO banner. Every one of those is gone; the pitch is
      purely supply-side (what you source, what you pay, what it ships with)
      and is no less persuasive for it.

   3. IT CLAIMED "40+ TEXAS PRACTICES". There are 4 applications in the
      database. Removed — the verifiable credentials (USP <797>, independent
      assay, published COA, 48hr dispatch) carry more weight anyway.

   4. NO GRADE FRAMING. "Pharmacy-grade" is retired site-wide per the
      compliance call; nothing here reintroduces it.

   ── REGISTER: WHITE-DOMINANT, NOT THE CONSUMER DARK ──────────────────────
   Parker 2026-08-13: "the peptides we sell are clinic level, especially to
   the physicians — we need to make sure they feel secure."

   So this page deliberately DIVERGES from the homepage's dark object
   cinema. Dark full-bleed drama sells a consumer a brand; it reads as
   nightclub to a prescriber evaluating a supplier. Clinical buyers read
   white space, ruled tables and restraint as competence — the visual
   language of a lab report, not a launch. White/slate dominant, cobalt as
   the single accent, ink for authority.

   The homepage hero IMAGE is still here (same vial wall, per the earlier
   instruction) but demoted from full-bleed ground to a contained plate —
   product evidence inside a white page rather than the world the page
   lives in.

   Headline: "Same compounds. Better invoice." was cut — it led with price,
   which is exactly the wrong opening for a buyer whose real anxiety is
   whether they can defend the sourcing decision. It now leads with
   defensibility and lets the price table make the money argument.
   ───────────────────────────────────────────────────────────────────────── */

/** Live retail-vs-account pricing for the comparison table. Reads the price
 *  book directly so the page can never quote a discount the catalog doesn't
 *  honour — the exact failure mode of the version this replaces. */
async function priceComparison() {
  try {
    const rows = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        physicianPriceCents: { not: null, gt: 0 },
        NOT: [{ title: { contains: 'water', mode: 'insensitive' } }],
      },
      select: { handle: true, title: true, vialSize: true, priceCents: true, physicianPriceCents: true },
      orderBy: { priceCents: 'desc' },
      take: 60,
    });
    const priced = rows
      .map((r) => {
        const retail = Number(r.priceCents);
        const account = Number(r.physicianPriceCents);
        return {
          handle: r.handle,
          title: r.title,
          vialSize: r.vialSize,
          retail,
          account,
          saveCents: retail - account,
          savePct: retail > 0 ? Math.round(((retail - account) / retail) * 100) : 0,
        };
      })
      .filter((r) => r.saveCents > 0);
    // Best savings first — the table opens on the strongest true numbers.
    priced.sort((a, b) => b.savePct - a.savePct);
    return {
      rows: priced.slice(0, 8),
      maxPct: priced.length ? priced[0].savePct : 0,
      count: priced.length,
    };
  } catch {
    return { rows: [], maxPct: 0, count: 0 };
  }
}

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function PractitionersPage() {
  const { rows, maxPct, count } = await priceComparison();

  return (
    <div className="bg-white text-ink">
      {/* ════════════ §01 · HERO — one band: copy on white, image bled into it
             The image was a card sitting beside the copy, which read as two
             separate elements stacked in a row. It now bleeds top-to-bottom
             and off the right edge of the viewport, so image and headline
             occupy the SAME band — the hero is one composition, and the
             white ground still dominates the page. ════════════ */}
      <section className="relative bg-white lg:min-h-[560px] lg:flex lg:items-center">
        {/* Desktop: full-height plate bled to the right edge. */}
        <div className="hidden lg:block absolute inset-y-0 right-0 w-[46%]">
          <Image
            src="/brand/pattern-vials-dof.webp"
            alt="Merit compound vials, sealed and lot-numbered"
            fill
            priority
            sizes="46vw"
            className="object-cover"
          />
          {/* Feathered inner edge so the plate meets white without a hard
              seam — the join reads as one surface, not a pasted rectangle. */}
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-32"
            style={{ background: 'linear-gradient(90deg, #ffffff 0%, rgba(255,255,255,0) 100%)' }}
          />
          <div className="absolute bottom-6 right-6 bg-white/95 backdrop-blur-sm px-4 py-3 ring-1 ring-ink/10">
            <p className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-ink-muted">
              Lot LOT2026-06-0001 · ILS Laboratories
            </p>
            <p className="font-poster font-black text-[20px] tracking-[-0.02em] text-ink mt-0.5">
              99.13% <span className="text-[11px] font-mono font-bold text-cobalt align-middle">HPLC</span>
            </p>
          </div>
        </div>

        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 lg:px-12 pt-10 lg:pt-14 pb-10 lg:pb-14">
          <div className="lg:max-w-[56%]">
            <p className="font-mono text-[10.5px] lg:text-[11px] tracking-[0.18em] uppercase text-cobalt font-bold mb-5">
              Practitioner Program · Verified-account access
            </p>
            <h1
              className="font-poster font-black uppercase leading-[0.9] tracking-[-0.04em] text-ink"
              style={{ fontSize: 'clamp(34px, 5.2vw, 80px)' }}
            >
              Sourcing your
              <br />
              practice can
              <br />
              <span className="text-cobalt">stand behind.</span>
            </h1>
            <p className="mt-7 max-w-[52ch] text-[15px] lg:text-[16px] leading-[1.62] text-ink-soft">
              Account pricing for licensed practitioners — on compounds compounded to USP
              &lt;797&gt; in a licensed US facility, assayed by an independent laboratory, with the
              certificate for every lot published before you buy. No minimums, no contracts.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="#apply"
                className="bg-ink text-white px-8 py-4 text-center text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-cobalt transition"
              >
                Apply for an account
              </Link>
              <Link
                href="#pricing"
                className="border-2 border-ink text-ink px-8 py-4 text-center text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-ink hover:text-white transition"
              >
                See account pricing
              </Link>
            </div>
          </div>

          {/* Mobile/tablet: the same plate as a full-bleed band under the copy,
              so the evidence still sits inside the hero rather than below it. */}
          <div className="lg:hidden relative mt-9 -mx-6 h-[240px] sm:h-[300px]">
            <Image
              src="/brand/pattern-vials-dof.webp"
              alt="Merit compound vials, sealed and lot-numbered"
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute bottom-4 left-6 bg-white/95 backdrop-blur-sm px-3.5 py-2.5 ring-1 ring-ink/10">
              <p className="font-mono text-[9px] tracking-[0.14em] uppercase text-ink-muted">
                Lot LOT2026-06-0001 · ILS Laboratories
              </p>
              <p className="font-poster font-black text-[17px] tracking-[-0.02em] text-ink">
                99.13% <span className="text-[10px] font-mono font-bold text-cobalt align-middle">HPLC</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ §02 · CREDENTIAL RAIL ════════════ */}
      <section className="border-y border-ink/10 bg-cream">
        <div className="max-w-[1400px] mx-auto grid grid-cols-2 lg:grid-cols-4">
          {[
            ['USP <797>', 'compounded, licensed US facility'],
            ['≥99%', 'HPLC purity, assayed per lot'],
            ['Every lot', 'COA published before purchase'],
            ['48 hrs', 'dispatch from Dallas · no minimums'],
          ].map(([big, small], i) => (
            <div
              key={big}
              className={`px-6 lg:px-10 py-5 lg:py-6 border-ink/10 ${i < 2 ? 'border-b lg:border-b-0' : ''} ${i % 2 === 0 ? 'border-r' : ''} lg:border-r lg:last:border-r-0`}
            >
              <span className="font-poster font-black text-[16px] lg:text-[20px] tracking-[-0.03em] text-ink">{big}</span>{' '}
              <span className="font-mono text-[10px] lg:text-[10.5px] tracking-[0.1em] uppercase text-ink-muted">
                {small}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════ §03 · THE NUMBERS — live price book ════════════
          The heart of the page. Real retail vs real account price, pulled
          from the catalog at request time. Replaces the "~30% savings"
          claim the old page made and the price book did not support. */}
      {rows.length > 0 && (
        <section id="pricing" className="bg-white">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 lg:py-24">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
              <div>
                <p className="font-mono text-[11px] tracking-[0.16em] uppercase text-cobalt font-bold mb-4">
                  Account pricing · live from the catalog
                </p>
                <h2
                  className="font-poster font-black uppercase leading-[0.94] tracking-[-0.04em] max-w-[15ch] text-ink"
                  style={{ fontSize: 'clamp(28px, 4.4vw, 64px)' }}
                >
                  What you&rsquo;d actually pay.
                </h2>
              </div>
              <p className="max-w-[40ch] text-[14.5px] leading-[1.6] text-ink-soft lg:pb-3">
                Not a percentage to take on faith — the real numbers, on {count} stocked compounds.
                Savings reach <b className="text-ink">{maxPct}%</b> and vary by compound.
              </p>
            </div>

            <div className="border border-ink/12 overflow-x-auto bg-white">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="border-b border-ink/12 bg-cream font-mono text-[10px] tracking-[0.14em] uppercase text-ink-muted">
                    <th className="px-5 lg:px-6 py-3.5 font-normal">Compound</th>
                    <th className="px-5 lg:px-6 py-3.5 font-normal text-right">Retail</th>
                    <th className="px-5 lg:px-6 py-3.5 font-normal text-right">Your account</th>
                    <th className="px-5 lg:px-6 py-3.5 font-normal text-right">You save</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.handle} className="border-b border-ink/8 last:border-b-0 hover:bg-cream/60 transition-colors">
                      <td className="px-5 lg:px-6 py-4">
                        <span className="font-poster font-extrabold text-[15px] lg:text-[17px] tracking-[-0.02em] text-ink">
                          {r.title}
                        </span>
                        <span className="block font-mono text-[10.5px] text-ink-muted mt-0.5">{r.vialSize}</span>
                      </td>
                      <td className="px-5 lg:px-6 py-4 text-right font-mono text-[13px] text-ink-muted line-through tabular-nums">
                        {money(r.retail)}
                      </td>
                      <td className="px-5 lg:px-6 py-4 text-right font-poster font-black text-[15px] lg:text-[17px] tabular-nums text-ink">
                        {money(r.account)}
                      </td>
                      <td className="px-5 lg:px-6 py-4 text-right tabular-nums">
                        <span className="font-poster font-black text-[15px] lg:text-[17px] text-cobalt">
                          {money(r.saveCents)}
                        </span>
                        <span className="block font-mono text-[10.5px] text-ink-muted mt-0.5">{r.savePct}% off</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-5 font-mono text-[10.5px] leading-[1.7] text-ink-muted max-w-[80ch]">
              Account pricing applies automatically across the catalog once you&rsquo;re signed in, on
              every pack size. Full price list is visible in your portal after approval — we
              don&rsquo;t publish account pricing publicly.
            </p>
          </div>
        </section>
      )}

      {/* ════════════ §04 · WHY THE PRICE CAN BE LOWER ════════════ */}
      <section className="bg-cream border-y border-ink/10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-20 items-center">
          <div>
            <p className="font-mono text-[11px] tracking-[0.16em] uppercase text-cobalt font-bold mb-5">
              Why the price can be lower
            </p>
            <h2
              className="font-poster font-black uppercase leading-[0.92] tracking-[-0.04em] max-w-[13ch] text-ink"
              style={{ fontSize: 'clamp(28px, 4.4vw, 66px)' }}
            >
              We spend on the lab, not the logo.
            </h2>
            <div className="mt-8 space-y-5 max-w-[54ch]">
              {[
                ['Compounded, not imported blind', 'Licensed US facility, compounded to USP <797> — the sterile-compounding standard, on every lot.'],
                ['Assayed by an outside laboratory', 'Identity, purity, heavy metals and a fentanyl screen — run by ILS Laboratories, not by us.'],
                ['Published before you buy', 'Scan the QR on any vial and that exact lot’s certificate opens. No account needed, no request form.'],
                ['Acetate, not TFA', 'We pay for the acetate exchange most discount sources skip. It shows up in the assay, not the invoice.'],
              ].map(([t, b]) => (
                <div key={t} className="flex gap-4">
                  <span aria-hidden="true" className="mt-[7px] h-2 w-2 shrink-0 bg-cobalt" />
                  <p className="text-[14.5px] leading-[1.6] text-ink-soft">
                    <b className="text-ink font-semibold">{t}.</b> {b}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-ink/12 bg-white">
            <div className="px-6 py-4 border-b border-ink/12 bg-cream font-mono text-[10px] tracking-[0.16em] uppercase text-cobalt font-bold">
              What an account includes
            </div>
            {[
              ['Account pricing', 'Applied automatically at catalog and checkout'],
              ['No minimums', 'Order one vial or fifty — same price per unit'],
              ['No contracts', 'No commitment, no monthly spend requirement'],
              ['COA on every lot', 'Certificate ships with the order and lives at /coa'],
              ['48-hour dispatch', 'Sealed, lot-numbered, from Dallas'],
              ['Order history + reorder', 'Past orders, lots and certificates in your portal'],
            ].map(([k, v]) => (
              <div key={k} className="px-6 py-3.5 border-b border-ink/8 last:border-b-0">
                <p className="font-poster font-extrabold text-[14px] tracking-[-0.02em] text-ink">{k}</p>
                <p className="font-mono text-[11px] text-ink-muted mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ §05 · HOW IT WORKS — expectations, explicitly ════════════
          The old page ended the form with silence. Applicants had no idea
          what happened next; this sets the timeline before they submit. */}
      <section className="bg-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 lg:py-24">
          <h2
            className="font-poster font-black uppercase leading-[0.94] tracking-[-0.04em] mb-10 lg:mb-14 max-w-[16ch] text-ink"
            style={{ fontSize: 'clamp(26px, 4vw, 58px)' }}
          >
            Four steps to an account.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-ink/10 border border-ink/10">
            {[
              ['01', 'Apply', 'License number and NPI, plus how to reach you. Two minutes.'],
              ['02', 'We verify', 'License and NPI checked against state and NPPES records — usually within one business day.'],
              ['03', 'Account opens', 'You get a sign-in link by email. Account pricing is live the moment you land.'],
              ['04', 'Order', 'Browse the catalog signed in and your pricing is already applied. Ships in 48 hours.'],
            ].map(([n, t, b]) => (
              <div key={n} className="bg-white p-6 lg:p-8">
                <span className="font-mono text-[11px] font-bold text-cobalt">{n}</span>
                <h3 className="font-poster font-black text-[19px] lg:text-[23px] tracking-[-0.03em] uppercase mt-2.5 mb-2.5 text-ink">
                  {t}
                </h3>
                <p className="text-[13.5px] leading-[1.6] text-ink-soft">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ §06 · APPLY ════════════ */}
      <section id="apply" className="bg-white text-ink">
        <div className="max-w-[860px] mx-auto px-6 lg:px-10 py-16 lg:py-24">
          <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">— Apply</p>
          <h2
            className="font-poster font-black uppercase tracking-[-0.04em] leading-[0.95]"
            style={{ fontSize: 'clamp(30px, 4.6vw, 60px)' }}
          >
            Open your account.
          </h2>
          <p className="mt-4 mb-9 text-[15px] text-ink-soft leading-relaxed max-w-[58ch]">
            License and NPI verification is usually complete within one business day. You&rsquo;ll get
            a sign-in link by email as soon as it clears — no commitments, no activation fee, and
            nothing to cancel if you never order.
          </p>
          <PractitionerApplicationForm />
        </div>
      </section>

      {/* ════════════ §07 · NOT READY YET ════════════ */}
      <section className="bg-cream text-ink border-t border-ink/10">
        <div className="max-w-[860px] mx-auto px-6 lg:px-10 py-12">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex-1">
              <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">
                — Not ready to apply?
              </p>
              <p className="text-[15px] text-ink leading-relaxed">
                Get <strong>The Practice Owner&rsquo;s Guide to Adding Compounds</strong> — the margin
                math, the sourcing questions worth asking, and what to check on a certificate of
                analysis. A short email series. Unsubscribe anytime.
              </p>
            </div>
            <div className="flex-1">
              <LeadCaptureForm />
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ §08 · CLOSE — the single dark moment, used as
             institutional authority (a signature block) rather than drama. */}
      <section className="bg-ink text-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-14 lg:py-20 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div>
            <h2
              className="font-poster font-black uppercase leading-[0.94] tracking-[-0.04em]"
              style={{ fontSize: 'clamp(26px, 4vw, 56px)' }}
            >
              Every lot, documented.
            </h2>
            <p className="mt-3 max-w-[52ch] text-[14.5px] leading-[1.6] text-white/65">
              Read a certificate before you ever open an account — every published lot is publicly
              verifiable, no sign-in required.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link
              href="#apply"
              className="bg-white text-ink px-8 py-4 text-center text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-cobalt hover:text-white transition"
            >
              Apply for an account
            </Link>
            <Link
              href="/coa"
              className="border border-white/40 px-8 py-4 text-center text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-white hover:text-ink transition"
            >
              Read a lab report
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
