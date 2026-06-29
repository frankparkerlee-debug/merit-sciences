'use client';

import { useState } from 'react';
import { deleteCoa } from './actions';

type Row = {
  id: string;
  compound: string;
  lotId: string;
  purity: string;
  testedDate: string;
  fileUrl: string;
  fileName: string | null;
};

export function CoaList({ rows }: { rows: Row[] }) {
  const [items, setItems] = useState(rows);
  const [busy, setBusy] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-cobalt/20 bg-white px-5 py-8 text-center text-sm text-ink-soft">
        No COAs published yet. Upload one above — it appears here and on the public library instantly.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-cobalt/12 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-cobalt/5 text-[10px] tracking-[0.16em] uppercase text-ink-soft font-bold">
          <tr>
            <th className="px-4 py-2.5 text-left">Compound</th>
            <th className="px-4 py-2.5 text-left">Lot</th>
            <th className="px-4 py-2.5 text-left">Purity</th>
            <th className="px-4 py-2.5 text-left">Tested</th>
            <th className="px-4 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.id} className="border-t border-cobalt/8">
              <td className="px-4 py-2.5 font-bold text-ink">{c.compound}</td>
              <td className="px-4 py-2.5 font-mono text-[13px] text-ink-soft">{c.lotId}</td>
              <td className="px-4 py-2.5 tabular-nums">{c.purity}</td>
              <td className="px-4 py-2.5 text-ink-soft">{c.testedDate}</td>
              <td className="px-4 py-2.5 text-right whitespace-nowrap">
                <a
                  href={c.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-cobalt hover:underline mr-4"
                >
                  View
                </a>
                <button
                  type="button"
                  disabled={busy === c.id}
                  onClick={async () => {
                    if (!confirm(`Remove the COA for ${c.compound} (lot ${c.lotId})?`)) return;
                    setBusy(c.id);
                    const out = await deleteCoa(c.id);
                    setBusy(null);
                    if (out.ok) setItems((prev) => prev.filter((x) => x.id !== c.id));
                    else alert(out.error);
                  }}
                  className="text-xs font-bold text-rose-700 hover:underline disabled:opacity-50"
                >
                  {busy === c.id ? '…' : 'Delete'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
