import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getPractitionerSession } from '@/lib/practitioner-session';
import { LoginForm } from './LoginForm';

export const metadata = { title: 'Sign in — Merit Sciences Practitioner Portal' };
export const dynamic = 'force-dynamic';

export default async function PractitionerLoginPage({
  searchParams,
}: {
  searchParams: { error?: string; email?: string };
}) {
  // If they're already signed in, send them straight to the portal.
  const session = await getPractitionerSession();
  if (session) redirect('/practitioners/portal');

  return (
    <main className="bg-cream min-h-screen flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full">
        <Link
          href="/practitioners"
          className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold inline-block hover:underline underline-offset-4 mb-5"
        >
          ← Practitioner Program
        </Link>

        <div className="rounded-2xl border border-cobalt/15 bg-white p-8">
          <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">
            — Practitioner Portal
          </p>
          <h1 className="font-display font-black text-ink text-3xl mb-3 tracking-[-0.025em]">
            Sign in<span className="text-cobalt">.</span>
          </h1>
          <p className="text-sm text-ink-soft leading-relaxed mb-6">
            Enter the email tied to your approved Practitioner account. We&rsquo;ll send a one-time
            sign-in link. No password.
          </p>

          {searchParams.error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 mb-4">
              {searchParams.error}
            </div>
          )}

          <LoginForm initialEmail={searchParams.email ?? ''} />

          <p className="text-[11px] text-ink-soft mt-6 leading-relaxed">
            Don&rsquo;t have an account yet?{' '}
            <Link href="/practitioners#apply" className="text-cobalt hover:underline font-bold">
              Apply for the Practitioner Program →
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
