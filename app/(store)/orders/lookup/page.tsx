import Link from 'next/link';
import { LookupForm } from './LookupForm';

export const metadata = {
  title: 'Look up your order — Merit Sciences',
  description: 'Enter your email + order number to receive a one-time link to view your order.',
};

export default function OrderLookupPage({
  searchParams,
}: {
  searchParams: { sent?: string };
}) {
  const sent = searchParams.sent === '1';

  return (
    <main className="bg-cream min-h-screen">
      <section className="max-w-[540px] mx-auto px-5 sm:px-6 lg:px-8 pt-20 pb-16">
        <Link href="/" className="font-display font-black text-ink text-lg tracking-[-0.02em] inline-block mb-12">
          Merit Sciences
        </Link>
        <p className="text-[10px] tracking-[0.28em] uppercase text-cobalt font-bold mb-3">— Order lookup</p>
        {sent ? (
          <>
            <h1
              className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95] mb-4"
              style={{ fontSize: 'clamp(28px, 4.5vw, 44px)' }}
            >
              Check your inbox<span className="text-cobalt">.</span>
            </h1>
            <p className="text-sm sm:text-base text-ink-soft leading-relaxed mb-2">
              If we have an order on file matching the details you gave us, we just emailed you a one-tap link to view it. The link expires in 24 hours.
            </p>
            <p className="text-xs text-ink-soft/70 mt-6">
              Didn&rsquo;t get it? Check your spam folder, or{' '}
              <Link href="/orders/lookup" className="text-cobalt font-bold underline-offset-4 hover:underline">
                try again
              </Link>.
            </p>
          </>
        ) : (
          <>
            <h1
              className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95] mb-4"
              style={{ fontSize: 'clamp(28px, 4.5vw, 44px)' }}
            >
              Look up your order<span className="text-cobalt">.</span>
            </h1>
            <p className="text-sm sm:text-base text-ink-soft leading-relaxed mb-8">
              Enter the email you used at checkout and the order reference from your confirmation email. We&rsquo;ll send you a secure link to view the order.
            </p>
            <LookupForm />
            <p className="text-xs text-ink-soft/70 mt-8">
              Lost your order reference? Check your inbox for a message from <strong className="text-ink-soft">Merit Sciences</strong>, or email{' '}
              <a href="mailto:support@meritsciences.com" className="text-cobalt font-bold">support@meritsciences.com</a>.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
