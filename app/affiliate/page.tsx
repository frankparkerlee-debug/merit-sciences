import { AffiliateSignupForm } from './AffiliateSignupForm';
import { AFFILIATE_PROGRAM } from '@/lib/affiliate';

export const metadata = {
  title: 'Become a Merit Sciences Affiliate',
  description:
    'Earn 15-25% commission on every order — forever — when your audience buys from Merit Sciences. Open sign-up, monthly payouts.',
};

export default function AffiliateLandingPage() {
  return (
    <main className="bg-cream min-h-screen">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-cobalt/10">
        <div className="h-1 bg-gradient-to-r from-cobalt via-[#5078FF] to-cobalt" />
        <div className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-12 pt-10 lg:pt-14 pb-10 lg:pb-12">
          <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
            — Affiliate Program
          </p>
          <h1
            className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95]"
            style={{ fontSize: 'clamp(32px, 5vw, 64px)' }}
          >
            Earn on every order<span className="text-cobalt">.</span>
            <br className="hidden sm:inline" />
            <span className="text-ink-soft font-extrabold">Forever.</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-ink-soft leading-relaxed max-w-xl">
            Promote Merit Sciences to your audience. Earn 15–25% on every order
            they place — first order and every reorder, for the life of the
            customer. Your audience saves {AFFILIATE_PROGRAM.buyerDiscountPct}% with your custom code.
            You save {AFFILIATE_PROGRAM.selfDiscountPct}% on your own purchases.
          </p>
        </div>
      </section>

      {/* ── Program details ──────────────────────────────────────── */}
      <section className="bg-cream/40 border-b border-cobalt/10">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-12 py-10 lg:py-14">
          <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
            — How it works
          </p>

          {/* Tier table */}
          <h2
            className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95] mb-6"
            style={{ fontSize: 'clamp(24px, 3.5vw, 36px)' }}
          >
            Three tiers. Real money.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
            {AFFILIATE_PROGRAM.tiers.map((t, i) => (
              <div
                key={t.name}
                className={`bg-white border border-cobalt/15 rounded-2xl p-5 lg:p-6 ${
                  i === 1 ? 'ring-2 ring-cobalt/20' : ''
                }`}
              >
                <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">
                  {t.name}
                </p>
                <p className="font-display text-3xl lg:text-4xl font-black text-ink tracking-tight leading-none mb-1">
                  {t.commissionPct}%
                </p>
                <p className="text-[11px] text-ink-soft mb-3">commission per order</p>
                <p className="text-[12px] text-ink leading-snug">
                  {t.maxOrders === null
                    ? `${t.minOrders}+ orders / month`
                    : `${t.minOrders}–${t.maxOrders} orders / month`}
                </p>
              </div>
            ))}
          </div>

          {/* Mechanics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: 'Evergreen attribution',
                body: 'When someone you refer makes their first order, they\'re linked to you permanently. You earn on every reorder they ever make — forever — at your current tier rate.',
              },
              {
                title: 'Your custom discount code',
                body: `Pick any code at sign-up — "${AFFILIATE_PROGRAM.buyerDiscountPct === 10 ? 'ParkerLee10' : 'Founder'}", "Author", whatever. Your audience saves ${AFFILIATE_PROGRAM.buyerDiscountPct}% when they use it at checkout. Every order through your code credits you.`,
              },
              {
                title: 'Self-purchase discount',
                body: `You save ${AFFILIATE_PROGRAM.selfDiscountPct}% on your own Merit orders, every time. No commission on those (you can\'t pay yourself), but you keep the discount.`,
              },
              {
                title: 'Monthly payouts',
                body: `Stripe Connect — set up once, get paid the 1st of every month for the prior month\'s earnings. ${AFFILIATE_PROGRAM.payoutMinUsd >= 50 ? `$${AFFILIATE_PROGRAM.payoutMinUsd} minimum.` : ''} Net-30 to absorb refund clawbacks.`,
              },
            ].map((b) => (
              <div key={b.title} className="bg-white border border-cobalt/10 rounded-xl p-5">
                <h3 className="font-display text-base lg:text-lg font-extrabold text-ink mb-2">
                  {b.title}<span className="text-cobalt">.</span>
                </h3>
                <p className="text-[13px] text-ink-soft leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sign-up form ─────────────────────────────────────────── */}
      <section className="bg-white">
        <div className="max-w-[640px] mx-auto px-5 sm:px-6 lg:px-8 py-12 lg:py-16">
          <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
            — Sign up
          </p>
          <h2
            className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95] mb-3"
            style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}
          >
            Get your link in 60 seconds<span className="text-cobalt">.</span>
          </h2>
          <p className="text-sm text-ink-soft leading-relaxed mb-8">
            No approval queue. No waiting. Submit this form and your referral
            link + discount code are live immediately. Suspicious activity
            (self-referrals, click fraud, abuse) gets caught later in audit;
            don&apos;t be that person.
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
            . Merit Sciences may suspend an account at any time for fraud,
            self-referral, or misrepresentation of the program.
          </p>
        </div>
      </section>
    </main>
  );
}
