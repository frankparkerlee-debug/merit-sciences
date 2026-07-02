'use client';

import { useMemo, useState } from 'react';
import type { CalcConfig, DoseTier } from '@/lib/library';

const SUBJECT_PRESETS: [string, number][] = [
  ['Mouse', 0.025],
  ['Rat', 0.25],
  ['Rat (lg)', 0.5],
  ['Rabbit', 3],
];

function fmt(n: number, d = 2): string {
  if (!isFinite(n) || n <= 0) return '—';
  const s = n.toFixed(d);
  // Strip trailing zeros ONLY after a decimal point ("2.50"→"2.5", "10.00"→"10")
  // — never touch whole numbers like "30" or "100".
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s;
}

// Draw volumes span from mL (human) down to sub-microliter (a mouse dose off a
// concentrated stock). Show mL when it's a workable volume, µL when it isn't —
// so a real 0.00015 mL reads as "0.15 µL", not a broken-looking "0 mL".
function fmtVol(ml: number): string {
  if (!isFinite(ml) || ml <= 0) return '—';
  return ml < 0.1 ? `${fmt(ml * 1000, 2)} µL` : `${fmt(ml)} mL`;
}

/**
 * Research reconstitution calculator. Rebuilt from the old Shopify widget's
 * config (vial sizes, human + preclinical dose tiers, blend components).
 * Pure client-side math — concentration = mass / diluent; draw = dose / conc.
 * Strictly a reference tool for research handling; not a dosing recommendation.
 */
