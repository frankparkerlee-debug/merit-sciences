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
  searchParams: Promise<{ sent?: string; error?: string; next?: string }>;
}) {
  // If already authenticated, jump straight to dashboard
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/affiliate/dashboard');

  const sp = await searchParams;
  const sent = sp.sent === '1';
  const error = sp.error || null;
  const next = sp.next || '/affiliate/dashboard';

  return (
    <main className="bg-cream min-h-screen">
      <section className="max-w-[480px] mx-auto px-5 sm:px-6 pt-20 pb-16">
        <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
          — Affiliate portal
        </p>
        <h1
          className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95] mb-3"
          style={{ fontSize: 'clamp(32px, 5vw, 56px)' }}
        >
          Sign in<span className="text-cobalt">.</span>
        </h1>
        <p className="text-base text-ink-soft leading-relaxed mb-8">
          Enter the email you used to sign up. We&rsquo;ll send you a
          one-tap link to log in &mdash; no password needed.
        </p>

        {sent ? (
          <div className="rounded-2xl border border-cobalt/20 bg-white p-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-cobalt shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="font-bold text-ink mb-1">Check your inbox.</p>
                <p className="text-sm text-ink-soft leading-relaxed">
                  We just sent you a sign-in link. It expires in 1 hour.
                  Don&rsquo;t see it? Check your spam folder, or{' '}
                  <Link href="/affiliate/login" className="text-cobalt font-bold underline">
                    request another
                  </Link>.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 mb-5">
                <p className="text-sm text-rose-900 leading-relaxed">{error}</p>
              </div>
            )}
            <LoginForm next={next} />
          </>
        )}

        <p className="text-xs text-ink-soft/70 mt-8 leading-relaxed">
          Not an affiliate yet?{' '}
          <Link href="/affiliate" className="text-cobalt font-bold">
            Join the program &rarr;
          </Link>
        </p>
      </section>
    </main>
  );
}
