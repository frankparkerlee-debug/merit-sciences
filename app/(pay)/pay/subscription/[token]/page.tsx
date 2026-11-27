import type { Metadata } from 'next';
import { verifyManageToken, describeSubscription } from '@/lib/retail-subscriptions';
import { ManageSubscription } from './ManageSubscription';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Your subscription', robots: { index: false, follow: false } };

export default async function SubscriptionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const id = verifyManageToken(decodeURIComponent(token));
  const sub = id ? await describeSubscription(id) : null;

  if (!sub) {
    return (
      <main className="bg-cream min-h-screen">
        <div className="max-w-[560px] mx-auto px-5 sm:px-6 pt-14 pb-20">
          <h1 className="font-display font-black text-ink tracking-[-0.03em] text-[34px] leading-none mb-3">
            This link is not valid<span className="text-cobalt">.</span>
          </h1>
          <p className="text-[15px] text-ink-soft leading-relaxed">
            Open the link again from your most recent subscription email. If it still does not work, reply to that
            email and a person will sort it out.
          </p>
        </div>
      </main>
    );
  }
  return <ManageSubscription token={decodeURIComponent(token)} initial={sub} />;
}
