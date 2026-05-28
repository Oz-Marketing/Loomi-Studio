/**
 * Public renderer for an HTML-mode landing page.
 *
 * The user owns the body innerHTML — we inject it via
 * `dangerouslySetInnerHTML` so their CSS, fonts, scripts, and layout
 * stand alone. Form embeds via the `<div data-loomi-form="<id>"></div>`
 * tag are server-rendered into the HTML and then hydrated client-side,
 * so visitors see the real form on first paint with no empty-div flash.
 *
 * Pre-fetched form schemas are passed through PreloadedFormsProvider
 * on both server and client so the EmbeddedFormBlock takes its
 * "rendered inline" code path on both sides — server and client emit
 * identical markup, which is what hydrateRoot needs to attach cleanly.
 */
import { renderToString } from 'react-dom/server';
import EmbeddedFormBlock from './components/EmbeddedForm';
import {
  PreloadedFormsProvider,
  type PreloadedForm,
} from './preloaded-forms-context';
import {
  LpAttributionProvider,
  type LpAttribution,
} from './lp-attribution-context';
import { FormPortalsHydrator } from './FormPortalsHydrator';

export interface PublicHtmlLandingPageProps {
  html: string;
  preloadedForms: Map<string, PreloadedForm>;
  /** LP attribution surfaced to embedded forms so submissions can
   *  be stamped with the source page id + slug. Threaded into each
   *  hydrateRoot in the client hydrator since independent React
   *  roots don't share context with the surrounding tree. */
  attribution: LpAttribution;
}

export function PublicHtmlLandingPage({
  html,
  preloadedForms,
  attribution,
}: PublicHtmlLandingPageProps) {
  // Splice each placeholder's server-rendered form HTML into the
  // user's body markup. Unknown form ids still get rendered (the
  // block falls through to its "form not found" placeholder), so
  // server and client agree on the markup either way.
  const enrichedHtml = injectFormsIntoHtml(html, preloadedForms, attribution);

  // Map isn't structurally cloneable across the server/client
  // boundary — serialize it into a plain object the client can
  // re-Map on the other side.
  const preloadedRecord: Record<string, PreloadedForm> = {};
  for (const [id, val] of preloadedForms) preloadedRecord[id] = val;

  return (
    <>
      <div
        className="loomi-lp-html-root"
        dangerouslySetInnerHTML={{ __html: enrichedHtml }}
      />
      <FormPortalsHydrator
        preloadedForms={preloadedRecord}
        attribution={attribution}
      />
    </>
  );
}

/** Walk the user's HTML for `<div data-loomi-form="..."></div>`
 *  placeholders and replace each placeholder's inner content with a
 *  server-rendered EmbeddedFormBlock. The regex is intentionally
 *  conservative: it matches the placeholder's outer `<div>` and a
 *  non-greedy inner body. Hand-written placeholders containing
 *  nested `<div>`s won't round-trip cleanly — the InsertForm picker
 *  inserts empty placeholders, so the common path is safe. */
function injectFormsIntoHtml(
  html: string,
  preloadedForms: Map<string, PreloadedForm>,
  attribution: LpAttribution,
): string {
  return html.replace(
    /<div\b([^>]*\bdata-loomi-form\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*)>[\s\S]*?<\/div>/gi,
    (_match, attrs: string, q1?: string, q2?: string, q3?: string) => {
      const id = q1 ?? q2 ?? q3 ?? '';
      // Server output must match the client's hydrateRoot tree
      // exactly — same providers in the same order, same props.
      const formHtml = renderToString(
        <LpAttributionProvider value={attribution}>
          <PreloadedFormsProvider value={preloadedForms}>
            <EmbeddedFormBlock formId={id} />
          </PreloadedFormsProvider>
        </LpAttributionProvider>,
      );
      return `<div${attrs}>${formHtml}</div>`;
    },
  );
}
