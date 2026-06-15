'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { saveBulkProductChanges, type BulkRow } from './actions';

type Row = {
  handle: string;
  title: string;
  compound: string;
  vialSize: string;
  status: 'ACTIVE' | 'DRAFT';
  stockQty: number;
  priceCents: number;
  physicianPriceCents: number | null;
  costCents: number | null;
  imageUrl: string | null;
};

type EditableRow = {
  status: 'active' | 'draft';
  stockQty: string;
  retailDollars: string;
  physicianDollars: string;
  costDollars: string;
  imageUrl: string;
};

function toEditable(p: Row): EditableRow {
  return {
    status: p.status === 'ACTIVE' ? 'active' : 'draft',
    stockQty: String(p.stockQty),
    retailDollars: (p.priceCents / 100).toFixed(2),
    physicianDollars: p.physicianPriceCents !== null
      ? (p.physicianPriceCents / 100).toFixed(2) : '',
    costDollars: p.costCents !== null
      ? (p.costCents / 100).toFixed(2) : '',
    imageUrl: p.imageUrl ?? '',
  };
}

function dollarsToCents(s: string): number {
  const cleaned = s.replace(/[$,\s]/g, '');
  const n = parseFloat(cleaned);
  if (!isFinite(n)) return 0;
  return Math.round(n * 100);
}

function emptyToNullCents(s: string): number | null {
  if (s.trim() === '') return null;
  return dollarsToCents(s);
}

function emptyToNullStr(s: string): string | null {
  const t = s.trim();
  return t === '' ? null : t;
}

