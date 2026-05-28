'use client';

/**
 * Client-side hydrator for HTML-mode landing pages.
 *
 * The server has already rendered each `[data-loomi-form]`
 * placeholder's EmbeddedFormBlock into the page markup (see
 * PublicHtmlLandingPage.tsx). On the client we walk those placeholders
 * and call `hydrateRoot` on each — attaching React to the existing
 * DOM so the form becomes interactive without a flash or re-mount.
 *
 * Each placeholder gets its own root because the placeholders live
 * inside a `dangerouslySetInnerHTML` parent that React doesn't own —
 * we can't hydrate them as part of the page tree, so each is a
 * standalone root. Independent roots don't share context with the
 * surrounding tree, so we re-wrap with PreloadedFormsProvider at
 * each root (with the same preloaded schema map the server used,
 * shipped to the client as a plain record).
 *
 * A `data-loomi-form-hydrated` marker guards against double-hydration
 * if the effect re-runs (React strict mode, prop change, etc.).
 */
import * as React from 'react';
import { hydrateRoot } from 'react-dom/client';
import EmbeddedFormBlock from './components/EmbeddedForm';
import {
  PreloadedFormsProvider,
  type PreloadedForm,
} from './preloaded-forms-context';
import {
  LpAttributionProvider,
  type LpAttribution,
} from './lp-attribution-context';

const HYDRATED_ATTR = 'data-loomi-form-hydrated';

export interface FormPortalsHydratorProps {
  preloadedForms: Record<string, PreloadedForm>;
  /** LP attribution surfaced to each form root so submissions can
   *  stamp the source LP. Independent roots don't inherit context
   *  from the surrounding tree, so we wrap each hydrateRoot here. */
  attribution: LpAttribution;
}

export function FormPortalsHydrator({
  preloadedForms,
  attribution,
}: FormPortalsHydratorProps) {
  React.useEffect(() => {
    const map = new Map(Object.entries(preloadedForms));
    const placeholders = document.querySelectorAll<HTMLElement>(
      `[data-loomi-form]:not([${HYDRATED_ATTR}])`,
    );
    placeholders.forEach((el) => {
      const formId = el.getAttribute('data-loomi-form');
      if (!formId) return;
      el.setAttribute(HYDRATED_ATTR, '');
      hydrateRoot(
        el,
        <LpAttributionProvider value={attribution}>
          <PreloadedFormsProvider value={map}>
            <EmbeddedFormBlock formId={formId} />
          </PreloadedFormsProvider>
        </LpAttributionProvider>,
      );
    });
  }, [preloadedForms, attribution]);

  return null;
}
