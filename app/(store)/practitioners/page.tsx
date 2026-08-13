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
   ───────────────────────────────────────────────────────────────────────── */

const LIME = '#B9FF66';

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
    <div className="bg-[#08090A] text-white">
      {/* ════════════ §01 · HERO — same wall as the homepage ════════════ */}
      <section className="relative isolate flex h-[86svh] min-h-[540px] max-h-[820px] items-end overflow-hidden">
        <Image
          src="/brand/pattern-vials-dof.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(8,9,10,0.88) 0%, rgba(8,9,10,0.64) 40%, rgba(8,9,10,0.26) 70%, rgba(8,9,10,0.34) 100%), linear-gradient(180deg, rgba(8,9,10,0.5) 0%, rgba(8,9,10,0.04) 36%, rgba(8,9,10,0.92) 100%)',
          }}
        />
        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 lg:px-12 pb-14 lg:pb-18">
          <p className="font-mono text-[11px] lg:text-[12px] tracking-[0.16em] uppercase mb-5" style={{ color: LIME }}>
            Practitioner Program · Verified-account access
          </p>
          <h1
            className="font-poster font-black uppercase leading-[0.84] tracking-[-0.05em]"
            style={{ fontSize: 'clamp(40px, 7.2vw, 120px)' }}
          >
            Same compounds.
            <br />
            <span className="text-transparent" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.6)' }}>
              Better invoice.
            </span>
          </h1>
          <div className="mt-8 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <p className="max-w-[50ch] text-[15px] leading-[1.62] text-white/70">
              Account pricing for licensed practitioners on the compounds you already source —
              compounded to USP &lt;797&gt; in a licensed US facility, assayed by an independent
              laboratory, certificate published on every lot. No minimums, no contracts.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link
                href="#apply"
                className="bg-white text-black px-9 py-4 text-center text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-[#B9FF66] transition"
              >
                Apply for an account
              </Link>
              <Link
                href="#pricing"
                className="border border-white/40 px-9 py-4 text-center text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-white hover:text-black transition"
              >
                See account pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════ §02 · CREDENTIAL RAIL ════════════ */}
      <section className="border-y border-white/12 bg-[#0B0D0F]">
        <div className="max-w-[1400px] mx-auto grid grid-cols-2 lg:grid-cols-4">
          {[
            ['USP <797>', 'compounded, licensed US facility'],
            ['≥99%', 'HPLC purity, assayed per lot'],
            ['Every lot', 'COA published before purchase'],
            ['48 hrs', 'dispatch from Dallas · no minimums'],
          ].map(([big, small], i) => (
            <div
              key={big}
              className={`px-6 lg:px-10 py-5 lg:py-6 border-white/12 ${i < 2 ? 'border-b lg:border-b-0' : ''} ${i % 2 === 0 ? 'border-r' : ''} lg:border-r lg:last:border-r-0`}
            >
              <span className="font-poster font-black text-[16px] lg:text-[20px] tracking-[-0.03em]">{big}</span>{' '}
              <span className="font-mono text-[10px] lg:text-[10.5px] tracking-[0.1em] uppercase text-white/50">
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
        <section id="pricing" className="bg-[#08090A]">
          <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 lg:py-24">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
              <div>
                <p className="font-mono text-[11px] tracking-[0.16em] uppercase mb-4" style={{ color: LIME }}>
                  Account pricing · live from the catalog
                </p>
                <h2
                  className="font-poster font-black uppercase leading-[0.92] tracking-[-0.045em] max-w-[15ch]"
                  style={{ fontSize: 'clamp(30px, 5vw, 76px)' }}
                >
                  What you&rsquo;d actually pay.
                </h2>
              </div>
              <p className="max-w-[40ch] text-[14.5px] leading-[1.6] text-white/60 lg:pb-3">
                Not a percentage to take on faith — the real numbers, on {count} stocked compounds.
                Savings reach <b className="text-white">{maxPct}%</b> and vary by compound.
              </p>
            </div>

            <div className="border border-white/12 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="border-b border-white/12 font-mono text-[10px] tracking-[0.14em] uppercase text-white/45">
                    <th className="px-5 lg:px-6 py-3.5 font-normal">Compound</th>
                    <th className="px-5 lg:px-6 py-3.5 font-normal text-right">Retail</th>
                    <th className="px-5 lg:px-6 py-3.5 font-normal text-right">Your account</th>
                    <th className="px-5 lg:px-6 py-3.5 font-normal text-right">You save</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.handle} className="border-b border-white/8 last:border-b-0">
                      <td className="px-5 lg:px-6 py-4">
                        <span className="font-poster font-extrabold text-[15px] lg:text-[17px] tracking-[-0.02em]">
                          {r.title}
                        </span>
                        <span className="block font-mono text-[10.5px] text-white/40 mt-0.5">{r.vialSize}</span>
                      </td>
                      <td className="px-5 lg:px-6 py-4 text-right font-mono text-[13px] text-white/45 line-through tabular-nums">
                        {money(r.retail)}
                      </td>
                      <td className="px-5 lg:px-6 py-4 text-right font-poster font-black text-[15px] lg:text-[17px] tabular-nums">
                        {money(r.account)}
                      </td>
                      <td className="px-5 lg:px-6 py-4 text-right tabular-nums">
                        <span className="font-poster font-black text-[15px] lg:text-[17px]" style={{ color: LIME }}>
                          {money(r.saveCents)}
                        </span>
                        <span className="block font-mono text-[10.5px] text-white/45 mt-0.5">{r.savePct}% off</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-5 font-mono text-[10.5px] leading-[1.7] text-white/40 max-w-[80ch]">
              Account pricing applies automatically across the catalog once you&rsquo;re signed in, on
              every pack size. Full price list is visible in your portal after approval — we
              don&rsquo;t publish account pricing publicly.
            </p>
          </div>
        </section>
      )}

      {/* ════════════ §04 · WHY THE PRICE CAN BE LOWER ════════════ */}
      <section className="bg-black border-y border-white/10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-20 items-center">
          <div>
            <p className="font-mono text-[11px] tracking-[0.16em] uppercase mb-5" style={{ color: LIME }}>
              Why the price can be lower
            </p>
            <h2
              className="font-poster font-black uppercase leading-[0.9] tracking-[-0.045em] max-w-[13ch]"
              style={{ fontSize: 'clamp(30px, 5vw, 80px)' }}
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
              <div key={k} className="px-6 py-3.5 border-b border-white/10 last:border-b-0">
                <p className="font-poster font-extrabold text-[14px] tracking-[-0.02em]">{k}</p>
                <p className="font-mono text-[11px] text-white/50 mt-0.5">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ §05 · HOW IT WORKS — expectations, explicitly ════════════
          The old page ended the form with silence. Applicants had no idea
          what happened next; this sets the timeline before they submit. */}
      <section className="bg-[#08090A]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 lg:py-24">
          <h2
            className="font-poster font-black uppercase leading-[0.94] tracking-[-0.04em] mb-10 lg:mb-14 max-w-[16ch]"
            style={{ fontSize: 'clamp(28px, 4.4vw, 66px)' }}
          >
            Four steps to an account.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px bg-white/12 border border-white/12">
            {[
              ['01', 'Apply', 'License number and NPI, plus how to reach you. Two minutes.'],
              ['02', 'We verify', 'License and NPI checked against state and NPPES records — usually within one business day.'],
              ['03', 'Account opens', 'You get a sign-in link by email. Account pricing is live the moment you land.'],
              ['04', 'Order', 'Browse the catalog signed in and your pricing is already applied. Ships in 48 hours.'],
            ].map(([n, t, b]) => (
              <div key={n} className="bg-[#08090A] p-6 lg:p-8">
                <span className="font-mono text-[11px] text-white/35">{n}</span>
                <h3 className="font-poster font-black text-[19px] lg:text-[23px] tracking-[-0.03em] uppercase mt-2.5 mb-2.5">
                  {t}
                </h3>
                <p className="text-[13.5px] leading-[1.6] text-white/55">{b}</p>
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

      {/* ════════════ §08 · CLOSE ════════════ */}
      <section className="relative isolate flex min-h-[52svh] max-h-[680px] items-end overflow-hidden bg-black">
        <Image src="/brand/hero-monolith.webp" alt="" fill sizes="100vw" className="object-cover" />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(8,9,10,0.6) 0%, rgba(8,9,10,0.2) 40%, rgba(8,9,10,0.95) 100%)' }}
        />
        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 lg:px-12 pb-14 lg:pb-18">
          <h2
            className="font-poster font-black uppercase leading-[0.86] tracking-[-0.05em] mb-7 text-white"
            style={{ fontSize: 'clamp(30px, 5.4vw, 92px)' }}
          >
            Know what&rsquo;s
            <br />
            <span className="text-transparent" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.6)' }}>
              in the vial.
            </span>
          </h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="#apply"
              className="bg-white text-black px-9 py-4 text-center text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-[#B9FF66] transition"
            >
              Apply for an account
            </Link>
            <Link
              href="/coa"
              className="border border-white/40 px-9 py-4 text-center text-[12px] font-poster font-black tracking-[0.16em] uppercase text-white hover:bg-white hover:text-black transition"
            >
              Read a lab report
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
