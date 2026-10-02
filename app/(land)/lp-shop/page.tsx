import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { FREE_SHIPPING_CENTS_THRESHOLD } from '@/lib/checkout-pricing';
import { WELCOME_CODE, WELCOME_PCT } from '@/lib/welcome-offer';
import { ADS_RESTRICTED_HANDLES } from '@/lib/ads-restricted';
import { LpEmailCapture } from '@/components/lp/LpEmailCapture';
import { StickyCta } from './StickyCta';

/**
 * Google Ads landing page, served at shop.meritsciences.com/ by middleware
 * rewrite (everything else on that host 308s to the store). Lives under the
 * (land) root, so the storefront's nav, cart and footer are structurally
 * absent, not hidden.
 *
 * ONE JOB: land a paid click and send it into the catalog with the welcome
 * code attached. One action, repeated.
 *
 * WRITTEN TO GOOGLE'S HEALTHCARE AND MEDICINES POLICY, which covers landing
 * pages and keywords as well as ads, and ends in account suspension rather
 * than a disapproved ad: no compound names in copy or legible in any image,
 * no claims about what anything does, no prescription or controlled-substance
 * terms, no guarantee the policies pages do not back. Google's reviewer sees
 * this page exactly as a visitor does.
 *
 * THESIS (2026-10-01, second rebuild). The first rebuild sold the certificate
 * and Parker killed it: "going the science, COA route is just too
 * disconnected from what I think is good messaging." The data agreed. Of the
 * last 317 converting visitors, 40 looked at a certificate first. People buy
 * here because it is a normal store in a market that mostly is not: a card
 * checkout, a Texas address, a tracking number inside 48 hours, a written
 * replace-or-refund policy. So that is the page. Testing is one row in the
 * ledger and one question in the FAQ, said once, plainly.
 *
 * Every number and policy line on this page is read from the code or the
 * legal copy that ships with the checkout. Do not add a specific that is not
 * backed there.
 *
 * Photographs are Pexels, free licence, real: 4050425 (Vlada Karpovich) and
 * 9594502 (Ron Lach). No vials, no labels, no Merit branding in frame.
 */

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Research compounds, ordered like anything else',
  description: `A normal checkout for research compounds. Cards accepted, orders out within 48 hours from San Antonio, Texas, a written 7-day replace-or-refund policy, and ${WELCOME_PCT}% off your first order.`,
  robots: { index: false, follow: true },
};

const STORE = 'https://meritsciences.com';
/**
 * `ads=1` serves the paid-traffic catalog (lib/ads-restricted): the same grid
 * without the listings whose displayed title is a prescription drug name.
 * Google's healthcare enforcement follows the click out of the landing page,
 * so every CTA on this page carries it. The catalog also reads it to skip the
 * email popup (the buyer already holds the code) and to tighten its header so
 * the first products sit above the fold on a phone.
 */
const CTA_HREF = `${STORE}/catalog?code=${WELCOME_CODE}&ads=1`;

type Live = { compounds: number; fromCents: number; reports: number };

/* Live figures with the values on the day this shipped as fallbacks, so a
   database hiccup still renders something true. */
async function live(): Promise<Live> {
  const fallback: Live = { compounds: 25, fromCents: 3999, reports: 82 };
  try {
    const [products, reports] = await Promise.all([
      prisma.product.findMany({
        where: { status: 'ACTIVE', handle: { not: 'bacteriostatic-water' } },
        select: { handle: true, priceCents: true },
      }),
      prisma.coa.count({ where: { retiredAt: null } }),
    ]);
    const shown = products.filter((p) => !ADS_RESTRICTED_HANDLES.has(p.handle) && p.priceCents > 0);
    return {
      compounds: shown.length || fallback.compounds,
      fromCents: shown.length ? Math.min(...shown.map((p) => p.priceCents)) : fallback.fromCents,
      reports: reports || fallback.reports,
    };
  } catch {
    return fallback;
  }
}

