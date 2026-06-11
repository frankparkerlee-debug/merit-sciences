import Link from 'next/link';

export const metadata = {
  title: 'Checkout canceled',
};

export default function CheckoutCancelPage() {
  return (
    <main className="bg-cream min-h-screen">
      <section className="max-w-[640px] mx-auto px-5 sm:px-6 lg:px-8 pt-20 pb-16 text-center">
        <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-3">
          — Checkout canceled
        </p>
        <h1
          className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95] mb-4"
          style={{ fontSize: 'clamp(28px, 4.5vw, 48px)' }}
        >
          No charge made<span className="text-cobalt">.</span>
        </h1>
        <p className="text-base text-ink-soft leading-relaxed mb-10">
          Your cart is still saved. Pick up where you left off — or
          keep browsing.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/catalog"
            className="bg-ink text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-steel transition"
          >
            Browse catalog
          </Link>
          <Link
            href="/cart"
            className="border border-cobalt/20 text-ink px-6 py-3 rounded-xl text-sm font-bold hover:border-cobalt/40 transition"
          >
            Review cart
          </Link>
        </div>
      </section>
    </main>
  );
}
