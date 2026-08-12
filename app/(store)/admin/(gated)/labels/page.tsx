export const metadata = { title: 'Label maker — Merit Admin' };
export const dynamic = 'force-dynamic';

/**
 * The 45×20mm vial-label designer (Holo/QR, 2026-07 print run), ported from
 * the ops hub (Labels/2026-07-Holo-QR/label-template.html) so it lives
 * behind admin auth instead of loose on a desktop.
 *
 * The tool is a self-contained 2,600-line HTML document with its own styles
 * and inline scripts (QR generator included). It is served as a REAL
 * document by /api/admin/label-template and embedded by URL — the first
 * version inlined it via iframe srcDoc, which broke the tool's buttons in
 * production. A served document restores the exact conditions the tool was
 * built and print-proofed under. The canonical print files remain
 * Labels/Research + Labels/Physician in the ops hub; this page is for
 * designing/QA-ing label variants.
 */
export default function AdminLabelsPage() {
  return (
    <main className="h-[calc(100svh-0px)] flex flex-col">
      <div className="px-6 py-3 border-b border-cobalt/10 bg-white flex items-baseline justify-between">
        <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold">— Label maker · 45×20mm Holo/QR</p>
        <p className="text-[11px] text-ink-soft">Print files of record: <span className="font-mono">Labels/</span> in the ops hub</p>
      </div>
      <iframe
        title="Merit label designer"
        src="/api/admin/label-template"
        className="flex-1 w-full border-0 bg-white"
      />
    </main>
  );
}
