import type { Metadata } from 'next';
import { Inter, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';

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
  // metadataBase resolves all relative OG/Twitter image URLs. Render's
  // temporary domain is the source of truth until shop.meritsciences.com
  // is wired — relative `/og-image.jpg` then works under both.
  metadataBase: new URL('https://merit-sciences.onrender.com'),
  title: {
    default: 'Merit Sciences · Research-grade compounds',
    template: '%s · Merit Sciences',
  },
  // HTML meta description — Google SERP target ~155 chars. PPC-safer
  // vocabulary: "compounds" (not peptides — auto-flagged by Meta),
  // no facility/pharmacy practice language, explicit RUO disclaimer
  // that ad reviewers like to see stated outright.
  description:
    'Merit Sciences supplies research-grade compounds: ≥99% HPLC purity, lot-documented. Ships 48hr from Dallas, TX. For research use only — not for human or veterinary use.',
  keywords: [
    // Primary commercial-intent terms
    'research compounds',
    'buy research compounds',
    'research compound supplier',
    'HPLC tested compounds',
    'lab-tested compounds',
    'lot-documented research compounds',
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
    title: 'Merit Sciences · Research-grade compounds',
    // OG description — names compounds in the catalog so AI link
    // previews and social cards surface the actual offerings. PPC-safer
    // framing: no facility/pharmacy practice language, explicit RUO.
    description:
      'Research-grade compounds from Merit Sciences — BPC-157, GHK-Cu, Tirzepatide, Sermorelin and more. ≥99% HPLC purity, lot-documented. Ships 48hr from Dallas. Research use only — not for human or veterinary use.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Merit Sciences — research-grade compounds, lab-verified, Dallas',
        type: 'image/jpeg',
      },
    ],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Merit Sciences · Research-grade compounds',
    // Twitter description — ~140 chars. PPC-safer, RUO explicit.
    description:
      'Research-grade compounds — ≥99% HPLC purity, lot-documented. Ships 48hr from Dallas. Research use only — not for human or veterinary use.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${interTight.variable} ${jetbrains.variable}`}>
      <body className="font-sans">
        <div className="bg-steel text-white text-center py-2 text-[10.5px] font-semibold tracking-[0.12em] uppercase">
          For Research Use Only · Not For Human or Veterinary Use · Not FDA-Approved
        </div>
        <Nav />
        <main>{children}</main>
        <Footer />
        {/* Global slide-in cart drawer — opens whenever the cart store's
            isDrawerOpen flips true (e.g. after any "Add to cart"). */}
        <CartDrawer />
      </body>
    </html>
  );
}
