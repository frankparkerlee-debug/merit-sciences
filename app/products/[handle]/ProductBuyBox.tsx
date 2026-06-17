'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Product } from '@/lib/product-types';
import { money } from '@/lib/product-types';
import { useCart } from '@/lib/cart';
import { familyLabel, type Family, type RestockSignal } from '@/lib/catalog-meta';
import { DeliveryPromise } from './DeliveryPromise';

type Sibling = {
  handle: string;
  title: string;
  vialSize: string;
  priceCents: number;
  stockQty: number;
  isCurrent: boolean;
};

type Props = {
  product: Product;
  family: Family | null;
  pharmacistNote: string | null;
  restock: RestockSignal | null;
  siblings: Sibling[];
};

export function ProductBuyBox({ product, family, pharmacistNote, restock, siblings }: Props) {
  const bundles = product.bundles ?? [
    { label: 'Single', vials: 1, priceCents: product.priceCents },
  ];

  // Default selected: always Single. Anchoring on 6-Pack auto-loaded
  // a $400+ price into the sticky bar before the buyer engaged with
  // bundle choice — read as forced upsell on mobile.
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [purchaseType, setPurchaseType] = useState<'onetime' | 'subscribe'>('onetime');
  const [subscriptionFreq, setSubscriptionFreq] = useState<string>('Every month');
  const [addBacWater, setAddBacWater] = useState(false);
  const [freqMenuOpen, setFreqMenuOpen] = useState(false);
  const add = useCart((s) => s.add);
  const openDrawer = useCart((s) => s.openDrawer);

  const selected = bundles[selectedIdx];
  const bacWaterCents = 999;

  // If subscribe selected, find subscribe bundle for pricing
  const subscribeBundle = bundles.find((b) => b.label.toLowerCase().includes('subscribe'));
  const effectiveBundle = purchaseType === 'subscribe' && subscribeBundle ? subscribeBundle : selected;

  const subtotalCents = effectiveBundle.priceCents + (addBacWater ? bacWaterCents : 0);

  // Compute savings %
  const singleBundle = bundles[0];
  const savingsPct =
    selected.vials > 0 && singleBundle
      ? Math.round((1 - (selected.priceCents / selected.vials) / singleBundle.priceCents) * 100)
      : 0;

  // Add-to-cart action — used by both the in-page button AND the mobile
  // sticky bottom bar so they stay in sync. Opens the cart drawer after
  // commit (this is the PDP — the buyer is committing, not browsing).
  const handleAddToCart = () => {
    add(
      {
        handle: product.handle,
        title: product.title,
        bundleLabel: purchaseType === 'subscribe' ? `Subscribe · ${subscriptionFreq}` : selected.label,
        unitCents: effectiveBundle.priceCents,
        imageUrl: product.imageUrl,
      },
      1,
    );
    if (addBacWater) {
      add(
        {
          handle: 'bac-water',
          title: 'BAC Water',
          bundleLabel: '10mL bacteriostatic',
          unitCents: bacWaterCents,
        },
        1,
      );
    }
    openDrawer();
  };

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      {/* Restock signal — at the top, like the reference's "Hurry Up!" banner */}
      {restock && (
        <div
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg w-fit text-[12px] font-bold ${
            restock.status === 'fresh'
              ? 'bg-green-500/10 text-green-700 border border-green-500/30'
              : restock.status === 'low'
              ? 'bg-amber-500/10 text-amber-700 border border-amber-500/30'
              : 'bg-cobalt/10 text-cobalt border border-cobalt/30'
          }`}
        >
          <span className="text-lg leading-none">
            {restock.status === 'fresh' ? '✦' : restock.status === 'low' ? '⏱' : '↻'}
          </span>
          {restock.message}
        </div>
      )}

      {/* Credential row — replaces the 5-star deco that read as fake.
          A skeptical research buyer would distrust "5 stars no count";
          an honest credential ("Pharmacy-verified · HPLC ≥99% · Lot
          {product.lot.id}") builds far more credibility. */}
      <div className="inline-flex items-center gap-2 text-[11px] font-bold text-cobalt">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 12l2 2 4-4" />
          <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
        </svg>
        <span className="tracking-[0.05em]">
          Pharmacy-verified · HPLC {product.lot.purity || '≥99%'}
          {product.lot.id !== 'TBD' && <> · Lot {product.lot.id}</>}
        </span>
      </div>

      {/* Title */}
      <div>
        {family && (
          <p className="text-[10px] sm:text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-1.5 sm:mb-2">
            {familyLabel(family)} · {product.eyebrow.split('·')[0].trim()}
          </p>
        )}
        <h1
          className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95]"
          style={{ fontSize: 'clamp(26px, 4.5vw, 60px)' }}
        >
          {product.title}
        </h1>
        <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-ink-soft">
          {product.vialSize} · {product.format === 'lyophilized' ? 'Lyophilized vial' : 'Reconstituted vial'}
          {product.spec.aminoAcids ? ` · ${product.spec.aminoAcids} AA` : ''}
        </p>
      </div>

      {/* Size variant selector — only renders when this compound has
          multiple sibling sizes. Each pill links to that size's PDP so
          a buyer can switch from Retatrutide 10mg → 30mg without
          backtracking through the catalog. The active pill is
          highlighted; out-of-stock siblings show a small badge. */}
      {siblings.length > 1 && (
        <div className="-mt-1">
          <p className="text-[10px] tracking-[0.22em] uppercase font-bold text-cobalt mb-2">
            — Vial size
          </p>
          <div className="flex flex-wrap gap-2">
            {siblings.map((s) => {
              const oos = s.stockQty <= 0;
              if (s.isCurrent) {
                return (
                  <span
                    key={s.handle}
                    className="inline-flex flex-col items-start gap-0.5 px-3.5 py-2 rounded-lg bg-ink text-white border border-ink min-w-[78px]"
                  >
                    <span className="text-[13px] font-bold leading-none">{s.vialSize}</span>
                    <span className="text-[10px] opacity-70 tabular-nums leading-none">
                      {money(s.priceCents)}
                    </span>
                  </span>
                );
              }
              return (
                <Link
                  key={s.handle}
                  href={`/products/${s.handle}`}
                  className={`inline-flex flex-col items-start gap-0.5 px-3.5 py-2 rounded-lg border transition-colors min-w-[78px] ${
                    oos
                      ? 'border-ink/15 text-ink-soft hover:border-ink/30'
                      : 'border-cobalt/30 text-ink hover:border-cobalt hover:bg-cobalt/5'
                  }`}
                >
                  <span className="text-[13px] font-bold leading-none">{s.vialSize}</span>
                  <span className="text-[10px] tabular-nums leading-none opacity-80">
                    {oos ? 'Sold out' : money(s.priceCents)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Trust badges — horizontal row. Hidden on mobile (info repeats
          in the sticky top-bar trust strip below + the buybox lot strip). */}
      <div className="hidden sm:flex flex-wrap gap-2">
        {[
          { label: 'Free shipping $100+', icon: 'truck' },
          { label: '48hr dispatch', icon: 'clock' },
          { label: 'Lot-documented', icon: 'doc' },
        ].map((b) => (
          <span
            key={b.label}
            className="inline-flex items-center gap-1.5 bg-cobalt/8 border border-cobalt/20 rounded-full px-3 py-1.5 text-[11px] font-bold text-cobalt"
          >
            {b.icon === 'truck' && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <rect x="1" y="3" width="15" height="13" />
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            )}
            {b.icon === 'clock' && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            )}
            {b.icon === 'doc' && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            )}
            {b.label}
          </span>
        ))}
      </div>

      {/* Description box — hidden on mobile (eats fold space; reappears
          as a section below). Visible on tablet+. */}
      <div className="hidden sm:block bg-cobalt/5 border border-cobalt/10 rounded-xl p-4">
        <p className="text-sm text-ink leading-relaxed">
          {product.oneLiner ||
            `${product.title} — pharmacy-verified, lot-tested, and shipped from our 503B facility in Dallas. Released only after a US-licensed pharmacist signs off on the batch.`}
        </p>
      </div>

      {/* Lot data — compact single-line on mobile, full card on tablet+. */}
      {product.lot.id !== 'TBD' && (
        <>
          {/* Mobile: compact inline strip */}
          <div className="sm:hidden flex items-center gap-2 text-[12px] text-ink-soft">
            <span className="w-1.5 h-1.5 rounded-full bg-cobalt flex-shrink-0" />
            <span className="text-cobalt font-bold">Lot {product.lot.id}</span>
            {product.lot.purity && <> · <span>{product.lot.purity}</span></>}
            {product.lot.testedDate && <> · <span>Tested {product.lot.testedDate.slice(0, 10)}</span></>}
          </div>
          {/* Tablet+: full card */}
          <div className="hidden sm:block bg-white border-l-4 border-cobalt rounded-r-xl p-4">
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">
              — Current Shipping Lot
            </p>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-display text-xl font-bold text-ink">Lot {product.lot.id}</span>
              {product.lot.purity && (
                <span className="text-sm text-ink-soft">{product.lot.purity}</span>
              )}
              {product.lot.testedDate && (
                <span className="text-xs text-ink-muted">· Tested {product.lot.testedDate.slice(0, 10)}</span>
              )}
            </div>
          </div>
        </>
      )}

      {/* Price row */}
      <div className="pt-2 border-t border-cobalt/10">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-display text-3xl lg:text-4xl font-black text-ink">
            {money(effectiveBundle.priceCents)}
          </span>
          {/* Bundle savings strikethrough (existing) — applies to 3-pack /
              6-pack vs Single, on either tier. */}
          {savingsPct > 0 && selectedIdx > 0 && purchaseType === 'onetime' && (
            <>
              <span className="text-lg text-ink-muted line-through font-semibold">
                {money(singleBundle.priceCents * selected.vials)}
              </span>
              {/* Dollarized savings — concrete dollar amount converts much
                  harder than a percentage. "Save $36.20" > "Save 25%". */}
              <span className="bg-cobalt text-white text-[11px] font-bold tracking-[0.12em] uppercase px-2 py-0.5 rounded">
                Save {money(singleBundle.priceCents * selected.vials - effectiveBundle.priceCents)}
              </span>
            </>
          )}
          {/* Practitioner-tier strikethrough — shows the retail equivalent
              of the currently-selected bundle. Only renders when an
              approved practitioner is signed in AND we have a retail
              value to compare against. Skipped on Subscribe (different
              discount layer) and on bundles where the retail value is
              missing (legacy products from before Phase B). */}
          {product.isPractitionerPricing && purchaseType === 'onetime' &&
           effectiveBundle.retailPriceCents != null &&
           effectiveBundle.retailPriceCents > effectiveBundle.priceCents && (
            <span className="text-base text-ink-muted line-through font-semibold">
              {money(effectiveBundle.retailPriceCents)}
              <span className="text-[10px] tracking-[0.12em] uppercase font-bold text-ink-soft/70 not-italic ml-1.5">retail</span>
            </span>
          )}
        </div>
        <p className="text-[12px] text-ink-soft mt-1">
          {selected.vials > 1 && purchaseType === 'onetime'
            ? `${money(Math.round(effectiveBundle.priceCents / selected.vials))} per vial · ${money(singleBundle.priceCents - Math.round(effectiveBundle.priceCents / selected.vials))} less than a single`
            : 'Per vial'}
        </p>
      </div>

      {/* Bundle picker — like reference "1 Package / 2 Package / 3 Package" */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <p className="text-[10px] tracking-[0.22em] uppercase text-ink-soft font-bold">
            Select your pack size
          </p>
          <span className="text-[11px] text-cobalt font-bold">
            {selected.label}
          </span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {bundles.map((b, i) => {
            const isBestDeal = i === 2; // 6-Pack is the best deal
            const isSubscribe = b.label.toLowerCase().includes('subscribe');
            const isActive = selectedIdx === i && purchaseType === 'onetime';
            const perVial = b.vials > 0 ? Math.round(b.priceCents / b.vials) : b.priceCents;
            // Dollar savings vs Single. Drives concrete value perception
            // far better than the percentage display we used to show.
            const dollarSaveCents = singleBundle && b.vials > 0
              ? singleBundle.priceCents * b.vials - b.priceCents
              : 0;
            return (
              <button
                key={b.label}
                type="button"
                onClick={() => {
                  setSelectedIdx(i);
                  if (isSubscribe) setPurchaseType('subscribe');
                  else setPurchaseType('onetime');
                }}
                className={`relative text-left rounded-xl p-3 transition border-2 ${
                  isActive || (isSubscribe && purchaseType === 'subscribe')
                    ? 'border-cobalt bg-cobalt/5'
                    : 'border-cobalt/15 hover:border-cobalt/40 bg-white'
                }`}
              >
                {isBestDeal && (
                  <span className="absolute -top-2 -right-1 bg-cobalt text-white text-[9px] font-bold tracking-[0.12em] uppercase px-2 py-0.5 rounded">
                    Best Deal
                  </span>
                )}
                <p className="text-[11px] font-bold text-ink mb-1">{b.label}</p>
                <p className="font-display text-base font-bold text-ink">
                  {money(b.priceCents)}
                </p>
                {!isSubscribe && b.vials > 1 && dollarSaveCents > 0 && (
                  <>
                    <p className="text-[10px] text-ink-soft mt-0.5">
                      {money(perVial)} / vial
                    </p>
                    <p className="text-[10px] text-cobalt font-bold mt-0.5">
                      Save {money(dollarSaveCents)}
                    </p>
                  </>
                )}
                {!isSubscribe && b.vials === 1 && (
                  <p className="text-[10px] text-ink-soft mt-0.5">
                    {money(perVial)} / vial
                  </p>
                )}
                {isSubscribe && (
                  <p className="text-[10px] text-cobalt font-bold mt-0.5">
                    {dollarSaveCents > 0 ? `Save ${money(dollarSaveCents)}/mo` : 'Save 10%'}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* One-time vs Subscription */}
      <div className="space-y-2.5">
        <PurchaseRadio
          checked={purchaseType === 'onetime'}
          onChange={() => setPurchaseType('onetime')}
          title="One-time purchase"
          subtitle="Receive a single shipment"
          rightLabel={money(selected.priceCents)}
        />
        <PurchaseRadio
          checked={purchaseType === 'subscribe'}
          onChange={() => setPurchaseType('subscribe')}
          title="Subscribe & save"
          subtitle={(() => {
            const subscribePrice = subscribeBundle?.priceCents ?? Math.round(product.priceCents * 0.9);
            const monthlySavings = product.priceCents - subscribePrice;
            const annualSavings = monthlySavings * 12;
            return monthlySavings > 0
              ? `Save ${money(monthlySavings)}/shipment · ${money(annualSavings)}/year`
              : `Save 10% on every shipment`;
          })()}
          rightLabel={money(subscribeBundle?.priceCents ?? Math.round(product.priceCents * 0.9))}
          rightTag="Save 10%"
        />

        {/* Frequency selector — only shown when subscribe is selected */}
        {purchaseType === 'subscribe' && (
          <div className="ml-9 relative">
            <button
              type="button"
              onClick={() => setFreqMenuOpen((v) => !v)}
              className="w-full flex items-center justify-between bg-white border border-cobalt/15 rounded-lg px-4 py-2.5 text-sm font-semibold text-ink hover:border-cobalt/40 transition"
            >
              {subscriptionFreq}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {freqMenuOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-cobalt/15 rounded-lg shadow-lg overflow-hidden z-30">
                {['Every month', 'Every 6 weeks', 'Every 2 months', 'Every 3 months'].map((freq) => (
                  <button
                    key={freq}
                    type="button"
                    onClick={() => {
                      setSubscriptionFreq(freq);
                      setFreqMenuOpen(false);
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm font-medium transition ${
                      subscriptionFreq === freq ? 'bg-cobalt/10 text-cobalt' : 'text-ink hover:bg-cream'
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* BAC Water add-on — bacteriostatic water only.
          Merit does NOT supply syringes or swabs. */}
      <button
        type="button"
        onClick={() => setAddBacWater(!addBacWater)}
        className="flex items-center gap-3 p-3.5 border border-dashed border-cobalt/30 rounded-xl bg-cream/50 hover:bg-cream/80 transition text-left"
      >
        <span
          className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition ${
            addBacWater ? 'bg-cobalt border-cobalt' : 'border-cobalt/40 bg-white'
          }`}
        >
          {addBacWater && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
        <span className="flex-1">
          <span className="block text-sm font-bold text-ink">
            Add BAC Water
          </span>
          <span className="block text-[12px] text-ink-soft">
            10mL bacteriostatic water — pharmacy-grade reconstitution carrier
          </span>
        </span>
        <span className="font-display text-sm font-bold text-cobalt">
          + {money(bacWaterCents)}
        </span>
      </button>

      {/* Delivery promise — concrete date/time math. Amazon-pattern
          urgency: "Order in the next 3h 24m for Mon Jun 17 delivery". */}
      <DeliveryPromise />

      {/* Risk reducers — MOVED above the cart button.
          Every conversion study confirms risk-reducing copy belongs
          BEFORE the CTA so it's read when purchase anxiety is highest,
          not after the click is already made. */}
      <ul className="space-y-1.5">
        <li className="flex items-center gap-2 text-[12px] text-ink-soft">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="text-cobalt flex-shrink-0">
            <path d="M9 12l2 2 4-4" />
            <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
          </svg>
          <span>
            <span className="font-bold text-ink">Purity Guarantee.</span>{' '}
            If a lot fails our ≥99% HPLC standard, full refund + replacement.
          </span>
        </li>
        <li className="flex items-center gap-2 text-[12px] text-ink-soft">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="text-cobalt flex-shrink-0">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Lot-specific COA on demand — anytime, free
        </li>
        <li className="flex items-center gap-2 text-[12px] text-ink-soft">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="text-cobalt flex-shrink-0">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Same reorder price — forever, no upcharge
        </li>
        {purchaseType === 'subscribe' && (
          <li className="flex items-center gap-2 text-[12px] text-ink-soft">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="text-cobalt flex-shrink-0">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Cancel or pause subscription anytime
          </li>
        )}
      </ul>

      {/* Add to cart — gradient cobalt. In-page version. */}
      <button
        type="button"
        onClick={handleAddToCart}
        className="w-full text-white py-4 rounded-xl text-base font-bold shadow-lg hover:opacity-95 transition relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, #2E4DDB 0%, #5078FF 50%, #2E4DDB 100%)',
        }}
      >
        Add to cart · {money(subtotalCents)}
      </button>

      {/* Mobile sticky add-to-cart bar — fixed to viewport bottom on mobile
          ONLY. Always visible so the buyer can convert from any scroll
          position. The pb-safe-area inset accommodates iOS home indicator. */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-cobalt/15 px-4 py-3 lg:hidden shadow-[0_-8px_24px_-12px_rgba(11,15,25,0.20)]"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-3 max-w-[600px] mx-auto">
          {/* Price + bundle label */}
          <div className="flex-1 min-w-0">
            <p className="font-display text-lg font-black text-ink leading-none">
              {money(subtotalCents)}
            </p>
            <p className="text-[10px] text-ink-soft truncate">
              {purchaseType === 'subscribe' ? `Subscribe · ${subscriptionFreq}` : selected.label}
              {addBacWater && ' + BAC water'}
            </p>
          </div>
          {/* Add button */}
          <button
            type="button"
            onClick={handleAddToCart}
            className="flex-shrink-0 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-md hover:opacity-95 transition whitespace-nowrap"
            style={{
              background:
                'linear-gradient(135deg, #2E4DDB 0%, #5078FF 50%, #2E4DDB 100%)',
            }}
          >
            Add to cart
          </button>
        </div>
      </div>

      {/* Below-CTA trust strip — 503B + ISO badge row. Final reassurance
          for buyers who scrolled past the cart button without clicking. */}
      <div className="flex items-center justify-center gap-3 text-[10px] tracking-[0.14em] uppercase font-bold text-ink-muted pt-1">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-cobalt" />
          503B
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-cobalt" />
          ISO-certified
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1 h-1 rounded-full bg-cobalt" />
          Dallas, TX
        </span>
      </div>
    </div>
  );
}

// Sub-component: purchase type radio
function PurchaseRadio({
  checked,
  onChange,
  title,
  subtitle,
  rightLabel,
  rightTag,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  subtitle: string;
  rightLabel: string;
  rightTag?: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition text-left ${
        checked ? 'border-cobalt bg-cobalt/5' : 'border-cobalt/15 hover:border-cobalt/30 bg-white'
      }`}
    >
      <span
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition ${
          checked ? 'border-cobalt' : 'border-cobalt/30'
        }`}
      >
        {checked && <span className="w-2.5 h-2.5 rounded-full bg-cobalt" />}
      </span>
      <span className="flex-1">
        <span className="block text-sm font-bold text-ink">{title}</span>
        <span className="block text-[12px] text-ink-soft">{subtitle}</span>
      </span>
      <span className="flex flex-col items-end">
        <span className="font-display text-base font-bold text-ink">{rightLabel}</span>
        {rightTag && (
          <span className="text-[10px] tracking-[0.12em] uppercase text-cobalt font-bold">
            {rightTag}
          </span>
        )}
      </span>
    </button>
  );
}
