import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listProducts } from '@/lib/catalog';
import { money, productImage, productDisplayName, type Product } from '@/lib/product-types';
import { COLLECTIONS, COLLECTION_SLUGS, getCollection, type Collection } from '@/lib/collections';
import { getMonograph } from '@/lib/monographs';
import { JsonLd } from '@/components/JsonLd';

/**
 * Category landing pages. See lib/collections.ts for why these exist and why
 * they live under /catalog rather than /collections.
 *
 * RENDERING. Statically generated with a 5 minute revalidate. No cookies(),
 * no searchParams, so nothing forces this onto the dynamic path: these are
 * public retail pages and deliberately do not resolve practitioner pricing.
 * That keeps them cacheable and keeps the crawler's view identical to a
 * logged-out visitor's.
 *
 * NO AD MAY POINT HERE. The copy uses category terms ("GLP-1", "NAD+") that
 * are on-site safe but not ad-safe, which is why these pages do not read the
 * ?ads=1 parameter. Paid traffic goes to /catalog?ads=1 or the shop lander.
 */

const SITE = 'https://meritsciences.com';

export const revalidate = 300;

export function generateStaticParams() {
  return COLLECTION_SLUGS.map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const c = getCollection(params.slug);
  if (!c) return { title: 'Page not found', robots: { index: false } };
  return {
    // The root layout appends " · Merit Sciences". Do not repeat it here.
    title: c.title,
    description: c.description,
    alternates: { canonical: `${SITE}/catalog/${c.slug}` },
    openGraph: {
      type: 'website',
      title: c.title,
      description: c.description,
      url: `${SITE}/catalog/${c.slug}`,
    },
  };
}

/** Milligrams parsed from the vial size, for the per-mg line. */
function perMg(p: Product): string | null {
  const m = /([\d.]+)\s*mg/i.exec(p.vialSize);
  if (!m) return null;
  const mg = parseFloat(m[1]);
  if (!isFinite(mg) || mg <= 0) return null;
  return `$${(p.priceCents / 100 / mg).toFixed(2)}/mg`;
}

