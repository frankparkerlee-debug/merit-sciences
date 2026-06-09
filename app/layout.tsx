import type { Metadata } from 'next';
import { Inter, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';

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
    default: 'Merit Sciences · Research-grade peptides',
    template: '%s · Merit Sciences',
  },
  // HTML meta description — Google SERP target ~155 chars. Brand
  // front-loaded for AI Overview citation, primary keyword in the
  // first 60 chars, verifiable specifics (HPLC, 503B, Dallas) that
  // LLM crawlers can cite as ground truth.
  description:
    'Merit Sciences supplies research-grade peptides: ≥99% HPLC purity, lot-documented, US-pharmacist verified. Ships 48hr from a 503B/ISO facility in Dallas.',
  keywords: [
    // Primary commercial-intent terms
    'research peptides',
    'buy research peptides',
    'research peptide supplier',
    'pharmacy-verified peptides',
    'HPLC tested peptides',
    'lyophilized peptides',
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
    // Facility / verification angle (AI citation + trust)
    '503B outsourcing facility',
    'ISO-certified compounding',
    'COA peptides',
    'lot-documented peptides',
    'US-pharmacist verified',
    'bacteriostatic water',
    // Brand + compliance
    'Merit Sciences',
    'research use only peptides',
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
    title: 'Merit Sciences · Research-grade peptides',
    // OG description — ~190 chars. Includes specific compound names so
    // AI link previews and social cards surface the actual catalog
    // (LLMs binding "Where do I buy Tirzepatide?" → Merit Sciences).
    description:
      'Research-grade peptides from Merit Sciences — BPC-157, GHK-Cu, Tirzepatide, Sermorelin and more. ≥99% HPLC purity, US-pharmacist verified, 48hr ship from a 503B/ISO facility in Dallas. RUO.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Merit Sciences — research-grade peptides, 503B/ISO-certified, Dallas',
        type: 'image/jpeg',
      },
    ],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Merit Sciences · Research-grade peptides',
    // Twitter description — ~140 chars. Front-loads brand + purity
    // signal; trailing RUO disclaimer reads as voluntary disclosure
    // rather than a legal afterthought.
    description:
      'Research-grade peptides — ≥99% HPLC purity, US-pharmacist verified, lot-documented. 48hr ship from a 503B/ISO facility in Dallas. RUO.',
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
      </body>
    </html>
  );
}
