import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase-server';
import { requireAdmin } from '@/lib/admin-session';
import { AdminLoginForm } from './AdminLoginForm';

export const metadata = {
  title: 'Admin sign-in — Merit Sciences',
};

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string; email?: string }>;
}) {
  // If already signed in AND admin, bounce to dashboard
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const admin = await requireAdmin();
    if (admin) redirect('/admin/orders');
    // Signed in but not an admin — show error rather than infinite loop
    return <NotAuthorizedScreen email={user.email ?? '(unknown)'} />;
  }

  const sp = await searchParams;
  const sent = sp.sent === '1';
  const sentTo = sp.email || null;
  const error = sp.error || null;

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[420px]">
        <p className="text-[10px] tracking-[0.28em] uppercase text-cobalt font-bold mb-3">
          — Operator portal
        </p>
        <h1
          className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95] mb-3"
          style={{ fontSize: 'clamp(32px, 4.5vw, 48px)' }}
        >
          Admin sign-in<span className="text-cobalt">.</span>
        </h1>
        <p className="text-sm sm:text-base text-ink-soft leading-relaxed mb-8">
          Restricted to authorized operators. We&rsquo;ll email a one-tap link &mdash; no password.
        </p>

        {sent ? (
          <SentState sentTo={sentTo} />
        ) : (
          <>
            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 mb-5">
                <p className="text-sm text-rose-900 leading-relaxed">{error}</p>
              </div>
            )}
            <AdminLoginForm />
          </>
        )}
      </div>
    </main>
  );
}

function SentState({ sentTo }: { sentTo: string | null }) {
  return (
    <div className="rounded-2xl border border-cobalt/15 bg-white p-6">
      <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">— Link sent</p>
      <h2 className="font-display font-black text-ink tracking-tight text-xl mb-2">
        Check your inbox.
      </h2>
      <p className="text-sm text-ink-soft mb-2">
        {sentTo
          ? <>Magic link sent to <strong className="text-ink">{sentTo}</strong>.</>
          : <>Magic link sent.</>}
      </p>
      <p className="text-xs text-ink-soft/70">Link expires in 60 minutes.</p>
    </div>
  );
}

function NotAuthorizedScreen({ email }: { email: string }) {
  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[420px]">
        <p className="text-[10px] tracking-[0.28em] uppercase text-rose-700 font-bold mb-3">
          — Access denied
        </p>
        <h1 className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95] mb-3 text-3xl">
          Not an operator<span className="text-cobalt">.</span>
        </h1>
        <p className="text-sm text-ink-soft leading-relaxed mb-6">
          You&rsquo;re signed in as <strong className="text-ink">{email}</strong>, which is not an authorized operator account. Contact the team if this is unexpected.
        </p>
        <form action="/auth/logout" method="POST">
          <button
            type="submit"
            className="w-full bg-ink text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-cobalt transition"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
