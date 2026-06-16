import Image from 'next/image';
import Link from 'next/link';
import { ClinicApplicationForm } from './ClinicApplicationForm';

export const metadata = {
  title: 'Clinic Accounts — Merit Sciences',
  description:
    'Wholesale pricing on pharmacy-grade peptides for licensed clinics. 25–40% off retail. 503B + ISO certified. HPLC ≥99% purity. Apply for clinic pricing.',
};

// Pricing snapshot — wholesale-vs-retail across our top SKUs. Numbers come
// from Inventory 6.14 (the current pricing book); the savings % is just
// (retail − physician) / retail × 100.
const PRICING_SNAPSHOT = [
  { sku: 'Retatrutide 30mg', retail: 169.99, physician: 112.50 },
  { sku: 'Tirzepatide 30mg', retail: 149.99, physician: 112.50 },
  { sku: 'Semaglutide 20mg', retail: 99.99, physician: 67.00 },
  { sku: 'Tesamorelin 10mg', retail: 86.99, physician: 58.00 },
  { sku: 'NAD+ 500mg', retail: 84.99, physician: 56.00 },
  { sku: 'GHK-Cu 100mg', retail: 85.99, physician: 56.00 },
];

const money = (n: number) =>
  `$${n.toFixed(2)}`;
const pct = (a: number, b: number) =>
  `${Math.round(((a - b) / a) * 100)}%`;

