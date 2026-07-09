'use client';

/**
 * Snippet block — renders a reusable AccountSnippet inline.
 *
 * Two render paths:
 *
 *   1. Public LP route (/lp/[slug]): the server preloads every
 *      referenced snippet, wraps the tree in PreloadedSnippetsProvider,
 *      and we read from context. No fetch, full SSR.
 *
 *   2. Editor canvas / preview thumbnails: no context provided. We
 *      fall back to SWR fetching `/api/account-snippets/[id]` so
 *      authors see the actual snippet content while building. The
 *      fetch is cached per-id across the editor session.
 *
 * Failure modes:
 *   - Empty `snippetId` → "Pick a reusable block" placeholder so
 *     authors know to configure it from the property panel.
 *   - Resolved but blocks empty → render nothing (intentional blank).
 *   - Resolved but not found / 404 → "Reusable block not found" so a
 *     stale ref to a deleted snippet doesn't silently disappear.
 */
import useSWR from 'swr';
import { RenderedBlock } from '../render';
import { usePreloadedSnippet } from '../preloaded-snippets-context';
import type { Block } from '../types';
import type { AccountSnippetSummary } from '@/lib/services/account-snippets';

interface SnippetBlockProps {
  snippetId?: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Failed: ${res.status}`);
  }
  return res.json();
};

export function SnippetBlock({ snippetId }: SnippetBlockProps) {
  if (!snippetId) {
    return <PickPlaceholder />;
  }
  return <SnippetBlockResolver snippetId={snippetId} />;
}

function SnippetBlockResolver({ snippetId }: { snippetId: string }) {
  // Prefer context if the host provided one (public route); otherwise
  // SWR-fetch (editor canvas). Both yield a `{ blocks }` shape.
  const preloaded = usePreloadedSnippet(snippetId);
  const shouldFetch = preloaded === null;
  const { data, error, isLoading } = useSWR<{ snippet: AccountSnippetSummary } | null>(
    shouldFetch ? `/api/account-snippets/${snippetId}` : null,
    fetcher,
  );

  if (preloaded) {
    return <BlocksList blocks={preloaded.blocks} />;
  }
  if (isLoading) return null;
  if (error || !data?.snippet) {
    return <MissingPlaceholder />;
  }
  return <BlocksList blocks={data.snippet.schema.blocks} />;
}

function BlocksList({ blocks }: { blocks: Block[] }) {
  if (blocks.length === 0) return null;
  return (
    <>
      {blocks.map((block) => (
        <RenderedBlock key={block.id} block={block} />
      ))}
    </>
  );
}

function PickPlaceholder() {
  return (
    <div
      style={{
        padding: '20px',
        textAlign: 'center',
        border: '1px dashed rgba(0,0,0,0.2)',
        borderRadius: '8px',
        color: 'rgba(0,0,0,0.45)',
        fontSize: '13px',
      }}
    >
      Pick a reusable block from the property panel →
    </div>
  );
}

function MissingPlaceholder() {
  return (
    <div
      style={{
        padding: '12px 16px',
        border: '1px dashed rgba(220, 38, 38, 0.4)',
        borderRadius: '8px',
        color: 'rgba(220, 38, 38, 0.9)',
        fontSize: '12px',
        background: 'rgba(220, 38, 38, 0.05)',
      }}
    >
      Reusable block not found (it may have been deleted).
    </div>
  );
}
