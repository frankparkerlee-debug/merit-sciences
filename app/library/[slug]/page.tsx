import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ARTICLES, getArticle, CATEGORY_META } from '@/lib/library';
import { ReconstitutionCalculator } from '@/components/ReconstitutionCalculator';

export const dynamic = 'error'; // fully static
export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const a = getArticle(params.slug);
  if (!a) return { title: 'Not found · Merit Sciences' };
  const desc = a.excerpt || `${a.title} — Merit Sciences Research Library.`;
  return {
    title: `${a.title} · Merit Sciences`,
    description: desc,
    alternates: { canonical: `https://meritsciences.com/library/${a.slug}` },
    openGraph: { title: a.title, description: desc, type: 'article', url: `https://meritsciences.com/library/${a.slug}` },
  };
}

const COMPOUND = (title: string) => title.replace(/ reconstitution protocol$/i, '').trim();

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const a = getArticle(params.slug);
  if (!a) notFound();
  const related = ARTICLES.filter((x) => x.category === a.category && x.slug !== a.slug).slice(0, 4);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: a.title,
    description: a.excerpt,
    author: { '@type': 'Organization', name: 'Merit Sciences' },
    publisher: { '@type': 'Organization', name: 'Merit Sciences' },
    mainEntityOfPage: `https://meritsciences.com/library/${a.slug}`,
    isAccessibleForFree: true,
  };

  return (
    <main className="bg-cream min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="max-w-[760px] mx-auto px-5 sm:px-6 lg:px-8 pt-10 pb-16">
        {/* breadcrumb */}
        <nav className="text-[12px] text-ink-muted mb-6">
          <Link href="/library" className="hover:text-cobalt">Library</Link>
          <span className="mx-1.5">›</span>
          <span className="text-ink-soft">{CATEGORY_META[a.category].label}</span>
        </nav>

        <p className="text-[11px] tracking-[0.2em] uppercase font-bold text-cobalt mb-3">— {a.category}</p>
        <h1 className="font-display font-black text-ink tracking-[-0.035em] leading-[1.02]" style={{ fontSize: 'clamp(28px, 4.5vw, 44px)' }}>
          {a.title}
        </h1>
        {a.excerpt && <p className="mt-4 text-lg text-ink-soft leading-relaxed">{a.excerpt}</p>}

        {/* calculator (protocols only) */}
        {a.calc && <ReconstitutionCalculator calc={a.calc} compound={COMPOUND(a.title)} />}

        {/* body */}
        <div className="library-prose mt-6" dangerouslySetInnerHTML={{ __html: a.body }} />

        {/* RUO footer */}
        <p className="mt-10 pt-5 border-t border-cobalt/10 text-[12px] leading-relaxed text-ink-muted">
          For research use only. Not for human or veterinary use. Not FDA-approved. Reference information summarized
          from published literature — not medical or dosing advice.
        </p>

        {/* related */}
        {related.length > 0 && (
          <div className="mt-10">
            <p className="text-[11px] tracking-[0.2em] uppercase font-bold text-cobalt mb-3">— More {CATEGORY_META[a.category].label.toLowerCase()}</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {related.map((r) => (
                <Link key={r.slug} href={`/library/${r.slug}`} className="rounded-xl border border-cobalt/12 bg-white p-4 hover:border-cobalt/40 transition">
                  <p className="font-display font-bold text-ink text-sm leading-tight">{r.title}</p>
                  {r.excerpt && <p className="mt-1 text-[12px] text-ink-soft line-clamp-2">{r.excerpt}</p>}
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </main>
  );
}