export default function ClinicPage() {
  return (
    <main className="bg-cream text-ink">
      {/* ═══════════ HERO ═══════════ */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            'linear-gradient(135deg, #F4F1EA 0%, #F0EDE5 30%, #DFE3F2 75%, #BFC9EB 100%)',
        }}
      >
        {/* Floating canonical vial on the right */}
        <div
          aria-hidden="true"
          className="absolute pointer-events-none hidden md:block"
          style={{
            right: 'clamp(-80px, -3vw, -20px)',
            top: '50%',
            transform: 'translateY(-50%) rotate(12deg)',
            width: 'clamp(280px, 28vw, 460px)',
            aspectRatio: '1',
          }}
        >
          <Image
            src="/brand/merit-vial-canonical-transparent.webp"
            alt=""
            fill
            priority
            sizes="(max-width: 1400px) 28vw, 460px"
            className="object-contain"
          />
        </div>

        <div className="relative z-10 max-w-[1240px] mx-auto px-6 lg:px-10 py-14 lg:py-20">
          <p className="text-[10px] lg:text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-5">
            — Clinic accounts · For licensed practitioners
          </p>
          <h1
            className="font-display font-black tracking-[-0.035em] leading-[0.92] max-w-3xl"
            style={{ fontSize: 'clamp(40px, 7vw, 96px)' }}
          >
            Pharmacy-grade peptides.
            <br />
            Wholesale<span className="text-cobalt"> economics.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] lg:text-[17px] text-ink-soft leading-relaxed">
            Verified per lot. 503B-compounded. HPLC <strong>≥99%</strong>. Shipped from Dallas in 48
            hours. <strong>25&ndash;40% below retail</strong> for licensed clinics &mdash; with the
            same lot data, the same pharmacist sign-off, the same vial.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Link
              href="#apply"
              className="inline-flex items-center justify-center bg-cobalt text-white font-bold tracking-[0.16em] uppercase text-xs px-7 py-3.5 rounded-lg hover:bg-ink transition-colors shadow-lg shadow-cobalt/30"
            >
              Apply for clinic pricing →
            </Link>
            <Link
              href="/catalog"
              className="inline-flex items-center justify-center bg-white/70 backdrop-blur-sm border border-cobalt/20 text-ink font-bold tracking-[0.16em] uppercase text-xs px-6 py-3.5 rounded-lg hover:border-cobalt/40 transition-colors"
            >
              Browse the public catalog
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ PRICING REALITY ═══════════ */}
      <section className="py-16 lg:py-24 border-t border-cobalt/10">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-10">
          <div className="max-w-2xl mb-10">
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
              — 01 · The pricing reality
            </p>
            <h2
              className="font-display font-black tracking-[-0.025em] leading-[0.98]"
              style={{ fontSize: 'clamp(32px, 4.5vw, 60px)' }}
            >
              Real numbers.
              <br />
              Real savings.
            </h2>
            <p className="mt-4 text-[15px] text-ink-soft leading-relaxed">
              No tiered nonsense, no hidden volume gates, no MOQ. Here&rsquo;s clinic pricing
              against retail across our top SKUs.
            </p>
          </div>

          <div className="rounded-2xl border border-cobalt/15 bg-white overflow-hidden">
            <div className="grid grid-cols-[1.4fr_repeat(3,_1fr)] gap-2 px-5 lg:px-8 py-4 bg-cobalt/[0.04] text-[10px] tracking-[0.18em] uppercase font-bold text-ink-soft">
              <div>SKU</div>
              <div className="text-right">Retail</div>
              <div className="text-right">Clinic</div>
              <div className="text-right">You save</div>
            </div>
            {PRICING_SNAPSHOT.map((p) => (
              <div
                key={p.sku}
                className="grid grid-cols-[1.4fr_repeat(3,_1fr)] gap-2 px-5 lg:px-8 py-4 border-t border-cobalt/5 items-baseline"
              >
                <div className="font-bold text-ink">{p.sku}</div>
                <div className="text-right text-ink-soft tabular-nums line-through opacity-60">
                  {money(p.retail)}
                </div>
                <div className="text-right text-ink font-bold tabular-nums">
                  {money(p.physician)}
                </div>
                <div className="text-right">
                  <span className="inline-flex items-baseline gap-1.5 bg-cobalt/8 text-cobalt rounded-md px-2 py-0.5">
                    <span className="font-bold tabular-nums">{money(p.retail - p.physician)}</span>
                    <span className="text-[10px] tracking-wider">({pct(p.retail, p.physician)})</span>
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-[13px]">
            <Pill icon="○" label="No MOQ" />
            <Pill icon="○" label="Free shipping over $100" />
            <Pill icon="○" label="48-hour dispatch from Dallas" />
          </div>
        </div>
      </section>

      {/* ═══════════ WHY WE CAN DO THIS ═══════════ */}
      <section className="bg-ink text-white py-16 lg:py-24">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-10">
          <div className="max-w-2xl mb-12">
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt-light font-bold mb-3" style={{ color: '#7B96FF' }}>
              — 02 · How we earn the margin back
            </p>
            <h2
              className="font-display font-black tracking-[-0.025em] leading-[0.98]"
              style={{ fontSize: 'clamp(32px, 4.5vw, 60px)' }}
            >
              Most cheap peptides
              <br />
              cut a corner somewhere<span style={{ color: '#7B96FF' }}>.</span>
            </h2>
            <p className="mt-4 text-[15px] text-white/70 leading-relaxed">
              Overseas synthesis. TFA counterions. No release testing. We don&rsquo;t. Every clinic
              account gets the same compound your patients would get at a top-tier hospital
              compounding pharmacy &mdash; documented at every step.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card
              tag="Facility"
              title="503B + ISO certified"
              body={
                <>
                  FDA-registered <strong>503B outsourcing facility</strong>, USP &lt;797&gt;
                  sterile compounding, ISO certifications on top. The regulatory tier above 503A
                  compounding pharmacies &mdash; with batch records to match.
                </>
              }
            />
            <Card
              tag="Purity"
              title="HPLC ≥99% per lot"
              body={
                <>
                  Every batch released only after HPLC purity, sterility (USP &lt;71&gt;),
                  endotoxin (USP &lt;85&gt;), and particulate (USP &lt;788&gt;) testing. <strong>COA
                  ships with every order</strong> &mdash; give it to your patient, post it to your
                  portal, file it in the chart.
                </>
              }
            />
            <Card
              tag="Counterion"
              title="Acetate salt, not TFA"
              body={
                <>
                  Most discount peptides ship as <strong>trifluoroacetate (TFA)</strong> because
                  the acetate exchange step is expensive. TFA accumulates in liver and kidneys at
                  repeated dosing, drives injection-site inflammation, and binds metabolic
                  enzymes. We exchange to acetate &mdash; the salt form real pharmaceutical
                  companies use.
                </>
              }
            />
          </div>
        </div>
      </section>

      {/* ═══════════ ROI MATH ═══════════ */}
      <section className="py-16 lg:py-24 border-t border-cobalt/10">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-10">
          <div className="max-w-2xl mb-10">
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
              — 03 · What this means for your practice
            </p>
            <h2
              className="font-display font-black tracking-[-0.025em] leading-[0.98]"
              style={{ fontSize: 'clamp(32px, 4.5vw, 60px)' }}
            >
              The margin you don&rsquo;t see
              <br />
              compounds the most<span className="text-cobalt">.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Per-protocol math */}
            <div className="rounded-2xl border border-cobalt/15 bg-white p-7 lg:col-span-2">
              <p className="text-[10px] tracking-[0.22em] uppercase font-bold text-cobalt mb-3">
                — Worked example
              </p>
              <h3 className="font-display font-black text-2xl text-ink leading-tight mb-5 tracking-[-0.02em]">
                12-week Tirzepatide titration · per patient
              </h3>
              <div className="space-y-3 text-[14px] text-ink-soft">
                <CalcRow label="Total dose (titrated 2.5 → 12.5 mg/wk)" value="≈ 60 mg" />
                <CalcRow label="Vials needed (Tirzepatide 30mg)" value="2 vials" />
                <CalcRow label="Retail acquisition cost" value="$299.98" muted />
                <CalcRow label="Clinic acquisition cost" value="$225.00" bold />
                <CalcRow label="Savings per patient" value="$74.98" highlight />
              </div>
              <div className="mt-6 pt-6 border-t border-cobalt/10 grid grid-cols-3 gap-4 text-center">
                <Stat n="20" label="Patients / mo" />
                <Stat n="$1,500" label="Saved / mo" />
                <Stat n="$18,000" label="Saved / yr" />
              </div>
            </div>

            {/* Outcomes / LTV column */}
            <div className="space-y-5">
              <div className="rounded-2xl border border-cobalt/15 bg-white p-6">
                <p className="text-[10px] tracking-[0.22em] uppercase font-bold text-cobalt mb-2">
                  — Adverse events
                </p>
                <p className="text-[14px] text-ink leading-relaxed">
                  Higher purity + acetate counterion =<br />
                  <strong>lower injection-site reactions</strong>, less mid-protocol dropout.
                  Industry data show 15&ndash;25% dropout at discount purity vs &lt;5% at
                  pharmacy grade.
                </p>
              </div>
              <div className="rounded-2xl border border-cobalt/15 bg-white p-6">
                <p className="text-[10px] tracking-[0.22em] uppercase font-bold text-cobalt mb-2">
                  — Patient LTV
                </p>
                <p className="text-[14px] text-ink leading-relaxed">
                  Patients who finish a full protocol are <strong>3× more likely to re-enroll</strong>.
                  Your margin compounds across the patient relationship, not the first vial.
                </p>
              </div>
              <div className="rounded-2xl border border-cobalt/15 bg-white p-6">
                <p className="text-[10px] tracking-[0.22em] uppercase font-bold text-cobalt mb-2">
                  — Liability
                </p>
                <p className="text-[14px] text-ink leading-relaxed">
                  Every shipment includes the lot COA. <strong>Chart it, post it, defend it</strong>.
                  The 503B + USP testing chain is the same one used by hospital pharmacies.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ APPLY ═══════════ */}
      <section id="apply" className="bg-white border-t border-cobalt/10 py-16 lg:py-24">
        <div className="max-w-[860px] mx-auto px-6 lg:px-10">
          <div className="max-w-xl mb-10">
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
              — 04 · Apply
            </p>
            <h2
              className="font-display font-black tracking-[-0.025em] leading-[0.98]"
              style={{ fontSize: 'clamp(32px, 4.5vw, 60px)' }}
            >
              Apply for a clinic account<span className="text-cobalt">.</span>
            </h2>
            <p className="mt-4 text-[15px] text-ink-soft leading-relaxed">
              License + NPI verification within 1 business day. Approved clinics see physician
              pricing on every SKU and get access to clinic-only compounds.
            </p>
          </div>

          <ClinicApplicationForm />
        </div>
      </section>
    </main>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────
function Card({ tag, title, body }: { tag: string; title: string; body: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.04] backdrop-blur-sm p-7">
      <p className="text-[10px] tracking-[0.22em] uppercase font-bold mb-3" style={{ color: '#7B96FF' }}>
        — {tag}
      </p>
      <h3 className="font-display font-black text-2xl leading-tight mb-3 tracking-[-0.02em]">
        {title}
      </h3>
      <p className="text-[13px] text-white/75 leading-relaxed">{body}</p>
    </div>
  );
}

function Pill({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-3 bg-white border border-cobalt/15 rounded-xl px-4 py-3 text-ink-soft">
      <span className="text-cobalt font-bold">{icon}</span>
      <span className="font-bold tracking-wide uppercase text-[11px]">{label}</span>
    </div>
  );
}

function CalcRow({
  label,
  value,
  muted,
  bold,
  highlight,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span>{label}</span>
      <span
        className={`tabular-nums ${
          highlight
            ? 'text-cobalt font-black text-lg'
            : bold
              ? 'text-ink font-bold'
              : muted
                ? 'line-through opacity-60'
                : ''
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <p className="font-display font-black text-cobalt text-2xl lg:text-3xl tabular-nums tracking-[-0.02em]">
        {n}
      </p>
      <p className="text-[10px] tracking-[0.18em] uppercase font-bold text-ink-soft mt-1">
        {label}
      </p>
    </div>
  );
}
