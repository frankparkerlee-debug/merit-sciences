import Image from 'next/image';
import Link from 'next/link';
import { PractitionerApplicationForm } from './PractitionerApplicationForm';

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
            Pharmacy-grade peptides.
            <br />
            Built for your<span className="text-cobalt"> practice.</span>
          </h1>
          <p className="mt-5 max-w-xl text-[15px] lg:text-[17px] text-ink-soft leading-relaxed">
            A verified-account program for licensed practitioners. Account-tier pricing in your
            portal. <strong>503B-compounded.</strong> <strong>HPLC &ge;99%</strong> per lot. COA
            with every shipment. Shipped from Dallas in 48 hours.
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

      {/* ═══════════ §01 — WHAT YOU GET ═══════════ */}
      <section className="py-16 lg:py-24 border-t border-cobalt/10">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-10">
          <div className="max-w-2xl mb-12">
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
              — 01 · What you get
            </p>
            <h2
              className="font-display font-black tracking-[-0.025em] leading-[0.98]"
              style={{ fontSize: 'clamp(32px, 4.5vw, 60px)' }}
            >
              Built for the people
              <br />
              actually doing the work<span className="text-cobalt">.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <Pillar
              tag="Account pricing"
              title="Set in your portal"
              body={
                <>
                  Account-tier pricing applied at approval &mdash; standard or custom to your
                  practice. <strong>Never published</strong>; visible only inside your portal.
                </>
              }
            />
            <Pillar
              tag="Documentation"
              title="COA with every order"
              body={
                <>
                  Every shipment includes the lot Certificate of Analysis. Save it, post it to
                  your portal, file it. <strong>Lot # on every label.</strong>
                </>
              }
            />
            <Pillar
              tag="Manufacturing"
              title="503B + ISO certified"
              body={
                <>
                  FDA-registered <strong>503B outsourcing facility</strong>, USP &lt;797&gt;
                  sterile compounding, ISO certifications. The regulatory tier above 503A.
                </>
              }
            />
            <Pillar
              tag="Operations"
              title="48hr · No MOQ"
              body={
                <>
                  Shipped from Dallas within 48 hours of order. <strong>No MOQ</strong>, free
                  shipping over $100. Reorder from history.
                </>
              }
            />
          </div>
        </div>
      </section>

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
              Most discount peptides
              <br />
              cut a corner somewhere<span style={{ color: '#7B96FF' }}>.</span>
            </h2>
            <p className="mt-4 text-[15px] text-white/70 leading-relaxed">
              Overseas synthesis. TFA counterions. No release testing. We don&rsquo;t. The compound
              you order is characterized and released to the same standards used by hospital
              pharmacies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <DarkCard
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
            <DarkCard
              tag="Characterization"
              title="HPLC ≥99% per lot"
              body={
                <>
                  Every batch released only after HPLC purity, sterility (USP &lt;71&gt;),
                  endotoxin (USP &lt;85&gt;), and particulate (USP &lt;788&gt;) testing.
                  <strong> COA accompanies every shipment.</strong>
                </>
              }
            />
            <DarkCard
              tag="Counterion"
              title="Acetate, not TFA"
              body={
                <>
                  We exchange to <strong>acetate</strong> &mdash; the salt form used in
                  characterized pharmaceutical references. Most discount peptides ship as the
                  trifluoroacetate (TFA) salt because the acetate exchange step is expensive. We
                  do it anyway.
                </>
              }
            />
          </div>
        </div>
      </section>

      {/* ═══════════ §03 — WHY A MERIT ACCOUNT MATTERS ═══════════ */}
      <section className="py-16 lg:py-24 border-t border-cobalt/10">
        <div className="max-w-[1240px] mx-auto px-6 lg:px-10">
          <div className="max-w-2xl mb-12">
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
              — 03 · Why a Merit account matters
            </p>
            <h2
              className="font-display font-black tracking-[-0.025em] leading-[0.98]"
              style={{ fontSize: 'clamp(32px, 4.5vw, 60px)' }}
            >
              Sourcing that holds up
              <br />
              to whoever asks<span className="text-cobalt">.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Pillar
              tag="Reputation"
              title="A supplier you can name"
              body={
                <>
                  US-licensed pharmacy team. 503B + ISO certified facility in Dallas. <strong>The
                  chain of custody is named, registered, and inspectable.</strong> The kind of
                  sourcing that holds up to questions.
                </>
              }
            />
            <Pillar
              tag="Documentation"
              title="Records follow the vial"
              body={
                <>
                  Every vial carries a lot #. Every shipment includes the COA. The
                  <strong> 503B + USP characterization chain</strong> mirrors the one used by
                  hospital pharmacies.
                </>
              }
            />
            <Pillar
              tag="Predictability"
              title="One supplier, one bar"
              body={
                <>
                  Same pharmacist sign-off across every order. Same purity floor across every lot.
                  Same vial every shipment. <strong>Sourcing variance off your worry list.</strong>
                </>
              }
            />
          </div>
        </div>
      </section>

      {/* ═══════════ §04 — APPLY ═══════════ */}
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
function Pillar({ tag, title, body }: { tag: string; title: string; body: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-cobalt/15 bg-white p-6">
      <p className="text-[10px] tracking-[0.22em] uppercase font-bold text-cobalt mb-2">— {tag}</p>
      <h3 className="font-display font-black text-lg lg:text-xl leading-tight mb-3 tracking-[-0.02em]">
        {title}
      </h3>
      <p className="text-[13px] text-ink-soft leading-relaxed">{body}</p>
    </div>
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
