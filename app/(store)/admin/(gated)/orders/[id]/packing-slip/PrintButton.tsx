'use client';

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded-lg bg-ink text-white font-bold text-[12px] tracking-[0.06em] uppercase px-5 py-2.5 hover:bg-cobalt transition-colors"
    >
      Print packing slip
    </button>
  );
}
