import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
    <main className="min-h-screen flex flex-col lg:flex-row bg-cream">

      {/* ───── LEFT: Form panel ───── */}
      <section className="bg-cream flex-1 flex flex-col px-6 sm:px-10 lg:px-16 xl:px-20 pt-6 lg:pt-10 pb-12 lg:pb-12 lg:min-h-screen order-2 lg:order-1">
        {/* Wordmark */}
        <Link href="/" className="inline-block mb-12 lg:mb-0">
          <span className="font-display font-black text-ink text-lg tracking-[-0.02em]">
            Merit Sciences
          </span>
        </Link>

        {/* Form content vertically centered */}
        <div className="flex-1 flex flex-col justify-center max-w-[420px] w-full mx-auto lg:mx-0 mt-8 lg:mt-0">
          {sent ? (
            <SentState sentTo={sentTo} />
          ) : (
            <>
              <p className="text-[10px] tracking-[0.28em] uppercase text-cobalt font-bold mb-3">
                — Sign in
              </p>
              <h1
                className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95] mb-4"
                style={{ fontSize: 'clamp(34px, 4.5vw, 52px)' }}
              >
                Welcome back<span className="text-cobalt">.</span>
              </h1>
              <p className="text-sm sm:text-base text-ink-soft leading-relaxed mb-8 max-w-[380px]">
                Sign in to your Merit Sciences affiliate dashboard. We&rsquo;ll email you a one-tap link &mdash; no password needed.
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

        {/* Footer pinned bottom on desktop */}
        <p className="hidden lg:block text-[11px] text-ink-soft/60 tracking-wide mt-10">
          Pharmacy-grade. Not pharmacy-priced.
        </p>
      </section>

      {/* ───── RIGHT: Editorial image panel ───── */}
      <aside className="relative bg-ink lg:w-[52%] lg:min-h-screen overflow-hidden order-1 lg:order-2">
        {/* Hero vial photo — full bleed */}
        <Image
          src="/brand/merit-vial-hero.webp"
          alt="Merit Sciences vial — pharmacy-grade, lyophilized, 99% HPLC verified"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 52vw"
          className="object-cover"
        />

        {/* Cobalt overlay for type contrast */}
        <div className="absolute inset-0 bg-gradient-to-tr from-ink/85 via-ink/55 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-ink/70" />

        {/* Editorial overlay copy — bottom-left on desktop, centered on mobile */}
        <div className="relative h-full min-h-[280px] sm:min-h-[360px] lg:min-h-screen flex flex-col justify-end px-6 sm:px-10 lg:px-12 xl:px-16 py-10 lg:py-12 text-white">
          <p className="text-[10px] tracking-[0.28em] uppercase text-cobalt-soft font-bold mb-4">
            — Affiliate portal
          </p>
          <h2
            className="font-display font-black tracking-[-0.038em] leading-[0.92] mb-5 max-w-[520px]"
            style={{ fontSize: 'clamp(28px, 4.5vw, 56px)' }}
          >
            Your earnings. <br className="hidden sm:block" />
            Your customers. <br className="hidden sm:block" />
            <span className="text-cobalt-soft">For life.</span>
          </h2>
          <p className="text-sm sm:text-base text-white/75 leading-relaxed mb-7 max-w-[420px]">
            Evergreen commissions. Custom discount codes. Your audience gets 10% off. You earn a flat 20% on every order &mdash; forever.
          </p>

          {/* Three quick stats */}
          <div className="grid grid-cols-3 gap-2 lg:gap-4 max-w-[440px] border-t border-white/10 pt-6">
            <Stat n="20%" label="Commission" />
            <Stat n="∞" label="Evergreen lock" />
            <Stat n="10%" label="Customers save" />
          </div>
        </div>
      </aside>
    </main>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <p className="font-display font-black tracking-tight text-xl sm:text-2xl lg:text-3xl text-white">
        {n}
      </p>
      <p className="text-[9px] sm:text-[10px] tracking-[0.16em] uppercase text-white/55 font-bold mt-1.5 leading-tight">
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
