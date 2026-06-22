import Link from 'next/link';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { CheckoutClient } from './CheckoutClient';

export const metadata = {
  title: 'Checkout — Merit Sciences',
};

export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  // Referral auto-discount: if the visitor arrived via an affiliate link
  // (?ref= set the merit_ref cookie), pre-fill that affiliate's discount
  // code so the 10% applies automatically AND the code is visible in the
  // discount box. The buyer can still remove it.
  let autoReferralCode: string | null = null;
  try {
    const cookieSlug = (await cookies()).get('merit_ref')?.value ?? null;
    if (cookieSlug) {
      const aff = await prisma.affiliate.findUnique({
        where: { slug: cookieSlug },
        select: { status: true, discountCode: true },
      });
      if (aff?.status === 'ACTIVE' && aff.discountCode) {
        autoReferralCode = aff.discountCode.toUpperCase();
      }
    }
  } catch {
    /* no referral pre-fill if the lookup fails — checkout still works */
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

        <CheckoutClient autoReferralCode={autoReferralCode} />
      </section>
    </main>
  );
}
