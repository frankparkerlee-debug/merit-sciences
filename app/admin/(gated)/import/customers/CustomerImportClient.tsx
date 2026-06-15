'use client';

import { useState, useTransition } from 'react';
import { parseCustomersCsv, applyCustomersCsv, type CustomerDiff } from './actions';

export function CustomerImportClient() {
  const [diff, setDiff] = useState<CustomerDiff | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [applyResult, setApplyResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pendingApply, startTransition] = useTransition();

  async function handleParse(formData: FormData) {
    setParseError(null);
    setDiff(null);
    setApplyResult(null);
    const result = (await parseCustomersCsv(null, formData)) as any;
    if ('error' in result) {
      setParseError(result.error);
      return;
    }
    setDiff(result as CustomerDiff);
  }

  function handleApply() {
    if (!diff) return;
    setApplyResult(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.append('diff', JSON.stringify(diff));
      const result = await applyCustomersCsv(null, fd);
      if (result.ok) {
        setApplyResult({ ok: true, msg: result.message });
        setDiff(null);
      } else {
        setApplyResult({ ok: false, msg: result.error });
      }
    });
  }

  const createRows = diff?.rows.filter((r) => r.action === 'create') ?? [];
  const updateRows = diff?.rows.filter((r) => r.action === 'update') ?? [];
  const skippedRows = diff?.rows.filter((r) => r.action === 'skip-affiliate' || r.action === 'skip-newsletter') ?? [];

  return (
    <div className="space-y-5">
      {/* Upload form */}
      <form action={handleParse} className="rounded-2xl border border-cobalt/15 bg-white p-6">
        <label htmlFor="csv" className="block text-xs font-bold tracking-wider uppercase text-ink-soft mb-2">
          Customers CSV (Shopify export format)
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
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
              <Stat label="Total rows" value={diff.totalRows} />
              <Stat label="To create" value={diff.toCreate} accent="emerald" />
              <Stat label="To update" value={diff.toUpdate} accent="cobalt" />
              <Stat label="Affiliates skipped" value={diff.skippedAffiliate} accent="rose" />
              <Stat label="Newsletter skipped" value={diff.skippedNewsletter} accent="rose" />
            </div>
            {(diff.toCreate + diff.toUpdate) > 0 && (
              <button
                type="button"
                onClick={handleApply}
                disabled={pendingApply}
                className="mt-5 bg-ink text-white px-5 py-3 rounded-xl text-xs font-bold tracking-wider uppercase hover:bg-cobalt transition disabled:opacity-60"
              >
                {pendingApply ? 'Importing…' : `Import ${diff.toCreate + diff.toUpdate} customer${(diff.toCreate + diff.toUpdate) === 1 ? '' : 's'}`}
              </button>
            )}
          </div>

          {createRows.length > 0 && (
            <Section title={`Will create (${createRows.length})`} tone="emerald">
              <CustomerTable rows={createRows} mode="create" />
            </Section>
          )}
          {updateRows.length > 0 && (
            <Section title={`Will update (${updateRows.length})`} tone="cobalt">
              <CustomerTable rows={updateRows} mode="update" />
            </Section>
          )}
          {skippedRows.length > 0 && (
            <Section title={`Skipped (${skippedRows.length})`} tone="rose">
              <p className="text-xs text-ink-soft mb-3">
                These rows are skipped because they belong elsewhere &mdash; either affiliates
                (managed in /admin/affiliates) or newsletter-only signups (will be imported when
                the newsletter table is built in a follow-up push).
              </p>
              <CustomerTable rows={skippedRows} mode="skip" />
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

function CustomerTable({ rows, mode }: { rows: CustomerDiff['rows']; mode: 'create' | 'update' | 'skip' }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="text-[10px] tracking-wider uppercase text-ink-soft font-bold">
          <tr className="border-b border-cobalt/10">
            <th className="text-left py-2 pr-3">Email</th>
            <th className="text-left py-2 pr-3">Name</th>
            <th className="text-left py-2 pr-3">Location</th>
            <th className="text-right py-2 pr-3">Orders</th>
            <th className="text-right py-2 pr-3">Spent</th>
            {mode === 'skip' && <th className="text-left py-2">Reason</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-cobalt/5">
              <td className="py-2 pr-3 text-ink">{r.row.email}</td>
              <td className="py-2 pr-3 text-ink">{r.row.fullName || <span className="text-ink-soft/50">—</span>}</td>
              <td className="py-2 pr-3 text-ink-soft">
                {[r.row.city, r.row.state, r.row.country].filter(Boolean).join(', ') || <span className="text-ink-soft/50">—</span>}
              </td>
              <td className="py-2 pr-3 text-right tabular-nums text-ink">{r.row.totalOrders}</td>
              <td className="py-2 pr-3 text-right tabular-nums text-ink font-bold">
                ${(r.row.totalSpentCents / 100).toFixed(2)}
              </td>
              {mode === 'skip' && (
                <td className="py-2 text-[11px] text-ink-soft">{r.reason}</td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