const money = (c: number) => `$${(c / 100).toFixed(2)}`;
const FREE_SHIP = money(FREE_SHIPPING_CENTS_THRESHOLD).replace('.00', '');

/* The ledger. Left is how this category usually treats a buyer; right is
   what happens here. Every right-hand line is backed by the checkout's legal
   copy (app/(pay)/legal) or by code. */
const LEDGER = (n: Live): [string, string, string][] => [
  ['Paying', 'A crypto wallet, or a payment app to somebody’s first name.', 'Visa, Mastercard, American Express or Discover, on a checkout we run. No account to create.'],
  ['Shipping', 'Whenever. Sometimes tracked.', 'Out of San Antonio within 48 hours on business days. The tracking number lands in your inbox when the carrier scans it.'],
  ['When something is wrong', 'Good luck.', 'Tell us within 7 days of delivery and we replace it or refund it. That is the written policy, not a favor.'],
  ['The price', 'Depends who is asking.', `${money(n.fromCents)} a vial and up. The price on the page is the price. Orders over ${FREE_SHIP} ship free.`],
  ['Who you are dealing with', 'A handle.', 'Merit Sciences LLC, San Antonio, Texas. One email address, read by a person.'],
  ['Whether it is real', 'Trust me bro.', 'Every lot is tested by a laboratory we do not own before it is listed, and the report is public. Read one if you like. Most people never do, and that is fine.'],
];

const FAQ: [string, string][] = [
  ['How fast will it get here?',
   'Orders leave San Antonio within 48 hours on business days. You get the tracking number by email as soon as the carrier scans the parcel, and transit is usually 2 to 5 business days. We ship to US addresses only, and not to PO boxes or freight forwarders.'],
  ['How do I pay?',
   'Visa, Mastercard, American Express or Discover at checkout. There is no account to create. Your card details go to the payment processor and never touch our servers.'],
  ['What if it arrives damaged, or wrong?',
   'Email us within 7 days of the delivery date the carrier shows and we replace it or refund it to the card you paid with. You can also cancel for a full refund any time before the order is packed.'],
  ['Is there a minimum order?',
   `No. One vial ships the same way a case does. Orders over ${FREE_SHIP} ship free.`],
  ['Who can order?',
   'Adults in the United States buying for laboratory research. Licensed practitioners can apply for account pricing through the Practitioner Program; everyone else orders straight from the catalog.'],
  ['Is it tested?',
   'Yes. Every lot goes to an independent laboratory before it is listed, and the report is published. The QR code on each vial opens the report for the lot in your hand.'],
  ['What does research use only mean?',
   'Everything we supply is for laboratory and scientific research. It is not for human or veterinary use and has not been evaluated or approved by the FDA.'],
];

const POLICIES: [string, string][] = [
  ['Shipping', `${STORE}/shipping`],
  ['Returns and refunds', `${STORE}/returns`],
  ['Privacy', `${STORE}/privacy`],
  ['Terms', `${STORE}/terms`],
  ['Contact', 'mailto:info@meritpeptides.com'],
];

/* The one button. Same words everywhere it appears. */
function Cta({ tone = 'ink', className = '', id }: { tone?: 'ink' | 'paper' | 'cobalt'; className?: string; id?: string }) {
  const tones = {
    ink: 'bg-ink text-white hover:bg-cobalt',
    paper: 'bg-white text-ink hover:bg-paper',
    cobalt: 'bg-cobalt text-white hover:bg-white hover:text-ink',
  } as const;
  return (
    <Link
      id={id}
      href={CTA_HREF}
      className={`${tones[tone]} inline-flex items-center justify-center gap-3 rounded-full pl-7 pr-5 py-4 text-[15px] font-semibold tracking-[-0.01em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cobalt ${className}`}
    >
      Shop with {WELCOME_PCT}% off
      <span aria-hidden="true" className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-current/10">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </Link>
  );
}

