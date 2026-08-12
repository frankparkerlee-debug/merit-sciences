import { promises as fs } from 'fs';
import path from 'path';

export const metadata = { title: 'Label maker — Merit Admin' };
export const dynamic = 'force-dynamic';

/**
 * The 45×20mm vial-label designer (Holo/QR, 2026-07 print run), ported from
 * the ops hub (Labels/2026-07-Holo-QR/label-template.html) so it lives
 * behind admin auth instead of loose on a desktop.
 *
 * The tool is a self-contained HTML document with its own styles + scripts,
 * so it renders in a sandboxed-by-document iframe via srcDoc rather than
 * being rewritten as React — the print-fidelity CSS (mm units, @page) is
 * exactly what was proofed with the printer, and rewriting it risks drift.
 * The canonical print files remain Labels/Research + Labels/Physician in
 * the ops hub; this page is for designing/QA-ing label variants.
 */
export default async function AdminLabelsPage() {
  const html = await fs.readFile(
    path.join(process.cwd(), 'app/(store)/admin/(gated)/labels/template.html'),
    'utf8',
  );

  return (
    <main className="h-[calc(100svh-0px)] flex flex-col">
      <div className="px-6 py-3 border-b border-cobalt/10 bg-white flex items-baseline justify-between">
        <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold">— Label maker · 45×20mm Holo/QR</p>
        <p className="text-[11px] text-ink-soft">Print files of record: <span className="font-mono">Labels/</span> in the ops hub</p>
      </div>
      <iframe
        title="Merit label designer"
        srcDoc={html}
        className="flex-1 w-full border-0 bg-white"
      />
    </main>
  );
}
