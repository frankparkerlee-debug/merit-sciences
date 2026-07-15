import { AFFILIATE_PROGRAM } from '@/lib/affiliate';
import { AffiliateSignupForm } from '@/app/affiliate/AffiliateSignupForm';

export const metadata = {
  title: 'Earn with Merit · Partner Program',
  robots: { index: false, follow: false },
};

// Paid-traffic recruitment LP. Lives under /lp so ChromeGate strips the nav,
// footer, cart, and popup — a Meta ad crawler sees NO compound catalog here.
// Sells the affiliate OPPORTUNITY only: zero molecule names, zero product or
// health claims. The signup form is embedded so the whole funnel stays clean.
const D = AFFILIATE_PROGRAM.buyerDiscountPct;

export default function EarnPage() {
  return (
    <main className="bg-cream text-ink font-sans min-h-screen">
      {/* ───────── HERO ───────── */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 90% at 12% 8%, rgba(46,77,219,0.55) 0%, rgba(11,15,25,0) 58%), linear-gradient(160deg, #0B0F19 0%, #11173A 100%)',
          }}
        />
        <div className="relative max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-12 pt-14 sm:pt-20 pb-14 lg:pb-20">
          <p className="text-[11px] tracking-[0.24em] uppercase text-cobalt-soft font-bold mb-5">
            — The Merit Partner Program
          </p>
          <h1
            className="font-display font-black tracking-[-0.04em] leading-[0.95] max-w-3xl"
            style={{ fontSize: 'clamp(38px, 8vw, 92px)' }}
          >
            Your audience trusts you.
            <br />
            <span className="text-white/85">
              Get paid for it<span className="text-cobalt-soft">.</span>
            </span>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-white/80 leading-relaxed max-w-xl">
            Share your code — your people save {D}%, and you earn{' '}
            <strong className="text-white">a flat 20%</strong> on every order they ever place. We give
            you the captions, the assets, and a simple playbook. You just share.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href="#signup"
              className="inline-flex items-center gap-2 bg-white text-ink px-7 py-4 rounded-xl text-sm sm:text-base font-bold hover:opacity-90 transition shadow-xl"
            >
              Start earning — it&rsquo;s free
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
            <a
              href="/affiliate/login"
              className="inline-flex items-center px-5 py-4 rounded-xl text-sm font-bold text-white/80 border border-white/20 hover:border-white/40 hover:text-white transition"
            >
              I already have an account →
            </a>
          </div>
        </div>
      </section>

      {/* ───────── STATS ───────── */}
      <section className="bg-white border-b border-cobalt/10">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-12 py-10 lg:py-14 grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-cobalt/10">
          <Stat top="FLAT" big="20%" label="On every order" sub="One rate, from your first sale." />
          <Stat top="EVERY REORDER" big="∞" label="Evergreen earnings" sub="One referral pays you for that customer's lifetime." accent />
          <Stat top="THEY SAVE" big={`${D}%`} label="For your audience" sub="Your code, applied instantly at checkout." />
        </div>
      </section>

      {/* ───────── HOW IT WORKS ───────── */}
      <section className="bg-cream/40 border-b border-cobalt/10">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-12 py-12 lg:py-16">
          <SectionHead eyebrow="How it works" title="Three steps. One forever" />
          <ol className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Step num="01" eyebrow="You share" head="Your custom code" body="Pick something memorable at sign-up. Drop it in your bio, a story, a video description, a DM." />
            <Step num="02" eyebrow="They save" head={`${D}% off, instantly`} body={`Your audience enters your code at checkout and ${D}% comes off — a real reason to choose Merit.`} />
            <Step num="03" eyebrow="You earn" head="Forever, on every order" body="Their first order pays you a flat 20%. Every reorder, months later, pays you again — no re-attribution." />
          </ol>
        </div>
      </section>

      {/* ───────── THE MATH ───────── */}
      <section className="bg-ink text-white border-b border-cobalt/30">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-12 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-[1fr_1.3fr] gap-8 lg:gap-12 items-center">
          <div>
            <p className="text-[11px] tracking-[0.24em] uppercase text-cobalt-soft font-bold mb-3">— The math</p>
            <h2 className="font-display font-black tracking-[-0.035em] leading-[0.95] mb-4" style={{ fontSize: 'clamp(28px, 4.5vw, 52px)' }}>
              What 50 referrals looks like<span className="text-cobalt-soft">.</span>
            </h2>
            <p className="text-white/75 leading-relaxed">
              Refer 50 customers in a month at a $150 average order — every order pays a flat 20%.
              Here&rsquo;s month one, and month twelve as they reorder.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 lg:p-8">
            <Row l="Customers referred" v="50" />
            <Row l="Avg order" v="$150" />
            <Row l="Commission" v="20% flat" />
            <div className="my-3 border-t border-white/10" />
            <Row l="Month 1 commission" v="$1,500" />
            <Row l="Month 12 cumulative" v="$13,200+" hi sub="If 60% reorder monthly" />
          </div>
        </div>
        <div className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-12 pb-8">
          <p className="text-[11px] text-white/40 italic max-w-2xl leading-relaxed">
            Illustrative, at the flat 20% rate. Actual earnings depend on referral volume
            and repeat purchases — not a guarantee.
          </p>
        </div>
      </section>

      {/* ───────── MADE FOR CREATORS / THE KIT ───────── */}
      <section className="bg-white border-b border-cobalt/10">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-12 py-12 lg:py-16">
          <SectionHead eyebrow="Made for creators" title="You bring the audience. We handle the rest" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-5">
            <div className="rounded-2xl border border-cobalt/15 bg-cream/40 p-6 lg:p-7">
              <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">You share</p>
              <ul className="space-y-2.5 text-[15px] text-ink-soft leading-snug">
                <li>— Your code and your link</li>
                <li>— Your story and your lifestyle</li>
                <li>— The approved captions we send you</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-cobalt/15 bg-cream/40 p-6 lg:p-7">
              <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">We handle</p>
              <ul className="space-y-2.5 text-[15px] text-ink-soft leading-snug">
                <li>— The product, the science, the claims</li>
                <li>— Branded photos, videos, and templates</li>
                <li>— Fulfillment, support, and your monthly payout</li>
              </ul>
            </div>
          </div>
          <p className="mt-6 text-sm text-ink-soft max-w-2xl leading-relaxed">
            Trainer, mom with a following, or full-time creator — you don&rsquo;t need to be an expert.
            We give you a simple do/don&rsquo;t playbook so every post is on-brand and worry-free.
          </p>
        </div>
      </section>

      {/* ───────── TIERS ───────── */}
      <section className="bg-cream/40 border-b border-cobalt/10">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-12 py-12 lg:py-16">
          <SectionHead eyebrow="Your commission" title="One flat rate, forever" />
          <div className="grid grid-cols-1 max-w-xs">
            {AFFILIATE_PROGRAM.tiers.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl bg-white p-6 lg:p-7 border-2 border-cobalt ring-4 ring-cobalt/10"
              >
                <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">Every affiliate</p>
                <p
                  className="font-display font-black text-ink tracking-[-0.04em] leading-none"
                  style={{ fontSize: 'clamp(40px, 6vw, 64px)' }}
                >
                  {t.commissionPct}
                  <span className="text-cobalt-soft">%</span>
                </p>
                <p className="text-[13px] text-ink-soft mt-2">
                  Every order · forever
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────── SIGN-UP ───────── */}
      <section id="signup" className="bg-cream scroll-mt-6">
        <div className="max-w-[640px] mx-auto px-5 sm:px-6 lg:px-8 py-14 lg:py-20">
          <p className="text-[11px] tracking-[0.24em] uppercase text-cobalt font-bold mb-3">— Sign up</p>
          <h2
            className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95] mb-3"
            style={{ fontSize: 'clamp(28px, 4.5vw, 52px)' }}
          >
            Get your link in 60 seconds<span className="text-cobalt">.</span>
          </h2>
          <p className="text-sm sm:text-base text-ink-soft leading-relaxed mb-10">
            No approval queue, no interview. Submit and your link plus your custom code are live immediately.
          </p>
          <AffiliateSignupForm />
          <p className="mt-8 text-[11px] text-ink-muted leading-relaxed">
            By signing up you agree to our{' '}
            <a href="/terms" className="text-cobalt font-semibold hover:underline">Terms</a> and{' '}
            <a href="/research-disclosure" className="text-cobalt font-semibold hover:underline">Research Disclosure</a>.
            Partners promote the Merit brand and follow the posting playbook — no product or health claims.
          </p>
        </div>
      </section>

      {/* ───────── DISCLAIMER FOOTER ───────── */}
      <footer className="bg-ink text-white/50">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-12 py-8">
          <p className="text-[10px] leading-relaxed max-w-3xl">
            Merit Sciences research compounds are for research use only. Not for human or veterinary use.
            Not evaluated or approved by the FDA. The Merit Partner Program is an affiliate program:
            partners earn a commission on referred orders, must disclose the paid relationship (e.g. #ad),
            and follow the program playbook. Earnings examples are illustrative, not guarantees.
          </p>
        </div>
      </footer>
    </main>
  );
}

