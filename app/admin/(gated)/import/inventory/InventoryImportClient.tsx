'use client';

import { useState, useTransition } from 'react';
import { parseInventoryCsv, applyInventoryCsv, type Diff } from './actions';

export function InventoryImportClient() {
  const [diff, setDiff] = useState<Diff | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pendingApply, startTransition] = useTransition();

  async function handleParse(formData: FormData) {
    setParseError(null);
    setDiff(null);
    setApplyResult(null);
    const result = (await parseInventoryCsv(null, formData)) as any;
    if ('error' in result) {
      setParseError(result.error);
      return;
    }
    setDiff(result as Diff);
  }

  function handleApply() {
    if (!diff) return;
    setApplyResult(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append('diff', JSON.stringify(diff));
      const result = await applyInventoryCsv(null, fd);
      if (result.ok) {
        setApplyResult({ ok: true, msg: result.message });
        setDiff(null);
      } else {
        setApplyResult({ ok: false, msg: result.error });
      }
    });
  }

  const changedRows = diff?.rows.filter((r) => Object.keys(r.changes).length > 0) ?? [];
  const noChangeRows = diff?.rows.filter((r) => r.action === 'update' && Object.keys(r.changes).length === 0) ?? [];
  const unmatchedRows = diff?.rows.filter((r) => r.action === 'no-match') ?? [];

  return (
    <div className="space-y-5">
      {/* Upload form */}
      <form action={handleParse} className="rounded-2xl border border-cobalt/15 bg-white p-6">
        <label htmlFor="csv" className="block text-xs font-bold tracking-wider uppercase text-ink-soft mb-2">
          Inventory file (.xlsx or .csv)
        </label>
        <input
          id="csv"
          type="file"
          name="csv"
          accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          required
          className="block w-full text-sm text-ink file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-ink file:text-white file:text-xs file:font-bold file:tracking-wider file:uppercase file:cursor-pointer hover:file:bg-cobalt"
        />
        <p className="text-[11px] text-ink-soft mt-2">
          Upload the Excel file directly — no need to export to CSV first.
        </p>
        <button
          type="submit"
          className="mt-4 bg-cobalt text-white px-5 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase hover:bg-ink transition"
        >
          Preview changes
        </button>
      </form>

      {parseError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {parseError}
        </div>
      )}

      {applyResult && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            applyResult.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          {applyResult.msg}
        </div>
      )}

      {/* Diff preview */}
      {diff && (
        <>
          <div className="rounded-2xl border border-cobalt/15 bg-white p-6">
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">— Summary</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <Stat label="Total rows" value={diff.totalRows} />
              <Stat label="Matched" value={diff.matchedCount} accent="emerald" />
              <Stat label="With changes" value={changedRows.length} accent="cobalt" />
              <Stat label="Unmatched" value={diff.unmatchedCount} accent="rose" />
            </div>
            {changedRows.length > 0 && (
              <button
                type="button"
                onClick={handleApply}
                disabled={pendingApply}
                className="mt-5 bg-ink text-white px-5 py-3 rounded-xl text-xs font-bold tracking-wider uppercase hover:bg-cobalt transition disabled:opacity-60"
              >
                {pendingApply ? 'Applying…' : `Apply ${changedRows.length} update${changedRows.length === 1 ? '' : 's'}`}
              </button>
            )}
          </div>

          {/* Rows with changes */}
          {changedRows.length > 0 && (
            <Section title={`Will update (${changedRows.length})`} tone="cobalt">
              <DiffTable rows={changedRows} mode="changed" />
            </Section>
          )}

          {/* Matched but no changes */}
          {noChangeRows.length > 0 && (
            <Section title={`Already in sync (${noChangeRows.length})`} tone="emerald">
              <DiffTable rows={noChangeRows} mode="no-change" />
            </Section>
          )}

          {/* Unmatched */}
          {unmatchedRows.length > 0 && (
            <Section title={`No matching product (${unmatchedRows.length})`} tone="rose">
              <p className="text-xs text-ink-soft mb-3">
                These SKUs from the inventory CSV don&rsquo;t correspond to any product currently in
                the Merit catalog. They&rsquo;ll be skipped &mdash; create the product manually if
                you want it imported.
              </p>
              <DiffTable rows={unmatchedRows} mode="unmatched" />
            </Section>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: 'cobalt' | 'emerald' | 'rose' }) {
  const cls =
    accent === 'cobalt' ? 'text-cobalt' :
    accent === 'emerald' ? 'text-emerald-700' :
    accent === 'rose' ? 'text-rose-700' :
    'text-ink';
  return (
    <div>
      <p className="text-[10px] tracking-wider uppercase text-ink-soft font-bold">{label}</p>
      <p className={`font-display font-black text-2xl tabular-nums ${cls}`}>{value}</p>
    </div>
  );
}

function Section({ title, tone, children }: { title: string; tone: 'cobalt' | 'emerald' | 'rose'; children: React.ReactNode }) {
  const borderCls =
    tone === 'cobalt' ? 'border-cobalt/30' :
    tone === 'emerald' ? 'border-emerald-200' :
    'border-rose-200';
  return (
    <section className={`rounded-2xl border ${borderCls} bg-white p-6`}>
      <p className="text-[10px] tracking-[0.22em] uppercase font-bold mb-3 text-ink-soft">— {title}</p>
      {children}
    </section>
  );
}

function DiffTable({
  rows,
  mode,
}: {
  rows: Diff['rows'];
  mode: 'changed' | 'no-change' | 'unmatched';
}) {
  if (mode === 'unmatched') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-[10px] tracking-wider uppercase text-ink-soft font-bold">
            <tr className="border-b border-cobalt/10">
              <th className="text-left py-2 pr-3">SKU</th>
              <th className="text-left py-2 pr-3">Product</th>
              <th className="text-left py-2 pr-3">Vial size</th>
              <th className="text-right py-2">Stock</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-cobalt/5">
                <td className="py-2 pr-3 font-mono text-ink">{r.row.sku}</td>
                <td className="py-2 pr-3 text-ink">{r.row.productName}</td>
                <td className="py-2 pr-3 text-ink-soft">{r.row.vialSize}</td>
                <td className="py-2 text-right tabular-nums text-ink-soft">{r.row.unitsOnHand}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-[10px] tracking-wider uppercase text-ink-soft font-bold">
          <tr className="border-b border-cobalt/10">
            <th className="text-left py-2 pr-3">Match</th>
            <th className="text-left py-2 pr-3">CSV row</th>
            <th className="text-left py-2 pr-3">Changes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-cobalt/5 align-top">
              <td className="py-2 pr-3">
                <div className="text-ink font-bold">{r.matchedTitle}</div>
                <div className="text-[10px] text-ink-soft font-mono">/{r.matchedHandle}</div>
              </td>
              <td className="py-2 pr-3">
                <div className="text-ink">{r.row.productName}</div>
                <div className="text-[10px] text-ink-soft">{r.row.sku}</div>
              </td>
              <td className="py-2 pr-3">
                {mode === 'no-change' ? (
                  <span className="text-emerald-700">No changes needed</span>
                ) : (
                  <div className="space-y-1">
                    {r.changes.stockQty && (
                      <Change label="Stock" from={String(r.changes.stockQty.from)} to={String(r.changes.stockQty.to)} />
                    )}
                    {r.changes.priceCents && (
                      <Change
                        label="Retail price"
                        from={`$${(r.changes.priceCents.from / 100).toFixed(2)}`}
                        to={`$${(r.changes.priceCents.to / 100).toFixed(2)}`}
                      />
                    )}
                    {r.changes.physicianPriceCents && (
                      <Change
                        label="Physician price"
                        from={r.changes.physicianPriceCents.from !== null
                          ? `$${(r.changes.physicianPriceCents.from / 100).toFixed(2)}`
                          : '—'}
                        to={`$${(r.changes.physicianPriceCents.to / 100).toFixed(2)}`}
                      />
                    )}
                    {r.changes.costCents && (
                      <Change
                        label="Unit cost"
                        from={r.changes.costCents.from !== null
                          ? `$${(r.changes.costCents.from / 100).toFixed(2)}`
                          : '—'}
                        to={`$${(r.changes.costCents.to / 100).toFixed(2)}`}
                      />
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Change({ label, from, to }: { label: string; from: string; to: string }) {
  return (
    <div className="text-[11px]">
      <span className="text-ink-soft">{label}: </span>
      <span className="text-ink-soft line-through">{from}</span>
      <span className="text-ink-soft"> → </span>
      <span className="text-cobalt font-bold tabular-nums">{to}</span>
    </div>
  );
}
