/* ─────────────────────────────────────────────────────────────────────────
   THE CHROMATOGRAM — Merit's own instrument output as the homepage image.

   Why this instead of a photograph: every seller in this category runs the
   same dark stock vial. None of them can run this, because it is the actual
   UV trace from a lot on our shelf. It is simultaneously the picture and the
   argument — a flat baseline with one dominant peak IS what purity looks
   like — and it costs ~2 KB of vector instead of a 50 KB photograph.

   PROVENANCE — this is real data, not a drawn approximation.
     source   public/coa/reports/merit-coa-retatrutide-10mg-lot2026-06-0001.pdf
     lot      LOT2026-06-0001 · Retatrutide 10 mg · COA-2026-49Y4L7
     lab      ILS Laboratories, San Diego CA · ISO/IEC 17025
     purity   99.13% main-peak area (HPLC)

   The path was traced pixel-by-pixel off the certificate's embedded UV
   chromatogram, then simplified with Douglas-Peucker at ε=0.30 in a
   1000×260 space (2,560 → 120 points). DP keeps extreme points exactly, so
   the peak's height and shape are the measured ones; only the flat baseline
   was collapsed.

   TO REGENERATE for a different lot: render the certificate page at 400 dpi
   (`pdftoppm -r 400 -x .. -y .. -W .. -H ..`), mask the trace by hue, take
   the topmost lit pixel per column, normalise to 1000×260, then simplify.
   If you swap the path you MUST swap `LOT` below with it — the caption names
   a specific lot, and a caption that doesn't match its trace is exactly the
   kind of thing this page exists to argue against.
   ───────────────────────────────────────────────────────────────────────── */

// Traced UV chromatogram, 1000×260 viewBox, y-down (0 = full-scale signal).
const TRACE =
  'M 0.0,249.6 L 1.5,249.6 L 1.9,248.3 L 5.3,248.3 L 5.7,246.5 L 23.2,246.5 L 23.6,248.3 L 54.1,248.3 L 54.4,246.5 L 70.4,246.5 L 70.8,248.3 L 75.8,248.3 L 76.1,246.5 L 88.3,246.5 L 88.7,249.6 L 90.2,249.6 L 90.6,260.0 L 92.1,260.0 L 92.5,256.3 L 93.6,256.3 L 94.0,249.6 L 95.5,249.6 L 95.9,248.3 L 104.7,248.3 L 105.1,246.5 L 106.6,246.5 L 107.0,244.7 L 108.1,244.7 L 108.5,243.4 L 110.0,243.4 L 110.4,244.7 L 113.8,244.7 L 114.2,246.5 L 119.1,246.5 L 135.9,233.0 L 137.0,233.0 L 137.4,230.0 L 138.9,230.0 L 139.3,226.3 L 140.8,226.3 L 143.1,219.5 L 144.3,219.5 L 144.7,218.3 L 148.1,218.3 L 148.5,216.5 L 153.4,216.5 L 153.8,218.3 L 157.2,218.3 L 157.6,219.5 L 158.7,219.5 L 164.8,223.2 L 175.1,223.2 L 175.5,221.4 L 186.1,221.4 L 186.5,223.2 L 194.9,223.2 L 195.3,224.4 L 200.6,224.4 L 201.0,226.3 L 217.0,226.3 L 217.4,228.1 L 227.6,228.1 L 228.0,226.3 L 274.8,226.3 L 275.2,228.1 L 287.4,228.1 L 287.8,226.3 L 359.7,226.3 L 360.1,224.4 L 386.8,224.4 L 387.1,226.3 L 390.6,226.3 L 390.9,224.4 L 446.5,224.4 L 446.9,223.2 L 451.8,223.2 L 452.2,224.4 L 459.1,224.4 L 459.5,223.2 L 545.9,223.2 L 546.3,221.4 L 553.1,221.4 L 553.5,223.2 L 562.2,223.2 L 562.6,221.4 L 589.3,221.4 L 589.6,223.2 L 591.2,223.2 L 591.5,221.4 L 741.1,221.4 L 741.5,218.3 L 743.1,218.3 L 743.4,142.9 L 745.0,142.9 L 745.3,22.1 L 746.9,22.1 L 747.2,0.0 L 748.4,0.0 L 748.8,1.8 L 750.3,1.8 L 750.7,77.3 L 752.2,77.3 L 752.6,155.8 L 754.1,155.8 L 754.5,201.1 L 756.0,201.1 L 756.4,218.3 L 757.5,218.3 L 757.9,219.5 L 759.4,219.5 L 759.8,221.4 L 793.7,221.4 L 794.1,219.5 L 799.4,219.5 L 799.8,221.4 L 837.1,221.4 L 837.5,223.2 L 952.8,223.2 L 953.2,224.4 L 1000.0,224.4';

