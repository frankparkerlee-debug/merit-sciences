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
  description:
    'Pharmacy-verified research peptides — every batch HPLC-tested to ≥99% purity, every shipment lot-documented. Shipped from our 503B outsourcing facility in Dallas, TX in 48 hours. For research use only.',
  keywords: [
    'research peptides',
    'pharmacy-verified peptides',
    'BPC-157',
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
    'lot-documented',
    '503B outsourcing facility',
    'ISO-certified',
    'lyophilized peptides',
    'COA',
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
    title: 'Merit Sciences · Research-grade peptides',
    description:
      'Pharmacy-verified research peptides — HPLC-tested to ≥99% purity, lot-documented, shipped from a 503B outsourcing facility in Dallas. For research use only.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Merit Sciences — research-grade peptides',
        type: 'image/jpeg',
      },
    ],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Merit Sciences · Research-grade peptides',
    description:
      'Pharmacy-verified, lot-documented research peptides. 503B facility, ISO-certified. Dallas. For research use only.',
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
