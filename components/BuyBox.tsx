'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Product } from '@/lib/product-types';
import { money, productImage } from '@/lib/product-types';
import { useCart } from '@/lib/cart';
import Link from 'next/link';

export function BuyBox({ product }: { product: Product }) {
  const bundles = product.bundles ?? [
    { label: 'Single', vials: 1, priceCents: product.priceCents },
  ];
  // Default selected: middle bundle if there are 3+ choices, else first
  const defaultIdx = bundles.length >= 3 ? 2 : 0;
  const [selectedIdx, setSelectedIdx] = useState(defaultIdx);
  const [addKit, setAddKit] = useState(true);
  const add = useCart((s) => s.add);

  const selected = bundles[selectedIdx];
  const kitCents = 1499;
  const totalCents = selected.priceCents + (addKit ? kitCents : 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1.1fr_0.85fr] gap-14 items-start max-w-container mx-auto px-8 py-4 pb-10">
      {/* Gallery */}
      <div>
        <div className="aspect-square rounded-xl border border-border-soft bg-gradient-to-br from-white to-cream relative overflow-hidden">
          <Image
            src={productImage(product.imageUrl)}
            alt={product.title}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-contain p-8"
          />
          {product.shopifySuspended && (
            <span className="absolute top-3 right-3 bg-cobalt text-white text-[10px] font-bold tracking-[0.12em] uppercase px-3 py-1.5 rounded z-10">
              Render-only listing
            </span>
          )}
        </div>
        <div className="grid grid-cols-5 gap-2 mt-2.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`aspect-square rounded-md ${
                i === 1 ? 'border-2 border-ink' : 'border border-border-soft'
              } bg-gradient-to-br from-white to-cream`}
            />
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-col gap-4">
        <p className="eyebrow text-cobalt">{product.eyebrow}</p>
        <h1 className="font-display text-5xl font-extrabold tracking-tighter leading-none">
          {product.title}
        </h1>
        <p className="text-base text-ink-soft -mt-2">
          {product.vialSize} · {product.format === 'lyophilized' ? 'Lyophilized vial' : 'Reconstituted vial'}
          {product.spec.aminoAcids ? ` · ${product.spec.aminoAcids} amino acids` : ''}
        </p>

        {/* Trust line */}
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-cream border-l-[3px] border-cobalt rounded-r-md text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="text-cobalt flex-shrink-0">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>
            <strong className="font-semibold">Pharmacy-verified per lot</strong> · 503B facility, ISO-certified · COA per lot
          </span>
        </div>

        {/* Price */}
        <div>
          <div className="flex items-baseline gap-3.5 flex-wrap">
            <span className="font-display text-3xl font-bold tracking-tight">
              {money(product.priceCents)}
            </span>
            {product.compareAtCents && (
              <>
                <span className="text-lg text-ink-muted line-through font-medium">
                  {money(product.compareAtCents)}
                </span>
                <span className="bg-success/10 text-success text-xs font-semibold px-2 py-1 rounded">
                  Save{' '}
                  {Math.round(
                    ((product.compareAtCents - product.priceCents) / product.compareAtCents) *
                      100,
                  )}
                  %
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-ink-muted mt-1">Free shipping over $100</p>
        </div>

        {/* Bundle picker */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="eyebrow text-ink-soft text-[11px]">Pack size</span>
            <span className="text-xs text-ink-muted">Subscribe & save 10%</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {bundles.map((b, i) => {
              const perVial = b.priceCents / b.vials;
              const isBest = i === 2;
              const isSubscribe = b.label.toLowerCase().includes('subscribe');
              return (
                <button
                  key={b.label}
                  onClick={() => setSelectedIdx(i)}
                  className={`relative text-left rounded-lg p-3 transition ${
                    selectedIdx === i
                      ? 'border-2 border-ink bg-[#FBFBFB]'
                      : 'border-[1.5px] border-border hover:border-ink-muted'
                  }`}
                >
                  {isBest && (
                    <span className="absolute -top-2 right-2 bg-ink text-white text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded">
                      Best
                    </span>
                  )}
                  <div className="font-display text-xs font-semibold tracking-tight">
                    {b.label}
                  </div>
                  <div className="font-display text-base font-bold tracking-tight mt-1">
                    {money(b.priceCents)}
                  </div>
                  <div className="text-[10.5px] text-ink-muted">
                    {isSubscribe ? 'Per vial · monthly' : `${money(perVial)} / vial`}
                  </div>
                  {!isSubscribe && i > 0 && bundles[0] && (
                    <div className="text-[10.5px] text-success font-semibold mt-0.5">
                      Save {Math.round((1 - perVial / bundles[0].priceCents) * 100)}%
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Companion kit */}
        <button
          onClick={() => setAddKit(!addKit)}
          className="flex items-center gap-3 px-3.5 py-2.5 border border-dashed border-border rounded-lg bg-[#FAFAFA] text-left"
        >
          <span
            className={`w-[18px] h-[18px] rounded border-[1.5px] flex items-center justify-center flex-shrink-0 ${
              addKit ? 'bg-ink border-ink' : 'border-ink-muted bg-white'
            }`}
          >
            {addKit && (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </span>
          <span className="flex-1 text-xs text-ink-soft">
            <strong className="text-ink font-semibold text-[13px]">Add BAC Water</strong>{' '}
            — 10mL bacteriostatic water, pharmacy-grade reconstitution carrier
          </span>
          <span className="font-display text-sm font-bold">+ {money(kitCents)}</span>
        </button>

        {/* CTA */}
        <button
          onClick={() => {
            add(
              {
                handle: product.handle,
                title: product.title,
                bundleLabel: selected.label,
                unitCents: selected.priceCents,
              },
              1,
            );
            if (addKit) {
              add(
                {
                  handle: 'bac-water',
                  title: 'BAC Water',
                  bundleLabel: '10mL bacteriostatic',
                  unitCents: kitCents,
                },
                1,
              );
            }
          }}
          className="w-full bg-ink text-white py-4 rounded-lg text-base font-semibold hover:bg-steel transition"
        >
          Add {selected.label} to cart · {money(totalCents)}
        </button>

        <Link
          href="/cart"
          className="text-center text-xs text-ink-muted underline-offset-2 hover:underline"
        >
          View cart
        </Link>
      </div>
    </div>
  );
}
