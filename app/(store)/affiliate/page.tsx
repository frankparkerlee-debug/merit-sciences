import Image from 'next/image';
import { AffiliateSignupForm } from './AffiliateSignupForm';
import { AFFILIATE_PROGRAM } from '@/lib/affiliate';

export const metadata = {
  title: 'Become a Merit Sciences Affiliate',
  description:
    'Earn 20% on every order — forever. Your audience saves 10%. Open sign-up, monthly PayPal payouts, no approval queue.',
};

export default function AffiliateLandingPage() {
  return (
    <main className="bg-cream min-h-screen">

      {/* ═══════════════ CINEMATIC HERO ═══════════════
          Cobalt vial pattern background, dark gradient overlay,
          monumental wordmark-scale type. Same visual vocabulary as
          the "Top-shelf molecules" homepage section. */}
      <section className="relative bg-ink overflow-hidden">
        <Image
          src="/brand/scene-pattern-cobalt.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-60"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(135deg, rgba(11,15,25,0.55) 0%, rgba(46,77,219,0.45) 50%, rgba(11,15,25,0.75) 100%)',
          }}
        />

        <div className="relative max-w-[1300px] mx-auto px-5 sm:px-6 lg:px-12 pt-16 sm:pt-20 lg:pt-28 pb-16 lg:pb-24">
          <p className="text-[11px] tracking-[0.22em] uppercase text-white/70 font-bold mb-6">
            — The Merit Affiliate Program
          </p>
          <h1
            className="font-display font-black text-white tracking-[-0.04em] leading-[0.92] max-w-5xl"
            style={{ fontSize: 'clamp(40px, 8vw, 112px)' }}
          >
            Get paid to share
            <br />
            <span className="text-cobalt-soft">what you trust.</span>
          </h1>
          <p className="mt-8 text-base sm:text-lg lg:text-xl text-white/85 leading-relaxed max-w-2xl">
            Every customer you bring to Merit Sciences pays you for life —
            first order and every reorder, at a flat <strong className="text-white">20%</strong> commission.
            Your audience uses your code at checkout and saves <strong className="text-white">{AFFILIATE_PROGRAM.buyerDiscountPct}%</strong> instantly.
          </p>

          <div className="flex flex-wrap items-center gap-3 mt-10">
            <a
              href="#signup"
              className="inline-flex items-center gap-2 bg-white text-ink px-7 py-4 rounded-xl text-sm sm:text-base font-bold tracking-tight hover:opacity-90 transition shadow-xl"
            >
              Get your link in 60 seconds
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
            <a
              href="/affiliate/login"
              className="inline-flex items-center gap-2 text-white/80 px-5 py-4 rounded-xl text-sm font-bold tracking-tight hover:text-white transition border border-white/20 hover:border-white/40"
            >
              I already have an account &rarr;
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-7 text-[12px] font-bold tracking-[0.07em] uppercase text-white/65">
            <span>✓ Free to join</span>
            <span>✓ Live in 60 seconds</span>
            <span>✓ No approval queue</span>
          </div>
        </div>
      </section>

      {/* ═══════════════ TWIN-BENEFIT STAT ROW ═══════════════
          Three monumental numbers. The Apple stat-tile treatment —
          big type, generous breathing room, one fact per cell. */}
      <section className="bg-white border-b border-cobalt/10">
        <div className="max-w-[1300px] mx-auto px-5 sm:px-6 lg:px-12 py-12 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-cobalt/10">
            <BigStat
              top="FLAT"
              number="20%"
              label="Commission on every order"
              detail="One rate, from your very first sale."
              accent="ink"
            />
            <BigStat
              top="EVERY ORDER"
              number="∞"
              label="Months of evergreen earnings"
              detail="One referral pays you for the lifetime of that customer."
              accent="cobalt"
            />
            <BigStat
              top="THEY SAVE"
              number={`${AFFILIATE_PROGRAM.buyerDiscountPct}%`}
              label="Off for your audience"
              detail="Your custom code applied at checkout — instant value."
              accent="ink"
            />
          </div>
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS — VISUAL FLOW ═══════════════ */}
      <section className="bg-cream/40 border-b border-cobalt/10">
        <div className="max-w-[1300px] mx-auto px-5 sm:px-6 lg:px-12 py-12 lg:py-16">
          <div className="max-w-2xl mb-10 lg:mb-12">
            <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
              — How it works
            </p>
            <h2
              className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95]"
              style={{ fontSize: 'clamp(28px, 4.5vw, 56px)' }}
            >
              Three steps. One forever<span className="text-cobalt">.</span>
            </h2>
          </div>

          <ol className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
            <FlowStep
              num="01"
              eyebrow="You share"
              headline="Your custom code or link"
              body="Pick something memorable at sign-up — your name, a phrase, anything. Drop it in your bio, video description, story, newsletter, DM."
            />
            <FlowStep
              num="02"
              eyebrow="They save"
              headline={`${AFFILIATE_PROGRAM.buyerDiscountPct}% off, instantly`}
              body={`Your audience types your code at checkout. ${AFFILIATE_PROGRAM.buyerDiscountPct}% comes off their order automatically — real incentive to try Merit instead of a reseller.`}
            />
            <FlowStep
              num="03"
              eyebrow="You earn"
              headline="Forever, on every order"
              body="First purchase pays you a flat 20%. Every reorder by that same customer — months and years later — pays you again. No re-attribution needed."
            />
          </ol>
        </div>
      </section>

      {/* ═══════════════ EARNINGS EXAMPLE — concrete math ═══════════════
          Removes ambiguity. Affiliates think in $/mo, not %. */}
      <section className="bg-ink text-white border-b border-cobalt/30">
        <div className="max-w-[1300px] mx-auto px-5 sm:px-6 lg:px-12 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-8 lg:gap-12 items-center">
            <div>
              <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt-soft font-bold mb-3">
                — The math
              </p>
              <h2
                className="font-display font-black tracking-[-0.035em] leading-[0.95] mb-5"
                style={{ fontSize: 'clamp(28px, 4vw, 52px)' }}
              >
                A real example<span className="text-cobalt">.</span>
              </h2>
              <p className="text-base text-white/80 leading-relaxed">
                Say you refer 50 customers in a month. They each spend $150
                on average, and every order pays you a flat <strong className="text-white">20%</strong>.
                Here&apos;s what month one looks like — and what
                month twelve looks like as those customers reorder.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 lg:p-8">
              <ExampleRow label="Customers referred" value="50" highlight={false} />
              <ExampleRow label="Avg order size" value="$150" highlight={false} />
              <ExampleRow label="Commission rate" value="20% flat" highlight={false} />
              <div className="my-3 border-t border-white/10" />
              <ExampleRow label="Month 1 commission" value="$1,500" highlight={false} />
              <ExampleRow
                label="Month 12 cumulative"
                detail="Assuming 60% of customers reorder monthly at avg $150"
                value="$13,200+"
                highlight={true}
              />
            </div>
          </div>
          <p className="text-[11px] text-white/45 italic mt-6 max-w-2xl">
            Illustrative example at the flat 20% rate. Actual
            earnings depend on referral volume and repeat-purchase
            behavior — not a guarantee.
          </p>
        </div>
      </section>

      {/* ═══════════════ WHY MERIT'S PROGRAM IS DIFFERENT ═══════════════ */}
      <section className="bg-white border-b border-cobalt/10">
        <div className="max-w-[1300px] mx-auto px-5 sm:px-6 lg:px-12 py-12 lg:py-16">
          <div className="max-w-2xl mb-10 lg:mb-12">
            <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
              — Why us
            </p>
            <h2
              className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95]"
              style={{ fontSize: 'clamp(28px, 4vw, 52px)' }}
            >
              What separates this program<span className="text-cobalt">.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <Differentiator
              eyebrow="Industry standard"
              headline="One-time commission"
              ours="Evergreen — every reorder, forever"
            />
            <Differentiator
              eyebrow="Industry standard"
              headline="Auto-generated code"
              ours={`Your custom code — "${'parkerlee10'}", "Founder", whatever you want`}
            />
            <Differentiator
              eyebrow="Industry standard"
              headline="Application + approval queue"
              ours="Open sign-up — live in 60 seconds"
            />
            <Differentiator
              eyebrow="Industry standard"
              headline="Quarterly or annual payouts"
              ours={`Monthly payouts · $${AFFILIATE_PROGRAM.payoutMinUsd} min · PayPal`}
            />
          </div>

          {/* You ALSO save — the affiliate's own perk */}
          <div className="mt-10 lg:mt-12 bg-cobalt/5 border border-cobalt/20 rounded-2xl p-6 lg:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
            <div
              className="flex-shrink-0 w-14 h-14 rounded-full bg-cobalt text-white flex items-center justify-center font-display font-black text-lg shadow-sm"
              aria-hidden="true"
            >
              {AFFILIATE_PROGRAM.selfDiscountPct}%
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-1">
                — Your own discount
              </p>
              <h3 className="font-display text-lg lg:text-xl font-extrabold text-ink leading-tight">
                You save {AFFILIATE_PROGRAM.selfDiscountPct}% on every Merit order you place yourself.
              </h3>
              <p className="text-[13px] text-ink-soft mt-1">
                Your perk. No commission on your own purchases (can&apos;t pay yourself),
                but you keep the discount, every time, forever.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ TIER CARDS — compact + visual ═══════════════ */}
      <section className="bg-cream/40 border-b border-cobalt/10">
        <div className="max-w-[1300px] mx-auto px-5 sm:px-6 lg:px-12 py-12 lg:py-16">
          <div className="max-w-2xl mb-8 lg:mb-10">
            <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
              — Your commission
            </p>
            <h2
              className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95]"
              style={{ fontSize: 'clamp(28px, 4vw, 52px)' }}
            >
              One flat rate. Forever<span className="text-cobalt">.</span>
            </h2>
            <p className="mt-3 text-sm sm:text-base text-ink-soft leading-relaxed">
              No tiers, no thresholds, no rate that resets. Every order you
              drive pays the same — your first sale and your thousandth.
            </p>
          </div>

          <div className="grid grid-cols-1 max-w-sm">
            {AFFILIATE_PROGRAM.tiers.map((t) => (
              <TierCard key={t.name} tier={t} highlight />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ SIGN-UP FORM ═══════════════ */}
      {/* ═══════════════ MID-PAGE CTA + FAQ ═══════════════ */}
      <section className="bg-white">
        <div className="max-w-[1300px] mx-auto px-5 sm:px-6 lg:px-12 pt-14 lg:pt-16 text-center">
          <a
            href="#signup"
            className="inline-flex items-center gap-2 bg-cobalt text-white px-8 py-4 rounded-xl text-base font-bold tracking-tight hover:opacity-90 transition shadow-lg"
          >
            Get your link — free, 60 seconds
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </a>
        </div>
      </section>

      <section className="bg-white border-b border-cobalt/10">
        <div className="max-w-[820px] mx-auto px-5 sm:px-6 lg:px-12 py-12 lg:py-16">
          <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">— Questions</p>
          <h2
            className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95] mb-8"
            style={{ fontSize: 'clamp(28px, 4vw, 52px)' }}
          >
            The honest answers<span className="text-cobalt">.</span>
          </h2>
          <div className="space-y-3">
            <Faq
              q="Is this MLM or a pyramid scheme?"
              a="No. No downline, no recruitment quota, no buy-in — ever. You earn a flat 20% on real orders the people you refer actually place. That's the whole program."
            />
            <Faq
              q="Do I need a big following?"
              a="No. 500 followers or 500,000 — the rate is the same 20%. Refer one person and you earn on their orders for as long as they keep buying."
            />
            <Faq
              q="When and how do I get paid?"
              a="Monthly, by PayPal, once you clear a $50 minimum. Each commission clears a 30-day refund window first, then it's payable."
            />
            <Faq
              q="What am I allowed to say?"
              a="We hand you approved captions and a simple do/don't playbook. You promote the Merit brand — never product or health claims — so every post stays on-brand and worry-free."
            />
          </div>
        </div>
      </section>

      <section id="signup" className="bg-white scroll-mt-12">
        <div className="max-w-[640px] mx-auto px-5 sm:px-6 lg:px-8 py-14 lg:py-20">
          <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
            — Sign up
          </p>
          <h2
            className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95] mb-3"
            style={{ fontSize: 'clamp(28px, 4.5vw, 52px)' }}
          >
            Get your link in 60 seconds<span className="text-cobalt">.</span>
          </h2>
          <p className="text-sm sm:text-base text-ink-soft leading-relaxed mb-10">
            No approval queue. No interview. Submit and your link plus your
            custom discount code are live immediately.
          </p>

          <AffiliateSignupForm />

          <p className="mt-8 text-[11px] text-ink-muted leading-relaxed">
            By signing up you agree to the program terms in our{' '}
            <a href="/terms" className="text-cobalt font-semibold hover:underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="/research-disclosure" className="text-cobalt font-semibold hover:underline">
              Research Disclosure
            </a>
            . Merit Sciences may suspend an account at any time for
            self-referral, click fraud, or misrepresentation of the program.
          </p>
        </div>
      </section>

      {/* Sticky mobile CTA — most recruit traffic is mobile */}
      <a
        href="#signup"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-cobalt text-white text-center text-[15px] font-bold py-4 shadow-[0_-8px_24px_rgba(0,0,0,0.18)]"
      >
        Sign up free — live in 60 seconds →
      </a>
    </main>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────

