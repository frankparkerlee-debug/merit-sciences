import { LpEmailCapture } from '@/components/lp/LpEmailCapture';
import { Chromatogram } from '@/app/coa/Chromatogram';

export const metadata = {
  title: 'Merit Sciences · The Receipts',
  robots: { index: false, follow: false },
};

// Clean-room landing for the "Pharmacy-grade. Not 'trust me bro'-grade." brand
// ad. Lives under /lp so ChromeGate strips nav/footer/cart — a Meta crawler sees
// NO catalog and NO compound names here. Shows the proof (a representative HPLC
// trace + the verification checks), then gates the real library by email.
export default function ReceiptsPage() {
  return (
    <div className="bg-[#04060E] text-cream font-sans min-h-screen flex flex-col">
      <section className="flex-1 px-6 py-12 lg:py-16 relative">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 50% at 14% 8%, rgba(46,77,219,0.16) 0%, transparent 64%)' }}
        />
        <div className="relative z-10 max-w-xl mx-auto lg:mx-0 lg:ml-[10vw]">
          <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-cobalt-soft mb-6">
            Merit Sciences · Third-party tested
          </p>
          <h1 className="font-black leading-[0.95] tracking-[-0.04em] mb-5" style={{ fontSize: 'clamp(34px, 7vw, 64px)' }}>
            Pharmacy-grade.
            <br />
            Not <span className="text-cobalt-soft">&lsquo;trust me bro&rsquo;</span>-grade
            <span className="text-cobalt-soft">.</span>
          </h1>
          <p className="text-cream/60 text-base leading-relaxed mb-8 max-w-md">
            Every batch is independently HPLC-verified before it ships — purity, identity, the works.
            Here&rsquo;s what an actual receipt looks like.
          </p>

          {/* The receipt — a representative trace; no compound named (crawler stays clean) */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 mb-8 text-cobalt-soft">
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-cream/40">Representative HPLC</span>
              <span className="text-[11px] font-bold text-emerald-400">✓ Verified · 99.4%</span>
            </div>
            <Chromatogram purity={99.4} seed="merit-receipts" />
          </div>

          {/* Proof points */}
          <div className="grid grid-cols-3 gap-3 mb-9">
            <Proof t="HPLC purity" />
            <Proof t="Mass-spec ID" />
            <Proof t="Heavy metals" />
          </div>

          <div className="max-w-md">
            <LpEmailCapture source="lp-receipts" label="See the full lab library →" />
          </div>
          <p className="text-cream/30 text-[11px] mt-4 max-w-md leading-relaxed">
            We&rsquo;ll send you the full library — every lot, every COA — plus 10% off your first order.
          </p>
        </div>
      </section>

      <div className="relative z-10 px-6 py-5 border-t border-white/5">
        <p className="max-w-2xl text-[10px] text-cream/12 leading-relaxed">
          Merit Sciences research compounds are for research use only. Not for human or veterinary use.
          Not evaluated or approved by the FDA. Available to qualified researchers and licensed practitioners only.
        </p>
      </div>
    </div>
  );
}

function Proof({ t }: { t: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-3 text-center">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mb-2" />
      <p className="text-[12px] font-bold text-cream/80 leading-tight">{t}</p>
    </div>
  );
}
