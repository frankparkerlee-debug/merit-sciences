import type { Metadata } from 'next';
import { Archivo, Inter, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import '../globals.css';
import { PostHogProvider } from '@/components/PostHogProvider';
import { MarketingPixels } from '@/components/MarketingPixels';
import { GoogleTagManager } from '@/components/GoogleTagManager';

/**
 * ROOT LAYOUT FOR PAID-SEARCH LANDING PAGES, a third independent root beside
 * (store) and (pay).
 *
 * shop.meritsciences.com serves a Google Ads lander by middleware rewrite.
 * Under the (store) root that lander inherited the Nav, cart drawer, footer and
 * site JSON-LD: <ChromeGate> decides from usePathname(), which reports the
 * address bar ("/"), not the rewritten route, so it never stripped anything.
 * And hiding client-side was never enough anyway: hidden chrome still ships in
 * the RSC payload, catalog links and all, and Google's reviewer reads the
 * payload as readily as the page. A separate root makes the chrome absent
 * rather than hidden, exactly as (pay) does for the checkout domain.
 *
 * Kept: fonts and globals.css for parity with the store, the RUO banner, and
 * the Google tag plus pixels, since a click id has to become a cookie here for
 * the purchase to attribute. Absent: everything that names, links to, or lists
 * the catalog. The lander renders its own business-identity footer.
 */

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-inter', display: 'swap' });
const interTight = Inter_Tight({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--font-inter-tight', display: 'swap' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-jetbrains-mono', display: 'swap' });
const archivo = Archivo({ subsets: ['latin'], weight: ['800', '900'], variable: '--font-archivo', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Merit Sciences', template: '%s · Merit Sciences' },
  // Paid landers never rank; the store does. follow, so the links to it count.
  robots: { index: false, follow: true },
};

export default function LandingRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${interTight.variable} ${jetbrains.variable} ${archivo.variable}`}>
      <body className="font-sans">
        <GoogleTagManager />
        <MarketingPixels />
        <PostHogProvider>
          <div className="bg-steel text-white text-center py-2 text-[10.5px] font-semibold tracking-[0.12em] uppercase">
            For Research Use Only · Not For Human or Veterinary Use · Not FDA-Approved
          </div>
          <main>{children}</main>
        </PostHogProvider>
      </body>
    </html>
  );
}
