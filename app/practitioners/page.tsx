import Image from 'next/image';
import Link from 'next/link';
import { PractitionerApplicationForm } from './PractitionerApplicationForm';
import { LeadCaptureForm } from './LeadCaptureForm';

export const metadata = {
  title: 'Practitioner Program — Merit Sciences',
  description:
    'Merit Sciences Practitioner Program — verified-account access for licensed practitioners. 503B + ISO certified. HPLC ≥99% per lot. COA with every shipment. Apply for portal access.',
};

export default function PractitionersPage() {
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
            — Practitioner Program · Verified-account access
          </p>
          <h1
            className="font-display font-black tracking-[-0.035em] leading-[0.92] max-w-3xl"
            style={{ fontSize: 'clamp(40px, 7vw, 96px)' }}
          >
            Pharmacy-grade compounds.
            <br />
            Built for your<span className="text-cobalt"> practice.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] lg:text-[17px] text-ink-soft leading-relaxed">
            A verified-account program for licensed practitioners. Practices save an average{' '}
            <strong>~30% on compound cost</strong> versus their previous supplier &mdash; margin
            added straight back into the practice. <strong>503B-sourced.</strong>{' '}
            <strong>HPLC &ge;99%</strong> per lot. COA with every shipment. Shipped from Dallas in 48
            hours.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Link
              href="#apply"
              className="inline-flex items-center justify-center bg-cobalt text-white font-bold tracking-[0.16em] uppercase text-xs px-7 py-3.5 rounded-lg hover:bg-ink transition-colors shadow-lg shadow-cobalt/30"
            >
              Apply for an account →
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

      {/* ═══════════ PROOF BAR — social proof + credentials ═══════════ */}
      <section className="bg-cobalt text-white">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-10 py-7 lg:py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-6 gap-x-4">
            <ProofStat value="40+" label="Texas practices sourcing through Merit" />
            <ProofStat value="503B" label="+ ISO certified outsourcing facility" />
            <ProofStat value="≥99%" label="HPLC purity, released per lot" />
            <ProofStat value="48hr" label="shipped from Dallas · no MOQ" />
          </div>
        </div>
      </section>

      {/* ═══════════ §01 — THE ECONOMIC CASE ═══════════ */}
      <section className="bg-white border-t border-cobalt/10 py-16 lg:py-24">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-16 items-center">
            {/* Left — the argument */}
            <div>
              <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
                — 01 · The economics
              </p>
              <h2
                className="font-display font-black tracking-[-0.025em] leading-[0.98]"
                style={{ fontSize: 'clamp(32px, 4.5vw, 60px)' }}
              >
                Keep your pricing.
                <br />
                Change your margin<span className="text-cobalt">.</span>
              </h2>
              <p className="mt-5 max-w-xl text-[15px] lg:text-[16px] text-ink-soft leading-relaxed">
                Practices that move their sourcing to Merit cut their average compound cost by
                roughly <strong className="text-ink">30%</strong> versus their previous supplier
                &mdash; without changing a single patient price. That spread stops going to a
                middleman. It goes back into your practice.
              </p>

              <ul className="mt-7 space-y-3">
                <EconPoint title="Don't change your protocols">
                  Same compounds, same doses, same patient programs. Only the invoice changes.
                </EconPoint>
                <EconPoint title="Don't change your patient pricing">
                  The ~30% isn&rsquo;t a discount you pass on &mdash; it&rsquo;s margin you&rsquo;re
                  currently handing your supplier.
                </EconPoint>
                <EconPoint title="Don't change your workflow">
                  Order office stock, reorder from history, COA on every shipment. Switching is a
                  sourcing decision, not an operational one.
                </EconPoint>
              </ul>
            </div>

            {/* Right — the math, illustrative */}
            <div className="rounded-3xl border border-cobalt/15 bg-cream p-8 lg:p-10">
              <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-5">
                — What 30% looks like
              </p>
              <div className="flex items-baseline gap-3">
                <span
                  className="font-display font-black text-cobalt leading-none"
                  style={{ fontSize: 'clamp(56px, 8vw, 88px)' }}
                >
                  ~30%
                </span>
                <span className="text-[13px] text-ink-soft leading-tight max-w-[150px]">
                  average cut in compound cost vs. previous supplier
                </span>
              </div>

              <div className="mt-8 space-y-4">
                <MathRow label="A practice spending" value="$5,000 / mo" />
                <MathRow label="Cost reduction at ~30%" value="≈ $1,500 / mo" accent />
                <MathRow label="Added to margin, annually" value="≈ $18,000 / yr" accent />
              </div>

              <p className="mt-6 text-[11px] text-ink-soft leading-relaxed">
                Illustrative example. Actual savings depend on your volume and current supplier.
                Account pricing is set in your portal at approval &mdash; standard or custom to your
                practice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ CTA BAND — catch the money-convinced ═══════════ */}
      <CTABand
        heading="Keep the 30%."
        sub="License + NPI verified within one business day. No commitments, no activation fees."
      />

      {/* ═══════════ §02 — QUALITY ═══════════ */}
      <section className="bg-ink text-white py-16 lg:py-24">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-10">
          <div className="max-w-2xl mb-12">
            <p className="text-[10px] tracking-[0.22em] uppercase font-bold mb-3" style={{ color: '#7B96FF' }}>
              — 02 · How we&rsquo;re different
            </p>
            <h2
              className="font-display font-black tracking-[-0.025em] leading-[0.98]"
              style={{ fontSize: 'clamp(32px, 4.5vw, 60px)' }}
            >
              Sourcing that holds up
              <br />
              to whoever asks<span style={{ color: '#7B96FF' }}>.</span>
            </h2>
            <p className="mt-4 text-[15px] text-white/70 leading-relaxed">
              Overseas synthesis. TFA counterions. No release testing. We don&rsquo;t. The compound
              you order is characterized and released to the same standards used by hospital
              pharmacies &mdash; from a US-licensed pharmacy team you can name.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <DarkCard
              tag="Facility"
              title="503B + ISO certified"
              body={
                <>
                  FDA-registered <strong>503B outsourcing facility</strong>, USP &lt;797&gt;
                  sterile processing, ISO certifications on top. The regulatory tier above 503A
                  pharmacies &mdash; named, registered, and inspectable.
                </>
              }
            />
            <DarkCard
              tag="Characterization"
              title="HPLC ≥99% per lot"
              body={
                <>
                  Every batch released only after HPLC purity, sterility (USP &lt;71&gt;),
                  endotoxin (USP &lt;85&gt;), and particulate (USP &lt;788&gt;) testing.
                  <strong> COA accompanies every shipment</strong> &mdash; lot # on every label.
                </>
              }
            />
            <DarkCard
              tag="Counterion"
              title="Acetate, not TFA"
              body={
                <>
                  We exchange to <strong>acetate</strong> &mdash; the salt form used in
                  characterized pharmaceutical references. Most discount sources ship as the
                  trifluoroacetate (TFA) salt because the acetate exchange step is expensive. We
                  do it anyway.
                </>
              }
            />
          </div>

          <div className="mt-10">
            <Link
              href="#apply"
              className="inline-flex items-center justify-center bg-white text-ink font-bold tracking-[0.16em] uppercase text-xs px-7 py-3.5 rounded-lg hover:bg-white/90 transition-colors"
            >
              Apply for an account →
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════ LEAD CAPTURE — soft alt for the not-ready, beside the apply form ═══════════ */}
      <section className="bg-white border-t border-cobalt/10 py-10">
        <div className="max-w-[860px] mx-auto px-6 lg:px-10">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex-1">
              <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">
                — Not ready to apply yet?
              </p>
              <p className="text-[15px] text-ink leading-relaxed">
                Get <strong>The Practice Owner&rsquo;s Guide to Adding Compounds</strong> &mdash; the
                margin math, the compliance basics, and the protocols practices start with. A short
                email series. Unsubscribe anytime.
              </p>
            </div>
            <div className="flex-1">
              <LeadCaptureForm />
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ §03 — APPLY ═══════════ */}
      <section id="apply" className="bg-cream border-t border-cobalt/10 py-16 lg:py-24">
        <div className="max-w-[860px] mx-auto px-6 lg:px-10">
          <div className="max-w-xl mb-10">
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
              — 03 · Apply
            </p>
            <h2
              className="font-display font-black tracking-[-0.025em] leading-[0.98]"
              style={{ fontSize: 'clamp(32px, 4.5vw, 60px)' }}
            >
              Apply for portal access<span className="text-cobalt">.</span>
            </h2>
            <p className="mt-4 text-[15px] text-ink-soft leading-relaxed">
              License + NPI verification within 1 business day. Approved practitioners get portal
              access with their account-tier pricing already applied. No commitments, no
              activation fees.
            </p>
          </div>

          <PractitionerApplicationForm />
        </div>
      </section>
    </main>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────
