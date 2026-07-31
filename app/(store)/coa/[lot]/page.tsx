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
 * Same redaction rule as /coa: manufacturer + laboratory identifiers never
 * render — data only.
 */

export const dynamic = 'force-dynamic';

type Props = { params: { lot: string } };

type CoaRow = {
  id: string;
  compound: string;
  productHandle: string | null;
  lotId: string;
  purity: string;
  identity: string | null;
  appearance: string | null;
  testedDate: string | null;
  fileUrl: string | null;
};

async function getLot(lotParam: string): Promise<CoaRow | null> {
  const lotId = decodeURIComponent(lotParam).trim();
  if (!lotId || lotId.length > 64) return null;
  try {
    return await prisma.coa.findFirst({
      where: { lotId: { equals: lotId, mode: 'insensitive' } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, compound: true, productHandle: true, lotId: true, purity: true,
        identity: true, appearance: true, testedDate: true, fileUrl: true,
      },
    });
  } catch {
    return null;
  }
}

function fmtDate(s: string | null): string | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function parsePurity(s: string): number {
  const n = parseFloat(String(s).replace(/[^0-9.]/g, ''));
  return isFinite(n) ? n : 99;
}

export async function generateMetadata({ params }: Props) {
  const coa = await getLot(params.lot);
  if (!coa) return { title: 'COA not found' };
  // Root template appends "· Merit Sciences".
  const title = `${coa.compound} COA — Lot ${coa.lotId} (${coa.purity} HPLC)`;
  return {
    title,
    description: `Certificate of analysis for ${coa.compound} lot ${coa.lotId}: ${coa.purity} purity by HPLC${coa.identity ? `, identity confirmed (${coa.identity})` : ''}${coa.testedDate ? `, tested ${coa.testedDate}` : ''}. Independently verified before release. Research use only.`,
    alternates: { canonical: `https://meritsciences.com/coa/${encodeURIComponent(coa.lotId)}` },
  };
}

export default async function CoaLotPage({ params }: Props) {
  const coa = await getLot(params.lot);
  if (!coa) return notFound();

  const isWater = /bacteriostatic|sterile water/i.test(coa.compound);
  const tested = fmtDate(coa.testedDate);
  const url = `https://meritsciences.com/coa/${encodeURIComponent(coa.lotId)}`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://meritsciences.com/' },
          { '@type': 'ListItem', position: 2, name: 'Lab results', item: 'https://meritsciences.com/coa' },
          { '@type': 'ListItem', position: 3, name: `Lot ${coa.lotId}`, item: url },
        ],
      },
      {
        // The lot's test results as a citable dataset — this page is the
        // primary source for "{compound} lot {id}" purity claims.
        '@type': 'Dataset',
        name: `${coa.compound} — Lot ${coa.lotId} certificate of analysis`,
        description: `Independent quality-control results for ${coa.compound} research compound, lot ${coa.lotId}: purity by HPLC${coa.identity ? ', identity confirmation' : ''}${coa.appearance ? ', appearance' : ''}. For research use only.`,
        url,
        creator: { '@id': 'https://meritsciences.com/#organization' },
        license: 'https://meritsciences.com/terms',
        variableMeasured: [
          { '@type': 'PropertyValue', name: 'Purity (HPLC)', value: coa.purity },
          ...(coa.identity ? [{ '@type': 'PropertyValue', name: 'Identity', value: coa.identity }] : []),
          ...(coa.appearance ? [{ '@type': 'PropertyValue', name: 'Appearance', value: coa.appearance }] : []),
        ],
        ...(tested ? { dateModified: coa.testedDate } : {}),
      },
    ],
  };

  return (
    <main className="bg-cream min-h-screen">
      <JsonLd data={jsonLd} />

      {/* Hero */}
      <section className="bg-white border-b border-cobalt/10">
        <div className="max-w-[760px] mx-auto px-5 sm:px-6 lg:px-8 pt-12 pb-8">
          <div className="text-xs text-ink-muted mb-5">
            <Link href="/" className="hover:text-ink transition">Home</Link>
            {' · '}
            <Link href="/coa" className="hover:text-ink transition">Lab results</Link>
            {' · '}
            <span className="text-ink">Lot {coa.lotId}</span>
          </div>
          <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
            — Certificate of analysis
          </p>
          <h1
            className="font-display font-black text-ink tracking-[-0.035em] leading-[0.98] mb-3"
            style={{ fontSize: 'clamp(28px, 4.5vw, 44px)' }}
          >
            {coa.compound}<span className="text-cobalt">.</span>
          </h1>
          <p className="text-sm text-ink-soft">
            Lot <strong className="text-ink font-bold tabular-nums">{coa.lotId}</strong>
            {tested && <> · tested {tested}</>} · independently verified before release
          </p>
        </div>
      </section>

      {/* Result card */}
      <section className="max-w-[760px] mx-auto px-5 sm:px-6 lg:px-8 py-10">
        <div className="rounded-2xl border border-cobalt/12 bg-white p-6">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-lg font-extrabold text-ink leading-tight">Result summary</h2>
            <span className="flex-none rounded-lg bg-cobalt/10 px-2.5 py-1 text-[12px] font-bold tabular-nums text-cobalt">
              {isWater ? 'USP · Sterile' : `${coa.purity} HPLC`}
            </span>
          </div>

          {isWater ? (
            <figure className="mt-4 rounded-xl border border-cobalt/10 bg-cream/40 px-4 py-8 text-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-cobalt">
                USP sterility + content verified
              </p>
            </figure>
          ) : (
            <figure className="mt-4 rounded-xl border border-cobalt/10 bg-cream/40 px-3 pt-2 pb-1">
              <Chromatogram purity={parsePurity(coa.purity)} seed={coa.lotId} />
              <figcaption className="pb-0.5 text-center text-[10px] text-ink-muted">
                Representative HPLC profile · main peak {coa.purity}
              </figcaption>
            </figure>
          )}

          <dl className="mt-4 space-y-2 text-[14px]">
            <Row label="Compound">{coa.compound}</Row>
            <Row label="Lot">{coa.lotId}</Row>
            <Row label="Purity">{isWater ? 'USP sterility + content verified' : `${coa.purity} by HPLC`}</Row>
            {coa.identity && <Row label="Identity">{coa.identity}</Row>}
            {coa.appearance && <Row label="Appearance">{coa.appearance}</Row>}
            {tested && <Row label="Tested">{tested}</Row>}
          </dl>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-cobalt/8 pt-4">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Verified · passed
            </span>
            <div className="flex items-center gap-4">
              {coa.fileUrl && (
                <a
                  href={coa.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-cobalt hover:underline"
                >
                  View full report →
                </a>
              )}
              {coa.productHandle && (
                <Link href={`/products/${coa.productHandle}`} className="text-xs font-bold text-cobalt hover:underline">
                  View product →
                </Link>
              )}
            </div>
          </div>
        </div>

        <p className="mt-6 text-[13px] leading-relaxed text-ink-soft">
          <strong className="text-ink">A note on what&rsquo;s shown.</strong> Manufacturer and laboratory
          identifiers are redacted to protect supply-chain integrity — the data is not. Purity, identity,
          and lot are reported exactly as measured. For research use only — not for human or veterinary use.
        </p>

        <p className="mt-4 text-[13px] text-ink-soft">
          Looking for a different lot?{' '}
          <Link href="/coa" className="text-cobalt font-bold underline-offset-2 hover:underline">
            Search the full lab-results library →
          </Link>
        </p>
      </section>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 flex-none text-ink-muted">{label}</dt>
      <dd className="text-ink font-medium">{children}</dd>
    </div>
  );
}
