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

export function GoogleTagManager() {
  if (!GTM_ID) return null;
  return (
    <>
      {/* Google Tag Manager (noscript) — must stay first inside <body> */}
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>
      {/* Google Tag Manager */}
      <Script
        id="gtm-loader"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
        }}
      />
    </>
  );
}
