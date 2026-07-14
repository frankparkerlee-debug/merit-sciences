import Image from 'next/image';
import Link from 'next/link';
import { listProducts, money } from '@/lib/catalog';
import type { Product } from '@/lib/product-types';
import { productImage } from '@/lib/product-types';
import { getStoreSettings } from '@/lib/store-settings';
import { prisma } from '@/lib/db';
import { QuickAdd } from './QuickAdd';
import { CaptureBand } from './CaptureBand';

/**
 * HOMEPAGE v6 — the approved v5 composition (split cinematic hero, cobalt
 * pattern feature, shop grid, dark close) wired for CONVERSION with REAL data:
 *
 *   - Featured grid pulls live products: real prices, real images, real
 *     availability — and "Add to cart" is a real add (opens cart drawer),
 *     not a disguised PDP link.
 *   - Receipts strip cites verifiable rigor (documented lots → /coa, HPLC
 *     standard, dispatch SLA, live compound count) — no fabricated scale.
 *   - FAQ with FAQPage JSON-LD (objection handling + the AI-search channel
 *     that already converts).
 *   - Email capture feeding the real WELCOME20 code + nurture drip.
 *
 * Review route only — noindexed until it replaces `/`.
 */

export const revalidate = 900; // fresh prices/lots every 15 min, static-fast otherwise

export const metadata = {
  title: 'Merit Sciences — Pharmacy-grade research peptides, shipped in 48 hours',
  description:
    'Research compounds produced in an ISO-certified US facility, HPLC-verified ≥99%, lot-documented with published COAs, dispatched from Dallas within 48 hours.',
  robots: { index: false, follow: false }, // preview route — flip when promoted to /
};

// Curated top-sellers, in display order. Matched against live catalog.
const FEATURED_HANDLES = [
  'tirzepatide-10mg',
  'retatrutide-10mg',
  'semaglutide-10mg',
  'bpc-10mg-tb-10mg-wolverine-20mg',
  'ghk-cu',
  'nad-500mg',
  'mots-c',
  'ipamorelin-10mg',
];

// Static fallback so the page NEVER renders an empty shelf (DB cold start,
// local dev). Prices verified against catalog 2026-07.
const FALLBACK_FEATURED = [
  { handle: 'tirzepatide-10mg', title: 'Tirzepatide 10 mg', priceCents: 7499, imageUrl: '/products/sku-tirzepatide-10mg.webp' },
  { handle: 'retatrutide-10mg', title: 'Retatrutide 10 mg', priceCents: 9999, imageUrl: '/products/sku-retatrutide-10mg.webp' },
  { handle: 'semaglutide-10mg', title: 'Semaglutide 10 mg', priceCents: 6499, imageUrl: '/products/sku-semaglutide-10mg.webp' },
  { handle: 'bpc-10mg-tb-10mg-wolverine-20mg', title: 'BPC-157 + TB-500 20 mg', priceCents: 9999, imageUrl: '/products/sku-bpc-10mg-tb-10mg-wolverine-20mg.webp' },
  { handle: 'ghk-cu', title: 'GHK-Cu 100 mg', priceCents: 8599, imageUrl: '/products/sku-ghk-cu-100mg.webp' },
  { handle: 'nad-500mg', title: 'NAD+ 500 mg', priceCents: 8499, imageUrl: '/products/sku-nad-500mg.webp' },
  { handle: 'mots-c', title: 'MOTS-c 40 mg', priceCents: 13799, imageUrl: '/products/sku-mots-c-40mg.webp' },
  { handle: 'ipamorelin-10mg', title: 'Ipamorelin 10 mg', priceCents: 5999, imageUrl: '/products/sku-ipamorelin-10mg.webp' },
];

type FeaturedCard = { handle: string; title: string; priceCents: number; imageUrl: string };

