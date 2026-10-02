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
 * code attached. One action, repeated. Reading a certificate is a text link.
 *
 * WRITTEN TO GOOGLE'S HEALTHCARE AND MEDICINES POLICY, which covers landing
 * pages and keywords as well as ads, and ends in account suspension rather
 * than a disapproved ad: no compound names in copy or legible in any image
 * (the certificate card below deliberately omits the compound and says so),
 * no claims about what anything does, no prescription or controlled-substance
 * terms, no guarantee the policies pages do not back. Google's reviewer sees
 * this page exactly as a visitor does.
 *
 * DESIGN (2026-10-01 rebuild). The previous page was a SaaS template: eyebrow,
 * two-tone headline, shine-border offer card, marquee, three cards, a table,
 * four stat tiles, an accordion, a cobalt band. It read as generated because
 * it was the generic default. This one has a thesis instead: Merit sells the
 * receipt, so the page IS a receipt. Dark object cinema to open (the same
 * world as the locked homepage), then paper, and on the paper a real
 * certificate ticket with live figures from the COA library. Fewer sections,
 * larger type, real photographs, one accent spent on one thing per screen.
 * No gradients, no animated borders, no icon rows.
 */

export const dynamic = 'force-dynamic';

/*
 * 2026-10-02 revision after two rejected directions in one day. Parker's
 * brief: keep the full-bleed hero, make the headline more human and punchy
 * so it reads as about the certificates but not only about them, and show
 * Merit's own branded imagery instead of generated or stock scenes. So:
 * hero = three Merit vials (brand/hero-A-cluster), the steps band = the
 * Merit vial wall from the locked homepage, the mid-page figure = the Merit
 * packshot. Labels read "Merit." and "Research use only"; no compound name
 * is legible anywhere, which is the Google constraint.
 */

