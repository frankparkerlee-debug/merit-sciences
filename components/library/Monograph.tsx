import Link from 'next/link';
import type { Monograph as Mono } from '@/lib/monographs';
import { getArticle } from '@/lib/library';
import { ProductCallout } from './ProductCallout';

function Section({ id, heading, children }: { id: string; heading: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <h2 id={id} className="font-display text-[1.4rem] font-extrabold text-ink tracking-[-0.02em] scroll-mt-24">
        {heading}
      </h2>
      <div className="mt-3 space-y-3.5 text-[15.5px] leading-[1.72] text-ink-soft">{children}</div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="py-2.5 px-3.5">
      <dt className="text-[10px] tracking-[0.14em] uppercase font-bold text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-[13.5px] text-ink leading-snug">{value}</dd>
    </div>
  );
}

export function MonographView({ m }: { m: Mono }) {
  const r = m.research;
  const related = [
    ...(m.protocolSlug ? [{ slug: m.protocolSlug, kind: 'Protocol' as const }] : []),
    ...(m.relatedSlugs ?? []).map((slug) => ({ slug, kind: 'Research' as const })),
  ]
    .map((x) => ({ ...x, article: getArticle(x.slug) }))
    .filter((x) => x.article);

  return (
    <article className="max-w-[760px] mx-auto px-5 sm:px-6 lg:px-8 pt-9 pb-16">
      {/* breadcrumb */}
      <nav className="text-[12px] text-ink-muted mb-6" aria-label="Breadcrumb">
        <Link href="/library" className="hover:text-cobalt">Library</Link>
        <span className="mx-1.5">›</span>
        <span className="text-ink-soft">Research monograph</span>
      </nav>

      {/* header */}
      <p className="text-[11px] tracking-[0.2em] uppercase font-bold text-cobalt mb-3">— Research monograph</p>
      <h1 className="font-display font-black text-ink tracking-[-0.035em] leading-[1.02]" style={{ fontSize: 'clamp(28px, 4.5vw, 44px)' }}>
        {m.title}
      </h1>
      {m.aka.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {m.aka.map((a) => (
            <span key={a} className="rounded-full bg-cobalt/8 px-2.5 py-0.5 text-[11px] font-semibold text-cobalt">{a}</span>
          ))}
        </div>
      )}
      <p className="mt-4 text-lg text-ink-soft leading-relaxed">{m.tagline}</p>

      {/* quick facts */}
      {(r.compoundClass || r.halfLife || r.solubility || r.discovery) && (
        <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 rounded-2xl border border-cobalt/12 bg-white divide-y sm:divide-y-0 sm:divide-x divide-cobalt/10 [&>div:nth-child(n+3)]:sm:border-t [&>div:nth-child(n+3)]:sm:border-cobalt/10">
          <Fact label="Class" value={r.compoundClass} />
          <Fact label="Half-life (research)" value={r.halfLife} />
          <Fact label="Origin" value={r.discovery} />
          <Fact label="Solubility" value={r.solubility} />
        </dl>
      )}

      {/* what is it */}
      <Section id="overview" heading={`What is ${m.title}?`}>
        {r.description.map((p, i) => <p key={i}>{p}</p>)}
      </Section>

      {/* mechanism */}
      {r.mechanism && (
        <Section id="mechanism" heading={`How does ${m.title} work?`}>
          <p>{r.mechanism}</p>
        </Section>
      )}

      {/* key findings */}
      {m.keyFindings.length > 0 && (
        <Section id="research" heading="What the research shows">
          <ul className="space-y-2.5 list-none pl-0">
            {m.keyFindings.map((f, i) => (
              <li key={i} className="relative pl-6">
                <span className="absolute left-0 top-2 w-2 h-2 rounded-full bg-cobalt/60" />
                {f}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* applications */}
      {r.researchApplications && r.researchApplications.length > 0 && (
        <Section id="applications" heading="Research applications">
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 list-disc pl-5 marker:text-cobalt/50">
            {r.researchApplications.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </Section>
      )}

      {/* productization — mid-article, after value is established */}
      {m.product && <ProductCallout title={m.title} product={m.product} />}

      {/* handling */}
      <Section id="handling" heading={`Handling & reconstitution`}>
        <p>
          {m.title} ships as a sealed, lyophilized (freeze-dried) powder and is reconstituted with
          bacteriostatic water for laboratory handling. {r.solubility ?? ''} Concentration equals vial
          mass divided by diluent volume.
        </p>
        {m.protocolSlug && getArticle(m.protocolSlug) && (
          <p>
            See the{' '}
            <Link href={`/library/${m.protocolSlug}`} className="text-cobalt underline font-medium">
              {getArticle(m.protocolSlug)!.title}
            </Link>{' '}
            for a step-by-step guide and an interactive research calculator (vial size → diluent → draw volume).
          </p>
        )}
      </Section>

      {/* FAQ */}
      {m.faqs.length > 0 && (
        <Section id="faq" heading="Frequently asked questions">
          <div className="divide-y divide-cobalt/10 border-t border-cobalt/10">
            {m.faqs.map((f, i) => (
              <div key={i} className="py-4">
                <h3 className="font-display font-bold text-ink text-[15.5px] leading-snug">{f.q}</h3>
                <p className="mt-1.5">{f.a}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* references */}
      {r.references.length > 0 && (
        <Section id="references" heading="References">
          <ol className="space-y-2.5 list-decimal pl-5 marker:text-ink-muted text-[13.5px]">
            {r.references.map((c, i) => (
              <li key={i}>
                <a href={c.url} target="_blank" rel="noopener noreferrer nofollow" className="text-cobalt hover:underline font-medium">
                  {c.title}
                </a>
                . {c.authors}. <em>{c.journal}</em>{c.year ? `, ${c.year}` : ''}
                {c.pubmedId ? ` · PMID ${c.pubmedId}` : c.doi ? ` · doi:${c.doi}` : ''}
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* RUO footer */}
      <p className="mt-10 pt-5 border-t border-cobalt/10 text-[12px] leading-relaxed text-ink-muted">
        For research use only. Not for human or veterinary use. Not FDA-approved. Reference information
        summarized from published literature — not medical or dosing advice.
      </p>

      {/* related */}
      {related.length > 0 && (
        <div className="mt-10">
          <p className="text-[11px] tracking-[0.2em] uppercase font-bold text-cobalt mb-3">— Keep reading</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {related.map(({ slug, kind, article }) => (
              <Link key={slug} href={`/library/${slug}`} className="rounded-xl border border-cobalt/12 bg-white p-4 hover:border-cobalt/40 transition">
                <span className="text-[10px] tracking-wide uppercase font-bold text-ink-muted">{kind}</span>
                <p className="mt-0.5 font-display font-bold text-ink text-sm leading-tight">{article!.title}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
