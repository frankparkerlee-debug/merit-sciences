import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { JsonLd } from '@/components/JsonLd';
import { Chromatogram } from '../Chromatogram';

/**
 * Per-lot COA page — the URL the QR/verify story points at. The PDP FAQ
 * promises "the COA for your specific batch lives at /coa/[lot-id]"; this
 * route makes that true. Each lot gets a stable, indexable page (long-tail:
 * "{compound} lot {id} COA") that IS the primary source for the lot's data.
 *
 * Current lots publish the lab's full signed certificate; older lots stay
 * data-only, with manufacturer and laboratory identifiers redacted.
 */

export const dynamic = 'force-dynamic';

const SITE = 'https://meritsciences.com';

type Props = { params: { lot: string } };

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
  /** Set when this legacy certificate has been superseded by newer testing. */
  retiredAt: Date | null;
  /** coaNumber of the certificate that now covers this compound. */
  supersededBy: string | null;
};

/**
 * Resolves either a lot number or a certificate number. A single production lot
 * can cover many SKUs (one lot number, one certificate per product), so a lot
 * lookup can legitimately return several rows — the caller renders an index in
 * that case rather than silently showing one of them.
 */
async function getLot(lotParam: string): Promise<CoaRow[]> {
  const key = decodeURIComponent(lotParam).trim();
  if (!key || key.length > 64) return [];
  try {
    return await prisma.coa.findMany({
      where: {
        OR: [
          { coaNumber: { equals: key, mode: 'insensitive' } },
          { lotId: { equals: key, mode: 'insensitive' } },
        ],
      },
      orderBy: [{ compound: 'asc' }, { createdAt: 'desc' }],
      take: 100,
      select: {
        id: true, compound: true, productHandle: true, lotId: true, coaNumber: true,
        purity: true, identity: true, appearance: true, testedDate: true, fileUrl: true,
        retiredAt: true, supersededBy: true,
      },
    });
  } catch {
    return [];
  }
}

/** An exact certificate-number hit always wins over its (shared) lot number. */
function resolveOne(rows: CoaRow[], key: string): CoaRow | null {
  const exact = rows.find((r) => r.coaNumber?.toLowerCase() === key.toLowerCase());
  if (exact) return exact;
  return rows.length === 1 ? rows[0] : null;
}

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

/** ISO-8601 for schema.org date fields; null when the source isn't a date. */
function isoDate(s: string | null): string | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function parsePurity(s: string): number {
  const n = parseFloat(String(s).replace(/[^0-9.]/g, ''));
  return isFinite(n) ? n : 99;
}

