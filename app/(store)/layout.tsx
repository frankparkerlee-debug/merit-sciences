import type { Metadata } from 'next';
import { Archivo, Inter, Inter_Tight, JetBrains_Mono } from 'next/font/google';
import '../globals.css';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { SubscribePopup } from '@/components/SubscribePopup';
import { ChromeGate } from '@/components/ChromeGate';
import { WelcomeOfferBar } from '@/components/WelcomeOfferBar';
import { PostHogProvider } from '@/components/PostHogProvider';
import { MarketingPixels } from '@/components/MarketingPixels';
import { GoogleTagManager } from '@/components/GoogleTagManager';
import { DiscountCodeCapture } from '@/components/DiscountCodeCapture';
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
// Display face for the homepage. Inter Tight tops out at 800 and its caps go
// soft at poster size; the register this brand is built on needs a true Black
// with tight negative tracking. Archivo is the closest freely-licensed
// neo-grotesk to it. Loaded at 800/900 only — display sizes never need more.
const archivo = Archivo({
  subsets: ['latin'],
  weight: ['800', '900'],
  variable: '--font-archivo',
  display: 'swap',
});

// Site-wide entity graph — Organization + WebSite (with a sitelinks search box
// wired to the library search). This is how Google/answer-engines resolve
// "Merit Sciences" as a known entity and attribute the whole domain's content.
const SITE = 'https://meritsciences.com';

/** Verified public profiles Merit controls, for the Organization's `sameAs`.
 *  Add a URL here ONLY after confirming it resolves and is ours. */
const SAME_AS: string[] = [
  // theassay.co — Merit's editorial property, publicly disclosing Merit as its
  // publisher in both its visible colophon and its own Organization schema.
  // That mutual, verifiable declaration is what makes this a legitimate
  // sameAs edge rather than an asserted one: an answer engine can follow it
  // in either direction and find the claim confirmed at the other end. It is
  // the first entity edge Merit has ever had; every additional one should
  // clear the same bar (owned, live, and confirming the relationship back).
  'https://theassay.co',
];
const SITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      // Organization carries the local signals directly rather than emitting a
      // separate LocalBusiness node. Merit ships from San Antonio but is not a
      // walk-in storefront, and LocalBusiness implies premises the public can
      // visit — it would invite map/venue treatment the business can't honour.
      // Organization with address + contactPoint gives Google the same
      // location and contact facts without the false affordance.
      '@type': 'Organization',
      '@id': `${SITE}/#organization`,
      name: 'Merit Sciences',
      legalName: 'Merit Sciences LLC',
      url: SITE,
      logo: `${SITE}/icon.png`,
      image: `${SITE}/og-image.jpg`,
      email: 'rx@meritsciences.com',
      description:
        'Lab-verified research compounds — ≥99% HPLC purity, lot COA on every batch, ISO-certified US facility. Ships 48h from San Antonio. For research use only.',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'San Antonio',
        addressRegion: 'TX',
        addressCountry: 'US',
      },
      areaServed: { '@type': 'Country', name: 'United States' },
      // Entity disambiguation. Without sameAs edges an answer engine has no
      // way to tell this "Merit Sciences" from any other similarly-named
      // company, so any mention found off-site can't be resolved back to this
      // one — a real ceiling on citability.
      //
      // Populated 2026-09-01 with theassay.co, Merit's editorial property —
      // the first edge that clears the bar. Only profiles Merit actually
      // controls may go here; asserting an unowned or dead URL is a false
      // identity claim in machine-readable form and degrades the node. A
      // LinkedIn company page and Crunchbase entry are the next cheapest
      // additions, and each must confirm the relationship back.
      ...(SAME_AS.length ? { sameAs: SAME_AS } : {}),
      // What the organization actually does, in machine-readable form — this
      // is what a "who sells research peptides in the US" style query matches
      // against once the entity resolves.
      knowsAbout: [
        'Research peptides',
        'Certificate of analysis',
        'High-performance liquid chromatography',
        'USP <797> sterile compounding',
        'Lot traceability',
      ],
      contactPoint: [
        {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          email: 'rx@meritsciences.com',
          areaServed: 'US',
          availableLanguage: 'English',
        },
      ],
      // The lot library is the strongest third-party-verifiable thing on the
      // domain; pointing at it from the entity node ties the org to its proof.
      subjectOf: { '@id': `${SITE}/coa#page` },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE}/#website`,
      name: 'Merit Sciences',
      url: SITE,
      publisher: { '@id': `${SITE}/#organization` },
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE}/library?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};

