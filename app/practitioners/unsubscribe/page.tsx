import Link from 'next/link';
import { onUnsubscribe } from '@/lib/practitioner-journey';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Unsubscribe — Merit Sciences' };

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token?.trim();
  const ok = token ? await onUnsubscribe(token) : false;

  return (
    <main className="bg-cream min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full rounded-2xl border border-cobalt/15 bg-white p-8 text-center">
        <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
          — Merit Sciences
        </p>
        {ok ? (
          <>
            <h1 className="font-display font-black text-ink text-2xl mb-3 tracking-[-0.02em]">
              You&rsquo;re unsubscribed.
            </h1>
            <p className="text-sm text-ink-soft leading-relaxed">
              We won&rsquo;t email you about the Practitioner Program again. If this was a mistake
              or you change your mind, you can apply for an account at any time.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display font-black text-ink text-2xl mb-3 tracking-[-0.02em]">
              Link expired or invalid.
            </h1>
            <p className="text-sm text-ink-soft leading-relaxed">
              We couldn&rsquo;t process this unsubscribe request. Reply directly to any of our
              emails and we&rsquo;ll remove you manually.
            </p>
          </>
        )}
        <p className="mt-6">
          <Link href="/practitioners" className="text-cobalt text-sm font-bold hover:underline">
            ← Back to Merit Sciences
          </Link>
        </p>
      </div>
    </main>
  );
}
