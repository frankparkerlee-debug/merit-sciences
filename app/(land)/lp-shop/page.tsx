import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { FREE_SHIPPING_CENTS_THRESHOLD } from '@/lib/checkout-pricing';
import { WELCOME_CODE, WELCOME_PCT } from '@/lib/welcome-offer';
import { NumberTicker } from '@/components/ui/number-ticker';
import { ShineBorder } from '@/components/ui/shine-border';
import { Marquee } from '@/components/ui/marquee';
import { LpEmailCapture } from '@/components/lp/LpEmailCapture';
import { StickyCta } from './StickyCta';

/**
 * Google Ads landing page, served at shop.meritsciences.com/ by middleware
 * rewrite (everything else on that host 308s to the store). Lives under the
 * (land) root, so the storefront's nav, cart and footer are structurally
 * absent, not hidden.
 *
 * ONE JOB: land a paid click and send it into the catalog with the welcome
 * code attached. So there is one action on this page, repeated, and no other
 * button. Reading a certificate is a text link, not a competing call.
 *
 * WRITTEN TO GOOGLE'S HEALTHCARE AND MEDICINES POLICY, which covers landing
 * pages and keywords as well as ads, and ends in account suspension rather
 * than a disapproved ad: no compound names in copy or legible in any image,
 * no claims about what anything does, no prescription or controlled-substance
 * terms, no guarantee the policies pages do not back. Google's reviewer sees
 * this page exactly as a visitor does; the middleware crawler fence is
 * Meta/TikTok only, on purpose.
 *
 * Register: the light paper-and-cobalt of /practitioners, which was built for
 * people evaluating a supplier. Cold search traffic is the same audience.
 */

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Independently tested research compounds',
  description:
    'Every batch tested by an independent laboratory before it is listed, with the certificate published in a public COA library. Licensed US facility, ships in 48 hours.',
  robots: { index: false, follow: true },
};

const STORE = 'https://meritsciences.com';
const CTA_HREF = `${STORE}/catalog?code=${WELCOME_CODE}`;
const CTA_LABEL = `Claim ${WELCOME_PCT}% and shop`;

/* Live figures for the numbers band. Fallbacks are the values on the day this
   shipped, so a database hiccup still renders something true. */
async function liveNumbers() {
  const fallback = { compounds: 31, fromCents: 3999, certificates: 82 };
  try {
    const [agg, certs] = await Promise.all([
      prisma.product.aggregate({
        where: { status: 'ACTIVE', handle: { not: 'bacteriostatic-water' } },
        _count: { _all: true },
        _min: { priceCents: true },
      }),
      prisma.coa.count({ where: { retiredAt: null } }),
    ]);
    return {
      compounds: agg._count._all || fallback.compounds,
      fromCents: agg._min.priceCents || fallback.fromCents,
      certificates: certs || fallback.certificates,
    };
  } catch {
    return fallback;
  }
}

const CHECKS: [string, string][] = [
  ['Identity', 'Confirmed against a reference standard'],
  ['Purity', 'HPLC main-peak percentage, published as measured'],
  ['Heavy metals', 'ICP-MS to trace thresholds'],
  ['Endotoxin', 'Bacterial endotoxin screened'],
  ['Provenance', 'Every certificate in the public COA library'],
];

// Left is the category Merit sells against; right is what Merit does.
const CONTRAST: [string, string, string][] = [
  ['Where it is made', 'Unknown. Often imported and relabeled.', 'A licensed US facility'],
  ['Testing', 'Promised. Sometimes.', 'An independent laboratory, every batch'],
  ['The certificate', 'On request, if you ask twice', 'Published before the batch is listed'],
  ['The label', 'A marker and a hope', 'A QR code that opens the COA library'],
  ['Shipping', 'Weeks, untracked', '48 hours, tracked and insured'],
  ['Paying', 'Apps and DMs', 'Major cards on a secure checkout'],
];

