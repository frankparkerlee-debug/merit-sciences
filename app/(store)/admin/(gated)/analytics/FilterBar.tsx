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
}: {
  range: string;
  channel: string | null;
  ranges: { key: string; label: string }[];
  channels: string[];
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