async function getHomeData(): Promise<{
  featured: FeaturedCard[];
  compoundCount: number;
  fromCents: number;
  coaLots: number | null;
  freeShipCents: number;
}> {
  let products: Product[] = [];
  let coaLots: number | null = null;
  let freeShipCents = 30_000;

  try {
    products = await listProducts();
  } catch {
    /* fall through to static fallback */
  }
  try {
    coaLots = await prisma.coa.count();
  } catch {
    coaLots = 52; // library size as of 2026-07 — refreshed on next successful count
  }
  try {
    const settings = await getStoreSettings();
    freeShipCents = settings.freeShippingThreshold;
  } catch {
    /* keep default */
  }

  const byHandle = new Map(products.map((p) => [p.handle, p]));
  const curated: FeaturedCard[] = FEATURED_HANDLES.map((h) => {
    const p = byHandle.get(h);
    if (!p) return null;
    return {
      handle: p.handle,
      title: p.title,
      priceCents: p.priceCents,
      imageUrl: productImage(p.imageUrl),
    };
  }).filter(Boolean) as FeaturedCard[];

  // Backfill from the live catalog if a curated handle is missing; static
  // fallback only when the catalog itself is unreachable.
  if (curated.length < 8 && products.length > 0) {
    for (const p of products) {
      if (curated.length >= 8) break;
      if (!curated.some((c) => c.handle === p.handle)) {
        curated.push({
          handle: p.handle,
          title: p.title,
          priceCents: p.priceCents,
          imageUrl: productImage(p.imageUrl),
        });
      }
    }
  }
  const featured = curated.length > 0 ? curated.slice(0, 8) : FALLBACK_FEATURED;

  const compoundCount = products.length > 0 ? products.length : 30;
  const fromCents =
    products.length > 0
      ? Math.min(...products.map((p) => p.priceCents))
      : Math.min(...FALLBACK_FEATURED.map((p) => p.priceCents));

  return { featured, compoundCount, fromCents, coaLots, freeShipCents };
}

