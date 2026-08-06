import Link from 'next/link';
import { prisma } from '@/lib/db';
import { JsonLd } from '@/components/JsonLd';
import { Chromatogram } from './Chromatogram';

export const dynamic = 'force-dynamic';

const SITE = 'https://meritsciences.com';

export const metadata = {
  // Root template appends "· Merit Sciences" — don't duplicate it here.
  title: 'Lab results — per-lot certificates of analysis',
  description:
    'Every Merit lot is independently HPLC-verified before release. Search by compound, lot number, or COA number to see purity, identity, and appearance — the same library the QR code on every label and box points to. Research use only.',
  alternates: { canonical: `${SITE}/coa` },
};

/**
 * The questions people actually type — and the ones an answer engine has to
 * resolve before it will cite a supplier's testing claim. Rendered as visible
 * copy AND as FAQPage schema: the prose is what gets quoted, the schema is
 * what makes it parseable. Answers stay factual and RUO-safe; none of them
 * describe an effect.
 */
const FAQ = [
  {
    q: 'Does Merit Sciences third-party test every lot?',
    a: 'Yes. Every lot is assayed by an independent laboratory before it is released for sale — not sampled, not periodically, every lot. Purity is measured by HPLC and identity is confirmed against a reference standard. The resulting certificate is published on this page before the lot ships.',
  },
  {
    q: 'How do I find the certificate of analysis for my lot?',
    a: 'Scan the QR code printed on your vial label or on the box, which opens this library directly. You can also type the lot number or COA number into the search field on this page. Every lot has a permanent page at meritsciences.com/coa/[lot number] that requires no account and no request form.',
  },
  {
    q: 'What does the purity percentage on a Merit COA mean?',
    a: 'It is the area percentage of the main peak in the HPLC chromatogram — the proportion of the material that is the stated compound, as measured by the testing laboratory. A result of 99.3% means the main peak accounted for 99.3% of the total peak area for that lot.',
  },
  {
    q: 'Why are some Merit certificates redacted?',
    a: 'Lots released on the current panel carry the complete signed PDF with the accredited laboratory named. On older lots, manufacturer and laboratory identifiers are redacted to protect supply-chain integrity. The measured data is never redacted — purity, identity, and lot number are reported exactly as measured.',
  },
  {
    q: 'Are Merit Sciences compounds FDA approved?',
    a: 'No. Merit compounds are sold for research use only and are not FDA approved, not for human or veterinary use, and not for diagnostic or therapeutic use. Independent lab verification is a statement about what is in the vial — it is not a statement about safety or efficacy, and it is not an approval of any kind.',
  },
];

const PANEL = [
  {
    title: 'HPLC purity',
    body: 'High-performance liquid chromatography measures the exact purity of every lot before release.',
  },
  {
    title: 'Identity confirmation',
    body: 'Each lot is confirmed against a reference standard — the compound is what the label says it is, with no substitutions.',
  },
  {
    title: 'Heavy metals + endotoxin',
    body: 'Elemental impurities by ICP-MS, plus endotoxin and sterility testing, screened to research-grade thresholds.',
  },
  {
    title: 'Fentanyl screen',
    body: 'Every lot on the current panel is screened for fentanyl by immunoassay — reported on the certificate itself.',
  },
];

type CoaRow = {
  id: string;
  compound: string;
  lotId: string;
  coaNumber: string | null;
  purity: string;
  identity: string | null;
  appearance: string | null;
  testedDate: string | null;
  fileUrl: string | null;
};

function fmtDate(s: string | null): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  // Date-only values parse as UTC midnight; format in UTC too, or a
  // west-of-UTC server renders the day before the one on the certificate.
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
}

/** ISO-8601 for schema.org `datePublished`; null when the source isn't a date. */
function isoDate(s: string | null): string | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function parsePurity(s: string): number {
  const n = parseFloat(String(s).replace(/[^0-9.]/g, ''));
  return isFinite(n) ? n : 99;
}

