import Link from 'next/link';
import { listCoaRecords } from '@/lib/coa-cache';
import {
  batchLabelOf,
  certificatePath,
  classifyCoas,
  compoundKey,
  countLots,
  labReference,
} from '@/lib/coa-batch';
import { JsonLd } from '@/components/JsonLd';
import { Chromatogram } from './Chromatogram';

/* One card per compound (its current batch), so the page stays small without
   pagination: it used to render all ~150 certificates at once, each with a
   5 KB inline chromatogram, which made this a 1.6 MB document. */

export const dynamic = 'force-dynamic';

const SITE = 'https://meritsciences.com';

export const metadata = {
  // Root template appends "· Merit Sciences" — don't duplicate it here.
  title: 'Lab results: per-batch certificates of analysis',
  description:
    'Every Merit batch is independently HPLC-verified before it is listed. See the current batch certificate for each compound (purity, identity, and appearance) in the same library the QR code on every label and box opens. Research use only.',
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
    q: 'Does Merit Sciences third-party test every batch?',
    a: 'Yes. Every batch is assayed by an independent laboratory before it is listed for sale, not sampled, not periodically, every batch. Purity is measured by HPLC and identity is confirmed against a reference standard. The resulting certificate is published on this page before the batch is listed.',
  },
  {
    q: 'How do I find the certificate of analysis for my batch?',
    a: 'Scan the QR code printed on your vial label or on the box, which opens this library directly. Search by compound to find the certificate for the batch currently shipping, or by the lab reference printed on your certificate. Every certificate has a permanent page that requires no account and no request form.',
  },
  {
    q: 'What does the purity percentage on a Merit COA mean?',
    a: 'It is the area percentage of the main peak in the HPLC chromatogram: the proportion of the material that is the stated compound, as measured by the testing laboratory. A result of 99.3% means the main peak accounted for 99.3% of the total peak area for that batch.',
  },
  {
    q: 'Why are some Merit certificates redacted?',
    a: 'Batches released on the current panel carry the complete signed PDF with the accredited laboratory named. On older batches, manufacturer and laboratory identifiers are redacted to protect supply-chain integrity. The measured data is never redacted: purity, identity, and batch identifier are reported exactly as measured.',
  },
  {
    q: 'Are Merit Sciences compounds FDA approved?',
    a: 'No. Merit compounds are sold for research use only and are not FDA approved, not for human or veterinary use, and not for diagnostic or therapeutic use. Independent lab verification is a statement about what is in the vial. It is not a statement about safety or efficacy, and it is not an approval of any kind.',
  },
];

const PANEL = [
  {
    title: 'HPLC purity',
    body: 'High-performance liquid chromatography measures the exact purity of every batch before it is listed.',
  },
  {
    title: 'Identity confirmation',
    body: 'Each batch is confirmed against a reference standard: the compound is what the label says it is, with no substitutions.',
  },
  {
    title: 'Heavy metals + endotoxin',
    body: 'Elemental impurities by ICP-MS, plus endotoxin and sterility testing, screened to research-grade thresholds.',
  },
  {
    title: 'Fentanyl screen',
    body: 'Every batch on the current panel is screened for fentanyl by immunoassay, reported on the certificate itself.',
  },
];

