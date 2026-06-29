import { prisma } from '@/lib/db';
import { CoaUploadForm } from './CoaUploadForm';
import { CoaList } from './CoaList';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'COA library — Merit Admin' };

export default async function AdminCoaPage() {
  let rows: any[] = [];
  try {
    rows = await prisma.coa.findMany({
      orderBy: { createdAt: 'desc' },
      take: 300,
      select: { id: true, compound: true, lotId: true, purity: true, testedDate: true, fileUrl: true, fileName: true },
    });
  } catch {
    rows = [];
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://meritsciences.com').replace(/\/$/, '');
  const coaUrl = `${siteUrl}/coa`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=14&data=${encodeURIComponent(coaUrl)}`;

  return (
    <main className="mx-auto max-w-3xl px-5 py-9 sm:px-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cobalt">— Trust</p>
      <h1 className="mt-1 font-display text-2xl font-black tracking-tight text-ink">COA library</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-soft">
        Upload a Certificate of Analysis and it&rsquo;s instantly searchable on the public{' '}
        <a href="/coa" target="_blank" className="font-bold text-cobalt hover:underline">/coa</a>{' '}
        library — the same page the bottle QR code points to.
      </p>

      {/* Upload */}
      <h2 className="mt-8 mb-3 font-display text-lg font-extrabold text-ink">Publish a COA</h2>
      <CoaUploadForm />

      {/* QR for the label */}
      <h2 className="mt-10 mb-3 font-display text-lg font-extrabold text-ink">Bottle QR code</h2>
      <div className="flex flex-col items-start gap-4 rounded-2xl border border-cobalt/15 bg-white p-5 sm:flex-row sm:items-center">
        <img
          src={qrSrc}
          alt="QR code linking to the COA library"
          width={140}
          height={140}
          className="rounded-lg border border-cobalt/10"
        />
        <div className="text-sm text-ink-soft">
          <p className="font-bold text-ink">Points to {coaUrl}</p>
          <p className="mt-1 leading-relaxed">
            One static code for every bottle — buyers scan it, then search their lot number.
            Right-click the image to save it for the label, or{' '}
            <a href={`${qrSrc}&download=1`} target="_blank" className="font-bold text-cobalt hover:underline">download a 600&times;600 PNG</a>.
            Need it bigger for print? Bump <code className="text-xs">size=600x600</code> in the URL.
          </p>
        </div>
      </div>

      {/* List */}
      <h2 className="mt-10 mb-3 font-display text-lg font-extrabold text-ink">
        Published <span className="text-ink-soft font-normal">({rows.length})</span>
      </h2>
      <CoaList rows={rows} />

      <p className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
        First-time setup: create a <strong>public</strong> Storage bucket named <code>coas</code> in Supabase,
        and run the <code>coas</code> table SQL (the pooler can&rsquo;t run migrations). Until both exist,
        uploads will error.
      </p>
    </main>
  );
}
