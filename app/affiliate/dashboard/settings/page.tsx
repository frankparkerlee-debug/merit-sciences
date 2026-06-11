import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentAffiliate } from '@/lib/affiliate-session';
import { SettingsForms } from './SettingsForms';

export const metadata = {
  title: 'Settings — Merit Sciences Affiliate',
};

export const dynamic = 'force-dynamic';

export default async function AffiliateSettingsPage() {
  const affiliate = await getCurrentAffiliate();
  if (!affiliate) redirect('/affiliate/login?next=/affiliate/dashboard/settings');

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
          Update your profile, change your discount code, or swap the email you use to sign in. Each section saves independently &mdash; changes to your discount code sync to Stripe in real-time.
        </p>
        <SettingsForms affiliate={affiliate} />
      </section>
    </main>
  );
}