type CoaRow = {
  id: string;
  compound: string;
  productHandle: string | null;
  lotId: string;
  coaNumber: string | null;
  purity: string;
  identity: string | null;
  appearance: string | null;
  testedDate: string | null;
  fileUrl: string | null;
  createdAt: Date | string;
  retiredAt: Date | string | null;
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

function matches(c: CoaRow, needle: string): boolean {
  return [c.compound, c.lotId, c.coaNumber, c.identity]
    .some((v) => (v ?? '').toLowerCase().includes(needle));
}

export default async function LabResultsPage({ searchParams }: { searchParams: { q?: string; page?: string } }) {
  const q = (searchParams.q ?? '').trim();

  /* One cached read of every certificate (lib/coa-cache), classified by batch
     (lib/coa-batch). The index lists only each compound's current batch;
     earlier batches sit behind a quiet disclosure on the same card, and their
     pages stay live so an older vial's QR code still resolves. Retired legacy
     certificates are left out of the index entirely, as before. */
  let records: CoaRow[] = [];
  try {
    records = (await listCoaRecords()) as unknown as CoaRow[];
  } catch {
    records = [];
  }
  const { groups } = classifyCoas(records);
  const lotCounts = countLots(records);
  const certPath = (c: CoaRow) => certificatePath(c, lotCounts);

  /* Search runs over the same cached rows. A compound, a lab reference from
     an older certificate, or a product title from the PDP link all land on
     the right card; a hit on an earlier batch opens that card's disclosure. */
  const needle = q.toLowerCase();
  // Product titles carry the blend's parts in parentheses, e.g.
  // "Wolverine (BPC-157 10mg + TB-500 10mg)": try the name and the parts.
  const qBases = q
    ? [q, ...Array.from(q.matchAll(/\(([^)]*)\)/g), (m) => m[1])]
        .map((s) => compoundKey(s).base)
        .filter(Boolean)
    : [];
  const visible = groups
    .filter((g) => g.current.length > 0)
    .map((g) => {
      if (!q) return { g, archivedHit: false };
      const baseHit = qBases.includes(compoundKey(g.name).base);
      const currentHit = baseHit || g.current.some((c) => matches(c, needle));
      const archivedMatch = g.archived.some((c) => matches(c, needle));
      // Open the disclosure only when the search named an earlier batch's lab
      // reference, not when it merely named the compound.
      const archivedHit = g.archived.some((c) =>
        [c.lotId, c.coaNumber].some((v) => (v ?? '').toLowerCase().includes(needle)),
      );
      return currentHit || archivedMatch ? { g, archivedHit } : null;
    })
    .filter((x): x is { g: (typeof groups)[number]; archivedHit: boolean } => x !== null);

  /* ── Structured data ────────────────────────────────────────────────────
     Three graphs, each doing a distinct job:

     · CollectionPage + ItemList: this URL is the index of Merit's current
       batch certificates, and enumerates them. Earlier batches are not
       listed; their pages are noindex.
     · FAQPage: the literal question/answer pairs an assistant needs to
       answer "is this tested" without inferring from marketing copy.
     · BreadcrumbList: places /coa in the site hierarchy.

     Only rendered when there are certificates to describe. Emitting an empty
     ItemList would assert "Merit publishes zero certificates", which is
     worse than emitting nothing at all. */
  const currentRows = visible.flatMap((v) => v.g.current);
  const itemList = currentRows.map((c, i) => {
    const label = batchLabelOf(c);
    return {
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Dataset',
        '@id': `${SITE}${certPath(c)}#dataset`,
        name: `${c.compound}, ${label}: certificate of analysis`,
        description: `Independent laboratory analysis of the ${label} of ${c.compound}: ${c.purity} purity by HPLC${c.identity ? `, identity confirmed (${c.identity})` : ''}.`,
        url: `${SITE}${certPath(c)}`,
        identifier: c.coaNumber ?? c.lotId,
        ...(isoDate(c.testedDate) ? { datePublished: isoDate(c.testedDate) } : {}),
        measurementTechnique: 'High-performance liquid chromatography (HPLC)',
        variableMeasured: [
          { '@type': 'PropertyValue', name: 'Purity (HPLC)', value: c.purity },
          ...(c.identity ? [{ '@type': 'PropertyValue', name: 'Identity', value: c.identity }] : []),
          ...(c.appearance ? [{ '@type': 'PropertyValue', name: 'Appearance', value: c.appearance }] : []),
          { '@type': 'PropertyValue', name: 'Batch', value: label },
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
    };
  });

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
        name: 'Merit Sciences lab results: certificates of analysis by batch',
        description: metadata.description,
        isPartOf: { '@id': `${SITE}/#website` },
        publisher: { '@id': `${SITE}/#organization` },
        ...(itemList.length
          ? {
              mainEntity: {
                '@type': 'ItemList',
                name: 'Current batch certificates of analysis',
                numberOfItems: itemList.length,
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
    <main className="bg-white text-ink min-h-screen">
      <JsonLd data={jsonLd} />

      {/* ── Hero + search ─────────────────────────────────────────────── */}
      <section className="border-b border-ink/10">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12 pt-14 lg:pt-20 pb-12">
          <p className="font-mono text-[11px] lg:text-[12px] tracking-[0.14em] uppercase text-cobalt mb-5">
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
          <p className="mt-7 max-w-[68ch] text-[15px] lg:text-[16px] leading-[1.65] text-ink-soft">
            Every Merit batch is assayed by an independent laboratory before it is listed: purity by HPLC,
            identity against a reference standard. The certificate is published here before the batch
            ships, and every vial label and box carries a QR code that opens this library. No account,
            no request form.
          </p>

          <form method="GET" className="mt-8 flex flex-col sm:flex-row max-w-[520px]">
            <label htmlFor="coa-q" className="sr-only">
              Search by compound or lab reference
            </label>
            <input
              id="coa-q"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="COMPOUND OR LAB REFERENCE"
              className="flex-1 bg-white border border-ink/25 sm:border-r-0 px-4 py-3.5 font-mono text-[12px] tracking-[0.06em] text-ink placeholder-ink-muted outline-none focus:border-cobalt transition"
            />
            <button
              type="submit"
              className="bg-ink text-white px-7 py-3.5 mt-2 sm:mt-0 text-[11px] font-poster font-black tracking-[0.16em] uppercase hover:bg-cobalt transition"
            >
              Search
            </button>
          </form>

          {q && (
            <p className="mt-4 font-mono text-[11px] tracking-[0.08em] uppercase text-ink-muted">
              {visible.length} {visible.length === 1 ? 'result' : 'results'} for “{q}” ·{' '}
              <Link href="/coa" className="text-cobalt hover:underline">
                clear
              </Link>
            </p>
          )}
          {!q && visible.length > 0 && (
            <p className="mt-4 font-mono text-[11px] tracking-[0.08em] uppercase text-ink-muted">
              Current batch certificates · {visible.length}{' '}
              {visible.length === 1 ? 'compound' : 'compounds'}
            </p>
          )}
        </div>
      </section>

      {/* ── Certificate grid: one card per compound, current batch ────── */}
      <section className="max-w-[1200px] mx-auto px-6 lg:px-12 py-12 lg:py-16">
        {visible.length === 0 ? (
          <div className="border border-dashed border-ink/20 px-6 py-16 text-center">
            <p className="text-[15px] text-ink-soft max-w-[60ch] mx-auto leading-relaxed">
              {q ? (
                <>
                  No certificate matches “{q}”. Try the compound name, or{' '}
                </>
              ) : (
                <>Certificates are being published. In the meantime, </>
              )}
              <a
                href="mailto:support@meritsciences.com"
                className="text-cobalt font-semibold hover:underline"
              >
                email us
              </a>{' '}
              with your order number and we&rsquo;ll send it.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-ink/10 border border-ink/10">
            {visible.map(({ g, archivedHit }) => {
              const c = g.current[0];
              const alsoCurrent = g.current.slice(1);
              // Bacteriostatic water is released on a USP sterility + preservative
              // assay, not HPLC: show a sterility panel instead of a chromatogram.
              const isWater = /bacteriostatic|sterile water/i.test(c.compound);
              const href = certPath(c);
              const tested = fmtDate(c.testedDate);
              return (
                <article key={g.key} className="bg-white p-6 lg:p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="font-poster font-black text-[20px] lg:text-[24px] tracking-[-0.03em] leading-tight">
                        {c.compound}
                      </h2>
                      <p className="mt-1 font-mono text-[11px] font-bold tracking-[0.08em] uppercase text-cobalt">
                        {batchLabelOf(c)}
                      </p>
                    </div>
                    <span className="flex-none font-mono text-[11px] font-bold tabular-nums text-success border border-success/40 px-2.5 py-1 whitespace-nowrap">
                      {isWater ? 'USP · STERILE' : `${c.purity} HPLC`}
                    </span>
                  </div>

                  {isWater ? (
                    <figure className="mt-4 border border-ink/10 px-4 py-7 text-center">
                      <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                        USP sterility + content verified
                      </p>
                    </figure>
                  ) : (
                    <figure className="mt-4 border border-ink/10 px-3 pt-2 pb-1">
                      <Chromatogram purity={parsePurity(c.purity)} seed={c.coaNumber ?? c.lotId} />
                      <figcaption className="pb-1 text-center font-mono text-[9.5px] tracking-[0.06em] uppercase text-ink-muted">
                        Representative HPLC profile · main peak {c.purity}
                      </figcaption>
                    </figure>
                  )}

                  <dl className="mt-4 space-y-2">
                    {c.identity && <Row label="Identity">{c.identity}</Row>}
                    {c.appearance && <Row label="Appearance">{c.appearance}</Row>}
                    {tested && <Row label="Tested">{tested}</Row>}
                    {/* The lab's identifiers, printed on the signed PDF. Merit
                        names releases by batch date, not lot number (Parker,
                        2026-10-22), so these stay secondary. */}
                    <Row label="Lab reference" muted>{labReference(c)}</Row>
                  </dl>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4">
                    <span className="inline-flex items-center gap-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-success">
                      <span aria-hidden="true" className="inline-block w-1.5 h-1.5 rounded-full bg-success" />
                      Verified · passed
                    </span>
                    <div className="flex items-center gap-4">
                      {c.fileUrl && (
                        <a
                          href={c.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[11px] font-bold text-cobalt hover:underline"
                        >
                          Certificate PDF →
                        </a>
                      )}
                      <Link
                        href={href}
                        className="font-mono text-[11px] font-bold text-ink hover:text-cobalt hover:underline"
                      >
                        Certificate →
                      </Link>
                    </div>
                  </div>

                  {alsoCurrent.length > 0 && (
                    <p className="mt-3 font-mono text-[10.5px] tracking-[0.04em] text-ink-muted">
                      Also in this batch:{' '}
                      {alsoCurrent.map((a, i) => (
                        <span key={a.id}>
                          {i > 0 && ', '}
                          <Link href={certPath(a)} className="underline underline-offset-2 hover:text-cobalt">
                            {a.coaNumber ?? a.lotId}
                          </Link>
                        </span>
                      ))}
                    </p>
                  )}

                  {g.archived.length > 0 && (
                    <details className="group mt-3" open={archivedHit}>
                      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden font-mono text-[10.5px] tracking-[0.08em] uppercase text-ink-muted hover:text-ink">
                        Earlier batches ({g.archived.length})
                        <span aria-hidden="true" className="ml-1 inline-block transition-transform group-open:rotate-90">›</span>
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {g.archived.map((a) => (
                          <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-3 font-mono text-[11px]">
                            <Link href={certPath(a)} className="text-ink-soft hover:text-cobalt hover:underline">
                              {batchLabelOf(a)}
                            </Link>
                            <span className="text-ink-muted tabular-nums">{a.coaNumber ?? a.lotId}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ── How we verify ─────────────────────────────────────────────── */}
      <section className="border-t border-ink/10">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-14 lg:py-20">
          <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted mb-5">
            How we verify
          </p>
          <h2
            className="font-poster font-black uppercase leading-[0.96] tracking-[-0.04em] mb-10"
            style={{ fontSize: 'clamp(28px, 4.4vw, 62px)' }}
          >
            A full QC panel. Zero exceptions.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-ink/10 border border-ink/10">
            {PANEL.map((p) => (
              <div key={p.title} className="bg-white p-6 lg:p-7">
                <h3 className="font-poster font-extrabold text-[16px] tracking-[-0.02em] mb-2">
                  {p.title}
                </h3>
                <p className="text-[14px] leading-[1.65] text-ink-soft">{p.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-[76ch] text-[14px] leading-[1.7] text-ink-soft">
            <strong className="text-white font-semibold">A note on what&rsquo;s shown.</strong> Batches
            released with a full certificate carry the complete PDF: accredited lab named, signed by
            the lab director, with an access code you can verify at the lab&rsquo;s own portal. On
            older batches, manufacturer and laboratory identifiers are redacted to protect supply-chain
            integrity; the data never is. Purity, identity, and batch are reported exactly as measured.
          </p>
        </div>
      </section>

      {/* ── FAQ — visible twin of the FAQPage schema above ────────────── */}
      <section className="border-t border-ink/10">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-14 lg:py-20">
          <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-ink-muted mb-5">
            Common questions
          </p>
          <h2
            className="font-poster font-black uppercase leading-[0.96] tracking-[-0.04em] mb-10 max-w-[20ch]"
            style={{ fontSize: 'clamp(26px, 4vw, 54px)' }}
          >
            What the certificate does and doesn&rsquo;t say.
          </h2>
          <div className="border-t border-ink/15">
            {FAQ.map((f) => (
              <details key={f.q} className="group border-b border-ink/15">
                <summary className="flex items-start justify-between gap-6 py-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-cobalt/15 transition-colors">
                  <h3 className="font-poster font-extrabold text-[17px] lg:text-[21px] tracking-[-0.02em] leading-snug">
                    {f.q}
                  </h3>
                  <span
                    aria-hidden="true"
                    className="flex-none text-[22px] text-ink-muted transition-transform group-open:rotate-45 group-open:text-cobalt"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-6 max-w-[76ch] text-[14.5px] leading-[1.7] text-ink-soft">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-ink/10">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-12 py-10">
          <p className="font-mono text-[11px] leading-[1.8] tracking-[0.04em] text-ink-muted">
            For research use only · Not for human or veterinary use · Not FDA-approved
          </p>
        </div>
      </section>
    </main>
  );
}

function Row({ label, children, muted }: { label: string; children: React.ReactNode; muted?: boolean }) {
  return (
    <div className="flex gap-3">
      <dt className="w-24 flex-none font-mono text-[10.5px] tracking-[0.08em] uppercase text-ink-muted pt-0.5">
        {label}
      </dt>
      <dd className={muted ? 'font-mono text-[11px] text-ink-muted break-all' : 'font-mono text-[12.5px] text-ink'}>
        {children}
      </dd>
    </div>
  );
}
