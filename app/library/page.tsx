import type { Metadata } from 'next';
import { ARTICLES } from '@/lib/library';
import { MONOGRAPHS } from '@/lib/monographs';
import { LibraryBrowser, type LibEntry } from '@/components/library/LibraryBrowser';

export const metadata: Metadata = {
  // Root template appends "· Merit Sciences" — don't duplicate it here.
  title: 'Research Library',
  description:
    'Compound monographs with mechanism of action and published research, trial summaries, and COA/HPLC/mass-spec explainers — the reference library for the research community. For research use only.',
  alternates: { canonical: 'https://meritsciences.com/library' },
};

const KIND_RANK: Record<LibEntry['kind'], number> = { Compound: 0, Guide: 1, Research: 2 };

function buildEntries(): LibEntry[] {
  const monos: LibEntry[] = MONOGRAPHS.map((m) => ({
    slug: m.slug, title: m.title, kind: 'Compound', excerpt: m.excerpt, aka: m.aka,
  }));
  const arts: LibEntry[] = ARTICLES.map((a) => ({
    slug: a.slug, title: a.title, kind: a.category, excerpt: a.excerpt, aka: [],
  }));
  return [...monos, ...arts].sort(
    (a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind] || a.title.localeCompare(b.title),
  );
}

export default function LibraryIndex() {
  const entries = buildEntries();
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
            {entries.length} references for the research community — {MONOGRAPHS.length} compound monographs
            with mechanism and published research, summaries of the published trials, and how
            we test every lot. For research use only.
          </p>
        </div>
      </section>

      {/* search + filter + results */}
      <div className="max-w-[1000px] mx-auto px-5 sm:px-6 lg:px-8 py-8">
        <LibraryBrowser entries={entries} />
      </div>

      <p className="max-w-[1000px] mx-auto px-5 sm:px-6 lg:px-8 pb-12 text-[12px] text-ink-muted leading-relaxed">
        Everything here is reference information summarized from published literature, for research use only —
        not for human or veterinary use, and not medical or dosing advice.
      </p>
    </main>
  );
}
