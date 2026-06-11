import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerSupabase } from '@/lib/supabase-server';
import { LoginForm } from './LoginForm';

export const metadata = {
  title: 'Affiliate sign-in — Merit Sciences',
  description: 'Sign in to your Merit Sciences affiliate dashboard.',
};

export const dynamic = 'force-dynamic';

export default async function AffiliateLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string; next?: string; email?: string }>;
}) {
  // If already authenticated, jump straight to dashboard
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/affiliate/dashboard');

  const sp = await searchParams;
  const sent = sp.sent === '1';
  const sentTo = sp.email || null;
  const error = sp.error || null;
  const next = sp.next || '/affiliate/dashboard';

  return (
    <main className="min-h-screen flex flex-col lg:flex-row">
      {/* ───── LEFT: Editorial brand panel ───── */}
      <aside className="relative bg-ink text-white lg:w-[42%] lg:min-h-screen px-6 sm:px-10 lg:px-12 xl:px-16 pt-8 lg:pt-10 pb-10 lg:pb-12 flex flex-col">
        {/* Wordmark */}
        <Link href="/" className="inline-block">
          <span className="font-display font-black text-lg tracking-[-0.02em]">
            Merit Sciences
          </span>
        </Link>

        {/* Editorial copy */}
        <div className="flex-1 flex flex-col justify-center max-w-[480px] mx-auto lg:mx-0 mt-12 lg:mt-0 w-full">
          <p className="text-[10px] tracking-[0.28em] uppercase text-cobalt-soft font-bold mb-5">
            — Affiliate portal
          </p>
          <h1
            className="font-display font-black tracking-[-0.038em] leading-[0.92] mb-6"
            style={{ fontSize: 'clamp(36px, 5.5vw, 64px)' }}
          >
            Your earnings. <br className="hidden sm:block" />
            Your customers. <br className="hidden sm:block" />
            <span className="text-cobalt-soft">For life.</span>
          </h1>
          <p className="text-base lg:text-lg text-white/70 leading-relaxed mb-10 max-w-[420px]">
            Sign in to see your commission ledger, share tools, and the customers locked to you under evergreen attribution.
          </p>

          {/* Three quick stats */}
          <div className="grid grid-cols-3 gap-2 lg:gap-4 max-w-[440px] border-t border-white/10 pt-7">
            <Stat n="15-25%" label="Tier commission" />
            <Stat n="∞" label="Evergreen lock" />
            <Stat n="10%" label="Your customers save" />
          </div>
        </div>

        {/* Footer */}
        <p className="text-[11px] text-white/40 tracking-wide mt-10 lg:mt-12">
          Pharmacy-grade. Not pharmacy-priced.
        </p>
      </aside>

      {/* ───── RIGHT: Form panel ───── */}
      <section className="bg-cream flex-1 flex items-center justify-center px-6 sm:px-10 py-12 lg:py-0">
        <div className="w-full max-w-[420px]">
          {sent ? (
            <SentState sentTo={sentTo} />
          ) : (
            <>
              <p className="text-[10px] tracking-[0.28em] uppercase text-cobalt font-bold mb-3">
                — Sign in
              </p>
              <h2
                className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95] mb-3"
                style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}
              >
                Welcome back<span className="text-cobalt">.</span>
              </h2>
              <p className="text-sm sm:text-base text-ink-soft leading-relaxed mb-8">
                Enter the email you used to join. We&rsquo;ll send a one-tap link &mdash; no password.
              </p>

              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 mb-5">
                  <p className="text-sm text-rose-900 leading-relaxed">{error}</p>
                </div>
              )}
              <LoginForm next={next} />

              <p className="text-xs text-ink-soft/70 mt-8 leading-relaxed">
                Not an affiliate yet?{' '}
                <Link href="/affiliate" className="text-cobalt font-bold underline-offset-4 hover:underline">
                  Join the program &rarr;
                </Link>
              </p>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <p className="font-display font-black tracking-tight text-2xl lg:text-3xl text-white">
        {n}
      </p>
      <p className="text-[10px] tracking-[0.16em] uppercase text-white/50 font-bold mt-1.5 leading-tight">
        {label}
      </p>
    </div>
  );
}

function SentState({ sentTo }: { sentTo: string | null }) {
  return (
    <div>
      {/* Cobalt envelope mark */}
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cobalt/10 mb-6">
        <svg className="w-7 h-7 text-cobalt" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <p className="text-[10px] tracking-[0.28em] uppercase text-cobalt font-bold mb-3">
        — Link sent
      </p>
      <h2
        className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95] mb-4"
        style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}
      >
        Check your inbox<span className="text-cobalt">.</span>
      </h2>
      <p className="text-sm sm:text-base text-ink-soft leading-relaxed mb-2">
        {sentTo
          ? <>We sent a sign-in link to <strong className="text-ink">{sentTo}</strong>.</>
          : <>We just sent you a sign-in link.</>}
      </p>
      <p className="text-sm text-ink-soft/80 leading-relaxed mb-8">
        Tap the button in the email to sign in. The link expires in 60 minutes and can only be used once.
      </p>

      <div className="border-t border-cobalt/10 pt-6 space-y-3 text-xs text-ink-soft/70 leading-relaxed">
        <p>
          <strong className="text-ink-soft">Don&rsquo;t see it?</strong>{' '}
          Check your spam folder, or{' '}
          <Link href="/affiliate/login" className="text-cobalt font-bold underline-offset-4 hover:underline">
            request another link
          </Link>.
        </p>
        <p>
          <strong className="text-ink-soft">Wrong email?</strong>{' '}
          <Link href="/affiliate/login" className="text-cobalt font-bold underline-offset-4 hover:underline">
            Start over
          </Link>.
        </p>
      </div>
    </div>
  );
}
