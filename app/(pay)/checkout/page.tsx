import Link from 'next/link';
import { headers } from 'next/headers';
import { getActiveReferral } from '@/lib/referral';
import { getProduct } from '@/lib/catalog';
import { getStoreSettings } from '@/lib/store-settings';
import { CheckoutClient } from './CheckoutClient';
import { CheckoutBridge } from './CheckoutBridge';
import { PaymentShellHeader } from '@/components/PaymentShell';
import { checkoutOrigin, isCheckoutHostname } from '@/lib/checkout-domain';

/**
 * Payment surfaces must never be indexed, and must never emit a canonical or
 * og:url pointing at meritsciences.com. The root layout sets a self-referential
 * canonical against metadataBase (meritsciences.com), which on the split
 * checkout domain would publish a machine-readable link straight back to the
 * storefront — exactly the association this domain exists to remove.
 */
export const metadata = {
  // `absolute` bypasses the root title template ("%s · Merit Sciences").
  title: { absolute: 'Secure checkout' },
  description: null,
  robots: { index: false, follow: false, nocache: true },
  alternates: { canonical: null },
  // Everything below is inherited storefront metadata that has no business on
  // an anonymized payment page — the keywords tag in particular listed
  // "sterile compounds, COA, HPLC verified, bacteriostatic water".
  keywords: null,
  authors: null,
  creator: null,
  publisher: null,
  openGraph: null,
  twitter: null,
};

export const dynamic = 'force-dynamic';

/**
 * True when CHECKOUT_ORIGIN is set AND this request did NOT arrive on it —
 * i.e. a buyer hit /checkout on the storefront while checkout lives on the
 * separate PayPal-required domain. They get the bridge, which carries cart +
 * affiliate + promo across and forwards.
 */
function needsBridge(): boolean {
  // Split only matters once CHECKOUT_ORIGIN is set (that is the redirect
  // switch). If this request already arrived on the checkout host, serve
  // checkout rather than bouncing it.
  if (!checkoutOrigin()) return false;
  return !isCheckoutHostname(headers().get('host'));
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams?: { c?: string };
}) {
  if (needsBridge()) return <CheckoutBridge />;

  // Handoff token minted by the storefront — CheckoutClient redeems it on
  // mount to rebuild cart + affiliate cookie + promo on this origin.
  const handoffToken = typeof searchParams?.c === 'string' ? searchParams.c : null;
  // Referral auto-discount: if the visitor arrived via an affiliate link,
  // pre-fill that affiliate's code so the 10% applies automatically and
  // shows in the discount box (removable).
  const [referral, settings] = await Promise.all([getActiveReferral(), getStoreSettings()]);
  const autoReferralCode = referral?.code ?? null;

  // PayPal button client id — read from the SERVER env at request time (this
  // page is force-dynamic) so the browser button always uses the SAME account
  // we capture against server-side. This removes the build-time bake pitfall:
  // when the Merchant-of-Record account's keys change, updating PAYPAL_CLIENT_ID
  // alone is enough — no need to also set NEXT_PUBLIC_PAYPAL_CLIENT_ID and
  // rebuild. Falls back to the public build-time var if the server one is unset.
  const paypalClientId =
    process.env.PAYPAL_CLIENT_ID || process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '';

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
      {/* Warm the PayPal connection while the page renders.
       *
       * The SDK script isn't requested until React hydrates and
       * PayPalScriptProvider mounts — by then DNS + TCP + TLS to paypal.com
       * still have to happen before a single byte arrives (measured TTFB
       * 0.35–0.52s). Preconnecting overlaps that handshake with render, so
       * the pay buttons paint materially sooner.
       *
       * Deliberately scoped to /checkout — NOT the root layout. A site-wide
       * preconnect would open a connection to PayPal from every page on the
       * domain, which is both wasted work and needless exposure. */}
      <link rel="preconnect" href="https://www.paypal.com" />
      <link rel="preconnect" href="https://www.paypalobjects.com" />
      <link rel="dns-prefetch" href="https://www.paypal.com" />
      <link rel="dns-prefetch" href="https://www.paypalobjects.com" />

      <PaymentShellHeader />

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

        <CheckoutClient
          autoReferralCode={autoReferralCode}
          bacWaterProduct={bacWaterProduct}
          freeShippingThresholdCents={settings.freeShippingThreshold}
          paypalClientId={paypalClientId}
          handoffToken={handoffToken}
        />
      </section>
    </main>
  );
}
