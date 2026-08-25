/** Route-level loading state. Shown instantly on first navigation while the
 *  server gathers data — filter changes inside the page use FilterBar's
 *  transition state instead, which keeps the current numbers visible. */
export default function Loading() {
  return (
    <main className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
      <p className="text-[10px] tracking-[0.28em] uppercase text-cobalt font-bold mb-2">— Overview</p>
      <h1 className="font-display text-3xl font-black text-ink tracking-tight mb-1">Analytics</h1>
      <p className="text-sm text-ink-soft mb-8">Loading store performance…</p>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-cobalt/10 bg-white p-4 h-[88px] animate-pulse">
            <div className="h-2.5 w-16 bg-cobalt/10 rounded mb-3" />
            <div className="h-6 w-20 bg-cobalt/15 rounded" />
          </div>
        ))}
      </div>
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-cobalt/10 bg-white p-5 h-44 animate-pulse">
            <div className="h-2.5 w-40 bg-cobalt/10 rounded mb-4" />
            <div className="h-24 bg-cobalt/[0.06] rounded-xl" />
          </div>
        ))}
      </div>
    </main>
  );
}
