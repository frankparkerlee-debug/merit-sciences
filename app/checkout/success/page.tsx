import Link from 'next/link';
import { ClearCartOnMount } from './ClearCartOnMount';

export const metadata = {
  title: 'Order confirmed',
  description: 'Your Merit Sciences order has been received.',
};

export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId = searchParams.session_id;
  return (
    <main className="bg-cream min-h-screen">
      {/* Client-only effect — clears the persisted Zustand cart on mount */}
      <ClearCartOnMount />

      <section className="bg-white border-b border-cobalt/10">
        <div className="h-1 bg-gradient-to-r from-cobalt via-[#5078FF] to-cobalt" />
        <div className="max-w-[640px] mx-auto px-5 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cobalt text-white mb-6 shadow-md">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
            — Order confirmed
          </p>
          <h1
            className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95] mb-4"
            style={{ fontSize: 'clamp(32px, 5vw, 56px)' }}
          >
            You&apos;re all set<span className="text-cobalt">.</span>
          </h1>
          <p className="text-base sm:text-lg text-ink-soft leading-relaxed mb-2">
            Confirmation is on the way to your inbox.
          </p>
          <p className="text-sm text-ink-soft leading-relaxed mb-8">
            Your order ships within 48 hours from our facility in Dallas.
            You&apos;ll receive a tracking number as soon as it leaves.
          </p>
          {sessionId && (
            <p className="text-[11px] text-ink-muted font-mono">
              Order reference: <span className="break-all">{sessionId}</span>
            </p>
          )}
        </div>
      </section>

      <section className="max-w-[640px] mx-auto px-5 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-cobalt/10 rounded-2xl p-6 lg:p-8 mb-6">
          <p className="text-[10px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">
            — What ships
          </p>
          <h2 className="font-display text-xl font-extrabold text-ink leading-tight mb-2">
            48hr dispatch from Dallas<span className="text-cobalt">.</span>
          </h2>
          <p className="text-[13px] text-ink-soft leading-relaxed">
            Lyophilized vial, sealed, labeled with lot ID. UPS Ground
            tracked + insured. Released only after our US-licensed
            pharmacist signs off on the batch.
          </p>
        </div>

        <Link
          href="/catalog"
          className="block text-center text-white py-3.5 rounded-xl text-base font-bold shadow-md hover:opacity-95 transition"
          style={{
            background:
              'linear-gradient(135deg, #2E4DDB 0%, #5078FF 50%, #2E4DDB 100%)',
          }}
        >
          Continue shopping
        </Link>

        <p className="text-center text-[12px] text-ink-muted mt-6">
          Questions? Email{' '}
          <a href="mailto:rx@meritsciences.com" className="text-cobalt font-bold underline-offset-2 hover:underline">
            rx@meritsciences.com
          </a>
        </p>
      </section>
    </main>
  );
}
