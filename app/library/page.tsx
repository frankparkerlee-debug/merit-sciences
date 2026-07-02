import type { Metadata } from 'next';
import Link from 'next/link';
import { ARTICLES, articlesByCategory, CATEGORY_META, CATEGORY_ORDER } from '@/lib/library';

export const metadata: Metadata = {
  title: 'Research Library · Merit Sciences',
  description:
    'Reconstitution protocols with a research calculator, COA/HPLC/mass-spec explainers, and summaries of the published trials — the reference library for the research community.',
  alternates: { canonical: 'https://meritsciences.com/library' },
};

export default function LibraryIndex() {
  return (
    <main className="bg-cream min-h-screen">
      {/* hero */}
      <section className="bg-white border-b border-cobalt/10">
        <div className="max-w-[1000px] mx-auto px-5 sm:px-6 lg:px-8 pt-14 pb-10">
          <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">— The research library</p>
          <h1 className="font-display font-black text-ink tracking-[-0.035em] leading-[0.98] mb-4" style={{ fontSize: 'clamp(30px, 5vw, 52px)' }}>
            Do the work right<span className="text-cobalt">.</span>
          </h1>
          <p className="text-base text-ink-soft leading-relaxed max-w-2xl">
            {ARTICLES.length} references for the research community — reconstitution protocols with a live calculator,
            how we test every lot, and what the published trials actually showed. For research use only.
          </p>
        </div>
      </section>

      {/* category sections */}
      <div className="max-w-[1000px] mx-auto px-5 sm:px-6 lg:px-8 py-10 space-y-12">
        {CATEGORY_ORDER.map((cat) => {
          const items = articlesByCategory(cat);
          if (items.length === 0) return null;
          return (
            <section key={cat}>
              <div className="border-b border-cobalt/10 pb-3 mb-5">
                <h2 className="font-display text-xl font-black text-ink tracking-tight">
                  {CATEGORY_META[cat].label} <span className="text-ink-muted font-bold text-base">· {items.length}</span>
                </h2>
                <p className="text-[13px] text-ink-soft mt-1">{CATEGORY_META[cat].blurb}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/library/${a.slug}`}
                    className="group rounded-2xl border border-cobalt/12 bg-white p-5 hover:border-cobalt/40 hover:shadow-sm transition flex flex-col"
                  >
                    {a.calc && (
                      <span className="self-start mb-2 rounded-full bg-cobalt/10 px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase text-cobalt">
                        Calculator
                      </span>
                    )}
                    <h3 className="font-display font-extrabold text-ink leading-tight group-hover:text-cobalt transition">
                      {a.title}
                    </h3>
                    {a.excerpt && <p className="mt-2 text-[13px] text-ink-soft leading-relaxed line-clamp-3">{a.excerpt}</p>}
                    <span className="mt-3 text-[12px] font-bold text-cobalt">Read →</span>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <p className="max-w-[1000px] mx-auto px-5 sm:px-6 lg:px-8 pb-12 text-[12px] text-ink-muted leading-relaxed">
        Everything here is reference information summarized from published literature, for research use only —
        not for human or veterinary use, and not medical or dosing advice.
      </p>
    </main>
  );
}
