'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

export type LibEntry = {
  slug: string;
  title: string;
  kind: 'Compound' | 'Protocol' | 'Guide' | 'Research';
  excerpt: string;
  aka: string[];
  hasCalc: boolean;
};

const FILTERS: { key: 'all' | LibEntry['kind']; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'Compound', label: 'Compounds' },
  { key: 'Protocol', label: 'Protocols' },
  { key: 'Guide', label: 'Guides' },
  { key: 'Research', label: 'Trials' },
];

const KIND_BADGE: Record<LibEntry['kind'], string> = {
  Compound: 'bg-cobalt/10 text-cobalt',
  Protocol: 'bg-cobalt/10 text-cobalt',
  Guide: 'bg-ink/[0.07] text-ink-soft',
  Research: 'bg-star/20 text-[#8a6410]',
};

export function LibraryBrowser({ entries }: { entries: LibEntry[] }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<'all' | LibEntry['kind']>('all');

  // Seed the query from ?q= so the WebSite SearchAction (sitelinks searchbox)
  // and shared/linked searches land pre-filtered.
  useEffect(() => {
    const seed = new URLSearchParams(window.location.search).get('q');
    if (seed) setQ(seed);
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: entries.length };
    for (const e of entries) c[e.kind] = (c[e.kind] ?? 0) + 1;
    return c;
  }, [entries]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (cat !== 'all' && e.kind !== cat) return false;
      if (!query) return true;
      return (
        e.title.toLowerCase().includes(query) ||
        e.excerpt.toLowerCase().includes(query) ||
        e.aka.some((a) => a.toLowerCase().includes(query))
      );
    });
  }, [entries, q, cat]);

  return (
    <div>
      {/* search + filter bar */}
      <div className="sticky top-[56px] z-20 -mx-5 sm:-mx-6 lg:-mx-8 px-5 sm:px-6 lg:px-8 py-3 bg-cream/92 backdrop-blur border-b border-cobalt/10">
        <div className="relative">
          <svg viewBox="0 0 20 20" className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-ink-muted" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="9" r="6" />
            <path d="m14 14 3.5 3.5" strokeLinecap="round" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search compounds, protocols, guides…"
            aria-label="Search the research library"
            className="w-full rounded-xl border border-cobalt/20 bg-white pl-10 pr-9 py-2.5 text-[15px] text-ink placeholder:text-ink-muted outline-none focus:border-cobalt"
          />
          {q && (
            <button onClick={() => setQ('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink text-lg leading-none">
              ×
            </button>
          )}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = cat === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setCat(f.key)}
                className={`rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition border ${
                  active ? 'bg-ink text-white border-ink' : 'bg-white text-ink-soft border-cobalt/15 hover:border-cobalt/40'
                }`}
              >
                {f.label}
                <span className={`ml-1.5 tabular-nums ${active ? 'text-white/60' : 'text-ink-muted'}`}>{counts[f.key] ?? 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* results */}
      <p className="mt-5 text-[12px] text-ink-muted">
        {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
        {q && <> for “{q}”</>}
      </p>

      {filtered.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-cobalt/20 py-12 text-center">
          <p className="text-ink-soft">No matches for “{q}”.</p>
          <button onClick={() => { setQ(''); setCat('all'); }} className="mt-2 text-[13px] font-bold text-cobalt hover:underline">
            Clear filters
          </button>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((e) => (
            <Link
              key={e.slug}
              href={`/library/${e.slug}`}
              className="group rounded-2xl border border-cobalt/12 bg-white p-5 hover:border-cobalt/40 hover:shadow-sm transition flex flex-col"
            >
              <span className={`self-start mb-2 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${KIND_BADGE[e.kind]}`}>
                {e.kind}{e.hasCalc ? ' · Calculator' : ''}
              </span>
              <h3 className="font-display font-extrabold text-ink leading-tight group-hover:text-cobalt transition">{e.title}</h3>
              {e.excerpt && <p className="mt-2 text-[13px] text-ink-soft leading-relaxed line-clamp-3">{e.excerpt}</p>}
              <span className="mt-3 text-[12px] font-bold text-cobalt">Read →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