// A real sequence, so it is numbered.
const STEPS: [string, string][] = [
  ['Each batch is tested before it is listed', 'An independent laboratory tests it. Nothing goes on sale until the results are in.'],
  ['The certificate goes into the library', 'Every certificate we have released, searchable by compound. No account, no request form.'],
  ['The QR code on the vial opens it', 'Scan the label and you are in the library, reading the same numbers we do.'],
];

const FAQ: [string, string][] = [
  ['What do I actually receive?',
   'A sealed vial of lyophilized material. The batch it came from was tested by an independent laboratory before it was listed, and its certificate is in our COA library.'],
  ['Who does the testing?',
   'A laboratory independent of the facility that made the batch. The certificate is published before the batch is listed, so the identity and purity figures you read are the same ones we read.'],
  ['How do I check a batch?',
   'The QR code on every vial opens our COA library. Search by compound to find the certificate for the batch currently shipping. No account and no request form.'],
  ['How fast does it ship?',
   'Orders dispatch within 48 hours, Monday through Thursday, by UPS Ground with tracking and insurance. Most US addresses receive within 3 to 5 business days.'],
  ['Who can order?',
   'Qualified researchers and licensed practitioners. Practitioners can apply for account pricing through the Practitioner Program; retail buyers order directly.'],
  ['Is there a minimum order?',
   'No. One vial ships the same way a case does: within 48 hours, tracked and insured. Orders over $300 ship free.'],
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

const money = (c: number) => `$${(c / 100).toFixed(2)}`;

/* The one button. Same words, same colour, everywhere it appears. */
function Cta({ light = false, className = '', id }: { light?: boolean; className?: string; id?: string }) {
  return (
    <Link
      id={id}
      href={CTA_HREF}
      className={
        (light
          ? 'bg-white text-ink hover:bg-paper '
          : 'bg-cobalt text-white hover:bg-ink ') +
        'inline-flex items-center justify-center gap-2 rounded-xl px-7 py-4 text-[15px] font-bold tracking-tight transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cobalt ' +
        className
      }
    >
      {CTA_LABEL}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </Link>
  );
}

function Check({ className = 'text-cobalt' }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[11px] tracking-[0.16em] uppercase text-cobalt font-bold mb-4">{children}</p>
  );
}