export function BulkProductTable({ products }: { products: Row[] }) {
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft'>('all');
  const [edits, setEdits] = useState<Record<string, EditableRow>>(() =>
    Object.fromEntries(products.map((p) => [p.handle, toEditable(p)])),
  );
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const visibleRows = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return products.filter((p) => {
      if (statusFilter === 'active' && p.status !== 'ACTIVE') return false;
      if (statusFilter === 'draft' && p.status !== 'DRAFT') return false;
      if (!f) return true;
      return (
        p.handle.includes(f) ||
        p.title.toLowerCase().includes(f) ||
        p.compound.toLowerCase().includes(f) ||
        p.vialSize.toLowerCase().includes(f)
      );
    });
  }, [products, filter, statusFilter]);

  const dirtyCount = useMemo(() => {
    let n = 0;
    for (const p of products) {
      const e = edits[p.handle];
      const base = toEditable(p);
      if (
        e.status !== base.status ||
        e.stockQty !== base.stockQty ||
        e.retailDollars !== base.retailDollars ||
        e.physicianDollars !== base.physicianDollars ||
        e.costDollars !== base.costDollars ||
        e.imageUrl !== base.imageUrl
      ) n++;
    }
    return n;
  }, [products, edits]);

  function update(handle: string, key: keyof EditableRow, value: string) {
    setEdits((prev) => ({
      ...prev,
      [handle]: { ...prev[handle], [key]: value },
    }));
    setResult(null);
  }

  function handleSave() {
    const rows: BulkRow[] = products.map((p) => {
      const e = edits[p.handle];
      return {
        handle: p.handle,
        status: e.status,
        stockQty: parseInt(e.stockQty || '0', 10) || 0,
        priceCents: dollarsToCents(e.retailDollars),
        physicianPriceCents: emptyToNullCents(e.physicianDollars),
        costCents: emptyToNullCents(e.costDollars),
        imageUrl: emptyToNullStr(e.imageUrl),
      };
    });
    startTransition(async () => {
      const r = await saveBulkProductChanges(rows);
      if (r.ok) {
        setResult({ ok: true, msg: `Saved ${r.updated} change${r.updated === 1 ? '' : 's'}. ${r.skipped} unchanged.` });
      } else {
        setResult({ ok: false, msg: r.error });
      }
    });
  }

  function resetAll() {
    setEdits(Object.fromEntries(products.map((p) => [p.handle, toEditable(p)])));
    setResult(null);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 sticky top-0 z-10 bg-cream/95 backdrop-blur py-3 -my-3 border-b border-cobalt/10">
        <input
          type="text"
          placeholder="Filter by handle, title, compound, size…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 min-w-[240px] rounded-lg border border-cobalt/15 bg-white text-sm px-3 py-2 focus:outline-none focus:border-cobalt"
        />
        <div className="flex rounded-lg border border-cobalt/15 overflow-hidden bg-white">
          {(['all', 'active', 'draft'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 text-[11px] tracking-[0.16em] uppercase font-bold transition-colors ${
                statusFilter === s ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="text-[11px] tracking-[0.16em] uppercase font-bold text-ink-soft">
          {visibleRows.length} shown · {dirtyCount} edited
        </div>
        {dirtyCount > 0 && (
          <button
            type="button"
            onClick={resetAll}
            className="text-[11px] tracking-[0.16em] uppercase font-bold text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            Reset
          </button>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={pending || dirtyCount === 0}
          className="bg-cobalt text-white px-4 py-2 rounded-lg text-[11px] font-bold tracking-[0.16em] uppercase hover:bg-ink transition-colors disabled:opacity-50"
        >
          {pending ? 'Saving…' : `Save ${dirtyCount} change${dirtyCount === 1 ? '' : 's'}`}
        </button>
      </div>

      {result && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            result.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
          }`}
        >
          {result.msg}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-cobalt/10 bg-white">
        <table className="w-full text-xs min-w-[1200px]">
          <thead className="text-[10px] tracking-[0.18em] uppercase text-ink-soft font-bold bg-cobalt/[0.03]">
            <tr>
              <th className="text-left py-3 px-3 sticky left-0 bg-cobalt/[0.03]">Product</th>
              <th className="text-left py-3 px-3 w-[88px]">Status</th>
              <th className="text-right py-3 px-3 w-[88px]">Stock</th>
              <th className="text-right py-3 px-3 w-[112px]">Retail</th>
              <th className="text-right py-3 px-3 w-[112px]">Physician</th>
              <th className="text-right py-3 px-3 w-[112px]">Cost</th>
              <th className="text-left py-3 px-3">Image URL</th>
              <th className="py-3 px-3 w-[40px]"></th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((p) => {
              const e = edits[p.handle];
              const base = toEditable(p);
              const dirty =
                e.status !== base.status ||
                e.stockQty !== base.stockQty ||
                e.retailDollars !== base.retailDollars ||
                e.physicianDollars !== base.physicianDollars ||
                e.costDollars !== base.costDollars ||
                e.imageUrl !== base.imageUrl;
              return (
                <tr
                  key={p.handle}
                  className={`border-t border-cobalt/5 align-top ${
                    dirty ? 'bg-amber-50/50' : ''
                  }`}
                >
                  <td className="py-2 px-3 sticky left-0 bg-inherit">
                    <div className="text-ink font-bold leading-tight">{p.title}</div>
                    <div className="text-[10px] text-ink-soft font-mono">
                      /{p.handle} · {p.vialSize}
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={e.status}
                      onChange={(ev) => update(p.handle, 'status', ev.target.value)}
                      className={`w-full rounded border px-2 py-1 text-xs font-bold ${
                        e.status === 'active'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-amber-300 bg-amber-50 text-amber-800'
                      }`}
                    >
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                    </select>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      min="0"
                      value={e.stockQty}
                      onChange={(ev) => update(p.handle, 'stockQty', ev.target.value)}
                      className="w-full text-right tabular-nums rounded border border-cobalt/15 px-2 py-1 focus:outline-none focus:border-cobalt"
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <DollarInput
                      value={e.retailDollars}
                      onChange={(v) => update(p.handle, 'retailDollars', v)}
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <DollarInput
                      value={e.physicianDollars}
                      onChange={(v) => update(p.handle, 'physicianDollars', v)}
                      placeholder="—"
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <DollarInput
                      value={e.costDollars}
                      onChange={(v) => update(p.handle, 'costDollars', v)}
                      placeholder="—"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={e.imageUrl}
                      placeholder="/products/sku-<slug>.webp"
                      onChange={(ev) => update(p.handle, 'imageUrl', ev.target.value)}
                      className="w-full rounded border border-cobalt/15 px-2 py-1 text-[11px] font-mono focus:outline-none focus:border-cobalt"
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <Link
                      href={`/admin/products/${encodeURIComponent(p.handle)}`}
                      className="text-[10px] tracking-[0.16em] uppercase text-cobalt font-bold hover:underline underline-offset-2"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {visibleRows.length === 0 && (
          <div className="text-center text-sm text-ink-soft py-12">
            No products match the filter.
          </div>
        )}
      </div>
    </div>
  );
}

function DollarInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-ink-soft text-xs">
        $
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        onChange={(ev) => onChange(ev.target.value)}
        className="w-full text-right tabular-nums rounded border border-cobalt/15 pl-5 pr-2 py-1 focus:outline-none focus:border-cobalt"
      />
    </div>
  );
}
