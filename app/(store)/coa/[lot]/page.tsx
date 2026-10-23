import Link from 'next/link';
import { cache } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { findCoasByKey, listCoaRecords } from '@/lib/coa-cache';
import {
  batchLabelOf,
  certificatePath,
  classifyCoas,
  countLots,
  labReference,
  type BatchRow,
} from '@/lib/coa-batch';
import { JsonLd } from '@/components/JsonLd';
import { Chromatogram } from '../Chromatogram';

/**
 * Per-certificate page: the URL the QR/verify story points at. The PDP FAQ
 * promises the COA for your batch has a permanent page under /coa; this route
 * makes that true.
 *
 * Merit names releases by batch date, not lot number (Parker, 2026-10-22), so
 * the page leads with the batch ("July 2026 batch"). The lab's identifiers
 * (lot reference, certificate number) are printed on the signed PDF and stay
 * visible as a secondary "Lab reference" so a reader can match the two.
 *
 * URLs are unchanged: they are still keyed by the lab reference, because QR
 * codes and links already point at them. A certificate from an earlier batch
 * (lib/coa-batch) still renders, carries noindex, follow, and points at the
 * compound's current batch.
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
  createdAt: Date | string;
  /** Set when this legacy certificate has been superseded by newer testing. */
  retiredAt: Date | string | null;
  /** coaNumber of the certificate that now covers this compound. */
  supersededBy: string | null;
};

/**
 * Resolves either a lab (lot) reference or a certificate number. One lab
 * reference can cover many SKUs (one reference, one certificate per product),
 * so a lookup can legitimately return several rows: the caller renders an
 * index in that case rather than silently showing one of them.
 */
async function getLot(lotParam: string): Promise<CoaRow[]> {
  const key = decodeURIComponent(lotParam).trim();
  if (!key || key.length > 64) return [];
  try {
    // Cached (lib/coa-cache) and request-deduplicated: generateMetadata and
    // the page both call this.
    return (await findCoasByKey(key)) as unknown as CoaRow[];
  } catch {
    return [];
  }
}

/**
 * Every certificate, classified by batch. Which batch is current for a
 * compound depends on all of its certificates, not only the one on screen.
 * Null when the read fails: callers then fail OPEN (no noindex, no note).
 */
const getBatchContext = cache(async () => {
  try {
    const records = (await listCoaRecords()) as unknown as (BatchRow & CoaRow)[];
    return { index: classifyCoas(records), lotCounts: countLots(records) };
  } catch {
    return null;
  }
});

type BatchContext = NonNullable<Awaited<ReturnType<typeof getBatchContext>>>;

type BatchInfo = {
  label: string;
  archived: boolean;
  /** The compound's current certificate, when this one is from an earlier batch. */
  current: { label: string; path: string; compound: string } | null;
};

function batchInfo(coa: CoaRow, ctx: BatchContext | null): BatchInfo {
  const label = batchLabelOf(coa);
  const cl = ctx?.index.byId.get(coa.id);
  // Fail open: without a classification, treat the certificate as current.
  const archived = Boolean(coa.retiredAt) || cl?.status === 'archived';
  const cur = archived && cl && ctx ? cl.group.current.find((r) => r.id !== coa.id) ?? null : null;
  return {
    label,
    archived,
    current: cur
      ? { label: batchLabelOf(cur), path: certificatePath(cur, ctx!.lotCounts), compound: cur.compound }
      : null,
  };
}

/** An exact certificate-number hit always wins over its (shared) lab reference. */
function resolveOne(rows: CoaRow[], key: string): CoaRow | null {
  const exact = rows.find((r) => r.coaNumber?.toLowerCase() === key.toLowerCase());
  if (exact) return exact;
  return rows.length === 1 ? rows[0] : null;
}