export default async function ShopLanding() {
  const n = await liveNumbers();
  const proof = [
    'Independent laboratory, every batch',
    `${n.certificates} certificates published`,
    'Licensed US facility',
    'Ships in 48 hours',
    'Tracked and insured',
    'No minimum order',
    'Secure checkout',
  ];

  return (
    <>
      {/* §01 HERO: headline, the offer, the one button; the lab photo beside it. */}
      <section className="bg-paper">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-10 pt-10 pb-14 lg:pt-16 lg:pb-20 grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-14 items-center">
          <div>
            <Eyebrow>Research compounds · Independently tested · Ships in 48 hours</Eyebrow>
            <h1
              className="font-display font-black text-ink tracking-[-0.035em] leading-[1.0]"
              style={{ fontSize: 'clamp(38px, 5.6vw, 68px)', textWrap: 'balance' }}
            >
              Every batch tested.
              <br />
              <span className="text-cobalt">Every certificate published.</span>
            </h1>
            <p className="mt-6 max-w-[50ch] text-[17px] leading-[1.6] text-ink-soft">
              Research compounds from a licensed US facility, tested by an independent laboratory
              before they are listed. Every certificate sits in a public library you can read before
              you order.
            </p>

            <div className="relative mt-8 max-w-[520px] rounded-2xl bg-white ring-1 ring-border-soft shadow-[0_1px_2px_rgba(11,15,25,0.04),0_12px_32px_-16px_rgba(46,77,219,0.25)] overflow-hidden">
              <ShineBorder shineColor={['#2E4DDB', '#6B8AFF']} borderWidth={2} duration={10} />
              <div className="p-6 lg:p-7">
                <p className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-muted">First order</p>
                <p className="mt-1 font-display font-black text-ink tracking-[-0.03em] text-[40px] leading-none">
                  {WELCOME_PCT}% off
                </p>
                <p className="mt-2 text-[14.5px] text-ink-soft">
                  Code <span className="font-mono font-semibold text-ink">{WELCOME_CODE}</span> is applied for you at checkout.
                </p>
                <div className="mt-5">
                  <Cta id="hero-cta" className="w-full sm:w-auto" />
                </div>
                <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] text-ink-soft">
                  {['Ships in 48 hours', 'Tracked and insured', 'No minimum order'].map((t) => (
                    <li key={t} className="inline-flex items-center gap-1.5"><Check />{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* The product itself, on the page's own palette. A staged lab
              scene was tried and read as fake; a packshot of what arrives
              reads as true. */}
          <div className="relative aspect-square lg:aspect-[5/4] rounded-3xl overflow-hidden ring-1 ring-border-soft bg-cream">
            <Image
              src="/brand/merit-vial-hero.webp"
              alt="A sealed Merit research vial, labeled research use only"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
            />
            <div className="absolute left-4 bottom-4 rounded-full bg-white/92 backdrop-blur px-3.5 py-2 text-[12px] font-semibold text-ink ring-1 ring-ink/10">
              Sealed · Independently tested · Certificate published
            </div>
          </div>
        </div>
      </section>

      {/* §02 PROOF STRIP */}
      <section className="bg-white border-y border-border-soft" aria-label="What every order includes">
        <Marquee pauseOnHover className="[--duration:36s] [--gap:0px] py-2">
          {proof.map((t) => (
            <span key={t} className="mx-6 inline-flex items-center gap-2 whitespace-nowrap text-[13.5px] font-semibold text-ink">
              <Check />
              {t}
            </span>
          ))}
        </Marquee>
      </section>

      {/* §03 WHY MERIT EXISTS: the brand line, earned by a contrast. */}
      <section className="bg-white">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-10 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-10 lg:gap-16">
          <div>
            <Eyebrow>Why Merit exists</Eyebrow>
            <h2
              className="font-display font-black text-ink tracking-[-0.03em] leading-[1.02]"
              style={{ fontSize: 'clamp(30px, 4vw, 52px)', textWrap: 'balance' }}
            >
              Same stack.
              <br />
              <span className="text-cobalt">Better source.</span>
            </h2>
            <p className="mt-5 max-w-[42ch] text-[15.5px] leading-[1.62] text-ink-soft">
              Most research compounds are sold on a photo and a promise. Merit sells the receipt:
              the same catalog, from a source you can check before you pay.
            </p>
            <div className="mt-8 hidden lg:block">
              <Cta />
            </div>
          </div>

          <div className="rounded-2xl ring-1 ring-border-soft overflow-hidden">
            <div className="hidden md:grid md:grid-cols-[22%_1fr_1fr] gap-x-6 px-6 py-3 bg-paper font-mono text-[10.5px] tracking-[0.14em] uppercase">
              <span aria-hidden="true"></span>
              <span className="text-ink-muted">The gray market</span>
              <span className="text-cobalt font-bold">Merit</span>
            </div>
            {CONTRAST.map(([k, them, us]) => (
              <div key={k} className="grid grid-cols-1 md:grid-cols-[22%_1fr_1fr] gap-x-6 gap-y-1.5 px-6 py-4 border-t border-border-soft text-[14.5px]">
                <p className="m-0 font-semibold text-ink">{k}</p>
                <p className="m-0 text-ink-muted">
                  <span className="md:hidden font-mono text-[10px] tracking-[0.12em] uppercase mr-2">Gray market</span>
                  {them}
                </p>
                <p className="m-0 text-ink font-medium inline-flex items-start gap-2">
                  <span className="md:hidden font-mono text-[10px] tracking-[0.12em] uppercase text-cobalt mr-1">Merit</span>
                  <Check className="text-cobalt mt-[3px] hidden md:block" />
                  <span>{us}</span>
                </p>
              </div>
            ))}
          </div>
          <div className="lg:hidden">
            <Cta className="w-full" />
          </div>
        </div>
      </section>

      {/* §04 TESTED FOR + THREE STEPS */}
      <section className="bg-paper border-t border-border-soft">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-10 py-16 lg:py-24">
          <Eyebrow>Before you order</Eyebrow>
          <h2
            className="font-display font-black text-ink tracking-[-0.03em] leading-[1.02] max-w-[18ch]"
            style={{ fontSize: 'clamp(30px, 4vw, 52px)', textWrap: 'balance' }}
          >
            Three steps from batch to lab report.
          </h2>
          <ol className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            {STEPS.map(([t, b], i) => (
              <li key={t} className="rounded-2xl bg-white ring-1 ring-border-soft p-6 lg:p-7">
                <span className="font-mono text-[11px] tracking-[0.14em] text-cobalt font-bold">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-3 font-display text-[18px] font-bold leading-snug text-ink">{t}</h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-ink-soft">{b}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 rounded-2xl bg-white ring-1 ring-border-soft p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-6 lg:gap-10 items-start">
            <div>
              <p className="font-mono text-[10.5px] tracking-[0.16em] uppercase text-ink-muted">Every batch is checked for</p>
              <p className="mt-2 text-[14.5px] leading-[1.6] text-ink-soft max-w-[40ch]">
                Each result below is printed on the certificate, by a laboratory that is not ours.
              </p>
              <p className="mt-4 text-[13.5px]">
                <Link href={`${STORE}/coa`} className="text-cobalt font-semibold underline underline-offset-4 hover:text-ink">
                  Read a certificate first
                </Link>
              </p>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              {CHECKS.map(([t, b]) => (
                <li key={t} className="flex gap-2.5 items-start border-b border-border-soft pb-3 text-[14px]">
                  <Check className="text-cobalt mt-[3px]" />
                  <span><b className="font-semibold text-ink">{t}.</b> <span className="text-ink-soft">{b}</span></span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* §05 NUMBERS, live from the catalog */}
      <section className="bg-white border-t border-border-soft">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-10 py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-8 lg:gap-14 items-center">
            <div>
              <Eyebrow>Pricing</Eyebrow>
              <h2
                className="font-display font-black text-ink tracking-[-0.03em] leading-[1.02] max-w-[16ch]"
                style={{ fontSize: 'clamp(30px, 4vw, 52px)', textWrap: 'balance' }}
              >
                Priced like the material it is.
              </h2>
              <p className="mt-5 max-w-[52ch] text-[15.5px] leading-[1.62] text-ink-soft">
                We spend on the laboratory, not the logo. Every price is public, and it is the same
                price whether you buy one vial or a case.
              </p>
            </div>
            {/* The laboratory the money goes to: an HPLC autosampler, the
                instrument behind the purity figure on every certificate.
                Photograph by Yura Shkoda on Pexels, free for commercial use. */}
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden ring-1 ring-border-soft bg-paper">
              <Image
                src="/brand/lab-hplc-autosampler.webp"
                alt="Sample vials loaded in the autosampler of an HPLC instrument"
                fill
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover"
              />
              <div className="absolute left-4 bottom-4 rounded-full bg-white/92 backdrop-blur px-3.5 py-2 text-[12px] font-semibold text-ink ring-1 ring-ink/10">
                HPLC. Where the purity number comes from.
              </div>
            </div>
          </div>
          <dl className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
            {([
              [<>{money(n.fromCents)}</>, 'per vial, and up'],
              [<NumberTicker value={n.compounds} />, 'compounds in stock'],
              [<NumberTicker value={n.certificates} />, 'certificates published'],
              [<>{money(FREE_SHIPPING_CENTS_THRESHOLD).replace('.00', '')}</>, 'and over ships free'],
            ] as [React.ReactNode, string][]).map(([v, l]) => (
              <div key={l} className="rounded-2xl bg-paper ring-1 ring-border-soft p-6 lg:p-7">
                <dt className="sr-only">{l}</dt>
                <dd className="m-0">
                  <span className="block font-display font-black text-ink text-[34px] lg:text-[44px] leading-none tracking-[-0.03em] tabular-nums">{v}</span>
                  <span className="mt-2 block text-[13px] text-ink-soft">{l}</span>
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 max-w-[60ch] text-[14px] leading-[1.65] text-ink-soft">
            Three-packs save 5%, six-packs and subscriptions save 10%, and there is no minimum order.
            First order: {WELCOME_PCT}% off with code <span className="font-mono font-semibold text-ink">{WELCOME_CODE}</span>.
          </p>
          <div className="mt-8">
            <Cta />
          </div>
        </div>
      </section>

      {/* §06 FAQ: native details, no JS, readable by Google as content. */}
      <section className="bg-paper border-t border-border-soft">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-10 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-8 lg:gap-16">
          <div>
            <Eyebrow>Straight answers</Eyebrow>
            <h2
              className="font-display font-black text-ink tracking-[-0.03em] leading-[1.02] max-w-[12ch]"
              style={{ fontSize: 'clamp(30px, 4vw, 52px)', textWrap: 'balance' }}
            >
              Before you decide.
            </h2>
          </div>
          <div className="rounded-2xl bg-white ring-1 ring-border-soft divide-y divide-border-soft">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group px-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15.5px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  {q}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-muted transition-transform group-open:rotate-45" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </summary>
                <p className="pb-5 pr-8 text-[14.5px] leading-[1.65] text-ink-soft">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* §07 FINAL CTA + the quiet fallback for people not ready to buy today */}
      <section className="bg-cobalt text-white">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-10 py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2
              className="font-display font-black tracking-[-0.03em] leading-[1.02]"
              style={{ fontSize: 'clamp(30px, 4vw, 52px)', textWrap: 'balance' }}
            >
              Ready when you are.
            </h2>
            <p className="mt-4 max-w-[44ch] text-[15.5px] leading-[1.6] text-white/80">
              {WELCOME_PCT}% off your first order. Code {WELCOME_CODE} applies itself at checkout.
              Ships within 48 hours, tracked and insured.
            </p>
            <div className="mt-7">
              <Cta light />
            </div>
          </div>
          <div className="rounded-2xl bg-white/10 ring-1 ring-white/20 p-6">
            <p className="text-[14px] font-semibold text-white">Not ready today?</p>
            <p className="mt-1 text-[13.5px] text-white/75">We will email you the code so it is there when you are.</p>
            <div className="mt-4">
              <LpEmailCapture source="google-lander" theme="dark" label="Email me the code" buttonLabel="Email me the code →" />
            </div>
          </div>
        </div>
      </section>

      {/* BUSINESS IDENTITY: this root has no site footer. Padded at the bottom
          on phones so the sticky bar never covers the policy links. */}
      <footer className="bg-white border-t border-border-soft text-ink-soft pb-24 lg:pb-0">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-10 py-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="text-[13px] leading-[1.7]">
            <p className="font-display font-bold text-ink text-[15px]">Merit Sciences LLC</p>
            <p>San Antonio, Texas</p>
            <p>
              <a href="mailto:info@meritpeptides.com" className="underline-offset-4 hover:underline hover:text-ink">info@meritpeptides.com</a>
            </p>
            <p className="mt-2">
              <Link href={`${STORE}/practitioners`} className="underline-offset-4 hover:underline hover:text-ink">Practitioner Program</Link>
            </p>
          </div>
          <nav aria-label="Policies" className="flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
            {POLICIES.map(([label, path]) => (
              <Link key={path} href={`${STORE}${path}`} className="underline-offset-4 hover:underline hover:text-ink">{label}</Link>
            ))}
          </nav>
        </div>
        <p className="max-w-[1240px] mx-auto px-6 lg:px-10 pb-10 font-mono text-[10.5px] leading-[1.7] text-ink-muted">
          For research use only. Not for human or veterinary use. Not evaluated or approved by the FDA.
          Merit makes no claim about what any compound does.
        </p>
      </footer>

      {/* STICKY MOBILE CTA: the one action stays reachable the whole scroll,
          appearing only after the hero's own button has left the screen. */}
      <StickyCta sentinelId="hero-cta">
        <Cta className="w-full" />
      </StickyCta>
    </>
  );
}
