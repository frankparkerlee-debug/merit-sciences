import Link from 'next/link';
import { getActiveReferral } from '@/lib/referral';
import { getProduct } from '@/lib/catalog';
import { CheckoutClient } from './CheckoutClient';

export const metadata = {
  title: 'Checkout — Merit Sciences',
};

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  // Referral auto-discount: if the visitor arrived via an affiliate link,
  // pre-fill that affiliate's code so the 10% applies automatically and
  // shows in the discount box (removable).
  const referral = await getActiveReferral();
  const autoReferralCode = referral?.code ?? null;

  // BAC water cross-sell — resolve the real product so the checkout
  // reconstitution nudge adds the correct handle/price/image. Null if the
  // product isn't stocked (the nudge then simply doesn't render).
  let bacWaterProduct: { handle: string; title: string; unitCents: number; imageUrl?: string } | null = null;
  try {
    const bac = await getProduct('bacteriostatic-water');
    if (bac) {
      bacWaterProduct = {
        handle: bac.handle,
        title: bac.title,
        unitCents: bac.priceCents,
        imageUrl: bac.imageUrl ?? undefined,
      };
    }
  } catch {
    /* checkout still works without the nudge */
  }

  return (
    <main className="bg-cream min-h-screen pb-24">
      <div className="border-b border-cobalt/10 bg-white">
        <div className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-8 py-5 flex items-center justify-between">
          <Link
            href="/"
            className="font-display font-black text-ink text-lg tracking-[-0.02em]"
          >
            Merit Sciences
          </Link>
          <Link
            href="/catalog"
            className="text-xs font-bold tracking-wider uppercase text-ink-soft hover:text-ink transition"
          >
            ← Keep shopping
          </Link>
        </div>
      </div>

      <section className="max-w-[1100px] mx-auto px-5 sm:px-6 lg:px-8 pt-10">
        <p className="text-[10px] tracking-[0.28em] uppercase text-cobalt font-bold mb-3">
          — Secure checkout
        </p>
        <h1
          className="font-display font-black text-ink tracking-[-0.035em] leading-[0.95] mb-10"
          style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}
        >
          Review &amp; pay<span className="text-cobalt">.</span>
        </h1>

        <CheckoutClient autoReferralCode={autoReferralCode} bacWaterProduct={bacWaterProduct} />
      </section>
    </main>
  );
}