function BigStat({
  top,
  number,
  label,
  detail,
  accent,
}: {
  top: string;
  number: string;
  label: string;
  detail: string;
  accent: 'ink' | 'cobalt';
}) {
  return (
    <div className="px-2 lg:px-6 py-5 md:py-2 lg:py-6 first:pt-2 md:first:pt-2">
      <p className="text-[10px] sm:text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">
        {top}
      </p>
      <p
        className={`font-display font-black tracking-[-0.05em] leading-[0.85] ${
          accent === 'cobalt' ? 'text-cobalt' : 'text-ink'
        }`}
        style={{ fontSize: 'clamp(64px, 9vw, 132px)' }}
      >
        {number}
      </p>
      <p className="font-display text-base lg:text-lg font-extrabold text-ink mt-3 leading-tight">
        {label}<span className="text-cobalt">.</span>
      </p>
      <p className="text-[13px] text-ink-soft leading-relaxed mt-1">{detail}</p>
    </div>
  );
}

function FlowStep({
  num,
  eyebrow,
  headline,
  body,
}: {
  num: string;
  eyebrow: string;
  headline: string;
  body: string;
}) {
  return (
    <li className="relative bg-white border border-cobalt/15 rounded-2xl p-6 lg:p-7 flex flex-col">
      <div className="flex items-baseline gap-3 mb-4">
        <span
          className="font-display font-black text-cobalt tabular-nums leading-none"
          style={{ fontSize: 'clamp(34px, 5vw, 48px)' }}
        >
          {num}
        </span>
        <span className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold">
          — {eyebrow}
        </span>
      </div>
      <h3 className="font-display text-xl lg:text-2xl font-extrabold text-ink tracking-tight leading-tight mb-3">
        {headline}<span className="text-cobalt">.</span>
      </h3>
      <p className="text-sm text-ink-soft leading-relaxed">{body}</p>
    </li>
  );
}

