import Image from 'next/image';
import Link from 'next/link';
import { WELCOME_CODE, WELCOME_PCT } from '@/lib/welcome-offer';

/**
 * Google Ads landing page, served at shop.meritsciences.com/ (middleware
 * rewrites that host's "/" here; everything else on the host 308s to the store).
 * Lives under the (land) root layout so the storefront's nav, cart, footer and
 * catalog JSON-LD are structurally absent, not hidden.
 *
 * WRITTEN TO GOOGLE'S HEALTHCARE AND MEDICINES POLICY, which covers the landing
 * page and the keywords, not just the ad text. It prohibits products subject to
 * regulatory action or warning, products marketed as safe or effective, and
 * prescription drugs without certification, and the penalty is account
 * suspension, not a disapproved ad. So this page sells verification, never a
 * compound:
 *   - no compound names, in copy or in any image a reviewer could read
 *   - no claims about what anything does, physiologically or otherwise
 *   - no prescription drug names and no controlled-substance terms, which is
 *     why the homepage's contaminant screen is not listed here
 *   - no price claim: "from $X per mg" floors come from bulk compounds a
 *     searcher isn't comparing, which is what the misrepresentation policy is for
 *
 * Google's reviewer sees this page exactly as a visitor does. The ad-crawler
 * fence in middleware matches Meta and TikTok only; showing Google anything
 * different would be cloaking, which suspends the account outright.
 *
 * The (land) root carries no nav or footer, so business identity, contact and
 * policies are rendered here: Google's misrepresentation policy expects them.
 */

export const metadata = {
  title: 'Independently tested research compounds',
  description:
    'Every lot tested by an independent laboratory before release, with the lab report published and tied to the lot number on the vial. Licensed US facility, ships in 48 hours.',
  // The store is the page to rank; this one exists for paid traffic.
  robots: { index: false, follow: true },
};

const LIME = '#B9FF66';
const STORE = 'https://meritsciences.com';

const TICKER = [
  'Independently tested',
  'Lab report on every lot',
  'Licensed US facility',
  'Ships in 48 hours',
  'Scan the label to verify',
];

const CHECKS: [string, string][] = [
  ['Identity', 'Confirmed against a reference standard'],
  ['Purity', 'HPLC main-peak percentage, published as measured'],
  ['Heavy metals', 'ICP-MS to trace thresholds'],
  ['Endotoxin', 'Bacterial endotoxin screened'],
  ['Provenance', 'The lot number resolves to its own report'],
];

// A real sequence, so it's numbered.
const STEPS: [string, string][] = [
  ['The vial carries a lot number', 'Printed on every label, with a QR code beside it.'],
  ['The report is published first', 'An outside laboratory tests the lot, and the certificate goes live before that lot is sold.'],
  ['You read the same numbers we do', 'Scan the code or type the lot number. No account, no request form.'],
];

// Only what is already stated on the live store. No guarantee is claimed
// because none is on the books; adding one here would be a promise the
// policies pages don't back.
const PILLARS: [string, string][] = [
  ['Ships in 48 hours', 'Monday to Thursday, UPS Ground, tracked and insured'],
  ['Lab report on every lot', 'Published before the lot is sold'],
  ['Licensed US facility', 'Compounded in the United States'],
  [`${WELCOME_PCT}% off your first order`, `Code ${WELCOME_CODE}, applied at checkout`],
];

// Same answers the product pages give. Google reads landing-page depth as
// part of landing-page experience, and every one of these is a question a
// first-time visitor actually has. Nothing here describes what a compound does.
const FAQ: [string, string][] = [
  ['What do I actually receive?',
   'A sealed vial of lyophilized material with a lot number printed on the label. The certificate for that lot is published on our site before the lot ships.'],
  ['Who does the testing?',
   'A laboratory independent of the facility that made the lot. The certificate is published before the lot is sold, so the identity and purity figures you read are the same ones we read.'],
  ['How do I check a lot?',
   'Scan the QR code on the label, or type the lot number into the lookup on our site. No account and no request form.'],
  ['How fast does it ship?',
   'Orders dispatch within 48 hours, Monday through Thursday, by UPS Ground with tracking and insurance. Most US addresses receive within 3 to 5 business days.'],
  ['What does research use only mean?',
   'Everything we supply is for laboratory and scientific research. It is not for human or veterinary use and has not been evaluated or approved by the FDA.'],
];

const POLICIES: [string, string][] = [
  ['Shipping', '/legal/shipping'],
  ['Refunds', '/legal/refunds'],
  ['Returns', '/legal/returns'],
  ['Privacy', '/legal/privacy'],
  ['Terms', '/legal/terms'],
  ['Contact', '/legal/contact'],
];

