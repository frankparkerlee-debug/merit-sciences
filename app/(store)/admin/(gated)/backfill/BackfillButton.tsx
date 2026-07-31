'use client';

import { useState } from 'react';
import { runBackfill, type BackfillActionResult } from './actions';

function money(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function BackfillButton() {
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<BackfillActionResult | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setRes(null);
          try {
            setRes(await runBackfill());
          } catch (e: any) {
            setRes({ ok: false, error: e?.message ?? 'Request failed' });
          } finally {
            setLoading(false);
          }
        }}
        className="inline-flex items-center gap-2 rounded-lg bg-cobalt px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
      >
        {loading ? 'Running…' : 'Run backfill'}
      </button>

      {res && !res.ok && (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {res.error}
        </p>
      )}

      {res && res.ok && (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm">
          <p className="font-bold text-emerald-900">Backfill complete.</p>
          <ul className="mt-2 space-y-1 text-emerald-900/90">
            <li>Orders scanned: <strong>{res.result.scanned}</strong></li>
            <li>Commission rows created: <strong>{res.result.created}</strong></li>
            <li>Skipped (already credited / no affiliate / $0 base): <strong>{res.result.skipped}</strong></li>
            <li>Self-purchases (created at $0): <strong>{res.result.selfPurchases}</strong></li>
            <li>Total commission credited: <strong>{money(res.result.totalCommissionCents)}</strong></li>
          </ul>
          {res.result.byAffiliate.length > 0 && (
            <table className="mt-4 w-full text-left text-[13px]">
              <thead className="text-[10px] uppercase tracking-wider text-emerald-900/70">
                <tr>
                  <th className="py-1">Affiliate ID</th>
                  <th className="py-1 text-right">Orders</th>
                  <th className="py-1 text-right">Credited</th>
                </tr>
              </thead>
              <tbody>
                {res.result.byAffiliate.map((a) => (
                  <tr key={a.affiliateId} className="border-t border-emerald-200/60">
                    <td className="py-1 font-mono text-xs">{a.affiliateId}</td>
                    <td className="py-1 text-right">{a.orders}</td>
                    <td className="py-1 text-right font-bold">{money(a.commissionCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-3 text-xs text-emerald-900/70">
            Re-running is safe — already-credited orders are skipped.
          </p>
        </div>
      )}
    </div>
  );
}
