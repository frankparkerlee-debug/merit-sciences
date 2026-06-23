import Image from 'next/image';
import { LpEmailCapture } from '@/components/lp/LpEmailCapture';

export const metadata = {
  title: 'Merit Sciences · Research Compounds',
  robots: { index: false, follow: false },
};

export default function ClinicSourcePage() {
  return (
    <div className="bg-[#080C15] text-cream font-sans min-h-screen flex flex-col">

      {/* ── MAIN: flex-col on mobile, 2-col grid on desktop ── */}
      <section className="flex-1 flex flex-col lg:grid lg:grid-cols-2 lg:items-center lg:gap-20 lg:max-w-6xl lg:mx-auto lg:w-full px-5 pt-8 pb-8 lg:px-6 lg:py-0">

        {/* MOBILE ONLY: COA as a top card — shows doc + purity visible */}
        <div className="relative lg:hidden mb-7 mx-1">
          <div
            className="relative h-[250px] rounded-xl overflow-hidden shadow-2xl border border-white/8"
            style={{ transform: 'rotate(-1.5deg)' }}
          >
            <Image
              src="/coa/bpc157-coa-crop.png"
              alt="Certificate of Analysis — HPLC and Mass Spectrometry, 99.389% purity"
              fill
              className="object-cover object-center"
              priority
            />
            {/* Fade out bottom edge so it doesn't hard-cut */}
            <div
              className="absolute inset-x-0 bottom-0 h-16"
              style={{ background: 'linear-gradient(to bottom, transparent, rgba(8,12,21,0.85))' }}
            />
          </div>
          <div className="absolute top-3 right-3 bg-cobalt text-cream font-mono text-[8px] tracking-[0.18em] uppercase px-2.5 py-1 rounded-full shadow-lg">
            HPLC + MS · Verified
          </div>
        </div>

        {/* DESKTOP ONLY: COA as left column */}
        <div className="relative hidden lg:block">
          <div className="absolute inset-0 translate-x-5 translate-y-5 bg-cobalt/12 rounded-2xl" />
          <div className="absolute inset-0 translate-x-2.5 translate-y-2.5 bg-cobalt/6 rounded-2xl" />
          <div
            className="relative rounded-2xl overflow-hidden shadow-2xl"
            style={{ transform: 'rotate(-2.5deg)' }}
          >
            <Image
              src="/coa/bpc157-coa.png"
              alt="BPC-157 Certificate of Analysis — Freedom Diagnostics, HPLC and Mass Spectrometry, 99.389% purity"
              width={1836}
              height={2376}
              className="w-full h-auto"
              priority
            />
          </div>
          <div className="absolute -top-3 -right-3 bg-cobalt text-cream font-mono text-[9px] tracking-[0.22em] uppercase px-4 py-2 rounded-full shadow-lg">
            HPLC + MS · Verified
          </div>
        </div>

        {/* TEXT + FORM: right column desktop, below image mobile */}
        <div>
          <p className="font-mono text-[10px] tracking-[0.32em] uppercase text-cobalt-soft mb-5">
            Merit Sciences · Research Compounds
          </p>

          <h1
            className="font-display font-black text-cream leading-[0.88] tracking-[-0.04em] mb-5"
            style={{ fontSize: 'clamp(36px, 5.5vw, 68px)' }}
          >
            This is what<br />legitimate<br />looks like.
          </h1>

          <div className="flex flex-wrap gap-2 mb-5">
            {['Freedom Diagnostics', 'HPLC + Mass Spec', '99.389% purity'].map((c) => (
              <span
                key={c}
                className="border border-cobalt/35 bg-cobalt/10 text-cobalt-soft font-mono text-[9px] tracking-[0.16em] uppercase px-3 py-1.5 rounded-full"
              >
                {c}
              </span>
            ))}
          </div>

          <p className="text-cream/50 text-sm leading-relaxed mb-7 max-w-md">
            Not a supplement label. A third-party certificate of analysis on every lot — from a licensed pharmacy sourcing from a 503B FDA-registered outsourcing facility.
          </p>

          <LpEmailCapture source="lp-clinic-source" label="Get access — 10% off your first order" />

          <p className="text-cream/20 text-[10px] mt-4 leading-relaxed">
            503A licensed compounding pharmacy · APIs from a 503B registered outsourcing facility · Research use only
          </p>
        </div>

      </section>

      {/* ── DISCLAIMER ── */}
      <div className="px-5 lg:px-6 py-5 border-t border-white/5">
        <p className="max-w-6xl mx-auto text-[10px] text-cream/15 leading-relaxed">
          Merit Sciences research compounds are for research use only. Not for human or veterinary use. Not evaluated or approved by the FDA. Available to qualified researchers and licensed practitioners only. By proceeding, you confirm eligibility. Merit Sciences is a licensed 503A compounding pharmacy. Active pharmaceutical ingredients sourced from a 503B licensed outsourcing facility. COA shown is representative; lot-specific COAs issued under Merit Sciences as production batches are certified.
        </p>
      </div>

    </div>
  );
}
