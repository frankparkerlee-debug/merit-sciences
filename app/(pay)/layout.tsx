import type { Metadata } from 'next';
import { Inter, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import '../globals.css';
import { PostHogProvider } from '@/components/PostHogProvider';
import { MarketingPixels } from '@/components/MarketingPixels';
import { GoogleTagManager } from '@/components/GoogleTagManager';

/**
 * ROOT LAYOUT FOR PAYMENT SURFACES — a second, independent root.
 *
 * PayPal requires checkout to run on a domain separate from the catalog, and
 * that domain must not reference the storefront at all. Gating the storefront
 * layout at render time wasn't enough: because <ChromeGate> is a client
 * component, the Nav/Footer/JSON-LD it hides were still serialised into the
 * RSC flight payload, so `view-source` on the payment domain still contained
 * meritsciences.com strings and catalog markup.
 *
 * A separate root layout is the only way to make that structurally impossible:
 * the storefront chrome is never part of this tree, so it cannot appear in the
 * rendered HTML OR the payload. Route groups `(store)` and `(pay)` each own a
 * root layout — hence no app/layout.tsx.
 *
 * Kept deliberately minimal:
 *   · fonts + globals.css      (visual parity with the storefront)
 *   · the RUO banner           (compliance, no links)
 *   · pixels + PostHog         (Purchase tracking must keep firing here — this
 *                               is where conversions actually happen)
 *
 * Deliberately ABSENT: Nav, Footer, CartDrawer, SubscribePopup,
 * WelcomeOfferBar, DiscountCodeCapture, and the Organization/WebSite JSON-LD —
 * every one of which names or links to the store.
 */

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});
const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-inter-tight',
  display: 'swap',
});
const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

/**
 * No metadataBase, no canonical, no openGraph, no keywords — all of those
 * resolve against meritsciences.com in the storefront layout. Payment pages
 * are never indexed, so none of it is needed here.
 */
export const metadata: Metadata = {
  title: { default: 'Secure checkout', template: '%s' },
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
};

export default function PayRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${interTight.variable} ${jetbrains.variable}`}>
      <body className="font-sans">
        {/* GTM: loader + noscript. Must be first inside <body>. */}
        <GoogleTagManager />
        <MarketingPixels />
        <PostHogProvider>
          {/* No RUO banner on payment surfaces. The attestation that actually
              carries legal weight sits at the point of purchase — the buyer
              confirms it in the checkout body copy when placing the order —
              and the eligibility clause is in the Terms. A category banner
              across the top of the payment domain adds no protection the
              attestation doesn't already provide, and reads as a category
              signal on the one surface kept deliberately neutral. */}
          <main>{children}</main>
        </PostHogProvider>
      </body>
    </html>
  );
}
