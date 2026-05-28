'use client';

/**
 * Client-only context that announces "this React subtree is being
 * rendered inside Loomi landing page <id>".
 *
 * Consumers (`useLpAttribution()` in EmbeddedFormBlock, FormPublic
 * when wrapped) read it at submit time to stamp the source LP onto
 * the FormSubmission row.
 *
 * Wrapping at the LP route level is straightforward for blocks-mode
 * (the LandingPageRenderer lives inside the provider). For html-mode
 * each `[data-loomi-form]` placeholder is its own `hydrateRoot`, so
 * the FormPortalsHydrator re-wraps each root with the same provider —
 * React contexts don't cross independent roots.
 */
import * as React from 'react';

export interface LpAttribution {
  pageId: string;
  pageSlug: string;
}

const Ctx = React.createContext<LpAttribution | null>(null);

export function LpAttributionProvider({
  value,
  children,
}: {
  value: LpAttribution;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLpAttribution(): LpAttribution | null {
  return React.useContext(Ctx);
}
