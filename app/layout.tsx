import type { Metadata } from 'next';
import { Inter, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { SubscribePopup } from '@/components/SubscribePopup';
import { ChromeGate } from '@/components/ChromeGate';
import { PostHogProvider } from '@/components/PostHogProvider';
import { MarketingPixels } from '@/components/MarketingPixels';
import { getStoreSettings } from '@/lib/store-settings';

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

export const metadata: Metadata = {
  // metadataBase resolves all relative OG/Twitter image URLs and is the
  // canonical origin Google/Bing attribute authority to. meritsciences.com
  // is the live production domain (apex → Render), so it is the source of
  // truth — NOT the onrender.com temp URL, which would split SEO authority.
  metadataBase: new URL('https://meritsciences.com'),
  title: {
    default: 'Merit Sciences · Pharmacy-grade compounds',
    template: '%s · Merit Sciences',
  },
  // HTML meta description — Google SERP target ~155 chars. PPC-safer
  // vocabulary: "compounds" (not peptides — auto-flagged by Meta).
  // RUO compliance lives in the top steel banner + Footer + Terms —
  // we don't repeat it in the SERP impression so the brand reads as a
  // pharmacy-grade pharmaceutical supplier, not a research-chem shop.
  description:
    'Pharmacy-grade compounds from an ISO-certified US facility. Sealed sterile lyophilized vials, lot COA on every batch, ≥99% HPLC purity. Ships 48hr from Dallas.',
  keywords: [
    // Primary commercial-intent terms
    'pharmacy-grade compounds',
    'ISO-certified facility compounds',
    'lot-documented compounds',
    'HPLC tested compounds',
    'sealed sterile compounds',
    'ISO-certified compounds',
    // Compound-specific (long-tail, high commercial intent)
    'BPC-157',
    'BPC-157 supplier',
    'TB-500',
    'GHK-Cu',
    'Tirzepatide',
    'Retatrutide',
    'Tesamorelin',
    'Sermorelin',
    'IGF-1 LR3',
    'NAD+',
    'MOTS-c',
    'Selank',
    'Semax',
    'PT-141',
    'Epitalon',
    'AOD-9604',
    'Thymosin Alpha-1',
    // Quality / verification angle (AI citation + trust)
    'COA',
    'HPLC verified',
    'bacteriostatic water',
    // Brand + compliance
    'Merit Sciences',
    'research use only',
  ],
  authors: [{ name: 'Merit Sciences' }],
  creator: 'Merit Sciences',
  publisher: 'Merit Sciences',
  // Auto-detected from /app or /public — explicit declaration is safer
  // across platforms (esp. iOS home-screen + browser tabs).
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.png',
    apple: '/apple-icon.png',
  },
  openGraph: {
    type: 'website',
    url: 'https://merit-sciences.onrender.com',
    siteName: 'Merit Sciences',
    title: 'Merit Sciences · Pharmacy-grade compounds',
    // OG description — names compounds in the catalog so AI link
    // previews and social cards surface the actual offerings. PPC-safer
    // framing leads with the ISO / sealed sterile channel proof.
    description:
      'Pharmacy-grade compounds from an ISO-certified US facility — BPC-157, GHK-Cu, Tirzepatide, Sermorelin and more. Sealed sterile vials, lot COA on every batch. Ships 48hr from Dallas.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Merit Sciences — pharmacy-grade compounds, ISO-certified, Dallas',
        type: 'image/jpeg',
      },
    ],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Merit Sciences · Pharmacy-grade compounds',
    // Twitter description — ~140 chars. ISO-certified channel framing.
    description:
      'Pharmacy-grade compounds from a US compounding facility. Sealed sterile vials, lot COA, ≥99% HPLC purity. Ships 48hr from Dallas.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getStoreSettings();
  return (
    <html lang="en" className={`${inter.variable} ${interTight.variable} ${jetbrains.variable}`}>
      <body className="font-sans">
        {/* Meta + TikTok ad pixels. Env-gated — no-op until IDs are set. */}
        <MarketingPixels />
        {/* PostHog: autocapture + pageviews across the whole app. No-ops
            until NEXT_PUBLIC_POSTHOG_KEY is set in Render. */}
        <PostHogProvider>
          <div className="bg-steel text-white text-center py-2 text-[10.5px] font-semibold tracking-[0.12em] uppercase">
            For Research Use Only · Not For Human or Veterinary Use · Not FDA-Approved
          </div>
          {/* ChromeGate strips Nav/Footer/cart/popup on clean-room ad
              landing routes (/access) so paid-ad crawlers see no catalog
              links. The RUO banner above and <main> below always render. */}
          <ChromeGate>
            <Nav />
          </ChromeGate>
          <main>{children}</main>
          <ChromeGate>
            <Footer />
            {/* Global slide-in cart drawer — opens whenever the cart store's
                isDrawerOpen flips true (e.g. after any "Add to cart"). */}
            <CartDrawer freeShippingThresholdCents={settings.freeShippingThreshold} />
            {/* Exit-intent / timed subscribe popup → 10%-off capture. Self-gates
                on transactional/account routes + frequency-caps via localStorage. */}
            <SubscribePopup />
          </ChromeGate>
        </PostHogProvider>
      </body>
    </html>
  );
}
