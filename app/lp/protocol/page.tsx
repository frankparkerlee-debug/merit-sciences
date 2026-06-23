import Image from 'next/image';
import { LpEmailCapture } from '@/components/lp/LpEmailCapture';

export const metadata = {
  title: 'Merit Sciences · COA Library',
  robots: { index: false, follow: false },
};

export default function ProtocolPage() {
  return (
    <div className="bg-[#04060E] text-cream font-sans min-h-screen flex flex-col overflow-hidden">

      {/* ── HERO ── */}
      <section className="flex-1 relative flex flex-col lg:flex-row lg:items-center px-8 pt-14 pb-10 lg:py-0 lg:min-h-screen">

        {/* Cobalt glow — behind number */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 55% 50% at 20% 45%, rgba(46,77,219,0.14) 0%, transparent 68%)',
          }}
        />

        {/* Desktop: COA ghosts in from right */}
        <div
          className="hidden lg:block absolute right-0 top-1/2 w-[420px] opacity-25 pointer-events-none select-none"
          style={{ transform: 'translateY(-50%) translateX(22%) rotate(7deg)' }}
        >
          <Image
            src="/coa/bpc157-coa.png"
            alt=""
            width={1836}
            height={2376}
            className="w-full h-auto drop-shadow-2xl"
            aria-hidden
          />
        </div>

        {/* Main content */}
        <div className="relative z-10 w-full max-w-3xl lg:max-w-4xl mx-auto flex flex-col">

          {/* Lab line */}
          <p className="font-mono text-[10px] tracking-[0.28em] uppercase text-cream/28 mb-8">
            Third-party lab · HPLC + UV Detection · Mass Spectrometry
          </p>

          {/* Purity label */}
          <p className="font-mono text-[11px] tracking-[0.26em] uppercase text-cobalt-soft mb-2">
            Purity
          </p>

          {/* THE NUMBER */}
          <p
            className="font-display font-black text-cream leading-none tracking-[-0.04em] mb-4"
            style={{ fontSize: 'clamp(100px, 26vw, 196px)' }}
          >
            99.389%
          </p>

          {/* Compound */}
          <p
            className="font-display font-black leading-none tracking-[-0.02em] mb-7"
            style={{ fontSize: 'clamp(30px, 6vw, 58px)', color: '#7B97FF' }}
          >
            BPC-157
          </p>

          <div className="w-10 h-px bg-white/15 mb-7" />

          {/* Statement */}
          <p className="text-cream/60 text-lg leading-relaxed mb-2 max-w-lg">
            Gray market vendors don&apos;t publish these. We do.
          </p>
          <p className="text-cream/35 text-sm leading-relaxed mb-8 max-w-md">
            Every compound we ship comes with a third-party certificate of analysis like this one.
            Independent lab. Every lot.
          </p>

          <p className="font-mono text-[10px] tracking-[0.24em] uppercase text-cream/25 mb-10">
            Licensed 503A pharmacy · 503B-sourced APIs · Dallas, TX
          </p>

          <div className="max-w-md">
            <LpEmailCapture source="lp-protocol" label="Get access — 10% off your first order" />
          </div>

          {/* Mobile: COA crop below CTA — shows HPLC banner + mass ID + chromatogram */}
          <div className="relative mt-12 lg:hidden mx-auto w-full">
            <div className="absolute inset-0 translate-x-3 translate-y-3 bg-cobalt/10 rounded-xl" />
            <div
              className="relative rounded-xl overflow-hidden shadow-2xl border border-white/8"
              style={{ transform: 'rotate(2deg)' }}
            >
              <Image
                src="/coa/bpc157-coa-crop.png"
                alt="Certificate of Analysis — HPLC and Mass Spectrometry, 99.389% purity"
                width={1785}
                height={885}
                className="w-full h-auto opacity-90"
              />
            </div>
          </div>

        </div>
      </section>

      {/* ── DISCLAIMER ── */}
      <div className="relative z-10 px-8 py-5 border-t border-white/5">
        <p className="max-w-4xl text-[10px] text-cream/15 leading-relaxed">
          Merit Sciences research compounds are for research use only. Not for human or veterinary use. Not evaluated or approved by the FDA. Available to qualified researchers and licensed practitioners only. By proceeding, you confirm eligibility. Merit Sciences is a licensed 503A compounding pharmacy. Active pharmaceutical ingredients sourced from a 503B licensed outsourcing facility.
        </p>
      </div>

    </div>
  );
}
