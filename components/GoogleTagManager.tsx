import Script from 'next/script';

/**
 * Google Tag Manager container.
 *
 * Renders BOTH halves of Google's snippet:
 *   · the loader, via next/script `afterInteractive` — the App Router
 *     equivalent of "paste this high in <head>". Next injects it correctly
 *     and, unlike a raw <script> in a layout, it survives client-side
 *     navigation without re-executing.
 *   · the <noscript> iframe fallback, which must be the first thing inside
 *     <body> — so mount this component as the first child of <body>.
 *
 * `dataLayer` is initialised by the snippet itself and is shared with the
 * existing Google Ads gtag in components/MarketingPixels.tsx (gtag pushes to
 * the same array), so the two coexist without clobbering each other.
 *
 * ID is env-overridable, matching the MarketingPixels pattern; a container ID
 * is a public client-side value, so the live default is safe in source.
 *   NEXT_PUBLIC_GTM_ID — GTM container (Tag Manager → Workspace → container ID)
 */
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || 'GTM-M7QPPSSR';

/**
 * Ad vendor's second container, which forwards events server-side through
 * Stape. It loads from our own subdomain (bhs.meritsciences.com, a CNAME to
 * Stape) so its cookies are first-party. It listens for the `*_stape`
 * ecommerce events pushed by lib/stape.ts. Empty NEXT_PUBLIC_SGTM_ID turns it off.
 */
const SGTM_ID = process.env.NEXT_PUBLIC_SGTM_ID ?? 'GTM-5FV4G2MT';
const SGTM_ORIGIN = process.env.NEXT_PUBLIC_SGTM_ORIGIN || 'https://bhs.meritsciences.com';

export function GoogleTagManager() {
  if (!GTM_ID && !SGTM_ID) return null;
  return (
    <>
      {SGTM_ID && (
        <noscript>
          <iframe
            src={`${SGTM_ORIGIN}/ns.html?id=${SGTM_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
      )}
      {SGTM_ID && (
        <Script
          id="sgtm-loader"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'${SGTM_ORIGIN}/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${SGTM_ID}');`,
          }}
        />
      )}
      {/* Google Tag Manager (noscript) — must stay first inside <body> */}
      {GTM_ID && (
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
      )}
      {/* Google Tag Manager */}
      {/* lazyOnload (2026-10-02): the container pulls ~1.9 MB of tag code
          and was the single largest main-thread cost on first load. GTM
          replays every dataLayer push queued before it arrives, so add-to-
          cart and conversion events fired earlier are not lost. */}
      {GTM_ID && (
        <Script
          id="gtm-loader"
          strategy="lazyOnload"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
          }}
        />
      )}
    </>
  );
}