export async function generateMetadata({ params }: Props) {
  const key = decodeURIComponent(params.lot).trim();
  const rows = await getLot(params.lot);
  const coa = resolveOne(rows, key);
  if (!coa) {
    if (rows.length > 1) {
      return {
        title: `Lot ${rows[0].lotId} — certificates of analysis`,
        description: `Certificates of analysis for every compound released under lot ${rows[0].lotId}: purity by HPLC, identity confirmation, and the full QC panel. Research use only.`,
        alternates: { canonical: `https://meritsciences.com/coa/${encodeURIComponent(rows[0].lotId)}` },
      };
    }
    return { title: 'COA not found' };
  }
  // Root template appends "· Merit Sciences".
  const title = `${coa.compound} COA — Lot ${coa.lotId} (${coa.purity} HPLC)`;
  return {
    title,
    description: `Certificate of analysis for ${coa.compound} lot ${coa.lotId}: ${coa.purity} purity by HPLC${coa.identity ? `, identity confirmed (${coa.identity})` : ''}${coa.testedDate ? `, tested ${coa.testedDate}` : ''}. Independently verified before release. Research use only.`,
    alternates: { canonical: `https://meritsciences.com/coa/${encodeURIComponent(coa.lotId)}` },
    // A superseded legacy certificate stays reachable for anyone holding an
    // older vial, but must not be indexed as current release testing.
    ...(coa.retiredAt ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function CoaLotPage({ params }: Props) {
  const key = decodeURIComponent(params.lot).trim();
  const rows = await getLot(params.lot);
  const coa = resolveOne(rows, key);
  if (!coa) {
    if (rows.length > 1) return <LotIndex rows={rows} />;
    return notFound();
  }

  const isWater = /bacteriostatic|sterile water/i.test(coa.compound);
  const tested = fmtDate(coa.testedDate);
  // Lot numbers that already read "LOT…" don't need the word in front of them.
  const lotLabel = /^lot/i.test(coa.lotId) ? coa.lotId : `Lot ${coa.lotId}`;
  const url = `${SITE}/coa/${encodeURIComponent(coa.lotId)}`;

  const testedIso = isoDate(coa.testedDate);
  const datasetId = `${url}#dataset`;

  /* Four linked nodes so an answer engine can resolve the whole claim without
     guessing: the Dataset IS the measurement, the Certification is the signed
     artifact behind it (only asserted when a real PDF exists), the Product is
     what the measurement is ABOUT, and the breadcrumb places it in the site.
     The `about`/`hasCertification` edges are the point — without them a
     crawler sees a purity number floating free of the thing it describes. */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'Lab results', item: `${SITE}/coa` },
          { '@type': 'ListItem', position: 3, name: lotLabel, item: url },
        ],
      },
      {
        // The lot's test results as a citable dataset — this page is the
        // primary source for "{compound} lot {id}" purity claims.
        '@type': 'Dataset',
        '@id': datasetId,
        name: `${coa.compound} — Lot ${coa.lotId} certificate of analysis`,
        description: `Independent quality-control results for ${coa.compound} research compound, lot ${coa.lotId}: purity by HPLC${coa.identity ? ', identity confirmation' : ''}${coa.appearance ? ', appearance' : ''}. For research use only.`,
        url,
        identifier: coa.coaNumber ?? coa.lotId,
        isPartOf: { '@id': `${SITE}/coa#page` },
        creator: { '@id': `${SITE}/#organization` },
        publisher: { '@id': `${SITE}/#organization` },
        license: `${SITE}/terms`,
        measurementTechnique: isWater
          ? 'USP sterility and preservative content assay'
          : 'High-performance liquid chromatography (HPLC)',
        variableMeasured: [
          { '@type': 'PropertyValue', name: 'Purity (HPLC)', value: coa.purity },
          ...(coa.identity ? [{ '@type': 'PropertyValue', name: 'Identity', value: coa.identity }] : []),
          ...(coa.appearance ? [{ '@type': 'PropertyValue', name: 'Appearance', value: coa.appearance }] : []),
          { '@type': 'PropertyValue', name: 'Lot', value: coa.lotId },
        ],
        ...(testedIso ? { datePublished: testedIso, dateModified: testedIso } : {}),
        ...(coa.fileUrl
          ? {
              distribution: {
                '@type': 'DataDownload',
                encodingFormat: 'application/pdf',
                contentUrl: coa.fileUrl,
                name: `${coa.compound} lot ${coa.lotId} — signed certificate of analysis`,
              },
            }
          : {}),
      },
      // Only assert a Certification when a signed certificate actually exists.
      // Redacted-data lots have real measurements but no publishable artifact,
      // and claiming one would be a false statement in machine-readable form.
      ...(coa.fileUrl
        ? [
            {
              '@type': 'Certification',
              '@id': `${url}#certification`,
              name: `Certificate of analysis — ${coa.compound} lot ${coa.lotId}`,
              certificationIdentification: coa.coaNumber ?? coa.lotId,
              certificationStatus: 'CertificationActive',
              url,
              ...(testedIso ? { datePublished: testedIso, auditDate: testedIso } : {}),
              hasMeasurement: {
                '@type': 'QuantitativeValue',
                name: 'Purity (HPLC)',
                value: parsePurity(coa.purity),
                unitText: 'percent',
              },
            },
          ]
        : []),
      // Join the certificate to the thing it certifies.
      ...(coa.productHandle
        ? [
            {
              '@type': 'Product',
              '@id': `${SITE}/products/${coa.productHandle}#product`,
              name: coa.compound,
              url: `${SITE}/products/${coa.productHandle}`,
              brand: { '@id': `${SITE}/#organization` },
              subjectOf: { '@id': datasetId },
              additionalProperty: [
                { '@type': 'PropertyValue', name: 'Lot', value: coa.lotId },
                { '@type': 'PropertyValue', name: 'Purity (HPLC)', value: coa.purity },
                ...(coa.identity
                  ? [{ '@type': 'PropertyValue', name: 'Identity', value: coa.identity }]
                  : []),
              ],
              ...(coa.fileUrl ? { hasCertification: { '@id': `${url}#certification` } } : {}),
            },
          ]
        : []),
    ],
  };

  return (
    <main className="bg-white text-ink min-h-screen">
      <JsonLd data={jsonLd} />
      {coa.retiredAt && (
        /* A superseded legacy certificate. The page stays live so anyone
           holding an older vial can still verify exactly what they have —
           breaking that link would defeat the point of publishing at all —
           but it says plainly that it is not current release testing and
           points at the certificate that is. */
        <div className="border-b border-amber-300 bg-amber-50">
          <div className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-8 py-4">
            <p className="text-[13px] leading-relaxed text-amber-900">
              <strong>This is an archived certificate.</strong> It documents an earlier
              third-party analysis of {coa.compound} and is kept online so this lot stays
              verifiable. It does not reflect Merit&rsquo;s current release testing.
              {coa.supersededBy && (
                <>
                  {' '}The current certificate for this compound is{' '}
                  <a
                    href={`/coa/${encodeURIComponent(coa.supersededBy)}`}
                    className="font-bold underline underline-offset-2"
                  >
                    {coa.supersededBy}
                  </a>
                  .
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="border-b border-ink/10">
        <div className="max-w-[900px] mx-auto px-6 lg:px-8 pt-12 lg:pt-16 pb-10">
          <nav aria-label="Breadcrumb" className="font-mono text-[10.5px] tracking-[0.08em] uppercase text-ink-muted mb-6">
            <Link href="/" className="hover:text-ink transition">Home</Link>
            {' · '}
            <Link href="/coa" className="hover:text-ink transition">Lab results</Link>
            {' · '}
            <span className="text-ink-soft">{lotLabel}</span>
          </nav>
          <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-cobalt mb-5">
            Certificate of analysis
          </p>
          <h1
            className="font-poster font-black uppercase tracking-[-0.045em] leading-[0.9] mb-4"
            style={{ fontSize: 'clamp(34px, 6.5vw, 84px)' }}
          >
            {coa.compound}
          </h1>
          {/* Plain-language restatement of the fact this page exists to prove.
              An assistant asked "was this lot tested" can quote this line. */}
          <p className="max-w-[62ch] text-[15px] leading-[1.65] text-ink-soft">
            <strong className="text-white font-semibold tabular-nums">{lotLabel}</strong>
            {tested && <> was tested {tested} and</>} was assayed by an independent laboratory
            before release. The measured results are below.
          </p>
        </div>
      </section>

      {/* Result card */}
      <section className="max-w-[900px] mx-auto px-6 lg:px-8 py-12">
        <div className="border border-ink/10 p-6 lg:p-8">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-poster font-black text-[20px] lg:text-[24px] tracking-[-0.03em] uppercase leading-tight">
              Result summary
            </h2>
            <span className="flex-none font-mono text-[12px] font-bold tabular-nums text-success border border-success/40 px-3 py-1.5 whitespace-nowrap">
              {isWater ? 'USP · STERILE' : `${coa.purity} HPLC`}
            </span>
          </div>

          {isWater ? (
            <figure className="mt-5 border border-ink/10 px-4 py-9 text-center">
              <p className="font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-soft">
                USP sterility + content verified
              </p>
            </figure>
          ) : (
            <figure className="mt-5 border border-ink/10 px-3 pt-2 pb-1">
              <Chromatogram purity={parsePurity(coa.purity)} seed={coa.lotId} />
              <figcaption className="pb-1 text-center font-mono text-[9.5px] tracking-[0.06em] uppercase text-ink-muted">
                Representative HPLC profile · main peak {coa.purity}
              </figcaption>
            </figure>
          )}

          <dl className="mt-5 space-y-2.5">
            <Row label="Compound">{coa.compound}</Row>
            <Row label="Lot">{coa.lotId}</Row>
            {coa.coaNumber && <Row label="COA #">{coa.coaNumber}</Row>}
            <Row label="Purity">{isWater ? 'USP sterility + content verified' : `${coa.purity} by HPLC`}</Row>
            {coa.identity && <Row label="Identity">{coa.identity}</Row>}
            {coa.appearance && <Row label="Appearance">{coa.appearance}</Row>}
            {tested && <Row label="Tested">{tested}</Row>}
          </dl>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-ink/10 pt-5">
            <span className="inline-flex items-center gap-2 font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-success">
              <span aria-hidden="true" className="inline-block w-1.5 h-1.5 rounded-full bg-success" />
              Verified · passed
            </span>
            <div className="flex items-center gap-5">
              {coa.fileUrl && (
                <a
                  href={coa.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] font-bold text-cobalt hover:underline"
                >
                  Certificate PDF →
                </a>
              )}
              {coa.productHandle && (
                <Link
                  href={`/products/${coa.productHandle}`}
                  className="font-mono text-[11px] font-bold text-ink hover:text-cobalt hover:underline"
                >
                  View product →
                </Link>
              )}
            </div>
          </div>
        </div>

        <p className="mt-8 max-w-[76ch] text-[14px] leading-[1.7] text-ink-soft">
          <strong className="text-white font-semibold">A note on what&rsquo;s shown.</strong>{' '}
          {coa.fileUrl ? (
            <>
              The full certificate above is the lab&rsquo;s own document — accredited lab named, signed by
              the lab director, carrying an access code you can verify at the lab&rsquo;s portal.
            </>
          ) : (
            <>
              Manufacturer and laboratory identifiers are redacted on this lot to protect supply-chain
              integrity — the data is not.
            </>
          )}{' '}
          Purity, identity, and lot are reported exactly as measured. For research use only — not for human
          or veterinary use.
        </p>

        <p className="mt-5 text-[14px] text-ink-soft">
          Looking for a different lot?{' '}
          <Link href="/coa" className="text-cobalt font-semibold hover:underline">
            Search the full lab-results library →
          </Link>
        </p>
      </section>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 flex-none font-mono text-[10.5px] tracking-[0.08em] uppercase text-ink-muted pt-0.5">
        {label}
      </dt>
      <dd className="font-mono text-[13px] text-ink">{children}</dd>
    </div>
  );
}

/**
 * One lot number, many SKUs — each with its own certificate. Landing on the
 * shared lot number lists them rather than picking one arbitrarily.
 */
function LotIndex({ rows }: { rows: CoaRow[] }) {
  const lotId = rows[0].lotId;
  const tested = fmtDate(rows[0].testedDate);
  // Lot numbers that already read "LOT…" don't need the word in front of them.
  const lotLabel = /^lot/i.test(lotId) ? lotId : `Lot ${lotId}`;

  /* A multi-compound lot renders this index instead of the single-certificate
     view, and that branch returned before any JSON-LD was emitted — so the one
     lot covering the largest number of released compounds was the only lot on
     the site with no machine-readable description of itself. The single-cert
     branch carries Dataset + Certification; the index carries the collection
     and the measured value for each member, so a crawler can read the whole
     release from this URL without walking into every child page. */
  const url = `${SITE}/coa/${encodeURIComponent(lotId)}`;
  const testedIso = isoDate(rows[0].testedDate);
  const indexJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'Lab results', item: `${SITE}/coa` },
          { '@type': 'ListItem', position: 3, name: lotLabel, item: url },
        ],
      },
      {
        '@type': 'CollectionPage',
        '@id': `${url}#page`,
        name: `${lotLabel} — certificates of analysis`,
        description: `Quality-control results for the ${rows.length} research compounds released under lot ${lotId}. For research use only.`,
        url,
        isPartOf: { '@id': `${SITE}/coa#page` },
        publisher: { '@id': `${SITE}/#organization` },
        ...(testedIso ? { datePublished: testedIso, dateModified: testedIso } : {}),
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: rows.length,
          itemListElement: rows.map((r, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': 'Dataset',
              name: `${r.compound} — lot ${r.lotId} certificate of analysis`,
              url: `${SITE}/coa/${encodeURIComponent(r.coaNumber ?? r.lotId)}`,
              identifier: r.coaNumber ?? r.lotId,
              creator: { '@id': `${SITE}/#organization` },
              variableMeasured: [
                { '@type': 'PropertyValue', name: 'Purity (HPLC)', value: r.purity },
                { '@type': 'PropertyValue', name: 'Lot', value: r.lotId },
              ],
            },
          })),
        },
      },
    ],
  };

  return (
    <main className="bg-cream min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(indexJsonLd) }}
      />
      <section className="bg-white border-b border-cobalt/10">
        <div className="max-w-[760px] mx-auto px-5 sm:px-6 lg:px-8 pt-12 pb-8">
          <div className="text-xs text-ink-muted mb-5">
            <Link href="/" className="hover:text-ink transition">Home</Link>
            {' · '}
            <Link href="/coa" className="hover:text-ink transition">Lab results</Link>
            {' · '}
            <span className="text-ink">{lotLabel}</span>
          </div>
          <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
            — Certificates of analysis
          </p>
          <h1
            className="font-display font-black text-ink tracking-[-0.035em] leading-[0.98] mb-3"
            style={{ fontSize: 'clamp(28px, 4.5vw, 44px)' }}
          >
            {lotLabel}<span className="text-cobalt">.</span>
          </h1>
          <p className="text-sm text-ink-soft">
            {rows.length} compounds released under this lot
            {tested && <> · tested {tested}</>}. Pick yours to see its certificate.
          </p>
        </div>
      </section>

      <section className="max-w-[760px] mx-auto px-5 sm:px-6 lg:px-8 py-10">
        <ul className="space-y-2">
          {rows.map((r) => {
            const isWater = /bacteriostatic|sterile water/i.test(r.compound);
            return (
              <li key={r.id}>
                <Link
                  href={`/coa/${encodeURIComponent(r.coaNumber ?? r.lotId)}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-cobalt/12 bg-white px-4 py-3 transition hover:border-cobalt/35"
                >
                  <span className="min-w-0">
                    <span className="block font-display text-[15px] font-extrabold text-ink leading-tight">
                      {r.compound}
                    </span>
                    {r.coaNumber && (
                      <span className="block text-[11.5px] text-ink-muted tabular-nums">{r.coaNumber}</span>
                    )}
                  </span>
                  <span className="flex-none rounded-lg bg-cobalt/10 px-2.5 py-1 text-[12px] font-bold tabular-nums text-cobalt">
                    {isWater ? 'USP · Sterile' : `${r.purity} HPLC`}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <p className="mt-6 text-[13px] text-ink-soft">
          Looking for a different lot?{' '}
          <Link href="/coa" className="text-cobalt font-bold underline-offset-2 hover:underline">
            Search the full lab-results library →
          </Link>
        </p>
      </section>
    </main>
  );
}
