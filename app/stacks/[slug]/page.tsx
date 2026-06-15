import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { listProducts } from '@/lib/catalog';
import {
  STACK_TEMPLATES,
  getStack,
  familyLabel,
  getFamily,
} from '@/lib/catalog-meta';
import { money } from '@/lib/product-types';
import { StackAddButton } from './StackAddButton';

type Props = { params: { slug: string } };

// Force-dynamic — see app/page.tsx for rationale (Supabase pool cap).
export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return STACK_TEMPLATES.map((s) => ({ slug: s.slug }));
}

export function generateMetadata({ params }: Props) {
  const stack = getStack(params.slug);
  if (!stack) return { title: 'Stack' };
  return {
    title: `${stack.name} · Merit Sciences`,
    description: stack.description,
  };
}

export default async function StackPage({ params }: Props) {
  const stack = getStack(params.slug);
  if (!stack) return notFound();

  // Resolve the stack — same logic as catalog/page.tsx server data prep.
  const allProducts = await listProducts({ status: 'active' });
  const items = stack.handles
    .map((h) => allProducts.find((p) => p.handle === h))
    .filter(Boolean);
  if (items.length !== stack.handles.length) return notFound();
  const sumCents = items.reduce((a, p) => a + p!.priceCents, 0);
  const discountedCents = Math.round(sumCents * (1 - stack.bundleDiscountPct / 100));
  const resolved = {
    ...stack,
    items: items as NonNullable<(typeof items)[number]>[],
    sumCents,
    discountedCents,
    savedCents: sumCents - discountedCents,
  };

  // Accent color → CSS values
  const ACCENT = {
    cobalt:  { fg: '#2E4DDB', bg: 'rgba(46,77,219,0.10)',  border: 'rgba(46,77,219,0.30)' },
    amber:   { fg: '#B58F4A', bg: 'rgba(181,143,74,0.12)', border: 'rgba(181,143,74,0.30)' },
    violet:  { fg: '#6B5BC0', bg: 'rgba(107,91,192,0.12)', border: 'rgba(107,91,192,0.30)' },
    emerald: { fg: '#4A8B6E', bg: 'rgba(74,139,110,0.12)', border: 'rgba(74,139,110,0.30)' },
  }[stack.accentColor];

  return (
    <main className="bg-cream min-h-screen pb-24 lg:pb-0">
      {/* Breadcrumbs */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 pt-4 pb-2 text-xs text-ink-muted overflow-x-auto whitespace-nowrap">
        <Link href="/" className="hover:text-ink transition">Home</Link>
        {' · '}
        <Link href="/catalog" className="hover:text-ink transition">Catalog</Link>
        {' · '}
        <span className="text-ink">{stack.name}</span>
      </div>

      {/* ═══════════════ HERO ═══════════════ */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-12 py-8 lg:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-14">
          {/* LEFT — component grid */}
          <div className="relative">
            {/* Stack tile — components arranged on a cream tile with cobalt halo */}
            <div
              className="relative w-full aspect-[4/3] sm:aspect-square max-h-[60vh] sm:max-h-none rounded-2xl border border-cobalt/10 overflow-hidden"
              style={{ background: ACCENT.bg }}
            >
              {/* Halo */}
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(ellipse 55% 60% at center, rgba(80,120,255,0.20) 0%, rgba(46,77,219,0.08) 40%, transparent 75%)',
                }}
              />

              {/* Component vials laid out in a grid — 2 col for 2-item, 3 col for 3-item, 4 col for 4-item */}
              <div
                className="absolute inset-0 grid items-center justify-items-center"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(resolved.items.length, 4)}, 1fr)`,
                  padding: '8% 6%',
                  gap: '4%',
                }}
              >
                {resolved.items.map((p) => (
                  <div key={p.handle} className="relative w-full h-full">
                    {p.imageUrl && (
                      <Image
                        src={p.imageUrl}
                        alt={p.title}
                        fill
                        sizes="(max-width: 1024px) 50vw, 25vw"
                        className="object-contain"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Bundle savings stamp — top-right */}
              <div
                className="absolute top-4 right-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold tracking-[0.12em] uppercase text-white"
                style={{ background: ACCENT.fg }}
              >
                Save {stack.bundleDiscountPct}%
              </div>
            </div>
          </div>

          {/* RIGHT — stack info + Add */}
          <div className="flex flex-col gap-5">
            <div>
              <span
                className="inline-flex items-center self-start text-[10px] font-bold tracking-[0.22em] uppercase mb-3 px-2.5 py-1 rounded border"
                style={{ color: ACCENT.fg, background: ACCENT.bg, borderColor: ACCENT.border }}
              >
                Stack · {resolved.items.length} compounds
              </span>
              <h1
                className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95]"
                style={{ fontSize: 'clamp(28px, 5vw, 56px)' }}
              >
                {stack.name}<span className="text-cobalt">.</span>
              </h1>
              <p className="mt-2 text-sm text-ink-soft uppercase tracking-[0.12em]">
                {stack.subtitle}
              </p>
            </div>

            <p className="text-base text-ink-soft leading-relaxed">
              {stack.description}
            </p>

            {/* Price block */}
            <div className="pt-3 border-t border-cobalt/10">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="font-display text-3xl lg:text-4xl font-black text-ink">
                  {money(resolved.discountedCents)}
                </span>
                <span className="text-lg text-ink-muted line-through font-semibold">
                  {money(resolved.sumCents)}
                </span>
                <span
                  className="text-[11px] font-bold tracking-[0.12em] uppercase px-2 py-0.5 rounded text-white"
                  style={{ background: ACCENT.fg }}
                >
                  Save {money(resolved.savedCents)}
                </span>
              </div>
              <p className="text-[12px] text-ink-soft mt-1">
                One shipment · {resolved.items.length} vials
              </p>
            </div>

            {/* Add stack — primary CTA */}
            <StackAddButton stack={resolved} />

            {/* Risk reducers */}
            <ul className="space-y-2 mt-1">
              <li className="flex items-center gap-2 text-[12px] text-ink-soft">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="text-cobalt flex-shrink-0">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Stack discount honored at reorder — forever
              </li>
              <li className="flex items-center gap-2 text-[12px] text-ink-soft">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="text-cobalt flex-shrink-0">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Each vial pharmacy-verified, individually lot-documented
              </li>
              <li className="flex items-center gap-2 text-[12px] text-ink-soft">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="text-cobalt flex-shrink-0">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                48-hour dispatch from Dallas
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* ═══════════════ TRUST STRIP ═══════════════ */}
      <section className="bg-ink text-white border-y border-cobalt/30 overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12 py-4 flex flex-wrap items-center justify-between gap-3 text-[12px] lg:text-[13px]">
          <div className="flex flex-wrap gap-6 lg:gap-8 font-black tracking-[0.18em] uppercase text-[10px] lg:text-[11px]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cobalt" />
              Pharmacy-Verified
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cobalt" />
              ≥99% Purity Per Vial
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cobalt" />
              503B · ISO-Certified
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cobalt" />
              48hr Dispatch
            </span>
          </div>
        </div>
      </section>

      {/* ═══════════════ WHAT'S INCLUDED ═══════════════ */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-12 pt-12 lg:pt-16 pb-6 lg:pb-8">
        <div className="max-w-2xl mb-8 lg:mb-10">
          <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
            — What&apos;s included
          </p>
          <h2
            className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95]"
            style={{ fontSize: 'clamp(28px, 4vw, 52px)' }}
          >
            The {resolved.items.length} compounds<span className="text-cobalt">.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
          {resolved.items.map((p) => {
            const family = getFamily(p.handle);
            return (
              <Link
                key={p.handle}
                href={`/products/${p.handle}`}
                className="group flex gap-4 lg:gap-5 p-5 lg:p-6 bg-white border border-cobalt/10 rounded-2xl hover:border-cobalt/30 transition"
              >
                {/* Thumb */}
                <div className="relative w-24 h-24 lg:w-28 lg:h-28 rounded-xl bg-gradient-to-br from-cream to-white border border-cobalt/10 flex-shrink-0 overflow-hidden">
                  {p.imageUrl && (
                    <Image
                      src={p.imageUrl}
                      alt={p.title}
                      fill
                      sizes="120px"
                      className="object-contain p-3 group-hover:scale-[1.04] transition-transform duration-500"
                    />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col">
                  {family && (
                    <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-1.5">
                      {familyLabel(family)}
                    </p>
                  )}
                  <h3 className="font-display text-lg lg:text-xl font-extrabold text-ink tracking-tight mb-1 group-hover:text-cobalt transition">
                    {p.title}
                  </h3>
                  <p className="text-[12px] text-ink-soft mb-2">
                    {p.vialSize} · {p.format}
                  </p>
                  {p.lot.id !== 'TBD' && (
                    <p className="text-[11px] text-ink-soft mt-auto">
                      <span className="text-cobalt font-bold">Lot {p.lot.id}</span>
                      {p.lot.purity && <> · {p.lot.purity}</>}
                    </p>
                  )}
                </div>

                {/* Per-item price */}
                <div className="hidden sm:flex flex-col items-end justify-between flex-shrink-0">
                  <p className="font-display text-base lg:text-lg font-bold text-ink">
                    {money(p.priceCents)}
                  </p>
                  <span className="text-[10px] tracking-[0.18em] uppercase text-cobalt font-bold">
                    Details →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ═══════════════ PRICING BREAKDOWN ═══════════════ */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-12 py-12 lg:py-16">
        <div className="max-w-3xl mx-auto bg-white border border-cobalt/10 rounded-2xl p-6 lg:p-8">
          <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-4">
            — Pricing
          </p>
          <h2 className="font-display text-2xl lg:text-3xl font-extrabold text-ink tracking-tight mb-6">
            The math, plainly<span className="text-cobalt">.</span>
          </h2>

          <ul className="space-y-2.5 mb-5 pb-5 border-b border-cobalt/10">
            {resolved.items.map((p) => (
              <li key={p.handle} className="flex justify-between text-sm">
                <span className="text-ink-soft">{p.title}</span>
                <span className="font-semibold text-ink tabular-nums">{money(p.priceCents)}</span>
              </li>
            ))}
          </ul>

          <div className="space-y-2 mb-5">
            <div className="flex justify-between text-sm">
              <span className="text-ink-soft">Subtotal</span>
              <span className="font-semibold text-ink tabular-nums">{money(resolved.sumCents)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-soft">Stack discount ({stack.bundleDiscountPct}%)</span>
              <span className="font-bold text-cobalt tabular-nums">− {money(resolved.savedCents)}</span>
            </div>
          </div>

          <div className="flex justify-between items-baseline pt-4 border-t border-cobalt/10">
            <span className="font-display text-lg font-bold text-ink">Stack total</span>
            <span className="font-display text-2xl lg:text-3xl font-black text-ink tabular-nums">
              {money(resolved.discountedCents)}
            </span>
          </div>
        </div>
      </section>

      {/* ═══════════════ BACK TO CATALOG ═══════════════ */}
      <section className="max-w-[1400px] mx-auto px-6 lg:px-12 pb-16 text-center">
        <Link
          href="/catalog"
          className="inline-flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold hover:text-ink transition"
        >
          ← Back to all compounds
        </Link>
      </section>
    </main>
  );
}
