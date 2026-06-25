import { LpEmailCapture } from '@/components/lp/LpEmailCapture';

export const metadata = {
  title: 'Merit Sciences · Research Compounds',
  robots: { index: false, follow: false },
};

export default function ClinicSourcePage() {
  return (
    <div className="bg-[#080C15] text-cream font-sans min-h-screen flex flex-col">

      <section className="flex-1 flex flex-col justify-center px-6 py-10 lg:py-0 min-h-screen">
        <div className="relative z-10 w-full max-w-xl mx-auto lg:mx-0 lg:ml-[12vw]">

          <p className="font-mono text-[10px] tracking-[0.32em] uppercase text-cobalt-soft mb-8">
            Merit Sciences · Research Compounds
          </p>

          {/* Step 1 */}
          <div className="mb-6">
            <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-cream/18 mb-2">
              Step 1
            </p>
            <h2 className="text-cream/50 text-xl font-bold leading-snug tracking-tight mb-1.5">
              You heard about it somewhere.
            </h2>
            <p className="text-cream/25 text-sm leading-relaxed">
              A podcast. A forum. A guy at the gym who looks suspiciously great.
            </p>
          </div>

          <div className="w-full h-px bg-white/[0.05] mb-6" />

          {/* Step 2 */}
          <div className="mb-6">
            <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-cream/18 mb-2">
              Step 2
            </p>
            <h2 className="text-cream/50 text-xl font-bold leading-snug tracking-tight mb-1.5">
              You started researching.
            </h2>
            <p className="text-cream/25 text-sm leading-relaxed">
              Found a lot of websites. Fewer answers.
            </p>
          </div>

          <div className="w-full h-px bg-white/[0.05] mb-6" />

          {/* Step 3 — the reveal */}
          <div className="mb-8">
            <p className="font-mono text-[9px] tracking-[0.3em] uppercase text-cobalt-soft mb-2">
              Step 3
            </p>
            <h1
              className="text-cream font-black leading-[0.92] tracking-[-0.04em] mb-4"
              style={{ fontSize: 'clamp(34px, 8vw, 76px)' }}
            >
              You found us.
            </h1>
            <p className="text-cream/60 text-base leading-relaxed mb-1.5 max-w-md">
              Licensed 503A compounding pharmacy. Sources from a 503B FDA-registered facility.
            </p>
            <p className="text-cream/35 text-sm leading-relaxed max-w-md">
              No appointment. No referral. No waitlist. Ships to your door in 48 hours from Dallas.
            </p>
          </div>

          <div className="max-w-md">
            <LpEmailCapture source="lp-clinic-source" label="Get access — 10% off your first order" />
          </div>

          <p className="text-cream/18 text-[10px] mt-5 leading-relaxed max-w-md">
            Research use only. 503A licensed compounding pharmacy. Active APIs sourced from a 503B registered outsourcing facility.
          </p>

        </div>
      </section>

      <div className="relative z-10 px-6 py-5 border-t border-white/5">
        <p className="max-w-2xl text-[10px] text-cream/12 leading-relaxed">
          Merit Sciences research compounds are for research use only. Not for human or veterinary use. Not evaluated or approved by the FDA. Available to qualified researchers and licensed practitioners only. By proceeding, you confirm eligibility. Merit Sciences is a licensed 503A compounding pharmacy. Active pharmaceutical ingredients sourced from a 503B licensed outsourcing facility.
        </p>
      </div>

    </div>
  );
}