function CTABand({ heading, sub }: { heading: string; sub: string }) {
  return (
    <section className="bg-cream border-y border-cobalt/15">
      <div className="max-w-[1240px] mx-auto px-6 lg:px-10 py-12 lg:py-14">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <h2
              className="font-display font-black tracking-[-0.025em] leading-[1.0]"
              style={{ fontSize: 'clamp(26px, 3.6vw, 44px)' }}
            >
              {heading.replace(/\.$/, '')}
              <span className="text-cobalt">.</span>
            </h2>
            <p className="mt-2 text-[15px] text-ink-soft max-w-md leading-relaxed">{sub}</p>
          </div>
          <Link
            href="#apply"
            className="inline-flex items-center justify-center bg-cobalt text-white font-bold tracking-[0.16em] uppercase text-xs px-8 py-4 rounded-lg hover:bg-ink transition-colors shadow-lg shadow-cobalt/30 whitespace-nowrap"
          >
            Apply for an account →
          </Link>
        </div>
      </div>
    </section>
  );
}

function DarkCard({ tag, title, body }: { tag: string; title: string; body: React.ReactNode }) {
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

function EconPoint({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        className="mt-0.5 flex-none w-5 h-5 rounded-full bg-cobalt/10 text-cobalt flex items-center justify-center"
        aria-hidden="true"
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 6.5L5 9L9.5 3.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-[14px] leading-relaxed">
        <strong className="text-ink">{title}.</strong>{' '}
        <span className="text-ink-soft">{children}</span>
      </span>
    </li>
  );
}

function MathRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-cobalt/10 pb-3">
      <span className="text-[13px] text-ink-soft">{label}</span>
      <span className={`text-[15px] font-bold tabular-nums ${accent ? 'text-cobalt' : 'text-ink'}`}>
        {value}
      </span>
    </div>
  );
}

function ProofStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center lg:text-left">
      <div
        className="font-display font-black tracking-[-0.02em] leading-none"
        style={{ fontSize: 'clamp(30px, 4vw, 46px)' }}
      >
        {value}
      </div>
      <p className="mt-1.5 text-[11px] lg:text-[12px] text-white/70 leading-snug">{label}</p>
    </div>
  );
}