export function ReconstitutionCalculator({ calc, compound }: { calc: CalcConfig; compound: string }) {
  const isBlend = calc.components.length > 0;
  const [mode, setMode] = useState<'human' | 'preclinical'>('human');
  const [vialIdx, setVialIdx] = useState(0);
  const [diluent, setDiluent] = useState(calc.defaultDiluentMl || 2);
  const [subjectKg, setSubjectKg] = useState(0.025);

  const vialMg = isBlend ? 0 : parseFloat(calc.vials[vialIdx]?.[0] ?? '0');
  const conc = !isBlend && diluent > 0 ? vialMg / diluent : 0;

  const rows = useMemo(() => {
    if (isBlend) {
      return calc.human.map((t) => ({
        level: t.level,
        dose: '—',
        draw: t.volume_ml != null ? fmtVol(t.volume_ml) : '—',
        freq: t.frequency_label || '',
        cite: t.citation || '',
      }));
    }
    const tiers: DoseTier[] = mode === 'human' ? calc.human : calc.preclinical;
    return tiers.map((t) => {
      const doseMg =
        mode === 'human'
          ? t.dose_mg ?? 0
          : ((t.dose_ug_per_kg ?? 0) * subjectKg) / 1000;
      const draw = conc > 0 ? doseMg / conc : 0;
      const doseLabel =
        mode === 'human' ? `${fmt(doseMg, 3)} mg` : `${fmt(t.dose_ug_per_kg ?? 0, 0)} µg/kg`;
      return { level: t.level, dose: doseLabel, draw: fmtVol(draw), freq: t.frequency_label || '', cite: t.citation || '' };
    });
  }, [isBlend, mode, calc, subjectKg, conc]);

  return (
    <div className="not-prose my-8 rounded-2xl border border-cobalt/15 bg-white overflow-hidden">
      {/* header */}
      <div className="px-5 py-4 border-b border-cobalt/10 bg-cobalt/[0.03]">
        <p className="text-[10px] tracking-[0.2em] uppercase font-bold text-cobalt">— Research reconstitution calculator</p>
        <p className="mt-1 text-sm font-bold text-ink">{compound}</p>
        <p className="text-[12px] text-ink-soft">Reference math for research handling. Not a dosing recommendation.</p>
      </div>

      {/* inputs */}
      <div className="px-5 py-4 grid gap-4 sm:grid-cols-3">
        {!isBlend && calc.vials.length > 1 && (
          <Field label="Vial size">
            <select
              value={vialIdx}
              onChange={(e) => setVialIdx(Number(e.target.value))}
              className="w-full rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-cobalt"
            >
              {calc.vials.map((v, i) => (
                <option key={v[0]} value={i}>{v[1]}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Diluent (BAC water)">
          <div className="flex items-center rounded-lg border border-cobalt/20 bg-white px-3">
            <input
              type="number" min={0.5} step={0.5} value={diluent}
              onChange={(e) => setDiluent(Math.max(0.1, Number(e.target.value) || 0))}
              className="w-full py-2 text-sm font-semibold text-ink outline-none bg-transparent"
            />
            <span className="text-xs text-ink-muted">mL</span>
          </div>
        </Field>
        {!isBlend && (
          <Field label="Concentration">
            <div className="rounded-lg border border-cobalt/10 bg-cream/50 px-3 py-2 text-sm font-bold text-cobalt tabular-nums">
              {fmt(conc)} mg/mL
            </div>
          </Field>
        )}
      </div>

      {/* blend components */}
      {isBlend && (
        <div className="px-5 pb-3">
          <p className="text-[10px] tracking-[0.16em] uppercase font-bold text-ink-muted mb-1.5">Blend components</p>
          <div className="flex flex-wrap gap-2">
            {calc.components.map((c) => (
              <span key={c.name} className="rounded-lg bg-cream/60 border border-cobalt/10 px-2.5 py-1 text-[12px] text-ink">
                <strong>{c.name}</strong> · {c.vial_mg} mg
                {diluent > 0 && <span className="text-ink-muted"> → {fmt(c.vial_mg / diluent)} mg/mL</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* mode toggle (single compounds only) */}
      {!isBlend && calc.preclinical.length > 0 && (
        <div className="px-5 flex items-center gap-2">
          {(['human', 'preclinical'] as const).map((m) => (
            <button
              key={m} type="button" onClick={() => setMode(m)}
              className={`rounded-full px-3 py-1 text-[12px] font-bold transition ${
                mode === m ? 'bg-cobalt text-white' : 'bg-cobalt/8 text-cobalt hover:bg-cobalt/15'
              }`}
            >
              {m === 'human' ? 'Clinical reference' : 'Preclinical (µg/kg)'}
            </button>
          ))}
        </div>
      )}

      {/* subject presets (preclinical) */}
      {!isBlend && mode === 'preclinical' && (
        <div className="px-5 pt-3 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-ink-muted">Subject:</span>
          {SUBJECT_PRESETS.map(([label, kg]) => (
            <button
              key={label} type="button" onClick={() => setSubjectKg(kg)}
              className={`rounded-lg px-2.5 py-1 text-[12px] font-semibold transition ${
                subjectKg === kg ? 'bg-ink text-white' : 'bg-white border border-cobalt/20 text-ink hover:border-cobalt'
              }`}
            >
              {label} <span className="opacity-60">{kg}kg</span>
            </button>
          ))}
        </div>
      )}

      {/* dose tiers */}
      <div className="px-5 py-4 overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="text-[10px] tracking-[0.12em] uppercase text-ink-muted">
              <th className="pb-2 pr-3 font-bold">Intensity</th>
              <th className="pb-2 px-3 font-bold">{isBlend ? 'Reference' : 'Dose'}</th>
              <th className="pb-2 px-3 font-bold">Draw</th>
              <th className="pb-2 pl-3 font-bold">Frequency</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-cobalt/8 align-top">
                <td className="py-2 pr-3 font-bold capitalize text-ink">{r.level}</td>
                <td className="py-2 px-3 text-ink tabular-nums">{r.dose}</td>
                <td className="py-2 px-3 font-bold text-cobalt tabular-nums">{r.draw}</td>
                <td className="py-2 pl-3 text-ink-soft">{r.freq}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="px-5 py-3 border-t border-cobalt/8 bg-cream/40 text-[11px] leading-relaxed text-ink-muted">
        Intensities summarized from published literature — <em>not a dosing recommendation.</em> For research use only.
        Not for human or veterinary use.
      </p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[10px] tracking-[0.16em] uppercase font-bold text-ink-muted mb-1.5">{label}</span>
      {children}
    </label>
  );
}
