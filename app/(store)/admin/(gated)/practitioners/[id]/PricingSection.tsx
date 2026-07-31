'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useMemo, useState } from 'react';
import { savePractitionerPricing, type PricingSaveResult } from '../actions';

type ProductRow = {
  handle: string;
  title: string;
  retailPriceCents: number;
  physicianPriceCents: number | null;
};

type Props = {
  applicationId: string;
  practiceName: string;
  currentMultiplierBps: number;
  products: ProductRow[];
  /** Map of productHandle → override priceCents. */
  currentOverrides: Record<string, number>;
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function bpsToPercent(bps: number): string {
  return ((bps - 10000) / 100).toFixed(2);
}

function percentToBps(pct: number): number {
  return Math.round((pct + 100) * 100);
}

function effectivePerVial(
  product: ProductRow,
  multBps: number,
  overrideDollars: string,
): { cents: number; source: 'override' | 'standard' | 'retail' } {
  const trimmed = overrideDollars.trim();
  if (trimmed !== '') {
    const v = Number.parseFloat(trimmed);
    if (Number.isFinite(v) && v > 0) {
      return { cents: Math.round(v * 100), source: 'override' };
    }
  }
  if (product.physicianPriceCents && product.physicianPriceCents > 0) {
    return {
      cents: Math.max(1, Math.round((product.physicianPriceCents * multBps) / 10000)),
      source: 'standard',
    };
  }
  return { cents: product.retailPriceCents, source: 'retail' };
}

export function PricingSection({
  applicationId,
  practiceName,
  currentMultiplierBps,
  products,
  currentOverrides,
}: Props) {
  const [result, formAction] = useFormState<PricingSaveResult | null, FormData>(
    savePractitionerPricing,
    null,
  );

  // Local state for live preview only — the form posts the actual values
  // to the server via field names, not these.
  const [multBps, setMultBps] = useState(currentMultiplierBps);
  const [overrides, setOverrides] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {};
    for (const [handle, cents] of Object.entries(currentOverrides)) {
      seed[handle] = (cents / 100).toFixed(2);
    }
    return seed;
  });

  const stats = useMemo(() => {
    let overrideCount = 0;
    let belowStandard = 0;
    let aboveStandard = 0;
    for (const p of products) {
      const e = effectivePerVial(p, multBps, overrides[p.handle] ?? '');
      if (e.source === 'override') overrideCount += 1;
      if (p.physicianPriceCents && e.cents < p.physicianPriceCents) belowStandard += 1;
      if (p.physicianPriceCents && e.cents > p.physicianPriceCents) aboveStandard += 1;
    }
    return { overrideCount, belowStandard, aboveStandard };
  }, [products, multBps, overrides]);

  return (
    <form action={formAction} className="rounded-2xl border border-cobalt/15 bg-white p-6 mb-6">
      <input type="hidden" name="id" value={applicationId} />

      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold">
            — Pricing
          </p>
          <p className="text-[13px] text-ink-soft mt-1">
            Tune what <strong className="text-ink">{practiceName}</strong> sees when they sign in.
          </p>
        </div>
        <SubmitButton />
      </div>

      {result && (
        <div
          className={`mt-3 mb-2 rounded-md px-3 py-2 text-xs font-bold ${
            result.ok
              ? 'bg-emerald-50 border border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border border-rose-300 text-rose-800'
          }`}
        >
          {result.ok ? result.message : result.error}
        </div>
      )}

      {/* Knob 1 — book-level multiplier */}
      <div className="mt-5 mb-6 grid grid-cols-1 sm:grid-cols-[1fr,auto] gap-4 items-end">
        <div>
          <label className="block text-[10px] tracking-[0.18em] uppercase font-bold text-ink-soft mb-1.5">
            Book-level adjustment vs. standard physician tier
          </label>
          <p className="text-[12px] text-ink-soft leading-relaxed mb-2">
            A single percentage applied across every SKU. Negative = discount, positive = markup. <strong>0%</strong> means everyone gets the catalog&apos;s standard physician price.
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.25"
              min={-90}
              max={200}
              value={bpsToPercent(multBps)}
              onChange={(e) => {
                const pct = Number.parseFloat(e.target.value);
                if (Number.isFinite(pct)) setMultBps(percentToBps(pct));
              }}
              className="w-28 rounded-lg border border-cobalt/25 bg-white px-3 py-2 text-sm font-bold tracking-tight focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-cobalt/20"
            />
            <span className="text-sm text-ink-soft">%</span>
            <span className="ml-3 text-xs text-ink-muted">
              {multBps === 10000
                ? 'standard tier (no adjustment)'
                : multBps < 10000
                  ? `${((10000 - multBps) / 100).toFixed(2)}% off standard`
                  : `${((multBps - 10000) / 100).toFixed(2)}% above standard`}
            </span>
          </div>
          <input type="hidden" name="priceMultiplierBps" value={multBps} />
        </div>
        <div className="text-[11px] tracking-[0.18em] uppercase font-bold text-ink-soft text-right">
          <div>
            {stats.overrideCount} <span className="font-normal normal-case tracking-normal text-ink-muted">override{stats.overrideCount === 1 ? '' : 's'}</span>
          </div>
          <div className="mt-1">
            {stats.belowStandard}
            <span className="font-normal normal-case tracking-normal text-ink-muted"> below standard</span>
          </div>
          <div className="mt-1">
            {stats.aboveStandard}
            <span className="font-normal normal-case tracking-normal text-ink-muted"> above standard</span>
          </div>
        </div>
      </div>

      {/* Knob 2 — per-SKU overrides */}
      <div>
        <p className="text-[10px] tracking-[0.18em] uppercase font-bold text-ink-soft mb-2">
          Per-SKU overrides
        </p>
        <p className="text-[12px] text-ink-soft leading-relaxed mb-3">
          Pin a specific dollar amount for one compound. Leave blank to use the book-level adjustment above. Bundles re-price automatically.
        </p>

        <div className="overflow-x-auto rounded-lg border border-cobalt/10">
          <table className="w-full text-[13px]">
            <thead className="bg-cream/50">
              <tr className="text-left text-[10px] tracking-[0.18em] uppercase text-ink-soft">
                <th className="px-3 py-2 font-bold">SKU</th>
                <th className="px-3 py-2 font-bold text-right">Retail</th>
                <th className="px-3 py-2 font-bold text-right">Standard physician</th>
                <th className="px-3 py-2 font-bold text-right">Override</th>
                <th className="px-3 py-2 font-bold text-right">Effective</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const e = effectivePerVial(p, multBps, overrides[p.handle] ?? '');
                return (
                  <tr key={p.handle} className="border-t border-cobalt/10">
                    <td className="px-3 py-2 align-middle">
                      <div className="font-bold text-ink truncate" title={p.title}>
                        {p.title}
                      </div>
                      <div className="text-[10px] tracking-[0.14em] uppercase text-ink-muted">{p.handle}</div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink-soft">
                      {money(p.retailPriceCents)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink-soft">
                      {p.physicianPriceCents ? money(p.physicianPriceCents) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex items-center gap-1 justify-end">
                        <span className="text-ink-muted">$</span>
                        <input
                          name={`override.${p.handle}`}
                          type="number"
                          step="0.01"
                          min="0"
                          inputMode="decimal"
                          placeholder="—"
                          value={overrides[p.handle] ?? ''}
                          onChange={(ev) =>
                            setOverrides((prev) => ({ ...prev, [p.handle]: ev.target.value }))
                          }
                          className="w-24 rounded-md border border-cobalt/20 bg-white px-2 py-1 text-right text-[13px] tabular-nums focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-cobalt/20"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <span
                        className={`font-bold ${
                          e.source === 'override'
                            ? 'text-cobalt'
                            : e.source === 'standard'
                              ? 'text-ink'
                              : 'text-ink-muted'
                        }`}
                      >
                        {money(e.cents)}
                      </span>
                      <span className="block text-[9px] tracking-[0.14em] uppercase text-ink-muted">
                        {e.source === 'override' ? 'pinned' : e.source === 'standard' ? 'book' : 'retail'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-cobalt text-white font-bold tracking-[0.12em] uppercase text-[11px] px-4 py-2.5 rounded-lg hover:bg-ink transition-colors disabled:opacity-60 whitespace-nowrap"
    >
      {pending ? 'Saving…' : 'Save pricing'}
    </button>
  );
}
