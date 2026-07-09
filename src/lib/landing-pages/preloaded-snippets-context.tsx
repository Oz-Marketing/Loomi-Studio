'use client';

/**
 * Client-only context for preloaded reusable snippets.
 *
 * Same pattern as PreloadedFormsProvider: the public /lp/[slug] route
 * is a Server Component, but createContext only exists in the client
 * bundle. Wrapping the context in a 'use client' module isolates the
 * createContext call to the client side; Server Component output gets
 * stitched to the client provider at hydration time.
 *
 * The renderer walks each `snippet` block, looks the id up here, and
 * renders the snippet's stored blocks inline. Missing snippets render
 * a fallback placeholder so authoring mistakes don't crash the page.
 */
import * as React from 'react';
import type { Block } from './types';

export interface PreloadedSnippet {
  id: string;
  name: string;
  blocks: Block[];
}

const PreloadedSnippetsContext = React.createContext<
  Map<string, PreloadedSnippet> | null
>(null);

export function usePreloadedSnippet(
  snippetId: string | undefined,
): PreloadedSnippet | null {
  const map = React.useContext(PreloadedSnippetsContext);
  if (!map || !snippetId) return null;
  return map.get(snippetId) ?? null;
}

export function PreloadedSnippetsProvider({
  value,
  children,
}: {
  value: Map<string, PreloadedSnippet>;
  children: React.ReactNode;
}) {
  return (
    <PreloadedSnippetsContext.Provider value={value}>
      {children}
    </PreloadedSnippetsContext.Provider>
  );
}