export default async function CollectionPage({ params }: { params: { slug: string } }) {
  const c = getCollection(params.slug);
  if (!c) return notFound();

  const all = await listProducts({ status: 'active' });
  const byHandle = new Map(all.map((p) => [p.handle, p]));
  // Keep the authored order, drop anything that has since been retired.
  const products = c.handles.map((h) => byHandle.get(h)).filter(Boolean) as Product[];

  const monographs = c.monographs
    .map((slug) => getMonograph(slug))
    .filter(Boolean) as NonNullable<ReturnType<typeof getMonograph>>[];

  const others = COLLECTIONS.filter((o) => o.slug !== c.slug);
  const fromCents = products.length ? Math.min(...products.map((p) => p.priceCents)) : null;

  /* Schema. CollectionPage carries the product list; FAQPage carries the
     visible questions; BreadcrumbList places the page under /catalog. All
     three anchor to the site Organization and WebSite nodes declared in the
     store layout, so the entity graph stays connected. */
  const graph: object[] = [
    {
      '@type': 'CollectionPage',
      '@id': `${SITE}/catalog/${c.slug}#page`,
      url: `${SITE}/catalog/${c.slug}`,
      name: c.name,
      description: c.description,
      isPartOf: { '@id': `${SITE}/#website` },
      publisher: { '@id': `${SITE}/#organization` },
      ...(monographs.length
        ? {
            about: monographs.map((m) => ({
              '@type': 'ChemicalSubstance',
              '@id': `${SITE}/library/${m.slug}#substance`,
              name: m.title,
              ...(m.aka.length ? { alternateName: m.aka } : {}),
              url: `${SITE}/library/${m.slug}`,
            })),
          }
        : {}),
      ...(products.length
        ? {
            mainEntity: {
              '@type': 'ItemList',
              numberOfItems: products.length,
              itemListElement: products.map((p, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                item: {
                  '@type': 'Product',
                  '@id': `${SITE}/products/${p.handle}#product`,
                  // productDisplayName already appends the vial size.
                  name: productDisplayName(p),
                  url: `${SITE}/products/${p.handle}`,
                  brand: { '@id': `${SITE}/#organization` },
                  offers: {
                    '@type': 'Offer',
                    price: (p.priceCents / 100).toFixed(2),
                    priceCurrency: 'USD',
                    availability: 'https://schema.org/InStock',
                    url: `${SITE}/products/${p.handle}`,
                  },
                },
              })),
            },
          }
        : {}),
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${SITE}/catalog/${c.slug}#breadcrumbs`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
        { '@type': 'ListItem', position: 2, name: 'Catalog', item: `${SITE}/catalog` },
        { '@type': 'ListItem', position: 3, name: c.name, item: `${SITE}/catalog/${c.slug}` },
      ],
    },
  ];
  if (c.faqs.length) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${SITE}/catalog/${c.slug}#faq`,
      mainEntity: c.faqs.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
  }

  return (
    <main className="bg-cream min-h-screen">
      <JsonLd data={{ '@context': 'https://schema.org', '@graph': graph }} />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-cobalt/10">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-8 pt-12 pb-10">
          <nav aria-label="Breadcrumb" className="mb-5 text-[12px] text-ink-muted">
            <Link href="/catalog" className="hover:text-cobalt">Catalog</Link>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="text-ink-soft">{c.name}</span>
          </nav>
          <h1
            className="font-display font-black text-ink tracking-[-0.035em] leading-[0.98] mb-4"
            style={{ fontSize: 'clamp(30px, 5vw, 52px)' }}
          >
            {c.name}<span className="text-cobalt">.</span>
          </h1>
          <p className="text-base sm:text-lg text-ink-soft leading-relaxed max-w-2xl">{c.lede}</p>
          {fromCents !== null && (
            <p className="mt-5 font-mono text-[12px] tracking-[0.08em] uppercase text-ink-muted">
              {products.length} {products.length === 1 ? 'compound' : 'compounds'} · from {money(fromCents)} per vial · ships in 48 hours
            </p>
          )}
        </div>
      </section>

      {/* ── Intro copy ───────────────────────────────────────────────── */}
      <section className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-8 pt-10">
        <div className="max-w-[68ch] space-y-4">
          {c.intro.map((para) => (
            <p key={para.slice(0, 40)} className="text-[15.5px] leading-[1.7] text-ink-soft">
              {para}
            </p>
          ))}
        </div>
      </section>

      {/* ── Products ─────────────────────────────────────────────────── */}
      <section className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-8 py-10">
        {products.length === 0 ? (
          <p className="text-[15px] text-ink-soft">
            Nothing in this category is in stock right now.{' '}
            <Link href="/catalog" className="text-cobalt font-semibold hover:underline">
              Browse the full catalog
            </Link>
            .
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => {
              const mg = perMg(p);
              return (
                <li key={p.handle}>
                  <Link
                    href={`/products/${p.handle}`}
                    className="group block h-full bg-white border border-cobalt/12 rounded-xl overflow-hidden hover:border-cobalt/40 transition-colors"
                  >
                    <div className="relative aspect-[4/3] bg-cream">
                      <Image
                        src={productImage(p.imageUrl)}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                        className="object-contain p-4"
                      />
                    </div>
                    <div className="p-5">
                      <h2 className="font-display font-extrabold text-ink text-[17px] tracking-[-0.02em] leading-tight group-hover:text-cobalt transition-colors">
                        {p.title}
                      </h2>
                      <p className="mt-1 font-mono text-[11.5px] tracking-[0.06em] uppercase text-ink-muted">
                        {p.vialSize}
                      </p>
                      <p className="mt-3 flex items-baseline gap-2">
                        <span className="font-display font-black text-ink text-[20px] tracking-[-0.02em]">
                          {money(p.priceCents)}
                        </span>
                        {mg && <span className="font-mono text-[11px] text-ink-muted">{mg}</span>}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Verification strip ───────────────────────────────────────── */}
      <section className="bg-white border-y border-cobalt/10">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-8 py-10 grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-8 items-center">
          <div>
            <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
              — Before you buy anything
            </p>
            <h2 className="font-display font-black text-ink tracking-[-0.03em] leading-[1.05] text-[24px] sm:text-[30px] mb-3">
              Read the lab report first.
            </h2>
            <p className="text-[15px] leading-[1.7] text-ink-soft max-w-[62ch]">
              Every batch in this category is tested by a laboratory that does not make the material
              and does not sell it. Identity against a reference standard, purity by HPLC. The report
              is published before the batch is listed, and the library is open with no account and no
              request form.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link
              href="/coa"
              className="inline-flex items-center gap-2 bg-ink text-white px-6 py-3.5 rounded-lg text-[14px] font-bold hover:bg-cobalt transition-colors"
            >
              Open the certificate library
            </Link>
            <Link
              href="/catalog"
              className="inline-flex items-center gap-2 border border-ink/20 text-ink px-6 py-3.5 rounded-lg text-[14px] font-bold hover:border-cobalt hover:text-cobalt transition-colors"
            >
              Full catalog
            </Link>
          </div>
        </div>
      </section>

      {/* ── Monographs: the reference layer for these compounds ──────── */}
      {monographs.length > 0 && (
        <section className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-8 py-12">
          <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
            — The research behind them
          </p>
          <h2 className="font-display font-black text-ink tracking-[-0.03em] leading-[1.05] text-[24px] sm:text-[30px] mb-6">
            Compound monographs
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {monographs.map((m) => (
              <li key={m.slug}>
                <Link
                  href={`/library/${m.slug}`}
                  className="group block bg-white border border-cobalt/12 rounded-lg p-5 hover:border-cobalt/40 transition-colors"
                >
                  <h3 className="font-display font-extrabold text-ink text-[16px] tracking-[-0.02em] group-hover:text-cobalt transition-colors">
                    {m.title}
                  </h3>
                  <p className="mt-1.5 text-[13.5px] leading-[1.6] text-ink-soft">{m.tagline}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      {c.faqs.length > 0 && (
        <section className="bg-white border-y border-cobalt/10">
          <div className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-8 py-12">
            <h2 className="font-display font-black text-ink tracking-[-0.03em] leading-[1.05] text-[24px] sm:text-[30px] mb-6">
              Common questions
            </h2>
            <div className="border-t border-ink/12 max-w-[72ch]">
              {c.faqs.map((f) => (
                <details key={f.q} className="group border-b border-ink/12">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-4 text-[16px] font-bold text-ink [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span
                      aria-hidden="true"
                      className="mt-0.5 shrink-0 font-mono text-[18px] leading-none text-ink-muted transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="pb-5 pr-8 text-[14.5px] leading-[1.7] text-ink-soft">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Other categories + editorial handoff ─────────────────────── */}
      <section className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-8 py-12">
        <h2 className="font-display font-black text-ink tracking-[-0.03em] leading-[1.05] text-[22px] sm:text-[26px] mb-5">
          Other categories
        </h2>
        <ul className="flex flex-wrap gap-2.5">
          {others.map((o) => (
            <li key={o.slug}>
              <Link
                href={`/catalog/${o.slug}`}
                className="inline-block bg-white border border-cobalt/15 rounded-full px-4 py-2 text-[13.5px] text-ink-soft hover:border-cobalt hover:text-cobalt transition-colors"
              >
                {o.name}
              </Link>
            </li>
          ))}
        </ul>
        {c.assayTopic && (
          <p className="mt-8 text-[14px] leading-[1.7] text-ink-soft max-w-[68ch]">
            For the published research on this class, read{' '}
            <a
              href={`https://theassay.co/topics/${c.assayTopic}`}
              className="text-cobalt font-semibold hover:underline"
            >
              The Assay
            </a>
            , our editorial property. It carries no products and no prices.
          </p>
        )}
        <p className="mt-6 font-mono text-[11px] leading-[1.8] text-ink-muted">
          For research use only · Not for human or veterinary use · Not FDA-approved
        </p>
      </section>
    </main>
  );
}