const primaryCta =
  'bg-white text-black px-9 py-4 text-center text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-[#B9FF66] hover:text-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B9FF66]';
const secondaryCta =
  'border border-white/40 px-9 py-4 text-center text-[12px] font-poster font-black tracking-[0.16em] uppercase hover:bg-white hover:text-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

export default function ShopLanding() {
  return (
    <>
      {/* §01 HERO: the homepage's scene, so the ad lands somewhere recognisably Merit. */}
      <section className="relative isolate flex h-[88svh] min-h-[560px] max-h-[860px] items-end overflow-hidden bg-[#08090A] text-white">
        <Image
          src="/brand/pattern-vials-dof.webp"
          alt="A defocused wall of sealed Merit Sciences vials in repeating rows"
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
              'linear-gradient(90deg, rgba(8,9,10,0.88) 0%, rgba(8,9,10,0.62) 42%, rgba(8,9,10,0.26) 72%, rgba(8,9,10,0.32) 100%), linear-gradient(180deg, rgba(8,9,10,0.5) 0%, rgba(8,9,10,0.06) 36%, rgba(8,9,10,0.92) 100%)',
          }}
        />
        <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 lg:px-12 pb-16 lg:pb-20">
          <p className="font-mono text-[11px] lg:text-[12px] tracking-[0.16em] uppercase mb-5" style={{ color: LIME }}>
            Licensed US facility · Independent laboratory · Ships in 48 hours
          </p>
          <h1
            className="font-poster font-black uppercase leading-[0.86] tracking-[-0.05em]"
            style={{ fontSize: 'clamp(40px, 7vw, 116px)' }}
          >
            Every lot tested.
            <br />
            <span className="text-transparent" style={{ WebkitTextStroke: '2px rgba(255,255,255,0.6)' }}>
              Every result published.
            </span>
          </h1>
          <div className="mt-9 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <p className="max-w-[50ch] text-[15px] leading-[1.62] text-white/70">
              Research compounds tested by an outside laboratory before they are released. The
              certificate for every lot is published and tied to the number printed on the vial,
              so you can read the results before you order.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Link href={`${STORE}/catalog?code=${WELCOME_CODE}`} className={primaryCta}>
                Shop the catalog
              </Link>
              <Link href={`${STORE}/coa`} className={secondaryCta}>
                Read a lab report
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* §02 TICKER: the one loud thing, as on the homepage. Static under reduced motion. */}
      <section className="overflow-hidden border-y border-black/20 text-black" style={{ background: LIME }}>
        <div className="lp-ticker flex whitespace-nowrap py-3">
          {[0, 1].map((dup) => (
            <div key={dup} aria-hidden={dup === 1} className="flex shrink-0">
              {TICKER.map((t) => (
                <span key={`${dup}-${t}`} className="font-poster font-black text-[13px] tracking-[0.1em] uppercase px-8 flex items-center gap-8">
                  {t} <span aria-hidden="true" className="text-[10px]">◆</span>
                </span>
              ))}
            </div>
          ))}
        </div>
        <style>{`
          .lp-ticker { animation: lpTicker 34s linear infinite; }
          @keyframes lpTicker { from { transform: translateX(0) } to { transform: translateX(-50%) } }
          @media (prefers-reduced-motion: reduce) { .lp-ticker { animation: none } }
        `}</style>
      </section>

      {/* §03 OFFER + PILLARS: facts already on the store, and the welcome code.
          The code rides ?code= to the catalog, where DiscountCodeCapture
          stashes it and checkout applies it. A discount is not a health claim,
          so it's safe to show; it's also the one thing on this page that a
          searcher comparing suppliers can act on immediately. */}
      <section className="bg-[#0E1013] text-white border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-12 lg:py-16 grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/10 border border-white/10">
          {PILLARS.map(([t, b]) => (
            <div key={t} className="bg-[#0E1013] p-6 lg:p-8">
              <p className="font-display text-[17px] lg:text-[19px] font-bold leading-snug text-white">{t}</p>
              <p className="mt-2 text-[13px] leading-[1.55] text-white/50">{b}</p>
            </div>
          ))}
        </div>
      </section>

      {/* §04 WHAT EACH LOT IS TESTED FOR */}
      <section className="bg-[#08090A] text-white">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="relative aspect-[3/2] overflow-hidden border border-white/10">
            <Image
              src="/brand/hero-cake.webp"
              alt="An unlabeled sealed glass vial of lyophilized powder, lit against a dark ground"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
          <div>
            <p className="font-mono text-[11px] tracking-[0.16em] uppercase mb-5" style={{ color: LIME }}>
              Before a lot is released
            </p>
            <h2
              className="font-poster font-black uppercase leading-[0.92] tracking-[-0.04em] max-w-[15ch]"
              style={{ fontSize: 'clamp(28px, 4.2vw, 62px)' }}
            >
              Measured, not promised.
            </h2>
            <p className="mt-6 max-w-[50ch] text-[14.5px] leading-[1.65] text-white/60">
              Each lot goes to an independent laboratory, not ours, and every result below is printed
              on its certificate.
            </p>
            <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5 max-w-[560px]">
              {CHECKS.map(([t, b]) => (
                <div key={t} className="border-b border-white/10 pb-3">
                  <p className="text-[13px] leading-[1.5] text-white/75">
                    <b className="font-semibold text-white">{t}.</b>{' '}
                    <span className="text-white/50">{b}</span>
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-6 max-w-[60ch] font-mono text-[10.5px] leading-[1.7] text-white/40">
              Merit publishes what the laboratory measured and makes no claim about what any compound
              does. For research use only. Not for human or veterinary use.
            </p>
          </div>
        </div>
      </section>

      {/* §05 HOW TO CHECK A LOT */}
      <section className="bg-[#0E1013] text-white border-t border-white/5">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 lg:py-24">
          <p className="font-mono text-[11px] tracking-[0.16em] uppercase mb-5" style={{ color: LIME }}>
            Check it yourself
          </p>
          <h2
            className="font-poster font-black uppercase leading-[0.92] tracking-[-0.04em] max-w-[18ch]"
            style={{ fontSize: 'clamp(28px, 4.2vw, 62px)' }}
          >
            Three steps from label to lab report.
          </h2>
          <ol className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10 border border-white/10">
            {STEPS.map(([t, b], i) => (
              <li key={t} className="bg-[#0E1013] p-7 lg:p-9">
                <span className="font-mono text-[11px] tracking-[0.14em]" style={{ color: LIME }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-4 font-display text-[19px] font-bold leading-snug text-white">{t}</h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-white/55">{b}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10">
            <Link href={`${STORE}/coa`} className={secondaryCta + ' inline-block'}>
              Look up a lot
            </Link>
          </div>
        </div>
      </section>

      {/* §06 FAQ */}
      <section className="bg-[#08090A] text-white border-t border-white/5">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-10 lg:gap-16">
          <div>
            <p className="font-mono text-[11px] tracking-[0.16em] uppercase mb-5" style={{ color: LIME }}>
              Before you order
            </p>
            <h2
              className="font-poster font-black uppercase leading-[0.92] tracking-[-0.04em] max-w-[12ch]"
              style={{ fontSize: 'clamp(28px, 4.2vw, 62px)' }}
            >
              Straight answers.
            </h2>
          </div>
          <dl className="divide-y divide-white/10 border-y border-white/10">
            {FAQ.map(([q, a]) => (
              <div key={q} className="py-5 lg:py-6 grid grid-cols-1 md:grid-cols-[minmax(0,17ch)_1fr] gap-2 md:gap-8">
                <dt className="font-display text-[15.5px] font-bold text-white leading-snug">{q}</dt>
                <dd className="text-[14.5px] leading-[1.65] text-white/60 m-0">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* §07 CLOSE */}
      <section className="relative isolate flex h-[64svh] min-h-[440px] max-h-[700px] items-end overflow-hidden bg-black text-white">
        <Image
          src="/brand/hero-monolith.webp"
          alt="A single unlabeled sealed glass vial, lit against a dark ground"
          fill
          sizes="100vw"
          className="object-cover"
        />
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
            <Link href={`${STORE}/catalog?code=${WELCOME_CODE}`} className={primaryCta}>
              Shop with {WELCOME_PCT}% off
            </Link>
          </div>
        </div>
      </section>

      {/* BUSINESS IDENTITY: nav and footer are stripped under /lp. */}
      <footer className="bg-[#08090A] text-white/50 border-t border-white/10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="text-[12.5px] leading-[1.7]">
            <p className="font-display font-bold text-white text-[15px]">Merit Sciences LLC</p>
            <p>San Antonio, Texas</p>
            <p>
              <a href="mailto:info@meritpeptides.com" className="hover:text-white underline-offset-4 hover:underline">
                info@meritpeptides.com
              </a>
            </p>
          </div>
          <nav aria-label="Policies" className="flex flex-wrap gap-x-6 gap-y-2 text-[12.5px]">
            {POLICIES.map(([label, path]) => (
              <Link key={path} href={`${STORE}${path}`} className="hover:text-white underline-offset-4 hover:underline">
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <p className="max-w-[1400px] mx-auto px-6 lg:px-12 pb-10 font-mono text-[10.5px] leading-[1.7] text-white/35">
          For research use only. Not for human or veterinary use. Not evaluated or approved by the FDA.
          Merit makes no claim about what any compound does.
        </p>
      </footer>
    </>
  );
}
