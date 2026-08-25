'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

/**
 * Window + source dropdowns for the analytics page. Navigation runs in a
 * transition so the CURRENT data stays on screen (dimmed, with a visible
 * "Updating…") while the server renders the new selection — the old pill
 * links gave no feedback at all, which read as "nothing happens".
 */
export function FilterBar({
  range,
  channel,
  ranges,
  channels,
  customLabel,
}: {
  range: string;
  channel: string | null;
  ranges: { key: string; label: string }[];
  channels: string[];
  /** Set when a chart-bar drill-down pinned an explicit date window. */
  customLabel?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const navigate = (r: string, c: string | null) =>
    startTransition(() => {
      router.push(`/admin/analytics?range=${r}${c ? `&channel=${encodeURIComponent(c)}` : ''}`);
    });

  const selectCls =
    'rounded-lg border border-cobalt/20 bg-white px-3 py-2 text-[12px] font-bold text-ink focus:outline-none focus:border-cobalt cursor-pointer';

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2">
        <span className="text-[10px] tracking-[0.14em] uppercase font-bold text-ink-soft/60">Window</span>
        {customLabel ? (
          <span className="inline-flex items-center gap-2 rounded-lg border border-cobalt bg-cobalt/[0.06] px-3 py-2 text-[12px] font-bold text-ink tabular-nums">
            {customLabel}
            <button
              type="button"
              onClick={() => navigate(range, channel)}
              className="text-cobalt hover:text-ink font-black"
              title="Clear the zoomed window"
            >
              ✕
            </button>
          </span>
        ) : (
          <select
            className={selectCls}
            value={range}
            onChange={(e) => navigate(e.target.value, channel)}
            disabled={pending}
          >
            {ranges.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
        )}
      </label>
      <label className="flex items-center gap-2">
        <span className="text-[10px] tracking-[0.14em] uppercase font-bold text-ink-soft/60">Source</span>
        <select
          className={selectCls}
          value={channel ?? ''}
          onChange={(e) => navigate(range, e.target.value || null)}
          disabled={pending}
        >
          <option value="">All sources</option>
          {channels.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>
      {pending && (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-cobalt">
          <span className="w-3 h-3 rounded-full border-2 border-cobalt/30 border-t-cobalt animate-spin" />
          Updating…
        </span>
      )}
    </div>
  );
}