// ─── sub-components ───────────────────────────────────────────────────
function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="max-w-2xl mb-8 lg:mb-10">
      <p className="text-[11px] tracking-[0.24em] uppercase text-cobalt font-bold mb-3">— {eyebrow}</p>
      <h2
        className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95]"
        style={{ fontSize: 'clamp(26px, 4vw, 48px)' }}
      >
        {title}<span className="text-cobalt">.</span>
      </h2>
    </div>
  );
}

function Stat({ top, big, label, sub, accent }: { top: string; big: string; label: string; sub: string; accent?: boolean }) {
  return (
    <div className="px-2 sm:px-6 py-5 sm:py-2 first:pt-0 sm:first:pt-2">
      <p className="text-[10px] sm:text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">{top}</p>
      <p
        className={`font-display font-black tracking-[-0.05em] leading-[0.85] ${accent ? 'text-cobalt' : 'text-ink'}`}
        style={{ fontSize: 'clamp(56px, 8vw, 104px)' }}
      >
        {big}
      </p>
      <p className="font-display text-base lg:text-lg font-extrabold text-ink mt-3 leading-tight">
        {label}<span className="text-cobalt">.</span>
      </p>
      <p className="text-[13px] text-ink-soft leading-relaxed mt-1">{sub}</p>
    </div>
  );
}

