import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'About',
  description:
    'Why Merit Sciences exists: pharmacy-grade compounds, tested and documented per lot, without the pharmacy markup. HPLC ≥99% purity, a COA with every shipment, shipped from Dallas.',
};

export default function AboutPage() {
  return (
    <main className="bg-cream text-ink">
      {/* ════════════════ HERO — MANIFESTO ════════════════ */}
      <section className="relative overflow-hidden bg-ink text-white">
        <Image
          src="/brand/scene-pattern-charcoal.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-40"
        />
        <div
          aria-hidden="true"
          className="absolute pointer-events-none hidden md:block"
          style={{
            right: 'clamp(-60px, -2vw, -10px)',
            top: '50%',
            transform: 'translateY(-50%) rotate(10deg)',
            width: 'clamp(260px, 26vw, 440px)',
            aspectRatio: '1',
          }}
        >
          <Image
            src="/brand/merit-vial-canonical-transparent.webp"
            alt=""
            fill
            priority
            sizes="(max-width: 1400px) 26vw, 440px"
            className="object-contain"
          />
        </div>

        <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-12 py-20 lg:py-32">
          <p className="text-[10px] lg:text-[11px] tracking-[0.24em] uppercase font-bold mb-6" style={{ color: '#9DB2FF' }}>
            — About Merit Sciences
          </p>
          <h1
            className="font-display font-black tracking-[-0.04em] leading-[0.9] max-w-4xl"
            style={{ fontSize: 'clamp(44px, 7.5vw, 104px)' }}
          >
            Built to end
            <br />
            a bad tradeoff<span className="text-cobalt">.</span>
          </h1>
          <p className="mt-7 max-w-xl text-[16px] lg:text-[19px] text-white/75 leading-relaxed">
            Research compounds force a choice no serious buyer should have to make: cheap and
            unverified, or legitimate and overpriced. Merit refuses it &mdash; pharmacy-grade
            material, fully documented, without the pharmacy markup.
          </p>
        </div>
      </section>

      {/* ════════════════ §01 · THE TRADEOFF ════════════════ */}
      <section className="bg-cream py-20 lg:py-28 px-6 lg:px-12">
        <div className="max-w-[1200px] mx-auto">
          <div className="max-w-2xl mb-12 lg:mb-16">
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
              — 01 · Why we exist
            </p>
            <h2
              className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95]"
              style={{ fontSize: 'clamp(32px, 5vw, 64px)' }}
            >
              The market gives you
              <br />
              two bad options<span className="text-cobalt">.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6 mb-6">
            <BadOption
              tag="Option one"
              title="Cheap and unverified"
              body="Anonymous sellers, overseas synthesis, no release testing, no paper trail. You save money and inherit all the risk — you're trusting a stranger about what's in the vial."
            />
            <BadOption
              tag="Option two"
              title="Legitimate but overpriced"
              body="Genuine pharmacy-grade material, marked up like a prescription. You get the documentation and the quality — and pay a premium that has nothing to do with what's in the vial."
            />
          </div>

          <div className="rounded-2xl border-2 border-cobalt bg-cobalt/[0.04] p-7 lg:p-9">
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
              — The third option
            </p>
            <p className="font-display font-black text-ink tracking-[-0.025em] leading-[1.05]" style={{ fontSize: 'clamp(24px, 3.4vw, 40px)' }}>
              Pharmacy-grade material, documented to the same standard,
              <span className="text-cobalt"> without the markup.</span>
            </p>
            <p className="mt-4 text-[15px] lg:text-[16px] text-ink-soft leading-relaxed max-w-2xl">
              That&rsquo;s the whole reason Merit exists. Not a discount on quality &mdash; the same
              quality, priced like the commodity it actually is.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════ §02 · THE STANDARD (RECEIPTS) ════════════════ */}
      <section className="relative bg-ink text-white py-20 lg:py-28 px-6 lg:px-12 overflow-hidden">
        <Image
          src="/brand/scene-pattern-cobalt.webp"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-[0.18]"
        />
        <div className="relative z-10 max-w-[1200px] mx-auto">
          <div className="max-w-2xl mb-12 lg:mb-16">
            <p className="text-[10px] tracking-[0.22em] uppercase font-bold mb-3" style={{ color: '#9DB2FF' }}>
              — 02 · The standard
            </p>
            <h2
              className="font-display font-black tracking-[-0.035em] leading-[0.95]"
              style={{ fontSize: 'clamp(32px, 5vw, 64px)' }}
            >
              We don&rsquo;t ask you to
              <br />
              take our word for it<span style={{ color: '#9DB2FF' }}>.</span>
            </h2>
            <p className="mt-5 text-[16px] text-white/70 leading-relaxed">
              Every claim on this page is something we hand you in writing. The proof travels with
              the product.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-10">
            <Stat value="≥99%" label="HPLC purity, verified per lot" />
            <Stat value="100%" label="of shipments include the lot COA" />
            <Stat value="48hr" label="from order to dispatch, Dallas" />
            <Stat value="Lot #" label="on every single vial label" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-4 max-w-3xl">
            <Check>Every batch released only after HPLC purity testing</Check>
            <Check>Sterility, endotoxin, and particulate tested to USP standards</Check>
            <Check>Acetate counterion — not the cheaper TFA salt</Check>
            <Check>A US-licensed pharmacist signs off on every lot</Check>
            <Check>Certificate of Analysis ships with every order</Check>
            <Check>One purity floor — no good batches and bad batches</Check>
          </div>
        </div>
      </section>

      {/* ════════════════ §03 · HOW A LOT REACHES YOU ════════════════ */}
      <section className="bg-cream py-20 lg:py-28 px-6 lg:px-12">
        <div className="max-w-[1200px] mx-auto">
          <div className="max-w-2xl mb-12 lg:mb-16">
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
              — 03 · Chain of custody
            </p>
            <h2
              className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95]"
              style={{ fontSize: 'clamp(32px, 5vw, 64px)' }}
            >
              How a lot reaches you<span className="text-cobalt">.</span>
            </h2>
            <p className="mt-5 text-[16px] text-ink-soft leading-relaxed">
              Five steps, none of them skipped. The same path every time &mdash; which is the point.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-5">
            <Step n="01" title="Synthesis" body="Manufactured under controlled conditions — the starting material is identified, not assumed." />
            <Step n="02" title="Characterization" body="HPLC purity plus the USP panel: sterility, endotoxin, particulate. Pass or it doesn't ship." />
            <Step n="03" title="Pharmacist release" body="A US-licensed pharmacist reviews the batch record and signs the lot off for release." />
            <Step n="04" title="Documented" body="A Certificate of Analysis is generated for the lot and a lot number is printed on every vial." />
            <Step n="05" title="Shipped" body="Sealed, lot-stamped, and dispatched from Dallas within 48 hours — COA in the box." />
          </div>
        </div>
      </section>

      {/* ════════════════ §04 · WHAT WE HOLD TO ════════════════ */}
      <section className="bg-ink text-white py-20 lg:py-28 px-6 lg:px-12">
        <div className="max-w-[1200px] mx-auto">
          <div className="max-w-2xl mb-12 lg:mb-16">
            <p className="text-[10px] tracking-[0.22em] uppercase font-bold mb-3" style={{ color: '#9DB2FF' }}>
              — 04 · What we hold to
            </p>
            <h2
              className="font-display font-black tracking-[-0.035em] leading-[0.95]"
              style={{ fontSize: 'clamp(32px, 5vw, 64px)' }}
            >
              Four things we
              <br />
              don&rsquo;t bend on<span style={{ color: '#9DB2FF' }}>.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
            <Principle n="01" title="Documentation over claims" body="Anyone can say ‘high purity.’ We hand you the COA. If the proof can't travel with the product, it isn't proof." />
            <Principle n="02" title="The same bar, every lot" body="Quality that varies batch-to-batch isn't quality — it's luck. One purity floor, held every single time." />
            <Principle n="03" title="A source you can name" body="A US-licensed pharmacy chain of custody you can point to — not an anonymous reseller and a leap of faith." />
            <Principle n="04" title="Price is not a quality signal" body="Pharmacy-grade shouldn't mean pharmacy markup. We price the material like the commodity it is, and let the documentation carry the trust." />
          </div>
        </div>
      </section>

      {/* ════════════════ §05 · WHO IT'S FOR ════════════════ */}
      <section className="bg-cream py-20 lg:py-28 px-6 lg:px-12">
        <div className="max-w-[1200px] mx-auto">
          <div className="max-w-2xl mb-12 lg:mb-16">
            <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
              — 05 · Who it&rsquo;s for
            </p>
            <h2
              className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95]"
              style={{ fontSize: 'clamp(32px, 5vw, 64px)' }}
            >
              Two ways in<span className="text-cobalt">.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
            <Audience
              tag="Researchers"
              title="Buy direct"
              body="Lot-documented research compounds at a fair price — a QR on every label pulls that lot's COA. Browse the full catalog and order direct — no account required."
              cta="Browse the catalog"
              href="/catalog"
            />
            <Audience
              tag="Practitioners"
              title="Open an account"
              body="A verified-account program for licensed practitioners — account-tier pricing, the same documentation, no minimums. Already trusted by 40+ practices across Texas."
              cta="Practitioner Program"
              href="/practitioners"
            />
          </div>
        </div>
      </section>

      {/* ════════════════ RUO CANDOR + CTA ════════════════ */}
      <section className="bg-ink text-white border-t border-white/10 py-16 lg:py-24 px-6 lg:px-12">
        <div className="max-w-[1200px] mx-auto">
          <p className="text-[10px] tracking-[0.22em] uppercase font-bold mb-4" style={{ color: '#9DB2FF' }}>
            — Plainly stated
          </p>
          <p className="font-display font-black tracking-[-0.025em] leading-[1.05] max-w-3xl" style={{ fontSize: 'clamp(24px, 3.6vw, 44px)' }}>
            Everything we sell is supplied for research use &mdash; and labeled, documented, and
            sold that way<span className="text-cobalt">.</span>
          </p>
          <p className="mt-5 text-[15px] lg:text-[16px] text-white/70 leading-relaxed max-w-2xl">
            No hedging, no winking. Merit is a research-compound supplier shipping from Dallas. The
            standard we hold is the whole product &mdash; and it&rsquo;s the part we&rsquo;re glad to
            put in writing.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row gap-3">
            <Link
              href="/catalog"
              className="inline-flex items-center justify-center bg-cobalt text-white font-bold tracking-[0.16em] uppercase text-xs px-7 py-4 rounded-lg hover:bg-white hover:text-ink transition-colors"
            >
              Browse the catalog →
            </Link>
            <Link
              href="/practitioners"
              className="inline-flex items-center justify-center bg-white/[0.06] border border-white/20 text-white font-bold tracking-[0.16em] uppercase text-xs px-7 py-4 rounded-lg hover:border-white/50 transition-colors"
            >
              Practitioner Program
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────
function BadOption({ tag, title, body }: { tag: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-ink/12 bg-white p-7 lg:p-8">
      <p className="text-[10px] tracking-[0.22em] uppercase font-bold text-ink-muted mb-3">— {tag}</p>
      <h3 className="font-display font-black text-ink text-xl lg:text-2xl tracking-[-0.02em] mb-3">
        {title}
      </h3>
      <p className="text-[14px] lg:text-[15px] text-ink-soft leading-relaxed">{body}</p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/12 bg-white/[0.04] p-5">
      <div className="font-display font-black tracking-[-0.03em] leading-none" style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}>
        {value}
      </div>
      <p className="mt-2 text-[11px] lg:text-[12px] text-white/65 leading-snug">{label}</p>
    </div>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5">
      <span className="mt-0.5 flex-none w-5 h-5 rounded-full bg-cobalt/25 flex items-center justify-center" aria-hidden="true" style={{ color: '#9DB2FF' }}>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6.5L5 9L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-[14px] lg:text-[15px] text-white/85 leading-snug">{children}</span>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-white border border-cobalt/10 p-6 hover:border-cobalt/40 transition-colors duration-300">
      <div className="font-display font-black text-cobalt leading-none tracking-[-0.04em] mb-4" style={{ fontSize: 'clamp(28px, 3vw, 36px)' }}>
        {n}
      </div>
      <h3 className="font-display text-base lg:text-lg font-extrabold text-ink tracking-tight mb-2">
        {title}
      </h3>
      <p className="text-[13px] text-ink-soft leading-relaxed">{body}</p>
    </div>
  );
}