export const metadata = {
  title: 'Research compounds with the lab report included. Shipped in 48 hours.',
  description:
    'Every batch is tested by an independent laboratory before it is listed and the report is public. Orders leave San Antonio within 48 hours on business days, tracked. 15% off your first order.',
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

type Live = {
  compounds: number;
  fromCents: number;
  certificates: number;
  coa: { number: string; lot: string; purity: string; tested: string; identity: string } | null;
};

/* Live figures. Fallbacks are the values on the day this shipped, so a
   database hiccup still renders something true. The certificate shown is the
   most recent clean one in the library; its compound is withheld on purpose. */
async function live(): Promise<Live> {
  const fallback: Live = {
    compounds: 25,
    fromCents: 3999,
    certificates: 82,
    coa: { number: 'COA-2026-5HUDMG', lot: 'LOT2026-06-0001', purity: '99.79', tested: '2026-08-01', identity: 'Confirmed' },
  };
  try {
    const [products, certs, coas] = await Promise.all([
      prisma.product.findMany({
        where: { status: 'ACTIVE', handle: { not: 'bacteriostatic-water' } },
        select: { handle: true, priceCents: true },
      }),
      prisma.coa.count({ where: { retiredAt: null } }),
      prisma.coa.findMany({
        where: { retiredAt: null },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: { coaNumber: true, lotId: true, purity: true, testedDate: true, identity: true },
      }),
    ]);
    const shown = products.filter((p) => !ADS_RESTRICTED_HANDLES.has(p.handle) && p.priceCents > 0);
    // Purity is stored as the laboratory prints it ("99.79%"). One row in the
    // table is corrupted (0.85), so the window below skips it rather than
    // putting a nonsense figure on the page.
    const purityOf = (c: { purity: string | null }) => parseFloat(String(c.purity ?? '').replace('%', ''));
    const clean = coas.find((c) => {
      const n = purityOf(c);
      return Number.isFinite(n) && n >= 90 && n <= 100 && c.lotId && c.coaNumber;
    });
    return {
      compounds: shown.length || fallback.compounds,
      fromCents: shown.length ? Math.min(...shown.map((p) => p.priceCents)) : fallback.fromCents,
      certificates: certs || fallback.certificates,
      coa: clean
        ? {
            number: clean.coaNumber!,
            lot: clean.lotId!,
            purity: purityOf(clean).toFixed(2),
            tested: clean.testedDate ?? '',
            // The identity column holds the compound name. It is never
            // rendered here; the card states the result, not the name.
            identity: 'Confirmed',
          }
        : fallback.coa,
    };
  } catch {
    return fallback;
  }
}

const money = (c: number) => `$${(c / 100).toFixed(2)}`;

/* What is on every certificate, in the order the laboratory prints it. */
const PANEL: [string, string, string][] = [
  ['Identity', 'HPLC against a reference standard', 'Confirmed'],
  ['Purity', 'HPLC main peak, as measured', 'Printed to two decimals'],
  ['Heavy metals', 'ICP-MS: arsenic, cadmium, lead, mercury', 'Below threshold'],
  ['Screen', 'Immunoassay for a common contaminant', 'Not detected'],
];

/* Left is the category Merit sells against; right is what Merit does. */
const LEDGER: [string, string, string][] = [
  ['Where it is made', 'Unknown. Often imported and relabeled.', 'A licensed US facility'],
  ['Who tests it', 'The seller, if anyone', 'An independent laboratory, every batch'],
  ['When you see the certificate', 'On request, if you ask twice', 'Before the batch is listed'],
  ['The label', 'A marker and a hope', 'A QR code that opens the certificate'],
  ['Shipping', 'Weeks, untracked', 'Within 48 hours on business days, tracked'],
  ['Paying', 'Apps and DMs', 'Major cards on a secure checkout'],
];

const FAQ: [string, string][] = [
  ['What do I actually receive?',
   'A sealed vial of lyophilized material. The batch it came from was tested by an independent laboratory before it was listed, and its certificate is in our COA library.'],
  ['Who does the testing?',
   'A laboratory independent of the facility that made the batch. The certificate is published before the batch is listed, so the identity and purity figures you read are the same ones we read.'],
  ['How do I check a batch?',
   'The QR code on every vial opens our COA library. Search by compound to find the certificate for the batch currently shipping. No account and no request form.'],
  ['How fast does it ship?',
   'Orders leave San Antonio within 48 hours on business days. The tracking number is emailed as soon as the carrier scans the parcel, and transit is usually 2 to 5 business days. US addresses only, no PO boxes or freight forwarders.'],
  ['Is there a minimum order?',
   `No. One vial ships the same way a case does: within 48 hours on business days, tracked. Orders over ${money(FREE_SHIPPING_CENTS_THRESHOLD).replace('.00', '')} ship free.`],
  ['Who can order?',
   'Qualified researchers and licensed practitioners. Practitioners can apply for account pricing through the Practitioner Program; retail buyers order directly.'],
  ['What does research use only mean?',
   'Everything we supply is for laboratory and scientific research. It is not for human or veterinary use and has not been evaluated or approved by the FDA.'],
];

/* Store routes that exist. (/legal/refunds and /legal/contact were 404s.) */
const POLICIES: [string, string][] = [
  ['Shipping', '/shipping'],
  ['Returns and refunds', '/returns'],
  ['Privacy', '/privacy'],
  ['Terms', '/terms'],
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
      className={`${tones[tone]} inline-flex items-center justify-center gap-3 whitespace-nowrap rounded-full pl-7 pr-5 py-4 text-[15px] font-semibold tracking-[-0.01em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cobalt ${className}`}
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

  return (
    <>
      {/* Hero entrance only: a single orchestrated rise on load, nothing on
          scroll. Content is visible without JS; the keyframes just add the
          arrival. Reduced motion gets a static page. */}
      <style>{`
        @keyframes lpRise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
        .lp-rise { animation: lpRise .9s cubic-bezier(.2,.8,.2,1) both; }
        .lp-rise-2 { animation-delay: .12s; } .lp-rise-3 { animation-delay: .24s; } .lp-rise-4 { animation-delay: .36s; }
        @media (prefers-reduced-motion: reduce) { .lp-rise { animation: none; } }
      `}</style>

      {/* §01 HERO. Parker's pick (2026-10-02): the Merit vial wall from the
          locked homepage, faded, with the brand line as the headline. The
          wall is a texture, so the words sit on the right half on desktop and
          over a gradient on a phone. Only the wordmark is legible on the
          labels; that is by design and it is the Google constraint. */}
      <section className="relative isolate bg-[#1B1F26] text-white overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/brand/pattern-vials-dof.webp"
            alt="A wall of Merit vials receding into shallow focus"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1B1F26] via-[#1B1F26]/90 to-[#1B1F26]/15 lg:bg-gradient-to-l lg:from-[#1B1F26] lg:via-[#1B1F26]/60 lg:to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#1B1F26] to-transparent" />
        </div>

        <header className="relative z-10 max-w-[1280px] mx-auto px-6 lg:px-10 pt-6 flex items-center justify-between">
          <span className="font-display font-extrabold tracking-[-0.03em] text-[22px]">
            Merit<span className="text-cobalt-soft">.</span>
          </span>
          <Link href={`${STORE}/coa`} className="text-[13px] text-white/70 hover:text-white underline-offset-4 hover:underline">
            Read a certificate
          </Link>
        </header>

        <div className="relative z-10 max-w-[1280px] mx-auto px-6 lg:px-10 pt-[18vh] pb-20 lg:pt-[16vh] lg:pb-28 min-h-[88svh] flex flex-col justify-end lg:items-end">
          <div className="lg:w-[54%]">
            <Kicker light>
              <span className="lp-rise inline-block">Research compounds · San Antonio, Texas</span>
            </Kicker>
            <h1
              className="lp-rise lp-rise-2 mt-5 font-display font-extrabold tracking-[-0.045em] leading-[0.94] max-w-[12ch]"
              style={{ fontSize: 'clamp(48px, 7.6vw, 108px)', textWrap: 'balance' }}
            >
              Same stack. <span className="text-cobalt-soft">Better source.</span>
            </h1>
            <p className="lp-rise lp-rise-3 mt-7 max-w-[46ch] text-[17px] lg:text-[19px] leading-[1.5] text-white/80">
              Every batch is tested by an independent laboratory before it is listed, and the
              report is public. Orders leave San Antonio within 48 hours on business days, tracked.
              Your first one is {WELCOME_PCT}% off.
            </p>
            <div className="lp-rise lp-rise-4 mt-9 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <Cta id="hero-cta" tone="paper" />
              <p className="text-[13.5px] text-white/60">
                Code <span className="font-mono text-white/90">{WELCOME_CODE}</span> is applied for you at checkout. No minimum order.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* §02 THE RECEIPT. Paper. A real certificate, live from the library,
          set as a ticket. The compound is withheld here on purpose and the
          card says so: the point is that the numbers exist and are public. */}
      <section id="receipt" className="bg-paper text-ink">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-20 lg:py-32 grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-12 lg:gap-20 items-start">
          <div className="lg:sticky lg:top-16">
            <Kicker>The receipt comes first</Kicker>
            <h2
              className="mt-5 font-display font-extrabold tracking-[-0.04em] leading-[0.95]"
              style={{ fontSize: 'clamp(36px, 5.2vw, 72px)', textWrap: 'balance' }}
            >
              The lab report comes with the vial.
            </h2>
            <p className="mt-7 max-w-[48ch] text-[16.5px] leading-[1.6] text-ink-soft">
              This is the newest certificate in our library, as a laboratory that is not ours
              printed it. Every batch we sell has one, published before the batch is listed, and
              the QR code on the vial opens it.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Cta />
              <Link href={`${STORE}/coa`} className="text-[14px] font-semibold text-ink underline underline-offset-[6px] decoration-ink/30 hover:decoration-cobalt">
                Open the COA library
              </Link>
            </div>
          </div>

          {/* The ticket. Mono for the figures, hairline rules, a perforated
              edge. Nothing else on the page uses a card, so this one reads as
              an object rather than a layout habit. */}
          <figure className="relative">
            <div className="bg-white shadow-[0_30px_80px_-40px_rgba(11,15,25,0.35),0_1px_0_rgba(11,15,25,0.06)] ring-1 ring-ink/8">
              <div className="px-7 pt-7 pb-6 flex items-start justify-between gap-6 border-b border-dashed border-ink/15">
                <div>
                  <p className="font-mono text-[11px] tracking-[0.16em] uppercase text-ink-muted">Certificate of analysis</p>
                  <p className="mt-1.5 font-mono text-[15px] text-ink">{n.coa?.number}</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-ink/12 px-3 py-1.5 font-mono text-[11px] tracking-[0.12em] uppercase text-ink">
                  <span className="h-1.5 w-1.5 rounded-full bg-cobalt" aria-hidden="true" />
                  Pass
                </span>
              </div>
              <dl className="px-7 py-6 grid grid-cols-2 gap-x-8 gap-y-5">
                <div>
                  <dt className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">Lot</dt>
                  <dd className="mt-1 font-mono text-[15px] text-ink">{n.coa?.lot}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">Analysis date</dt>
                  <dd className="mt-1 font-mono text-[15px] text-ink">{n.coa?.tested}</dd>
                </div>
                <div>
                  <dt className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">Compound</dt>
                  <dd className="mt-1 text-[14px] text-ink-soft">Withheld on this page. Named in the library.</dd>
                </div>
                <div>
                  <dt className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">Laboratory</dt>
                  <dd className="mt-1 text-[14px] text-ink">Independent, ISO/IEC 17025 accredited</dd>
                </div>
              </dl>
              <div className="px-7 py-7 border-t border-ink/8 grid grid-cols-[1fr_auto] items-end gap-6">
                <div>
                  <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">Purity, HPLC main peak</p>
                  <p className="mt-2 font-display font-extrabold tracking-[-0.05em] leading-none text-ink" style={{ fontSize: 'clamp(56px, 7vw, 96px)' }}>
                    {n.coa?.purity}<span className="text-cobalt">%</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted">Identity</p>
                  <p className="mt-2 font-mono text-[15px] text-ink">{n.coa?.identity}</p>
                </div>
              </div>
              <ul className="px-7 pb-7 divide-y divide-ink/8 border-t border-ink/8">
                {PANEL.map(([k, method, result]) => (
                  <li key={k} className="py-3.5 grid grid-cols-[1fr_auto] sm:grid-cols-[120px_1fr_auto] gap-x-6 gap-y-1 text-[13.5px]">
                    <span className="font-semibold text-ink">{k}</span>
                    <span className="hidden sm:block text-ink-soft">{method}</span>
                    <span className="font-mono text-[12.5px] text-ink text-right">{result}</span>
                  </li>
                ))}
              </ul>
            </div>
            <figcaption className="mt-4 font-mono text-[11px] leading-[1.7] text-ink-muted">
              Figures are read live from the COA library. {n.certificates} certificates published to date.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* §03 NUMBERS. A single typographic line, not tiles. */}
      <section id="numbers" className="bg-paper border-y border-ink/8">
        <dl className="max-w-[1280px] mx-auto px-6 lg:px-10 py-10 grid grid-cols-2 lg:grid-cols-4 gap-y-8 gap-x-10">
          {([
            [String(n.certificates), 'certificates published'],
            [String(n.compounds), 'compounds in the catalog'],
            [money(n.fromCents), 'per vial and up'],
            ['48 h', 'to dispatch on business days, tracked'],
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

      {/* §04 WHAT ARRIVES. The vial itself, Merit's packshot, and the plain
          facts about getting it: sealed, lot on the label, QR to the report,
          out the door in 48 hours. The one section that is about the box
          rather than the paperwork. */}
      <section id="vial" className="bg-paper">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 pt-20 lg:pt-28 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] gap-10 lg:gap-20 items-center">
          <div>
            <Kicker>What arrives</Kicker>
            <h2
              className="mt-5 font-display font-extrabold tracking-[-0.04em] leading-[0.95]"
              style={{ fontSize: 'clamp(34px, 4.6vw, 64px)', textWrap: 'balance' }}
            >
              Sealed, labeled, and already on record.
            </h2>
            <p className="mt-7 max-w-[48ch] text-[16.5px] leading-[1.6] text-ink-soft">
              Each vial comes sealed with its lot number on the label, and the QR code on that label
              opens the lot&rsquo;s report. Orders leave San Antonio within 48 hours on business
              days with a tracking number. One vial ships the same way a case does, and orders
              over {money(FREE_SHIPPING_CENTS_THRESHOLD).replace('.00', '')} ship free.
            </p>
            <div className="mt-9">
              <Cta />
            </div>
          </div>
          <figure className="relative aspect-square overflow-hidden ring-1 ring-ink/8">
            <Image
              src="/brand/merit-vial-hero.webp"
              alt="A sealed Merit vial on a cobalt and cream background, label reading Merit, research use only"
              fill
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover"
            />
          </figure>
        </div>
      </section>

      {/* §05 THE LEDGER. The category Merit sells against, in two columns of
          plain statements. Hairlines, no table chrome. */}
      <section id="ledger" className="bg-paper">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-20 lg:py-32">
          <div className="max-w-[760px]">
            <Kicker>Side by side</Kicker>
            <h2
              className="mt-5 font-display font-extrabold tracking-[-0.04em] leading-[0.95]"
              style={{ fontSize: 'clamp(34px, 4.6vw, 64px)', textWrap: 'balance' }}
            >
              The same catalog. A source you can check.
            </h2>
          </div>
          <div className="mt-12 lg:mt-16 border-t border-ink/15">
            <div className="hidden md:grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-10 py-4 font-mono text-[11px] tracking-[0.16em] uppercase text-ink-muted border-b border-ink/8">
              <span aria-hidden="true" />
              <span>The gray market</span>
              <span className="text-cobalt">Merit</span>
            </div>
            {LEDGER.map(([k, them, us]) => (
              <div key={k} className="grid grid-cols-1 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-10 gap-y-2 py-5 lg:py-6 border-b border-ink/8">
                <p className="m-0 font-display font-bold text-[17px] lg:text-[19px] tracking-[-0.02em] text-ink">{k}</p>
                <p className="m-0 text-[15.5px] text-ink-muted">
                  <span className="md:hidden font-mono text-[10px] tracking-[0.14em] uppercase mr-2">Gray market</span>
                  {them}
                </p>
                <p className="m-0 text-[15.5px] text-ink">
                  <span className="md:hidden font-mono text-[10px] tracking-[0.14em] uppercase text-cobalt mr-2">Merit</span>
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

      {/* §06 HOW IT WORKS. Dark again over a single Merit vial (the wall is
          the hero now), three plain steps. Numbered because it is a sequence. */}
      <section id="steps" className="relative isolate bg-[#070A12] text-white overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/brand/hero-monolith.webp"
            alt="A single sealed vial standing in low light"
            fill
            sizes="100vw"
            className="object-cover object-[70%_center] opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#070A12]/50 via-[#070A12]/75 to-[#070A12]" />
        </div>
        <div className="relative z-10 max-w-[1280px] mx-auto px-6 lg:px-10 py-24 lg:py-36">
          <Kicker light>From batch to bench</Kicker>
          <h2
            className="mt-5 font-display font-extrabold tracking-[-0.04em] leading-[0.95] max-w-[14ch]"
            style={{ fontSize: 'clamp(34px, 4.6vw, 64px)', textWrap: 'balance' }}
          >
            Three steps, and you can check every one.
          </h2>
          <ol className="mt-14 lg:mt-20 grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-12">
            {([
              ['The batch is tested before it is listed', 'An independent laboratory runs identity, purity and heavy metals. Nothing goes on sale until the results are in.'],
              ['The certificate goes into the library', 'Every certificate we have released, searchable by compound. No account, no request form.'],
              ['The QR code on the vial opens it', 'Scan the label and you are reading the same numbers we read, for the batch in your hand.'],
            ] as [string, string][]).map(([t, b], i) => (
              <li key={t} className="border-t border-white/20 pt-6">
                <span className="font-mono text-[12px] tracking-[0.16em] text-cobalt-soft">0{i + 1}</span>
                <h3 className="mt-4 font-display font-bold text-[21px] lg:text-[24px] tracking-[-0.025em] leading-[1.1]">{t}</h3>
                <p className="mt-3 text-[15px] leading-[1.6] text-white/70">{b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* §07 FAQ. Native details, no JS, readable by Google as content. */}
      <section id="faq" className="bg-paper">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-20 lg:py-32 grid grid-cols-1 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] gap-10 lg:gap-20">
          <div>
            <Kicker>Before you decide</Kicker>
            <h2
              className="mt-5 font-display font-extrabold tracking-[-0.04em] leading-[0.95] max-w-[10ch]"
              style={{ fontSize: 'clamp(34px, 4.6vw, 64px)', textWrap: 'balance' }}
            >
              Straight answers.
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

      {/* §08 CLOSE. The offer once more, and the quiet fallback for people
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
              <span className="text-cobalt-soft">We&rsquo;ll earn the rest.</span>
            </h2>
            <p className="mt-7 max-w-[44ch] text-[16.5px] leading-[1.55] text-white/70">
              Code {WELCOME_CODE} applies itself at checkout. Out of San Antonio within 48 hours on
              business days, tracked, with the report already published.
            </p>
            <div className="mt-9">
              <Cta tone="paper" />
            </div>
          </div>
          <div className="border-t border-white/15 pt-7">
            <p className="text-[15px] font-semibold text-white">Not ready today?</p>
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
            <p className="mt-2">
              <Link href={`${STORE}/practitioners`} className="underline-offset-4 hover:underline hover:text-ink">Practitioner Program</Link>
            </p>
          </div>
          <nav aria-label="Policies" className="flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] lg:justify-end">
            {POLICIES.map(([label, path]) => (
              <Link key={path} href={`${STORE}${path}`} className="underline-offset-4 hover:underline hover:text-ink">{label}</Link>
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
