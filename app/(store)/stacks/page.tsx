import Link from 'next/link';
import Image from 'next/image';
import { listProducts } from '@/lib/catalog';
import { STACK_TEMPLATES } from '@/lib/catalog-meta';
import { money, productImage } from '@/lib/product-types';
import { JsonLd } from '@/components/JsonLd';

/**
 * /stacks index — the page was advertised in sitemap.ts, IndexNow, and
 * llms.txt but never existed (404). Lists every stack template with live
 * bundle pricing when the DB is reachable, degrading to the static template
 * copy when it isn't.
 */

// Force-dynamic — see app/page.tsx for rationale (Supabase pool cap).
export const dynamic = 'force-dynamic';

export const metadata = {
  // Root template appends "· Merit Sciences".
  title: 'Research Stacks',
  description:
    'Pre-built research compound stacks — the pairings most requested by the research community, bundled at a discount. Every component HPLC-tested ≥99% with a per-lot COA. Ships 48hr from Dallas.',
  alternates: { canonical: 'https://meritsciences.com/stacks' },
};

const ACCENT: Record<string, { fg: string; bg: string; border: string }> = {
  cobalt:  { fg: '#2E4DDB', bg: 'rgba(46,77,219,0.10)',  border: 'rgba(46,77,219,0.30)' },
  amber:   { fg: '#B58F4A', bg: 'rgba(181,143,74,0.12)', border: 'rgba(181,143,74,0.30)' },
  violet:  { fg: '#6B5BC0', bg: 'rgba(107,91,192,0.12)', border: 'rgba(107,91,192,0.30)' },
  emerald: { fg: '#4A8B6E', bg: 'rgba(74,139,110,0.12)', border: 'rgba(74,139,110,0.30)' },
};

export default async function StacksIndexPage() {
  // Resilient: listProducts returns [] on a DB blip — cards then render
  // without pricing rather than failing the page.
  let products: Awaited<ReturnType<typeof listProducts>> = [];
  try {
    products = await listProducts({ status: 'active' });
  } catch {
    products = [];
  }

  const stacks = STACK_TEMPLATES.map((s) => {
    const items = s.handles
      .map((h) => products.find((p) => p.handle === h))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
    const complete = items.length === s.handles.length && items.length > 0;
    const sumCents = complete ? items.reduce((a, p) => a + p.priceCents, 0) : 0;
    const discountedCents = complete ? Math.round(sumCents * (1 - s.bundleDiscountPct / 100)) : 0;
    return { ...s, items, complete, sumCents, discountedCents };
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://meritsciences.com/' },
          { '@type': 'ListItem', position: 2, name: 'Research Stacks', item: 'https://meritsciences.com/stacks' },
        ],
      },
      {
        '@type': 'ItemList',
        name: 'Merit Sciences research stacks',
        itemListElement: STACK_TEMPLATES.map((s, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: s.name,
          url: `https://meritsciences.com/stacks/${s.slug}`,
        })),
      },
    ],
  };

  return (
    <main className="bg-cream min-h-screen">
      <JsonLd data={jsonLd} />

      {/* Hero */}
      <section className="bg-white border-b border-cobalt/10">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-8 pt-14 pb-10">
          <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
            — Bundled research pairings
          </p>
          <h1
            className="font-display font-black text-ink tracking-[-0.035em] leading-[0.98] mb-4"
            style={{ fontSize: 'clamp(30px, 5vw, 52px)' }}
          >
            Research stacks<span className="text-cobalt">.</span>
          </h1>
          <p className="text-base text-ink-soft leading-relaxed max-w-2xl">
            The pairings researchers actually order together, bundled at a discount. Every component
            ships as a sealed sterile lyophilized vial — HPLC-tested ≥99%, per-lot COA behind the QR
            on every label.
          </p>
        </div>
      </section>

      {/* Stack cards */}
      <section className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {stacks.map((s) => {
            const accent = ACCENT[s.accentColor] ?? ACCENT.cobalt;
            return (
              <Link
                key={s.slug}
                href={`/stacks/${s.slug}`}
                className="group rounded-2xl border border-cobalt/12 bg-white p-6 transition hover:border-cobalt/35 hover:shadow-[0_18px_40px_-20px_rgba(8,21,46,0.25)]"
              >
                {/* Component thumbnails on an accent tile */}
                <div
                  className="mb-5 flex items-center justify-center gap-3 rounded-xl border px-4 py-6"
                  style={{ background: accent.bg, borderColor: accent.border }}
                >
                  {s.complete ? (
                    s.items.map((p) => (
                      <div key={p.handle} className="relative h-20 w-14 sm:h-24 sm:w-16">
                        <Image
                          src={productImage(p.imageUrl)}
                          alt={`${p.title} research vial`}
                          fill
                          sizes="64px"
                          className="object-contain drop-shadow-[0_10px_14px_rgba(8,21,46,0.18)]"
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: accent.fg }}>
                      {s.handles.length} components
                    </p>
                  )}
                </div>

                <p className="text-[10px] font-bold uppercase tracking-[0.18em] mb-1.5" style={{ color: accent.fg }}>
                  {s.subtitle}
                </p>
                <h2 className="font-display text-xl font-extrabold text-ink leading-tight mb-2">
                  {s.name}
                </h2>
                <p className="text-[13.5px] leading-relaxed text-ink-soft mb-4">{s.description}</p>

                <div className="flex items-center justify-between border-t border-cobalt/8 pt-3.5">
                  <span className="text-[12px] text-ink-muted">
                    {s.handles.length} compounds
                    {s.complete && (
                      <>
                        {' · '}
                        <s className="text-ink-muted/70">{money(s.sumCents)}</s>{' '}
                        <strong className="text-ink font-bold">{money(s.discountedCents)}</strong>
                      </>
                    )}
                  </span>
                  <span
                    className="rounded-lg px-2.5 py-1 text-[11px] font-bold"
                    style={{ background: accent.bg, color: accent.fg }}
                  >
                    Save {s.bundleDiscountPct}%
                  </span>
                </div>
              </Link>
            );
          })}
        </div>

        <p className="mt-8 text-[13px] text-ink-soft">
          Prefer to build your own? Select any compounds in the{' '}
          <Link href="/catalog" className="text-cobalt font-bold underline-offset-2 hover:underline">
            catalog
          </Link>{' '}
          and add them together. For research use only — not for human or veterinary use.
        </p>
      </section>
    </main>
  );
}