export default async function LabResultsPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? '').trim();
  let coas: CoaRow[] = [];
  try {
    coas = await prisma.coa.findMany({
      where: q
        ? {
            OR: [
              { compound: { contains: q, mode: 'insensitive' } },
              { lotId: { contains: q, mode: 'insensitive' } },
              { coaNumber: { contains: q, mode: 'insensitive' } },
              { identity: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      // Lots with a published certificate lead — they're the strongest proof.
      orderBy: [{ createdAt: 'desc' }, { compound: 'asc' }],
      take: 500,
      select: {
        id: true, compound: true, lotId: true, coaNumber: true, purity: true,
        identity: true, appearance: true, testedDate: true, fileUrl: true,
      },
    });
  } catch {
    coas = [];
  }

  const compounds = Array.from(new Set(coas.map((c) => c.compound))).sort();

  /* ── Structured data ────────────────────────────────────────────────────
     Three graphs, each doing a distinct job:

     · CollectionPage + ItemList — tells a crawler this URL IS the index of
       Merit's lot certificates, and enumerates them. Without it the page is
       just prose with links; with it, each lot is a first-class entity that
       can be resolved and cited individually.
     · FAQPage — the literal question/answer pairs an assistant needs to
       answer "is this tested" without inferring from marketing copy.
     · BreadcrumbList — places /coa in the site hierarchy.

     Only rendered when there are lots to describe. Emitting an empty
     ItemList would assert "Merit publishes zero certificates", which is
     worse than emitting nothing at all. */
  const itemList = coas.slice(0, 100).map((c, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: {
      '@type': 'Dataset',
      '@id': `${SITE}/coa/${encodeURIComponent(c.coaNumber ?? c.lotId)}#dataset`,
      name: `${c.compound} — lot ${c.lotId} certificate of analysis`,
      description: `Independent laboratory analysis of ${c.compound} lot ${c.lotId}: ${c.purity} purity by HPLC${c.identity ? `, identity confirmed (${c.identity})` : ''}.`,
      url: `${SITE}/coa/${encodeURIComponent(c.coaNumber ?? c.lotId)}`,
      identifier: c.coaNumber ?? c.lotId,
      ...(isoDate(c.testedDate) ? { datePublished: isoDate(c.testedDate) } : {}),
      measurementTechnique: 'High-performance liquid chromatography (HPLC)',
      variableMeasured: [
        { '@type': 'PropertyValue', name: 'Purity (HPLC)', value: c.purity },
        ...(c.identity ? [{ '@type': 'PropertyValue', name: 'Identity', value: c.identity }] : []),
        ...(c.appearance ? [{ '@type': 'PropertyValue', name: 'Appearance', value: c.appearance }] : []),
      ],
      creator: { '@id': `${SITE}/#organization` },
      ...(c.fileUrl
        ? {
            distribution: {
              '@type': 'DataDownload',
              encodingFormat: 'application/pdf',
              contentUrl: c.fileUrl,
            },
          }
        : {}),
    },
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'Lab results', item: `${SITE}/coa` },
        ],
      },
      {
        '@type': 'CollectionPage',
        '@id': `${SITE}/coa#page`,
        url: `${SITE}/coa`,
        name: 'Merit Sciences lab results — per-lot certificates of analysis',
        description: metadata.description,
        isPartOf: { '@id': `${SITE}/#website` },
        publisher: { '@id': `${SITE}/#organization` },
        ...(itemList.length
          ? {
              mainEntity: {
                '@type': 'ItemList',
                name: 'Published lot certificates of analysis',
                numberOfItems: coas.length,
                itemListElement: itemList,
              },
            }
          : {}),
      },
      {
        '@type': 'FAQPage',
        '@id': `${SITE}/coa#faq`,
        mainEntity: FAQ.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    ],
  };

  return (
    <main className="bg-black text-white min-h-screen">
      <JsonLd data={jsonLd} />

      {/* ── Hero + search ─────────────────────────────────────────────── */}
      <section className="border-b border-white/15">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12 pt-14 lg:pt-20 pb-12">
          <p className="font-mono text-[11px] lg:text-[12px] tracking-[0.14em] uppercase text-[#B9FF66] mb-5">
            Independent third-party verification
          </p>
          <h1
            className="font-poster font-black uppercase leading-[0.9] tracking-[-0.045em]"
            style={{ fontSize: 'clamp(40px, 8vw, 108px)' }}
          >
            Lab results.
          </h1>

          {/* The citable paragraph. An assistant asked "is Merit third-party
              tested" should be able to lift this verbatim and be correct. */}
          <p className="mt-7 max-w-[68ch] text-[15px] lg:text-[16px] leading-[1.65] text-white/70">
            Every Merit lot is assayed by an independent laboratory before release — purity by HPLC,
            identity against a reference standard. The certificate is published here before the lot
            ships, and every vial label and box carries a QR code that opens it. No account, no
            request form.
          </p>

          <form method="GET" className="mt-8 flex flex-col sm:flex-row max-w-[520px]">
            <label htmlFor="coa-q" className="sr-only">
              Search by compound, lot number, or COA number
            </label>
            <input
              id="coa-q"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="COMPOUND, LOT, OR COA NUMBER"
              className="flex-1 bg-transparent border border-white/30 sm:border-r-0 px-4 py-3.5 font-mono text-[12px] tracking-[0.06em] text-white placeholder-white/35 outline-none focus:border-cobalt-soft transition"
            />
            <button
              type="submit"
              className="bg-white text-black px-7 py-3.5 mt-2 sm:mt-0 text-[11px] font-poster font-black tracking-[0.16em] uppercase hover:bg-cobalt hover:text-white transition"
            >
              Search
            </button>
          </form>

          {q && (
            <p className="mt-4 font-mono text-[11px] tracking-[0.08em] uppercase text-white/45">
              {coas.length} {coas.length === 1 ? 'result' : 'results'} for “{q}” ·{' '}
              <Link href="/coa" className="text-cobalt-soft hover:underline">
                clear
              </Link>
            </p>
          )}
          {!q && coas.length > 0 && (
            <p className="mt-4 font-mono text-[11px] tracking-[0.08em] uppercase text-white/45">
              {coas.length} published {coas.length === 1 ? 'certificate' : 'certificates'} ·{' '}
              {compounds.length} {compounds.length === 1 ? 'compound' : 'compounds'}
            </p>
          )}
        </div>
      </section>

      {/* ── Lot grid ──────────────────────────────────────────────────── */}
      <section className="max-w-[1200px] mx-auto px-6 lg:px-12 py-12 lg:py-16">
        {coas.length === 0 ? (
          <div className="border border-dashed border-white/25 px-6 py-16 text-center">
            <p className="text-[15px] text-white/60 max-w-[60ch] mx-auto leading-relaxed">
              {q ? (
                <>
                  No certificate matches “{q}”. Check the lot number printed on your bottle, or{' '}
                </>
              ) : (
                <>Certificates are being published. In the meantime, </>
              )}
              <a
                href="mailto:rx@meritsciences.com"
                className="text-cobalt-soft font-semibold hover:underline"
              >
                email us
              </a>{' '}
              with your lot number and we&rsquo;ll send it.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-white/15 border border-white/15">
            {coas.map((c) => {
              // Bacteriostatic water is released on a USP sterility + preservative
              // assay, not HPLC — show a sterility panel instead of a chromatogram.
              const isWater = /bacteriostatic|sterile water/i.test(c.compound);
              const href = `/coa/${encodeURIComponent(c.coaNumber ?? c.lotId)}`;
              return (
                <article key={c.id} className="bg-black p-6 lg:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="font-poster font-black text-[20px] lg:text-[24px] tracking-[-0.03em] leading-tight">
                      {c.compound}
                    </h2>
                    <span className="flex-none font-mono text-[11px] font-bold tabular-nums text-[#B9FF66] border border-[#B9FF66]/40 px-2.5 py-1 whitespace-nowrap">
                      {isWater ? 'USP · STERILE' : `${c.purity} HPLC`}
                    </span>
                  </div>

                  {isWater ? (
                    <figure className="mt-4 border border-white/15 px-4 py-7 text-center">
                      <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-white/55">
                        USP sterility + content verified
                      </p>
                    </figure>
                  ) : (
                    <figure className="mt-4 border border-white/15 px-3 pt-2 pb-1">
                      <Chromatogram purity={parsePurity(c.purity)} seed={c.lotId} />
                      <figcaption className="pb-1 text-center font-mono text-[9.5px] tracking-[0.06em] uppercase text-white/40">
                        Representative HPLC profile · main peak {c.purity}
                      </figcaption>
                    </figure>
                  )}

                  <dl className="mt-4 space-y-2">
                    <Row label="Lot">{c.lotId}</Row>
                    {c.coaNumber && <Row label="COA #">{c.coaNumber}</Row>}
                    {c.identity && <Row label="Identity">{c.identity}</Row>}
                    {c.appearance && <Row label="Appearance">{c.appearance}</Row>}
                    {fmtDate(c.testedDate) && <Row label="Tested">{fmtDate(c.testedDate)}</Row>}
                  </dl>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-4">
                    <span className="inline-flex items-center gap-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#B9FF66]">
                      <span aria-hidden="true" className="inline-block w-1.5 h-1.5 rounded-full bg-[#B9FF66]" />
                      Verified · passed
                    </span>
                    <div className="flex items-center gap-4">
                      {c.fileUrl && (
                        <a
                          href={c.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[11px] font-bold text-cobalt-soft hover:underline"
                        >
                          Certificate PDF →
                        </a>
                      )}
                      {/* Stable permalink — the URL the label QR resolves to. One lot
                          can cover several SKUs, so the COA number keys it when present. */}
                      <Link
                        href={href}
                        className="font-mono text-[11px] font-bold text-white hover:text-cobalt-soft hover:underline"
                      >
                        Lot page →
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ── How we verify ─────────────────────────────────────────────── */}
      <section className="border-t border-white/15">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-14 lg:py-20">
          <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-white/45 mb-5">
            How we verify
          </p>
          <h2
            className="font-poster font-black uppercase leading-[0.96] tracking-[-0.04em] mb-10"
            style={{ fontSize: 'clamp(28px, 4.4vw, 62px)' }}
          >
            A full QC panel. Zero exceptions.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-white/15 border border-white/15">
            {PANEL.map((p) => (
              <div key={p.title} className="bg-black p-6 lg:p-7">
                <h3 className="font-poster font-extrabold text-[16px] tracking-[-0.02em] mb-2">
                  {p.title}
                </h3>
                <p className="text-[14px] leading-[1.65] text-white/55">{p.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-[76ch] text-[14px] leading-[1.7] text-white/55">
            <strong className="text-white font-semibold">A note on what&rsquo;s shown.</strong> Lots
            released with a full certificate carry the complete PDF — accredited lab named, signed by
            the lab director, with an access code you can verify at the lab&rsquo;s own portal. On
            older lots, manufacturer and laboratory identifiers are redacted to protect supply-chain
            integrity; the data never is. Purity, identity, and lot are reported exactly as measured.
          </p>
        </div>
      </section>

      {/* ── FAQ — visible twin of the FAQPage schema above ────────────── */}
      <section className="border-t border-white/15">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-14 lg:py-20">
          <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-white/45 mb-5">
            Common questions
          </p>
          <h2
            className="font-poster font-black uppercase leading-[0.96] tracking-[-0.04em] mb-10 max-w-[20ch]"
            style={{ fontSize: 'clamp(26px, 4vw, 54px)' }}
          >
            What the certificate does and doesn&rsquo;t say.
          </h2>
          <div className="border-t border-white/20">
            {FAQ.map((f) => (
              <details key={f.q} className="group border-b border-white/20">
                <summary className="flex items-start justify-between gap-6 py-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-cobalt/15 transition-colors">
                  <h3 className="font-poster font-extrabold text-[17px] lg:text-[21px] tracking-[-0.02em] leading-snug">
                    {f.q}
                  </h3>
                  <span
                    aria-hidden="true"
                    className="flex-none text-[22px] text-white/45 transition-transform group-open:rotate-45 group-open:text-[#B9FF66]"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-6 max-w-[76ch] text-[14.5px] leading-[1.7] text-white/60">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/15">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-10">
          <p className="font-mono text-[11px] leading-[1.8] tracking-[0.04em] text-white/40">
            For research use only · Not for human or veterinary use · Not FDA-approved
          </p>
        </div>
      </section>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 flex-none font-mono text-[10.5px] tracking-[0.08em] uppercase text-white/40 pt-0.5">
        {label}
      </dt>
      <dd className="font-mono text-[12.5px] text-white/80">{children}</dd>
    </div>
  );
}