function Step({ num, eyebrow, head, body }: { num: string; eyebrow: string; head: string; body: string }) {
  return (
    <li className="bg-white border border-cobalt/15 rounded-2xl p-6 lg:p-7">
      <div className="flex items-baseline gap-3 mb-3">
        <span className="font-display font-black text-cobalt tabular-nums leading-none" style={{ fontSize: 'clamp(30px, 5vw, 44px)' }}>
          {num}
        </span>
        <span className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold">— {eyebrow}</span>
      </div>
      <h3 className="font-display text-xl font-extrabold text-ink tracking-tight leading-tight mb-2">
        {head}<span className="text-cobalt">.</span>
      </h3>
      <p className="text-sm text-ink-soft leading-relaxed">{body}</p>
    </li>
  );
}

function Row({ l, v, hi, sub }: { l: string; v: string; hi?: boolean; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between py-2.5 gap-4">
      <div className="min-w-0">
        <p className={`text-[13px] sm:text-sm font-semibold leading-tight ${hi ? 'text-white' : 'text-white/80'}`}>{l}</p>
        {sub && <p className="text-[11px] text-white/45 mt-0.5 leading-tight">{sub}</p>}
      </div>
      <p
        className={`font-display tabular-nums whitespace-nowrap leading-none ${
          hi ? 'text-cobalt-soft font-black text-2xl sm:text-3xl' : 'text-white font-bold text-lg'
        }`}
      >
        {v}
      </p>
    </div>
  );
}
