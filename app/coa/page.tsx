import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Certificates of Analysis · Merit Sciences',
  description:
    'Every Merit lot ships with a third-party Certificate of Analysis. Find yours by compound or lot number — the same report linked from the QR code on your bottle.',
};

type CoaRow = {
  id: string;
  compound: string;
  lotId: string;
  purity: string;
  testedDate: string;
  fileUrl: string;
};

function fmtDate(s: string): string {
  const d = new Date(s);
  return isNaN(d.getTime())
    ? s
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default async function CoaLibraryPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = (searchParams.q ?? '').trim();
  let coas: CoaRow[] = [];
  try {
    coas = await prisma.coa.findMany({
      where: q
        ? {
            OR: [
              { compound: { contains: q, mode: 'insensitive' } },
              { lotId: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: [{ compound: 'asc' }, { createdAt: 'desc' }],
      take: 500,
      select: { id: true, compound: true, lotId: true, purity: true, testedDate: true, fileUrl: true },
    });
  } catch {
    coas = [];
  }

  return (
    <main className="bg-cream min-h-screen">
      <section className="bg-white border-b border-cobalt/10">
        <div className="max-w-[900px] mx-auto px-5 sm:px-6 lg:px-8 pt-14 pb-10">
          <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
            — Verify your lot
          </p>
          <h1
            className="font-display font-black text-ink tracking-[-0.035em] leading-[0.98] mb-4"
            style={{ fontSize: 'clamp(30px, 5vw, 52px)' }}
          >
            Certificates of Analysis<span className="text-cobalt">.</span>
          </h1>
          <p className="text-base text-ink-soft leading-relaxed max-w-2xl">
            Every Merit lot ships with an independent, third-party Certificate of Analysis —
            the HPLC trace, the measured purity, and the lot ID. Find yours below by compound
            or by the lot number printed on your bottle. It&rsquo;s the same report the QR code
            on your label points to.
          </p>

          {/* Search */}
          <form method="GET" className="mt-7 flex gap-2 max-w-md">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search by compound or lot number…"
              className="flex-1 rounded-xl border border-cobalt/20 bg-white px-4 py-2.5 text-sm text-ink outline-none focus:border-cobalt"
              aria-label="Search certificates of analysis"
            />
            <button
              type="submit"
              className="rounded-xl bg-cobalt px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="max-w-[900px] mx-auto px-5 sm:px-6 lg:px-8 py-10">
        {coas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-cobalt/20 bg-white px-6 py-12 text-center">
            <p className="text-sm text-ink-soft">
              {q
                ? `No certificate found for “${q}”. Check the lot number on your bottle, or `
                : 'Certificates are being published. '}
              <a href="mailto:rx@meritsciences.com" className="text-cobalt font-bold underline-offset-2 hover:underline">
                email us
              </a>{' '}
              and we&rsquo;ll send your lot&rsquo;s COA directly.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-cobalt/12 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-cobalt/5 text-[10px] tracking-[0.16em] uppercase text-ink-soft font-bold">
                <tr>
                  <th className="px-5 py-3 text-left">Compound</th>
                  <th className="px-5 py-3 text-left">Lot</th>
                  <th className="px-5 py-3 text-left">Purity</th>
                  <th className="px-5 py-3 text-left">Tested</th>
                  <th className="px-5 py-3 text-right">COA</th>
                </tr>
              </thead>
              <tbody>
                {coas.map((c) => (
                  <tr key={c.id} className="border-t border-cobalt/8">
                    <td className="px-5 py-3 font-bold text-ink">{c.compound}</td>
                    <td className="px-5 py-3 font-mono text-[13px] text-ink-soft">{c.lotId}</td>
                    <td className="px-5 py-3 tabular-nums text-ink">{c.purity}</td>
                    <td className="px-5 py-3 text-ink-soft">{fmtDate(c.testedDate)}</td>
                    <td className="px-5 py-3 text-right">
                      <a
                        href={c.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block rounded-lg border border-cobalt/30 px-3 py-1.5 text-xs font-bold text-cobalt hover:bg-cobalt/5"
                      >
                        View PDF →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-6 text-[12px] text-ink-muted leading-relaxed">
          Certificates are issued per production lot. If your lot isn&rsquo;t listed yet, it may be a
          recent batch still in publishing — email{' '}
          <a href="mailto:rx@meritsciences.com" className="text-cobalt font-bold">rx@meritsciences.com</a>{' '}
          with your lot number and we&rsquo;ll send it. For research use only.
        </p>
      </section>
    </main>
  );
}