export const metadata: Metadata = {
  // metadataBase resolves all relative OG/Twitter image URLs and is the
  // canonical origin Google/Bing attribute authority to. meritsciences.com
  // is the live production domain (apex → Render), so it is the source of
  // truth — NOT the onrender.com temp URL, which would split SEO authority.
  metadataBase: new URL('https://meritsciences.com'),
  // "Pharmacy-grade" dropped site-wide 2026-08-11 (team compliance call: a
  // pharmacy exists to dispense to people, so the word implies human use).
  // "Lab-verified" carries the same quality signal from the supply side.
  title: {
    default: 'Merit Sciences · Lab-verified research compounds',
    template: '%s · Merit Sciences',
  },
  // HTML meta description — Google SERP target ~155 chars. PPC-safer
  // vocabulary: "compounds" (not peptides — auto-flagged by Meta).
  // RUO compliance lives in the top steel banner + Footer + Terms —
  // we don't repeat it in the SERP impression so the brand reads as a
  // lab-verified supplier, not a research-chem shop.
  description:
    'Lab-verified compounds from an ISO-certified US facility. Sealed sterile lyophilized vials, lot COA on every batch, ≥99% HPLC purity. Ships 48hr from San Antonio.',
  // NOTE: molecule names deliberately kept OUT of the GLOBAL <head> — it rides
  // on every page incl. the /access ad gate, and a paid-platform crawler must
  // never see a compound there. Compound-level SEO lives on the per-product
  // pages + page content (which Google/AI index directly).
  keywords: [
    'lab-verified compounds',
    'ISO-certified facility compounds',
    'lot-documented compounds',
    'HPLC tested compounds',
    'sealed sterile compounds',
    'COA',
    'HPLC verified',
    'bacteriostatic water',
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
  // Self-referential canonical on every page: './' resolves against
  // metadataBase + the current route, so /catalog canonicalizes to
  // https://meritsciences.com/catalog etc. Pages with an explicit canonical
  // (PDPs, monographs) override this. Kills the onrender.com duplicate-host
  // signal alongside the middleware 301.
  alternates: { canonical: './' },
  openGraph: {
    type: 'website',
    url: 'https://meritsciences.com',
    siteName: 'Merit Sciences',
    title: 'Merit Sciences · Lab-verified compounds',
    // OG description — GENERIC only (no molecule names): this rides on the
    // /access ad gate's <head>, so a paid-platform crawler can't surface a
    // compound. Per-product OG (on the product pages) carries the specifics.
    description:
      'Lab-verified compounds from an ISO-certified US facility. Sealed sterile vials, lot COA on every batch, third-party tested. Ships 48hr from San Antonio.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Merit Sciences — Same Stack. Better Source. Research compounds, ≥99% HPLC purity, USP <797> compounded, every lot independently assayed, 48-hour dispatch from San Antonio.',
        type: 'image/jpeg',
      },
    ],
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Merit Sciences · Lab-verified compounds',
    // Twitter description — ~140 chars. ISO-certified channel framing.
    description:
      'Lab-verified compounds from a US facility. Sealed sterile vials, lot COA, ≥99% HPLC purity. Ships 48hr from San Antonio.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  },
  /* Search-console ownership. Bing matters here beyond ordinary SEO: ChatGPT
     and Copilot retrieval lean on Bing's index, so a verified Bing property
     (plus the IndexNow pings already wired) is the most direct lever on how
     often answer engines can find this site at all. Set the codes as env vars
     — no deploy-time code change needed to claim either property. */
  verification: {
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : {}),
    ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { other: { 'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } }
      : {}),
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getStoreSettings();
  return (
    <html lang="en" className={`${inter.variable} ${interTight.variable} ${jetbrains.variable} ${archivo.variable}`}>
      <body className="font-sans">
        {/* GTM: loader + noscript. Must be first inside <body>. */}
        <GoogleTagManager />
        {/* Site-wide Organization + WebSite JSON-LD (entity + sitelinks search).
            Suppressed on the split checkout domain: it embeds meritsciences.com
            URLs, which would be a live machine-readable link from the payment
            domain straight back to the store. */}
        <ChromeGate>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_SCHEMA) }} />
        </ChromeGate>
        {/* Meta + TikTok ad pixels. Env-gated — no-op until IDs are set. */}
        <MarketingPixels />
        {/* Email-link code capture: ?code=X on any page → localStorage →
            checkout auto-applies it. Renders nothing. */}
        <DiscountCodeCapture />
        {/* PostHog: autocapture + pageviews across the whole app. No-ops
            until NEXT_PUBLIC_POSTHOG_KEY is set in Render. */}
        <PostHogProvider>
          <div className="bg-steel text-white text-center py-2 text-[10.5px] font-semibold tracking-[0.12em] uppercase">
            For Research Use Only · Not For Human or Veterinary Use · Not FDA-Approved
          </div>
          {/* ChromeGate strips Nav/Footer/cart/popup on clean-room ad
              landing routes (/access) so paid-ad crawlers see no catalog
              links. The RUO banner above and <main> below always render. */}
          {/* On the split checkout domain the storefront chrome is skipped
              SERVER-side — not hidden client-side — so Nav/Footer markup and
              their /catalog links never enter the RSC payload either. */}
          <ChromeGate>
            <Nav />
            <WelcomeOfferBar />
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