// Apex x-position as a fraction of the trace width — pins the callout to the
// actual peak instead of a hand-guessed percentage, so the two can't drift.
const PEAK_X = '74.7%';

/** Facts printed alongside the trace. These must match the certificate named
 *  in the provenance block above — see the regeneration note. */
export const LOT = {
  compound: 'Retatrutide 10 mg',
  lotId: 'LOT2026-06-0001',
  purity: '99.13%',
  lab: 'ILS Laboratories',
};

export function ChromatogramHero() {
  return (
    <>
      {/* Draw-on for the trace. pathLength="1" normalises the geometry so the
          dash math is independent of the path's real length — swap the trace
          and this keeps working. Guarded by prefers-reduced-motion: the trace
          is decorative, and a 2s sweep across the fold is exactly the kind of
          motion people disable it for. */}
      <style>{`
        @keyframes meritTraceDraw { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }
        .merit-trace { stroke-dasharray: 1; stroke-dashoffset: 1;
          animation: meritTraceDraw 2.1s cubic-bezier(.22,.61,.36,1) .15s forwards; }
        @media (prefers-reduced-motion: reduce) {
          .merit-trace { animation: none; stroke-dashoffset: 0 }
        }
      `}</style>

      <svg
        viewBox="0 0 1000 260"
        preserveAspectRatio="none"
        aria-hidden="true"
        className="absolute inset-x-0 bottom-[16%] z-[1] h-[56%] w-full overflow-visible"
      >
        <defs>
          <linearGradient id="merit-trace-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B9FF66" stopOpacity="0.30" />
            <stop offset="100%" stopColor="#B9FF66" stopOpacity="0" />
          </linearGradient>
          <filter id="merit-trace-glow" x="-10%" y="-40%" width="120%" height="180%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Area under the curve, then the curve itself. Non-scaling-stroke so
            the line stays hairline-crisp despite preserveAspectRatio="none"
            stretching the coordinate space horizontally. */}
        <path d={`${TRACE} L 1000,260 L 0,260 Z`} fill="url(#merit-trace-fill)" />
        <path
          d={TRACE}
          pathLength={1}
          fill="none"
          stroke="#B9FF66"
          strokeWidth="1.6"
          vectorEffect="non-scaling-stroke"
          filter="url(#merit-trace-glow)"
          className="merit-trace"
        />
      </svg>

      {/* Peak callout — the number the whole page is about, sitting on the
          peak it was measured from. */}
      <div
        className="absolute top-[13%] z-[2] -translate-x-1/2 text-center"
        style={{ left: PEAK_X }}
      >
        <div className="font-mono text-[9px] lg:text-[10px] tracking-[0.14em] uppercase text-white/45">
          Main peak
        </div>
        <div className="font-poster font-black leading-none tracking-[-0.03em] text-[#B9FF66] text-[clamp(18px,2.6vw,40px)]">
          {LOT.purity}
        </div>
      </div>
    </>
  );
}
