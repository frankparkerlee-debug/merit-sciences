'use client';

import { useState, useTransition } from 'react';
import { parseOrdersCsv, applyOrdersCsv, type OrderDiff } from './actions';

export function OrderImportClient() {
  const [diff, setDiff] = useState<OrderDiff | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pendingApply, startTransition] = useTransition();

  async function handleParse(formData: FormData) {
    setParseError(null);
    setDiff(null);
    setApplyResult(null);
    const result = (await parseOrdersCsv(null, formData)) as any;
    if ('error' in result) {
      setParseError(result.error);
      return;
    }
    setDiff(result as OrderDiff);
  }

  function handleApply() {
    if (!diff) return;
    setApplyResult(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append('diff', JSON.stringify(diff));
      const result = await applyOrdersCsv(null, fd);
      if (result.ok) {
        setApplyResult({ ok: true, msg: result.message });
        setDiff(null);
      } else {
        setApplyResult({ ok: false, msg: result.error });
      }
    });
  }

  const createRows = diff?.rows.filter((r) => r.action === 'create') ?? [];
  const skippedRows = diff?.rows.filter((r) => r.action !== 'create') ?? [];

  return (
    <div className="space-y-5">
      <form action={handleParse} className="rounded-2xl border border-cobalt/15 bg-white p-6">
        <label htmlFor="csv" className="block text-xs font-bold tracking-wider uppercase text-ink-soft mb-2">
          Orders CSV (Shopify export)
        </label>
        <input
          id="csv"
          type="file"
          name="csv"
          accept=".csv,text/csv"
          required
          className="block w-full text-sm text-ink file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-ink file:text-white file:text-xs file:font-bold file:tracking-wider file:uppercase file:cursor-pointer hover:file:bg-cobalt"
        />
        <button
          type="submit"
          className="mt-4 bg-cobalt text-white px-5 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase hover:bg-ink transition"
        >
          Preview import
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

      {diff && (
        <>
          <div className="rounded-2xl border border-cobalt/15 bg-white p-6">
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">— Summary</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <Stat label="Total orders" value={diff.totalOrders} />
              <Stat label="To create" value={diff.toCreate} accent="emerald" />
              <Stat label="Skipped" value={diff.skipped} accent="rose" />
            </div>
            {diff.toCreate > 0 && (
              <button
                type="button"
                onClick={handleApply}
                disabled={pendingApply}
                className="mt-5 bg-ink text-white px-5 py-3 rounded-xl text-xs font-bold tracking-wider uppercase hover:bg-cobalt transition disabled:opacity-60"
              >
                {pendingApply ? 'Importing…' : `Import ${diff.toCreate} order${diff.toCreate === 1 ? '' : 's'}`}
              </button>
            )}
          </div>

          {createRows.length > 0 && (
            <Section title={`Will create (${createRows.length})`} tone="emerald">
              <OrderTable rows={createRows} showReason={false} />
            </Section>
          )}
          {skippedRows.length > 0 && (
            <Section title={`Skipped (${skippedRows.length})`} tone="rose">
              <OrderTable rows={skippedRows} showReason={true} />
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

function OrderTable({ rows, showReason }: { rows: OrderDiff['rows']; showReason: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-[10px] tracking-wider uppercase text-ink-soft font-bold">
          <tr className="border-b border-cobalt/10">
            <th className="text-left py-2 pr-3">Order</th>
            <th className="text-left py-2 pr-3">Customer</th>
            <th className="text-left py-2 pr-3">Items</th>
            <th className="text-right py-2 pr-3">Total</th>
            <th className="text-left py-2 pr-3">Status</th>
            {showReason && <th className="text-left py-2">Reason</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-cobalt/5 align-top">
              <td className="py-2 pr-3 font-mono text-ink">{r.order.shopifyName}</td>
              <td className="py-2 pr-3">
                <div className="text-ink">{r.order.customerName}</div>
                <div className="text-[10px] text-ink-soft">{r.order.customerEmail}</div>
              </td>
              <td className="py-2 pr-3 text-ink-soft">
                {r.order.lines.length} item{r.order.lines.length === 1 ? '' : 's'}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums text-ink font-bold">
                ${(r.order.totalCents / 100).toFixed(2)}
              </td>
              <td className="py-2 pr-3 text-[10px] uppercase tracking-wider font-bold text-cobalt">
                {r.order.status}
              </td>
              {showReason && (
                <td className="py-2 text-[11px] text-ink-soft">{r.reason}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