function Principle({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/[0.03] p-7 lg:p-8">
      <div className="flex items-baseline gap-3 mb-3">
        <span className="font-display font-black text-cobalt text-lg tracking-tight">{n}</span>
        <h3 className="font-display font-black text-white text-xl lg:text-2xl tracking-[-0.02em]">
          {title}
        </h3>
      </div>
      <p className="text-[14px] lg:text-[15px] text-white/70 leading-relaxed">{body}</p>
    </div>
  );
}

function Audience({
  tag, title, body, cta, href,
}: {
  tag: string; title: string; body: string; cta: string; href: string;
}) {
  return (
    <div className="rounded-2xl border border-cobalt/15 bg-white p-7 lg:p-9 flex flex-col">
      <p className="text-[10px] tracking-[0.22em] uppercase font-bold text-cobalt mb-3">— {tag}</p>
      <h3 className="font-display font-black text-ink text-2xl lg:text-3xl tracking-[-0.025em] mb-3">
        {title}
      </h3>
      <p className="text-[14px] lg:text-[15px] text-ink-soft leading-relaxed mb-6 flex-1">{body}</p>
      <Link
        href={href}
        className="inline-flex items-center self-start text-cobalt font-bold tracking-[0.14em] uppercase text-[11px] hover:text-ink transition-colors"
      >
        {cta} →
      </Link>
    </div>
  );
}
