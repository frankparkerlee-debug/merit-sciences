import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentAffiliate } from '@/lib/affiliate-session';
import { transfersReady } from '@/lib/stripe-connect';
import { SettingsForms } from './SettingsForms';
import { startStripeOnboarding } from './actions';

export const metadata = {
  title: 'Settings — Merit Sciences Affiliate',
};

export const dynamic = 'force-dynamic';

export default async function AffiliateSettingsPage() {
  const affiliate = await getCurrentAffiliate();
  if (!affiliate) redirect('/affiliate/login?next=/affiliate/dashboard/settings');

  // Direct-deposit status, checked live so a just-finished onboarding (the
  // ?stripe=return round-trip) shows Ready without any cache dance.
  const stripeStatus: 'none' | 'incomplete' | 'ready' = !affiliate.stripeAccountId
    ? 'none'
    : (await transfersReady(affiliate.stripeAccountId))
      ? 'ready'
      : 'incomplete';

  return (
    <main className="bg-cream min-h-screen pb-24">
      {/* Header */}
      <div className="border-b border-cobalt/10 bg-white">
        <div className="max-w-[820px] mx-auto px-5 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div>
            <Link
              href="/affiliate/dashboard"
              className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-1 inline-block hover:underline underline-offset-4"
            >
              &larr; Back to dashboard
            </Link>
            <h1 className="font-display font-black text-ink tracking-[-0.025em] text-2xl sm:text-3xl">
              Settings<span className="text-cobalt">.</span>
            </h1>
          </div>
          <form action="/auth/logout" method="POST">
            <button
              type="submit"
              className="text-xs font-bold tracking-wider uppercase text-ink-soft hover:text-ink transition"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <section className="max-w-[820px] mx-auto px-5 sm:px-6 lg:px-8 pt-10">
        <p className="text-sm text-ink-soft mb-10 leading-relaxed max-w-[620px]">
          Update your profile, change your discount code, connect direct deposit for payouts, or swap the email you use to sign in. Each section saves independently &mdash; changes take effect immediately.
        </p>
        {/* Direct deposit (Stripe) — preferred payout rail when connected;
            the PayPal email in the forms below remains the fallback. */}
        <section className="mb-10 rounded-2xl border border-cobalt/15 bg-white p-6">
          <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">— Payouts · Direct deposit</p>
          {stripeStatus === 'ready' ? (
            <>
              <p className="text-sm font-bold text-green-700">✓ Direct deposit connected</p>
              <p className="text-sm text-ink-soft mt-1">
                Your payouts go straight to your bank via Stripe. Need to change the bank on file?
              </p>
              <form action={startStripeOnboarding} className="mt-3">
                <button type="submit" className="text-xs font-bold tracking-wider uppercase text-cobalt hover:underline underline-offset-4">
                  Update bank details \u2192
                </button>
              </form>
            </>
          ) : (
            <>
              <p className="text-sm text-ink leading-relaxed">
                {stripeStatus === 'incomplete'
                  ? 'Your direct-deposit setup isn\u2019t finished \u2014 pick up where you left off to start receiving bank payouts.'
                  : 'Get paid straight to your bank account. Setup takes about two minutes with Stripe \u2014 we never see your bank details.'}
              </p>
              <form action={startStripeOnboarding} className="mt-4">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center bg-cobalt text-white font-bold tracking-[0.16em] uppercase text-xs px-6 py-3 rounded-lg hover:bg-ink transition-colors"
                >
                  {stripeStatus === 'incomplete' ? 'Finish setup \u2192' : 'Set up direct deposit \u2192'}
                </button>
              </form>
              <p className="text-[11px] text-ink-soft mt-3">
                Payouts are on hold for your account until this is connected.
              </p>
            </>
          )}
        </section>

        <SettingsForms affiliate={affiliate} />
      </section>
    </main>
  );
}