/** This certificate's own URL path (its canonical), matching the /coa links. */
async function selfPath(coa: CoaRow, ctx: BatchContext | null): Promise<string> {
  const lotCounts = ctx?.lotCounts ?? countLots(await getLot(encodeURIComponent(coa.lotId)));
  return certificatePath(coa, lotCounts);
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

/** One batch label for a set of rows, or null when they span several. */
function sharedBatchLabel(rows: CoaRow[]): string | null {
  const labels = Array.from(new Set(rows.map((r) => batchLabelOf(r))));
  return labels.length === 1 ? labels[0] : null;
}

const NOINDEX = { robots: { index: false, follow: true } };

export async function generateMetadata({ params }: Props) {
  const key = decodeURIComponent(params.lot).trim();
  const rows = await getLot(params.lot);
  const coa = resolveOne(rows, key);
  const ctx = await getBatchContext();
  if (!coa) {
    if (rows.length > 1) {
      const lotId = rows[0].lotId;
      const label = sharedBatchLabel(rows);
      // Noindex only when every certificate under this reference is from an
      // earlier batch; any current one keeps the index page indexable.
      const allArchived = rows.every((r) => batchInfo(r, ctx).archived);
      return {
        title: label
          ? `${label}: certificates of analysis`
          : `Certificates of analysis, lab reference ${lotId}`,
        description: `Certificates of analysis for the ${rows.length} compounds ${label ? `in Merit's ${label}, ` : ''}tested together under lab reference ${lotId}: purity by HPLC, identity confirmation, and the full QC panel. Research use only.`,
        alternates: { canonical: `${SITE}/coa/${encodeURIComponent(lotId)}` },
        ...(allArchived ? NOINDEX : {}),
      };
    }
    return { title: 'COA not found' };
  }
  // Root template appends "· Merit Sciences".
  // Water is released on sterility + preservative testing; its purity column
  // is not an HPLC figure and must not be presented as one.
  const isWater = /bacteriostatic|sterile water/i.test(coa.compound);
  const info = batchInfo(coa, ctx);
  const tested = fmtDate(coa.testedDate);
  const title = isWater
    ? `${coa.compound} COA, ${info.label}`
    : `${coa.compound} COA, ${info.label} (${coa.purity} HPLC)`;
  return {
    title,
    description: isWater
      ? `Certificate of analysis for the ${info.label} of ${coa.compound}: USP sterility and content verified${tested ? `, tested ${tested}` : ''}. Independently verified before release. Research use only.`
      : `Certificate of analysis for the ${info.label} of ${coa.compound}: ${coa.purity} purity by HPLC${coa.identity ? `, identity confirmed (${coa.identity})` : ''}${tested ? `, tested ${tested}` : ''}. Independently verified before release. Research use only.`,
    alternates: { canonical: `${SITE}${await selfPath(coa, ctx)}` },
    // An earlier batch (or a superseded legacy certificate) stays reachable
    // for anyone holding that vial, but is not indexed as current testing.
    ...(info.archived ? NOINDEX : {}),
  };
}

export default async function CoaLotPage({ params }: Props) {
  const key = decodeURIComponent(params.lot).trim();
  const rows = await getLot(params.lot);
  const coa = resolveOne(rows, key);
  const ctx = await getBatchContext();
  if (!coa) {
    if (rows.length > 1) return <LotIndex rows={rows} ctx={ctx} />;
    return notFound();
  }

  /* A certificate-number alias (/coa/COA-2026-…) served the same page as the
     lab-reference URL: a duplicate. When the reference resolves to this
     certificate alone, 308 to it so links, QR scans and engines consolidate on
     one URL. A reference covering several certificates renders an index at its
     own URL, so the certificate number stays the permalink there. */
  if (
    coa.coaNumber?.toLowerCase() === key.toLowerCase() &&
    coa.lotId.toLowerCase() !== key.toLowerCase()
  ) {
    const lotRows = await getLot(encodeURIComponent(coa.lotId));
    if (lotRows.length === 1) permanentRedirect(`/coa/${encodeURIComponent(coa.lotId)}`);
  }

  const isWater = /bacteriostatic|sterile water/i.test(coa.compound);
  const tested = fmtDate(coa.testedDate);
  const info = batchInfo(coa, ctx);
  const ref = labReference(coa);
  const url = `${SITE}${await selfPath(coa, ctx)}`;

  const testedIso = isoDate(coa.testedDate);
  const datasetId = `${url}#dataset`;
  const certName = `${coa.compound}, ${info.label}`;

  /* Four linked nodes so an answer engine can resolve the whole claim without
     guessing: the Dataset IS the measurement, the Certification is the signed
     artifact behind it (only asserted when a real PDF exists), the Product is
     what the measurement is ABOUT, and the breadcrumb places it in the site. */
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE}/` },
          { '@type': 'ListItem', position: 2, name: 'Lab results', item: `${SITE}/coa` },
          { '@type': 'ListItem', position: 3, name: certName, item: url },
        ],
      },
      {
        // The batch's test results as a citable dataset: this page is the
        // primary source for purity claims about this batch.
        '@type': 'Dataset',
        '@id': datasetId,
        name: `${certName}: certificate of analysis`,
        description: `Independent quality-control results for the ${info.label} of ${coa.compound} research compound: purity by HPLC${coa.identity ? ', identity confirmation' : ''}${coa.appearance ? ', appearance' : ''}. Lab reference ${ref}. For research use only.`,
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
          { '@type': 'PropertyValue', name: 'Batch', value: info.label },
          { '@type': 'PropertyValue', name: 'Lab reference', value: ref },
        ],
        ...(testedIso ? { datePublished: testedIso, dateModified: testedIso } : {}),
        ...(coa.fileUrl
          ? {
              distribution: {
                '@type': 'DataDownload',
                encodingFormat: 'application/pdf',
                contentUrl: coa.fileUrl,
                name: `${certName}: signed certificate of analysis`,
              },
            }
          : {}),
      },
      // Only assert a Certification when a signed certificate actually exists.
      // Redacted-data batches have real measurements but no publishable
      // artifact, and claiming one would be a false machine-readable statement.
      ...(coa.fileUrl
        ? [
            {
              '@type': 'Certification',
              '@id': `${url}#certification`,
              name: `Certificate of analysis: ${certName}`,
              certificationIdentification: coa.coaNumber ?? coa.lotId,
              certificationStatus: info.archived ? 'CertificationInactive' : 'CertificationActive',
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
      // Join the certificate to the thing it certifies. Only for the current
      // batch: an earlier batch should not describe the product on sale now.
      ...(coa.productHandle && !info.archived
        ? [
            {
              '@type': 'Product',
              '@id': `${SITE}/products/${coa.productHandle}#product`,
              name: coa.compound,
              url: `${SITE}/products/${coa.productHandle}`,
              brand: { '@id': `${SITE}/#organization` },
              subjectOf: { '@id': datasetId },
              additionalProperty: [
                { '@type': 'PropertyValue', name: 'Batch', value: info.label },
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

  const currentLink = info.current ? (
    <>
      {' '}The current batch for this compound is{' '}
      <Link href={info.current.path} className="font-bold underline underline-offset-2">
        {info.current.compound}, {info.current.label}
      </Link>
      .
    </>
  ) : coa.supersededBy ? (
    <>
      {' '}The current certificate for this compound is{' '}
      <Link
        href={`/coa/${encodeURIComponent(coa.supersededBy)}`}
        className="font-bold underline underline-offset-2"
      >
        {coa.supersededBy}
      </Link>
      .
    </>
  ) : null;

  return (
    <main className="bg-white text-ink min-h-screen">
      <JsonLd data={jsonLd} />
      {info.archived && (
        /* An earlier batch. The page stays live so anyone holding that vial
           can still verify exactly what they have (breaking the link would
           defeat the point of publishing at all), but it says plainly that a
           newer batch exists and links to it. */
        <div className="border-b border-amber-300 bg-amber-50">
          <div className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-8 py-4">
            <p className="text-[13px] leading-relaxed text-amber-900">
              <strong>Earlier batch.</strong>
              {coa.retiredAt && (
                <>
                  {' '}This certificate documents an earlier third-party analysis of {coa.compound}{' '}
                  and is kept online so this batch stays verifiable. It does not reflect
                  Merit&rsquo;s current release testing.
                </>
              )}
              {currentLink}
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
            <span className="text-ink-soft">{info.label}</span>
          </nav>
          <p className="font-mono text-[11px] tracking-[0.14em] uppercase text-cobalt mb-5">
            Certificate of analysis
          </p>
          <h1
            className="font-poster font-black uppercase tracking-[-0.045em] leading-[0.9] mb-4"
            style={{ fontSize: 'clamp(34px, 6.5vw, 84px)' }}
          >
            {coa.compound}
            <span className="block mt-3 font-mono font-bold normal-case tracking-[0.02em] text-[clamp(15px,2vw,22px)] text-ink-soft">
              {info.label}
            </span>
          </h1>
          {/* Plain-language restatement of the fact this page exists to prove.
              An assistant asked "was this batch tested" can quote this line. */}
          <p className="max-w-[62ch] text-[15px] leading-[1.65] text-ink-soft">
            The <strong className="text-white font-semibold">{info.label}</strong> of {coa.compound} was
            assayed by an independent laboratory before release{tested && <>, tested {tested}</>}. The
            measured results are below.
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
              <Chromatogram purity={parsePurity(coa.purity)} seed={coa.coaNumber ?? coa.lotId} />
              <figcaption className="pb-1 text-center font-mono text-[9.5px] tracking-[0.06em] uppercase text-ink-muted">
                Representative HPLC profile · main peak {coa.purity}
              </figcaption>
            </figure>
          )}

          <dl className="mt-5 space-y-2.5">
            <Row label="Compound">{coa.compound}</Row>
            <Row label="Batch">{info.label}</Row>
            <Row label="Purity">{isWater ? 'USP sterility + content verified' : `${coa.purity} by HPLC`}</Row>
            {coa.identity && <Row label="Identity">{coa.identity}</Row>}
            {coa.appearance && <Row label="Appearance">{coa.appearance}</Row>}
            {tested && <Row label="Tested">{tested}</Row>}
            {/* The lab's identifiers, as printed on the signed PDF. */}
            <Row label="Lab reference" muted>{ref}</Row>
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
              The certificate PDF is the lab&rsquo;s own document: accredited lab named, signed by the
              lab director, carrying an access code you can verify at the lab&rsquo;s portal. The lab
              reference above is the identifier printed on it.
            </>
          ) : (
            <>
              Manufacturer and laboratory identifiers are redacted on this batch to protect supply-chain
              integrity. The data is not.
            </>
          )}{' '}
          Purity, identity, and batch are reported exactly as measured. For research use only, not for
          human or veterinary use.
        </p>

        <p className="mt-5 text-[14px] text-ink-soft">
          Looking for a different batch?{' '}
          <Link href="/coa" className="text-cobalt font-semibold hover:underline">
            Search the full lab-results library →
          </Link>
        </p>
      </section>
    </main>
  );
}

function Row({ label, children, muted }: { label: string; children: React.ReactNode; muted?: boolean }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 flex-none font-mono text-[10.5px] tracking-[0.08em] uppercase text-ink-muted pt-0.5">
        {label}
      </dt>
      <dd className={muted ? 'font-mono text-[11.5px] text-ink-muted break-all' : 'font-mono text-[13px] text-ink'}>
        {children}
      </dd>
    </div>
  );
}

/**
 * One lab reference, many SKUs, each with its own certificate. Landing on the
 * shared reference lists them rather than picking one arbitrarily.
 */
function LotIndex({ rows, ctx }: { rows: CoaRow[]; ctx: BatchContext | null }) {
  const lotId = rows[0].lotId;
  const tested = fmtDate(rows[0].testedDate);
  const label = sharedBatchLabel(rows);
  const heading = label ?? 'Certificates of analysis';
  const lotCounts = ctx?.lotCounts ?? countLots(rows);

  /* The single-certificate branch carries Dataset + Certification; the index
     carries the collection and the measured value for each member, so a
     crawler can read the whole release from this URL without walking into
     every child page. */
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
          { '@type': 'ListItem', position: 3, name: heading, item: url },
        ],
      },
      {
        '@type': 'CollectionPage',
        '@id': `${url}#page`,
        name: `${heading}: certificates of analysis`,
        description: `Quality-control results for the ${rows.length} research compounds ${label ? `in the ${label}, ` : ''}tested together under lab reference ${lotId}. For research use only.`,
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
              name: `${r.compound}, ${batchLabelOf(r)}: certificate of analysis`,
              url: `${SITE}${certificatePath(r, lotCounts)}`,
              identifier: r.coaNumber ?? r.lotId,
              creator: { '@id': `${SITE}/#organization` },
              variableMeasured: [
                { '@type': 'PropertyValue', name: 'Purity (HPLC)', value: r.purity },
                { '@type': 'PropertyValue', name: 'Batch', value: batchLabelOf(r) },
              ],
            },
          })),
        },
      },
    ],
  };

  return (
    <main className="bg-cream min-h-screen">
      <JsonLd data={indexJsonLd} />
      <section className="bg-white border-b border-cobalt/10">
        <div className="max-w-[760px] mx-auto px-5 sm:px-6 lg:px-8 pt-12 pb-8">
          <div className="text-xs text-ink-muted mb-5">
            <Link href="/" className="hover:text-ink transition">Home</Link>
            {' · '}
            <Link href="/coa" className="hover:text-ink transition">Lab results</Link>
            {' · '}
            <span className="text-ink">{heading}</span>
          </div>
          <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
            Certificates of analysis
          </p>
          <h1
            className="font-display font-black text-ink tracking-[-0.035em] leading-[0.98] mb-3"
            style={{ fontSize: 'clamp(28px, 4.5vw, 44px)' }}
          >
            {heading}<span className="text-cobalt">.</span>
          </h1>
          <p className="text-sm text-ink-soft">
            {rows.length} compounds tested together
            {tested && <> · tested {tested}</>}. Pick yours to see its certificate.
          </p>
          <p className="mt-2 font-mono text-[11px] text-ink-muted">Lab reference {lotId}</p>
        </div>
      </section>

      <section className="max-w-[760px] mx-auto px-5 sm:px-6 lg:px-8 py-10">
        <ul className="space-y-2">
          {rows.map((r) => {
            const isWater = /bacteriostatic|sterile water/i.test(r.compound);
            const info = batchInfo(r, ctx);
            return (
              <li key={r.id}>
                <Link
                  href={certificatePath(r, lotCounts)}
                  className="flex items-center justify-between gap-3 rounded-xl border border-cobalt/12 bg-white px-4 py-3 transition hover:border-cobalt/35"
                >
                  <span className="min-w-0">
                    <span className="block font-display text-[15px] font-extrabold text-ink leading-tight">
                      {r.compound}
                    </span>
                    <span className="block text-[11.5px] text-ink-muted tabular-nums">
                      {info.archived ? `Earlier batch · ${info.label}` : label ? null : info.label}
                      {(info.archived || !label) && r.coaNumber ? ' · ' : ''}
                      {r.coaNumber}
                    </span>
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
          Looking for a different batch?{' '}
          <Link href="/coa" className="text-cobalt font-bold underline-offset-2 hover:underline">
            Search the full lab-results library →
          </Link>
        </p>
      </section>
    </main>
  );
}
