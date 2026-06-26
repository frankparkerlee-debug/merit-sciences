'use client';

import Script from 'next/script';

/**
 * Meta + TikTok advertising pixels for the paid funnel.
 *
 * Fully env-gated: each pixel only injects when its ID is set in Render, so
 * this is a complete no-op on the live site until the operator pastes IDs
 * from each Ads Manager. Fires PageView on load; the top-of-funnel `Lead`
 * event is fired from the /access Enter click via lib/analytics → trackLead().
 *
 *   NEXT_PUBLIC_META_PIXEL_ID     — Meta Pixel ID (Events Manager)
 *   NEXT_PUBLIC_TIKTOK_PIXEL_ID   — TikTok Pixel ID (Events Manager)
 */
// Meta pixel defaults to "Merit Sciences's pixel" (the live dataset, ~7.4K
// events) — a pixel ID is a public client-side value, so it's safe in code.
// Override via NEXT_PUBLIC_META_PIXEL_ID in Render if it ever changes.
const META = process.env.NEXT_PUBLIC_META_PIXEL_ID || '1012608588376068';
const TIKTOK = process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID;

export function MarketingPixels() {
  return (
    <>
      {META && (
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META}');fbq('track','PageView');`,
          }}
        />
      )}
      {TIKTOK && (
        <Script
          id="tiktok-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=d.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=d.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};ttq.load('${TIKTOK}');ttq.page();}(window,document,'ttq');`,
          }}
        />
      )}
    </>
  );
}