function ExampleRow({
  label,
  value,
  detail,
  highlight,
}: {
  label: string;
  value: string;
  detail?: string;
  highlight: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between py-2.5 gap-4">
      <div className="min-w-0">
        <p
          className={`text-[13px] sm:text-sm font-semibold leading-tight ${
            highlight ? 'text-white' : 'text-white/80'
          }`}
        >
          {label}
        </p>
        {detail && (
          <p className="text-[11px] text-white/45 mt-0.5 leading-tight">{detail}</p>
        )}
      </div>
      <p
        className={`font-display tabular-nums whitespace-nowrap leading-none ${
          highlight
            ? 'text-cobalt-soft font-black text-2xl sm:text-3xl tracking-tight'
            : 'text-white font-bold text-lg'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Differentiator({
  eyebrow,
  headline,
  ours,
}: {
  eyebrow: string;
  headline: string;
  ours: string;
}) {
  return (
    <div className="bg-cream/40 border border-cobalt/10 rounded-2xl p-5 lg:p-6">
      <p className="text-[10px] tracking-[0.22em] uppercase text-ink-muted font-bold mb-2">
        {eyebrow}
      </p>
      <p className="text-[14px] text-ink-soft line-through decoration-ink-muted/40 leading-snug mb-4">
        {headline}
      </p>
      <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">
        Merit
      </p>
      <p className="font-display text-[15px] lg:text-base font-extrabold text-ink leading-snug">
        {ours}
      </p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="bg-cream/50 border border-cobalt/12 rounded-2xl p-5 lg:p-6">
      <p className="font-display text-base lg:text-lg font-extrabold text-ink leading-snug mb-1.5">
        {q}
      </p>
      <p className="text-sm text-ink-soft leading-relaxed">{a}</p>
    </div>
  );
}

function TierCard({
  tier,
  highlight,
}: {
  tier: { name: string; commissionPct: number; minOrders: number; maxOrders: number | null };
  highlight: boolean;
}) {
  return (
    <div
      className={`relative bg-white rounded-2xl p-6 lg:p-7 transition ${
        highlight
          ? 'border-2 border-cobalt ring-4 ring-cobalt/10'
          : 'border border-cobalt/15'
      }`}
    >
      {highlight && (
        <span className="absolute -top-3 left-6 bg-cobalt text-white text-[9px] font-bold tracking-[0.22em] uppercase px-2.5 py-1 rounded">
          Every affiliate
        </span>
      )}
      <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
        {tier.name}
      </p>
      <p
        className="font-display font-black text-ink tracking-[-0.04em] leading-none mb-2"
        style={{ fontSize: 'clamp(48px, 7vw, 72px)' }}
      >
        {tier.commissionPct}<span className="text-cobalt-soft">%</span>
      </p>
      <p className="text-[13px] text-ink-soft leading-tight mb-4">
        commission on every order
      </p>
      <div className="pt-4 border-t border-cobalt/10">
        <p className="text-[11px] tracking-[0.14em] uppercase text-ink-muted font-bold">
          From day one
        </p>
        <p className="font-display text-base lg:text-lg font-extrabold text-ink mt-1">
          Every order · forever
        </p>
      </div>
    </div>
  );
}
