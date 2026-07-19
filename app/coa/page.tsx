import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Chromatogram } from './Chromatogram';

export const dynamic = 'force-dynamic';
export const metadata = {
  // Root template appends "· Merit Sciences" — don't duplicate it here.
  title: 'Lab results — per-lot COA library',
  description:
    'Every Merit batch is independently HPLC-verified before release. Find your lot by compound or lot number — purity, identity, and appearance, with lab and manufacturer identifiers redacted to protect supply-chain integrity.',
};

type CoaRow = {
  id: string;
  compound: string;
  lotId: string;
  purity: string;
  identity: string | null;
  appearance: string | null;
  testedDate: string | null;
  fileUrl: string | null;
};

function fmtDate(s: string | null): string | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
              { identity: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: [{ compound: 'asc' }, { createdAt: 'desc' }],
      take: 500,
      select: {
        id: true, compound: true, lotId: true, purity: true,
        identity: true, appearance: true, testedDate: true, fileUrl: true,
      },
    });
  } catch {
    coas = [];
  }

  return (
    <main className="bg-cream min-h-screen">
      {/* Hero */}
      <section className="bg-white border-b border-cobalt/10">
        <div className="max-w-[1000px] mx-auto px-5 sm:px-6 lg:px-8 pt-14 pb-10">
          <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
            — Independent third-party verification
          </p>
          <h1
            className="font-display font-black text-ink tracking-[-0.035em] leading-[0.98] mb-4"
            style={{ fontSize: 'clamp(30px, 5vw, 52px)' }}
          >
            Lab results<span className="text-cobalt">.</span>
          </h1>
          <p className="text-base text-ink-soft leading-relaxed max-w-2xl">
            Every Merit batch is independently HPLC-verified before release. Find your lot below by
            compound or by the lot number printed on your bottle — the same library the QR on your
            label points to.
          </p>

          <form method="GET" className="mt-7 flex gap-2 max-w-md">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search by compound or lot number…"
              className="flex-1 rounded-xl border border-cobalt/20 bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-cobalt"
              aria-label="Search lab results"
            />
            <button type="submit" className="rounded-xl bg-cobalt px-5 py-2.5 text-sm font-bold text-white hover:opacity-90">
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Results */}
      <section className="max-w-[1000px] mx-auto px-5 sm:px-6 lg:px-8 py-10">
        {coas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-cobalt/20 bg-white px-6 py-12 text-center">
            <p className="text-sm text-ink-soft">
              {q ? `No result found for “${q}”. Check the lot number on your bottle, or ` : 'Results are being published. '}
              <a href="mailto:rx@meritsciences.com" className="text-cobalt font-bold underline-offset-2 hover:underline">email us</a>{' '}
              with your lot number and we&rsquo;ll send it.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {coas.map((c) => {
              // Bacteriostatic water is released on a USP sterility + preservative
              // assay, not HPLC — show a sterility panel instead of a chromatogram.
              const isWater = /bacteriostatic|sterile water/i.test(c.compound);
              return (
              <div key={c.id} className="rounded-2xl border border-cobalt/12 bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-lg font-extrabold text-ink leading-tight">{c.compound}</h2>
                  <span className="flex-none rounded-lg bg-cobalt/10 px-2.5 py-1 text-[12px] font-bold tabular-nums text-cobalt">
                    {isWater ? 'USP · Sterile' : `${c.purity} HPLC`}
                  </span>
                </div>
                {isWater ? (
                  <figure className="mt-3 rounded-xl border border-cobalt/10 bg-cream/40 px-4 py-6 text-center">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-cobalt">
                      USP sterility + content verified
                    </p>
                  </figure>
                ) : (
                  <figure className="mt-3 rounded-xl border border-cobalt/10 bg-cream/40 px-3 pt-2 pb-1">
                    <Chromatogram purity={parsePurity(c.purity)} seed={c.lotId} />
                    <figcaption className="pb-0.5 text-center text-[10px] text-ink-muted">
                      Representative HPLC profile · main peak {c.purity}
                    </figcaption>
                  </figure>
                )}
                <dl className="mt-3 space-y-1.5 text-[13px]">
                  <Row label="Lot">{c.lotId}</Row>
                  {c.identity && <Row label="Identity">{c.identity}</Row>}
                  {c.appearance && <Row label="Appearance">{c.appearance}</Row>}
                  {fmtDate(c.testedDate) && <Row label="Tested">{fmtDate(c.testedDate)}</Row>}
                </dl>
                <div className="mt-3 flex items-center justify-between border-t border-cobalt/8 pt-3">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-emerald-700">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Verified · passed
                  </span>
                  <div className="flex items-center gap-3">
                    {c.fileUrl && (
                      <a
                        href={c.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-cobalt hover:underline"
                      >
                        View report →
                      </a>
                    )}
                    {/* Stable per-lot permalink — the URL the label QR resolves to */}
                    <Link
                      href={`/coa/${encodeURIComponent(c.lotId)}`}
                      className="text-xs font-bold text-cobalt hover:underline"
                    >
                      Lot page →
                    </Link>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </section>

      {/* How we verify */}
      <section className="bg-white border-t border-cobalt/10">
        <div className="max-w-[1000px] mx-auto px-5 sm:px-6 lg:px-8 py-12">
          <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">— How we verify</p>
          <h2 className="font-display text-2xl font-black text-ink tracking-tight mb-6">
            Three independent checks. Zero exceptions<span className="text-cobalt">.</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Check title="HPLC purity" body="High-performance liquid chromatography measures the exact purity of every lot before release." />
            <Check title="Mass-spec identity" body="Mass spectrometry confirms the compound is what the label says it is — no substitutions." />
            <Check title="Heavy metals + endotoxin" body="Screened for heavy-metal and endotoxin contamination to research-grade thresholds." />
          </div>
          <p className="mt-8 max-w-2xl text-[13px] leading-relaxed text-ink-soft">
            <strong className="text-ink">A note on what&rsquo;s shown.</strong> Manufacturer and laboratory
            identifiers are redacted to protect supply-chain integrity — the data is not. Purity, identity,
            and lot are reported exactly as measured. For research use only.
          </p>
        </div>
      </section>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 flex-none text-ink-muted">{label}</dt>
      <dd className="text-ink font-medium">{children}</dd>
    </div>
  );
}

function Check({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-cobalt/12 bg-cream/40 p-4">
      <p className="font-display font-extrabold text-ink text-sm mb-1.5">{title}</p>
      <p className="text-[12.5px] leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
