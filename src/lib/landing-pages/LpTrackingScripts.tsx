/**
 * Vendor-pixel + custom-script injection for the public LP route.
 *
 * Rendered as a sibling of the page body — Next.js's runtime hoists
 * `next/script` tags into the document `<head>` for the
 * `afterInteractive` strategy regardless of where they appear in
 * the JSX tree, so we don't need a custom head.tsx layout.
 *
 * Pixel snippets are the vendor-canonical install code with the
 * user's ID substituted in. Custom HTML strings are injected
 * verbatim via dangerouslySetInnerHTML — by design, we don't
 * sanitize (admins are trusted to put their own code on their own
 * LP). The settings modal length-caps each at 10KB.
 *
 * Server Component — works in both blocks-mode and html-mode page
 * renders since both end up as Server Component output before
 * client hydration.
 */
import Script from 'next/script';

export interface LpTrackingScriptsProps {
  metaPixelId: string | null;
  ga4MeasurementId: string | null;
  gtmContainerId: string | null;
  customHeadHtml: string | null;
  customBodyEndHtml: string | null;
}

export function LpTrackingScripts({
  metaPixelId,
  ga4MeasurementId,
  gtmContainerId,
  customHeadHtml,
  customBodyEndHtml,
}: LpTrackingScriptsProps) {
  return (
    <>
      {gtmContainerId && <GoogleTagManager containerId={gtmContainerId} />}
      {ga4MeasurementId && <GoogleAnalytics4 measurementId={ga4MeasurementId} />}
      {metaPixelId && <MetaPixel pixelId={metaPixelId} />}

      {/* Custom <head> HTML — Next hoists this into <head> when we
          render it as a Script tag, but for arbitrary HTML (not just
          scripts) we use a fragment. Browser parses the string at
          render time and tags placed here behave the same as if the
          user had hand-edited <head>. */}
      {customHeadHtml && (
        <div
          // suppressHydrationWarning — the user's HTML may contain
          // tags React doesn't know how to reconcile; we just want
          // the browser to parse them once.
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: customHeadHtml }}
          style={{ display: 'none' }}
        />
      )}

      {/* Custom pre-</body> HTML — same treatment but visible
          (chat widgets etc. mount themselves into the DOM and
          want a hook point). */}
      {customBodyEndHtml && (
        <div
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: customBodyEndHtml }}
        />
      )}
    </>
  );
}

// ── Meta Pixel ─────────────────────────────────────────────────────

function MetaPixel({ pixelId }: { pixelId: string }) {
  // Standard Meta Pixel install snippet, verbatim from
  // https://developers.facebook.com/docs/meta-pixel/get-started.
  // Fires `init` + `PageView` on load. Single-quotes in template
  // literals are escaped where the snippet uses them.
  const snippet = `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${escapeJs(pixelId)}');
fbq('track', 'PageView');`;
  return (
    <>
      <Script id="loomi-meta-pixel" strategy="afterInteractive">
        {snippet}
      </Script>
      {/* Noscript image fallback so visitors with JS disabled still
          show up in Meta reports. Optional but vendor-recommended. */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src={`https://www.facebook.com/tr?id=${encodeURIComponent(pixelId)}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}

// ── Google Analytics 4 ────────────────────────────────────────────

function GoogleAnalytics4({ measurementId }: { measurementId: string }) {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
        strategy="afterInteractive"
      />
      <Script id="loomi-ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${escapeJs(measurementId)}');`}
      </Script>
    </>
  );
}

// ── Google Tag Manager ────────────────────────────────────────────

function GoogleTagManager({ containerId }: { containerId: string }) {
  // GTM is canonically split into head <script> + body <noscript>
  // iframe. The body part is small; we inline it next to the script
  // for simplicity. Modern browsers don't require the noscript
  // iframe for tracking, but vendor docs include it.
  return (
    <>
      <Script id="loomi-gtm" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${escapeJs(containerId)}');`}
      </Script>
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(containerId)}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
          title="Google Tag Manager"
        />
      </noscript>
    </>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

/** Escape characters that would otherwise break out of the JS string
 *  literal we inject the ID into. Pixel IDs are server-validated to
 *  a strict format already, but defense-in-depth here is cheap. */
function escapeJs(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/</g, '\\u003c');
}