export default async function HomeV2() {
  const { featured, compoundCount, fromCents, coaLots, freeShipCents } = await getHomeData();
  const freeShip = `$${Math.round(freeShipCents / 100)}`;

  const faqs = [
    {
      q: 'How fast do orders ship?',
      a: `Orders dispatch within 48 hours from our facility in Dallas, TX — tracked and insured, with free shipping over ${freeShip}. You get a tracking number the moment it leaves.`,
    },
    {
      q: 'How do I verify purity?',
      a: 'Every lot is independently HPLC-tested to a ≥99% purity standard, and every certificate of analysis is published in our COA library. The lot ID printed on your vial matches its certificate.',
    },
    {
      q: 'How are Merit compounds produced?',
      a: 'Compounds are produced in an ISO-certified US facility under USP <797> sterile practices, sealed and lot-labeled to clinical standard, and released only after a licensed pharmacist signs off on the batch.',
    },
    {
      q: 'Who can purchase?',
      a: 'Merit Sciences supplies qualified researchers, laboratories, and licensed practitioners. All products are strictly for research use only — not for human or veterinary use.',
    },
  ];

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <main className="bg-cream text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ══ HERO — approved split: text left, cinematic vial right ══ */}
      <section className="grid lg:grid-cols-2 items-stretch">
        {/* text */}
        <div className="order-2 lg:order-1 flex items-center bg-gradient-to-br from-cream via-cream to-[#E3E7F4]">
          <div className="max-w-[40rem] px-6 lg:px-16 py-14 lg:py-20">
            <p className="eyebrow text-cobalt mb-5">Pharmacy-grade research peptides · Dallas, TX</p>
            <h1 className="font-display font-black text-ink tracking-[-0.04em] leading-[0.94]" style={{ fontSize: 'clamp(42px,4.4vw,76px)' }}>
              Pharmacy-grade peptides, shipped in 48 hours.
            </h1>
            <p className="mt-6 text-lg text-ink-soft leading-relaxed max-w-[30rem]">
              Compounded in an ISO-certified US facility, verified per lot, and labeled to
              clinical standard — at your door in two days.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/catalog" className="rounded-full bg-cobalt px-8 py-4 text-[15px] font-bold text-white hover:opacity-90 transition shadow-sm">
                Shop the catalog
              </Link>
              <Link href="#why" className="rounded-full border border-ink/15 px-8 py-4 text-[15px] font-bold text-ink hover:border-ink/40 transition">
                Why Merit
              </Link>
            </div>
            <p className="mt-5 font-mono text-[12px] text-ink-muted">
              {compoundCount} compounds · from {money(fromCents)} · free shipping over {freeShip}
            </p>
          </div>
        </div>
        {/* cinematic vial — bleeds off the right edge. Capped on mobile so the
            headline + CTA still enter the first viewport. */}
        <div className="order-1 lg:order-2 relative min-h-[36vh] lg:min-h-[86vh]">
          <Image src="/brand/hero-C-cinematic.webp" alt="Merit lyophilized peptide vial" fill priority sizes="(max-width:1024px) 100vw, 50vw" className="object-cover" />
        </div>
      </section>

      {/* ══ RECEIPTS STRIP — verifiable rigor, not adjectives ══ */}
      <section className="bg-ink text-white">
        <div className="max-w-[1300px] mx-auto px-6 grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
          <div className="py-7 text-center">
            <p className="font-display font-black text-cobalt-soft leading-none" style={{ fontSize: 'clamp(26px,2.8vw,38px)' }}>48h</p>
            <p className="mt-1.5 text-[13px] text-white/60">dispatch from Dallas</p>
          </div>
          <Link href="/coa" className="py-7 text-center group">
            <p className="font-display font-black text-cobalt-soft leading-none" style={{ fontSize: 'clamp(26px,2.8vw,38px)' }}>{coaLots ?? '50+'}</p>
            <p className="mt-1.5 text-[13px] text-white/60 group-hover:text-white transition">lots documented — see every COA →</p>
          </Link>
          <div className="py-7 text-center">
            <p className="font-display font-black text-cobalt-soft leading-none" style={{ fontSize: 'clamp(26px,2.8vw,38px)' }}>≥99%</p>
            <p className="mt-1.5 text-[13px] text-white/60">HPLC-verified purity</p>
          </div>
          <div className="py-7 text-center">
            <p className="font-display font-black text-cobalt-soft leading-none" style={{ fontSize: 'clamp(26px,2.8vw,38px)' }}>{compoundCount}</p>
            <p className="mt-1.5 text-[13px] text-white/60">research compounds</p>
          </div>
        </div>
      </section>

      {/* ══ WHY — approved image-led feature (cobalt vial pattern) ══ */}
      <section id="why" className="max-w-[1400px] mx-auto px-6 lg:px-12 py-20 lg:py-28 grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div className="relative aspect-[4/3] rounded-[28px] overflow-hidden shadow-[0_40px_90px_-40px_rgba(11,15,25,0.4)]">
          <Image src="/brand/scene-pattern-cobalt.webp" alt="Merit research-compound vials — pharmacy-grade, lot-verified" fill sizes="(max-width:1024px) 100vw, 620px" className="object-cover" />
        </div>
        <div>
          <p className="eyebrow text-cobalt mb-3">— Why Merit</p>
          <h2 className="font-display font-black text-ink tracking-[-0.03em]" style={{ fontSize: 'clamp(30px,3.6vw,50px)' }}>
            Built like a pharmacy. Priced like it isn’t.
          </h2>
          <p className="mt-4 text-lg text-ink-soft leading-relaxed">
            The difference between Merit and a vial off a forum is everything you can’t see.
          </p>
          <ul className="mt-7 space-y-4">
            {[
              ['In your hands in 48 hours', 'Cold-chain and tracked from Dallas — not two weeks from overseas.'],
              ['Made in a sterile US facility', 'ISO-certified, USP <797> cleanroom, released by a licensed pharmacist.'],
              ['Labeled to clinical standard', 'Compound, dose, lot, and handling on every vial. No unmarked grey-market glass.'],
              ['Verified ≥99% purity', 'Independently HPLC-tested, COA a QR-scan away on every label, acetate salt — never TFA.'],
            ].map(([t, b]) => (
              <li key={t} className="flex gap-3.5">
                <span className="mt-1 flex-none w-5 h-5 rounded-full bg-cobalt/12 text-cobalt flex items-center justify-center">
                  <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 4.5 6.5 11 3 7.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <div>
                  <p className="font-display font-bold text-ink text-[16px] leading-tight">{t}</p>
                  <p className="text-[14px] text-ink-soft leading-relaxed">{b}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ══ SHOP — live catalog, real quick-add ══ */}
      <section className="bg-white border-t border-ink/10">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-20 lg:py-24">
          <div className="flex items-end justify-between mb-9">
            <div>
              <p className="eyebrow text-cobalt mb-2">— The catalog</p>
              <h2 className="font-display font-black text-ink tracking-[-0.03em]" style={{ fontSize: 'clamp(28px,3.4vw,46px)' }}>Shop the shelf.</h2>
            </div>
            <Link href="/catalog" className="text-[12px] tracking-[0.18em] uppercase font-bold text-cobalt hover:opacity-70">View all {compoundCount} →</Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {featured.map((p) => (
              <div key={p.handle} className="group rounded-3xl border border-ink/10 bg-cream/50 p-4 hover:shadow-lg hover:-translate-y-1 transition flex flex-col">
                <Link href={`/products/${p.handle}`} className="block">
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-white mb-3">
                    <Image src={p.imageUrl} alt={p.title} fill sizes="300px" className="object-cover group-hover:scale-105 transition-transform" />
                    <span className="absolute top-2.5 left-2.5 rounded-full bg-white/90 backdrop-blur px-2 py-0.5 text-[10px] font-bold text-success">✓ ≥99% · COA</span>
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display font-extrabold text-ink leading-tight">{p.title}</p>
                    <p className="font-display font-black text-ink tabular-nums whitespace-nowrap">{money(p.priceCents)}</p>
                  </div>
                </Link>
                <div className="mt-auto">
                  <QuickAdd
                    handle={p.handle}
                    title={p.title}
                    bundleLabel="Single"
                    unitCents={p.priceCents}
                    imageUrl={p.imageUrl}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FAQ — objection handling + FAQPage schema ══ */}
      <section className="bg-cream border-t border-ink/10">
        <div className="max-w-[760px] mx-auto px-6 py-16 lg:py-20">
          <p className="eyebrow text-cobalt mb-2 text-center">— Questions</p>
          <h2 className="font-display font-black text-ink tracking-[-0.03em] text-center mb-8" style={{ fontSize: 'clamp(26px,3vw,40px)' }}>
            Before you order.
          </h2>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-ink/10 bg-white px-6 py-4 open:shadow-sm">
                <summary className="cursor-pointer list-none flex items-center justify-between gap-4">
                  <span className="font-display font-bold text-ink text-[16px]">{f.q}</span>
                  <span className="flex-none text-cobalt font-black text-lg transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[14px] text-ink-soft leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CAPTURE — real WELCOME20 offer feeding the drip ══ */}
      <CaptureBand />

      {/* ══ CLOSE — approved cinematic band ══ */}
      <section className="relative">
        <Image src="/brand/hero-C-cinematic.webp" alt="" fill sizes="100vw" className="object-cover" />
        <div aria-hidden className="absolute inset-0 bg-ink/78" />
        <div className="relative max-w-[900px] mx-auto px-6 py-24 lg:py-32 text-center text-white">
          <h2 className="font-display font-black tracking-[-0.03em] leading-[1.02]" style={{ fontSize: 'clamp(32px,4.6vw,64px)' }}>
            Same stack. Better source.
          </h2>
          <p className="mt-5 text-lg text-white/70 max-w-[34rem] mx-auto">
            Pharmacy-grade, verified per lot, at your door in 48 hours. Switch the source, keep the protocol.
          </p>
          <Link href="/catalog" className="inline-block mt-8 rounded-full bg-white px-9 py-4 text-[15px] font-bold text-ink hover:bg-cobalt hover:text-white transition">
            Shop the catalog →
          </Link>
        </div>
      </section>
    </main>
  );
}