function Kicker({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p className={`font-mono text-[11px] tracking-[0.18em] uppercase ${light ? 'text-white/55' : 'text-ink-muted'}`}>
      {children}
    </p>
  );
}

export default async function ShopLanding() {
  const n = await live();
  const ledger = LEDGER(n);

  return (
    <>
      {/* Hero entrance only: a single rise on load, nothing on scroll. Content
          is visible without JS; the keyframes just add the arrival. Reduced
          motion gets a static page. */}
      <style>{`
        @keyframes lpRise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
        .lp-rise { animation: lpRise .9s cubic-bezier(.2,.8,.2,1) both; }
        .lp-rise-2 { animation-delay: .12s; } .lp-rise-3 { animation-delay: .24s; } .lp-rise-4 { animation-delay: .36s; }
        @media (prefers-reduced-motion: reduce) { .lp-rise { animation: none; } }
      `}</style>

      {/* §01 HERO. Paper, daylight, a person at home with a laptop: the buyer,
          not the laboratory. Text left, photograph right; on a phone the
          photograph follows the button. */}
      <section className="relative bg-paper text-ink overflow-hidden">
        <header className="max-w-[1280px] mx-auto px-6 lg:px-10 pt-6 flex items-center justify-between">
          <span className="font-display font-extrabold tracking-[-0.03em] text-[22px]">
            Merit<span className="text-cobalt">.</span>
          </span>
          <Link href={`${STORE}/shipping`} className="text-[13px] text-ink-soft hover:text-ink underline-offset-4 hover:underline">
            Shipping and returns
          </Link>
        </header>

        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 pt-14 pb-16 lg:pt-20 lg:pb-24 grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-12 lg:gap-16 items-center">
          <div>
            <Kicker>
              <span className="lp-rise inline-block">Research compounds · San Antonio, Texas</span>
            </Kicker>
            <h1
              className="lp-rise lp-rise-2 mt-5 font-display font-extrabold tracking-[-0.045em] leading-[0.94]"
              style={{ fontSize: 'clamp(44px, 6.4vw, 88px)', textWrap: 'balance' }}
            >
              Buy it like you&rsquo;d buy <span className="text-cobalt">anything else.</span>
            </h1>
            <p className="lp-rise lp-rise-3 mt-7 max-w-[46ch] text-[17px] lg:text-[19px] leading-[1.5] text-ink-soft">
              Most of this market runs on DMs and crypto. Merit is a store. Pick what you need, pay with a
              card, and the tracking number is in your inbox within 48 hours on business days.
            </p>
            <div className="lp-rise lp-rise-4 mt-9 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <Cta id="hero-cta" />
              <p className="text-[13.5px] text-ink-muted">
                Code <span className="font-mono text-ink">{WELCOME_CODE}</span> applies itself at checkout. No minimum order.
              </p>
            </div>
          </div>

          <figure className="relative aspect-[4/3] lg:aspect-[4/5] overflow-hidden ring-1 ring-ink/8">
            <Image
              src="/brand/lp-window.webp"
              alt="A person sitting on a windowsill at home with a laptop and a mug, in daylight"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover object-[40%_center]"
            />
          </figure>
        </div>
      </section>

      {/* §02 THE LEDGER. Why people switch. Hairlines, two columns of plain
          statements, the brand line as the kicker. */}
      <section id="ledger" className="bg-paper text-ink border-t border-ink/8">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-8 lg:gap-16 items-end">
            <div>
              <Kicker>Same stack. Better source.</Kicker>
              <h2
                className="mt-5 font-display font-extrabold tracking-[-0.04em] leading-[0.95]"
                style={{ fontSize: 'clamp(34px, 4.8vw, 64px)', textWrap: 'balance' }}
              >
                The parts of ordering that usually go wrong.
              </h2>
            </div>
            <p className="max-w-[50ch] text-[16.5px] leading-[1.6] text-ink-soft lg:pb-2">
              If you have bought in this category before, you already know the drill: a Telegram
              handle, a wallet address, a box that shows up eventually, or does not. We think that
              is a bad way to buy anything. Here is what changes.
            </p>
          </div>

          <div className="mt-12 lg:mt-16 border-t border-ink/15">
            <div className="hidden md:grid md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.3fr)] gap-x-10 py-4 font-mono text-[11px] tracking-[0.16em] uppercase text-ink-muted border-b border-ink/8">
              <span aria-hidden="true" />
              <span>Elsewhere</span>
              <span className="text-cobalt">Here</span>
            </div>
            {ledger.map(([k, them, us]) => (
              <div key={k} className="grid grid-cols-1 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_minmax(0,1.3fr)] gap-x-10 gap-y-2 py-5 lg:py-6 border-b border-ink/8">
                <p className="m-0 font-display font-bold text-[17px] lg:text-[19px] tracking-[-0.02em] text-ink">{k}</p>
                <p className="m-0 text-[15.5px] text-ink-muted">
                  <span className="md:hidden font-mono text-[10px] tracking-[0.14em] uppercase mr-2">Elsewhere</span>
                  {them}
                </p>
                <p className="m-0 text-[15.5px] leading-[1.55] text-ink">
                  <span className="md:hidden font-mono text-[10px] tracking-[0.14em] uppercase text-cobalt mr-2">Here</span>
                  {us}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <Cta />
          </div>
        </div>
      </section>

      {/* §03 NUMBERS. One typographic line, not tiles. */}
      <section id="numbers" className="bg-paper border-y border-ink/8">
        <dl className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10 grid grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-10">
          {([
            [String(n.compounds), 'compounds in the catalog'],
            [money(n.fromCents), 'per vial and up'],
            ['48 h', 'to dispatch, business days'],
            [String(n.reports), 'lab reports public'],
          ] as [string, string][]).map(([v, l]) => (
            <div key={l}>
              <dt className="sr-only">{l}</dt>
              <dd className="m-0">
                <span className="block font-display font-extrabold tracking-[-0.04em] leading-none text-ink text-[40px] lg:text-[52px] tabular-nums">{v}</span>
                <span className="mt-2 block text-[13.5px] text-ink-soft">{l}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* §04 WHAT SHOWS UP. The buyer's next question after "will it ship" is
          "what arrives". A plain box, said plainly, with one photograph. */}
      <section id="box" className="bg-paper text-ink">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-20 lg:py-28 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-10 lg:gap-16 items-center">
          <div>
            <Kicker>What shows up</Kicker>
            <h2
              className="mt-5 font-display font-extrabold tracking-[-0.04em] leading-[0.95]"
              style={{ fontSize: 'clamp(34px, 4.6vw, 60px)', textWrap: 'balance' }}
            >
              A box, a tracking number, and nothing to explain.
            </h2>
            <p className="mt-7 max-w-[46ch] text-[16.5px] leading-[1.6] text-ink-soft">
              Each vial arrives sealed, with its lot number on the label. The label carries a QR
              code that opens that lot&rsquo;s report, if you ever want it. Shipping is covered
              over {FREE_SHIP}, and one vial ships the same way a case does.
            </p>
            <div className="mt-9">
              <Cta />
            </div>
          </div>
          <figure className="relative aspect-[3/2] overflow-hidden ring-1 ring-ink/8">
            <Image
              src="/brand/lp-box.webp"
              alt="Hands folding tissue paper into an open cardboard box on a table"
              fill
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover"
            />
          </figure>
        </div>
      </section>

      {/* §05 FAQ. Native details, no JS, readable by Google as content. */}
      <section id="faq" className="bg-paper border-t border-ink/8">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-20 lg:py-28 grid grid-cols-1 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] gap-10 lg:gap-20">
          <div>
            <Kicker>Before you decide</Kicker>
            <h2
              className="mt-5 font-display font-extrabold tracking-[-0.04em] leading-[0.95] max-w-[12ch]"
              style={{ fontSize: 'clamp(34px, 4.6vw, 64px)', textWrap: 'balance' }}
            >
              The questions we get.
            </h2>
          </div>
          <div className="border-t border-ink/15">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group border-b border-ink/8">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-[17px] lg:text-[18px] font-semibold tracking-[-0.01em] text-ink [&::-webkit-details-marker]:hidden">
                  {q}
                  <span aria-hidden="true" className="mt-1 shrink-0 font-mono text-[18px] leading-none text-ink-muted transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="pb-6 pr-10 max-w-[62ch] text-[15px] leading-[1.65] text-ink-soft">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* §06 CLOSE. The offer once more, and the quiet fallback for people
          not ready to buy today. */}
      <section id="close" className="bg-ink text-white">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-20 lg:py-28 grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-12 lg:gap-20 items-end">
          <div>
            <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-white/55">First order</p>
            <h2
              className="mt-5 font-display font-extrabold tracking-[-0.045em] leading-[0.92]"
              style={{ fontSize: 'clamp(44px, 7vw, 104px)', textWrap: 'balance' }}
            >
              {WELCOME_PCT}% off the first one.<br />
              <span className="text-cobalt-soft">We earn the second.</span>
            </h2>
            <p className="mt-7 max-w-[44ch] text-[16.5px] leading-[1.55] text-white/70">
              Code {WELCOME_CODE} applies itself at checkout. Out of San Antonio within 48 hours on
              business days, tracked.
            </p>
            <div className="mt-9">
              <Cta tone="paper" />
            </div>
          </div>
          <div className="border-t border-white/15 pt-7">
            <p className="text-[15px] font-semibold text-white">Not today?</p>
            <p className="mt-1.5 text-[14px] text-white/60 max-w-[40ch]">We will email you the code so it is there when you are.</p>
            <div className="mt-5">
              <LpEmailCapture source="google-lander" theme="dark" label="Email me the code" buttonLabel="Email me the code →" />
            </div>
          </div>
        </div>
      </section>

      {/* BUSINESS IDENTITY. This root has no site footer. Padded at the bottom
          on phones so the sticky bar never covers the policy links. */}
      <footer className="bg-paper border-t border-ink/8 text-ink-soft pb-28 lg:pb-0">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-12 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto] gap-8">
          <div className="text-[13.5px] leading-[1.75]">
            <p className="font-display font-bold text-ink text-[16px]">Merit Sciences LLC</p>
            <p>San Antonio, Texas</p>
            <p>
              <a href="mailto:info@meritpeptides.com" className="underline-offset-4 hover:underline hover:text-ink">info@meritpeptides.com</a>
            </p>
            <p className="mt-2 flex flex-wrap gap-x-5">
              <Link href={`${STORE}/practitioners`} className="underline-offset-4 hover:underline hover:text-ink">Practitioner Program</Link>
              <Link href={`${STORE}/coa`} className="underline-offset-4 hover:underline hover:text-ink">Lab reports</Link>
            </p>
          </div>
          <nav aria-label="Policies" className="flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] lg:justify-end">
            {POLICIES.map(([label, href]) => (
              href.startsWith('mailto:')
                ? <a key={href} href={href} className="underline-offset-4 hover:underline hover:text-ink">{label}</a>
                : <Link key={href} href={href} className="underline-offset-4 hover:underline hover:text-ink">{label}</Link>
            ))}
          </nav>
        </div>
        <p className="max-w-[1280px] mx-auto px-6 lg:px-10 pb-12 font-mono text-[11px] leading-[1.7] text-ink-muted">
          For research use only. Not for human or veterinary use. Not evaluated or approved by the FDA.
          Merit makes no claim about what any compound does.
        </p>
      </footer>

      {/* STICKY MOBILE CTA: appears once the hero's own button has left the screen. */}
      <StickyCta sentinelId="hero-cta">
        <Cta className="w-full" />
      </StickyCta>
    </>
  );
}
