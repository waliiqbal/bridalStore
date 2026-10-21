import Script from "next/script";

// Loads Meta Pixel and Google Analytics once for the whole site, using the IDs the owner typed in
// Settings (the backend only accepts the right shapes, and they are written out as JSON here, so
// nothing else can end up inside these scripts). Nothing is loaded when the boxes are empty.
//
// Two steps, so tracking is both complete and light:
//  1. A tiny inline "queue" runs first. Events fired while the page is still loading (like
//     viewing a product) wait in the queue instead of being lost.
//  2. The big Meta and Google files load later, when the browser is idle, and then read the queue.
// (beforeInteractive is allowed in the root layout, where this is used; the lint rule only knows the old Pages Router.)
/* eslint-disable @next/next/no-before-interactive-script-outside-document */
export function TrackingScripts({
  metaPixelId,
  googleAnalyticsId,
}: {
  metaPixelId: string | null;
  googleAnalyticsId: string | null;
}) {
  return (
    <>
      {metaPixelId && (
        <>
          <Script id="meta-pixel-queue" strategy="beforeInteractive">
            {`!function(f){if(f.fbq)return;var n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[]}(window);fbq('init',${JSON.stringify(metaPixelId)});fbq('track','PageView');`}
          </Script>
          <Script src="https://connect.facebook.net/en_US/fbevents.js" strategy="lazyOnload" />
        </>
      )}
      {googleAnalyticsId && (
        <>
          <Script id="google-analytics-queue" strategy="beforeInteractive">
            {`window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag('js',new Date());gtag('config',${JSON.stringify(googleAnalyticsId)});`}
          </Script>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleAnalyticsId)}`}
            strategy="lazyOnload"
          />
        </>
      )}
    </>
  );
}
