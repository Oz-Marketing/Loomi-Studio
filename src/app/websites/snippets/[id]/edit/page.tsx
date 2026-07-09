'use client';

import { use, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/outline';
import { AdminOnly } from '@/components/route-guard';
import { useLoomiDialog } from '@/contexts/loomi-dialog-context';
import { useSubaccountHref } from '@/hooks/use-subaccount-href';
import { LandingPageEditorShell } from '@/lib/landing-pages/editor/LandingPageEditorShell';
import {
  DEFAULT_LP_SETTINGS,
  type Block,
  type LandingPageTemplate,
} from '@/lib/landing-pages/types';
import type { AccountSnippetSummary } from '@/lib/services/account-snippets';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
};

const KIND_OPTIONS = [
  { value: 'header', label: 'Header' },
  { value: 'footer', label: 'Footer' },
  { value: 'disclaimer', label: 'Disclaimer' },
  { value: 'generic', label: 'Generic' },
];

const AUTOSAVE_MS = 1000;

/**
 * Snippet editor — re-uses LandingPageEditorShell by wrapping the
 * snippet's `{ version, blocks }` content into a fake LandingPageTemplate
 * with default LP settings. On edit, we extract the blocks back into
 * the snippet shape and PATCH.
 *
 * Known V1 wart: the editor sidebar's Settings tab exposes LP page
 * settings (bg color, max width, brand color) that don't actually
 * apply to snippets at render time — the snippet inherits whatever
 * settings come from its host LP. These don't get persisted (we only
 * save the blocks), so editing them is harmless but cosmetic only.
 */
export default function SnippetEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const subHref = useSubaccountHref();
  const { confirm } = useLoomiDialog();
  const { data, error, mutate, isLoading } = useSWR<{ snippet: AccountSnippetSummary }>(
    `/api/account-snippets/${id}`,
    fetcher,
  );

  const snippet = data?.snippet;

  // Local draft state — seeded once from the SWR payload, then user
  // edits drive it and autosave catches up.
  const [template, setTemplate] = useState<LandingPageTemplate | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'header' | 'footer' | 'disclaimer' | 'generic'>('generic');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  );

  useEffect(() => {
    if (!snippet || template) return;
    setTemplate({
      version: '1',
      // Fake LP-level settings so the editor's renderer + sidebar work
      // unchanged. Not persisted back into the snippet schema.
      settings: { ...DEFAULT_LP_SETTINGS },
      blocks: snippet.schema.blocks,
    });
    setName(snippet.name);
    setKind((snippet.kind as typeof kind) ?? 'generic');
  }, [snippet, template, kind]);

  // Track the latest template for keepalive flush on unmount.
  const latestRef = useRef<LandingPageTemplate | null>(null);
  const savedRef = useRef<Block[] | null>(null);
  useEffect(() => {
    if (template) latestRef.current = template;
  }, [template]);

  const patchSchema = useCallback(
    async (blocks: Block[]) => {
      setSaveStatus('saving');
      const res = await fetch(`/api/account-snippets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema: { version: '1', blocks } }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveStatus('error');
        toast.error(payload.error || 'Autosave failed');
        return;
      }
      savedRef.current = blocks;
      setSaveStatus('saved');
      if (payload.snippet) {
        void mutate({ snippet: payload.snippet }, { revalidate: false });
      }
    },
    [id, mutate],
  );

  // Debounced autosave on schema edits.
  const initialRender = useRef(true);
  useEffect(() => {
    if (!template) return;
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    const handle = window.setTimeout(() => {
      void patchSchema(template.blocks);
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(handle);
  }, [template, patchSchema]);

  // Keepalive flush on tab close.
  useEffect(() => {
    const flush = () => {
      const pending = latestRef.current;
      if (!pending) return;
      if (savedRef.current && savedRef.current === pending.blocks) return;
      try {
        fetch(`/api/account-snippets/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schema: { version: '1', blocks: pending.blocks } }),
          keepalive: true,
        }).catch(() => {});
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [id]);

  // Name + kind save on blur — separate from the debounced schema
  // autosave so a typo in the name doesn't trigger a network call on
  // every keystroke.
  async function saveMeta(patch: { name?: string; kind?: string }) {
    const res = await fetch(`/api/account-snippets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(payload.error || 'Could not save');
      return;
    }
    if (payload.snippet) {
      void mutate({ snippet: payload.snippet }, { revalidate: false });
    }
  }

  async function destroy() {
    const ok = await confirm({
      title: `Delete "${snippet?.name || 'Untitled'}"?`,
      message:
        'This removes the reusable block permanently. Any landing pages still referencing it will show a "missing" placeholder.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/account-snippets/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      toast.error(payload.error || 'Could not delete');
      return;
    }
    toast.success('Reusable block deleted.');
    router.push(subHref('/websites/snippets'));
  }

  return (
    <AdminOnly>
      <div className="flex flex-col h-screen">
        {/* Top bar — back link, name + kind editor, save status, delete */}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-[var(--border)] bg-[var(--card)]">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={subHref('/websites/snippets')}
              className="inline-flex items-center justify-center w-8 h-8 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              title="Back to reusable blocks"
              aria-label="Back to reusable blocks"
            >
              <ArrowLeftIcon className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2 min-w-0">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  if (name.trim() && name !== snippet?.name) void saveMeta({ name: name.trim() });
                }}
                placeholder="Reusable block name"
                className="px-2 py-1 text-sm font-semibold bg-transparent border border-transparent hover:border-[var(--border)] focus:border-[var(--primary)] rounded outline-none min-w-0 w-64"
              />
              <select
                value={kind}
                onChange={(e) => {
                  const next = e.target.value as typeof kind;
                  setKind(next);
                  if (next !== snippet?.kind) void saveMeta({ kind: next });
                }}
                className="px-2 py-1 text-xs rounded border border-[var(--border)] bg-[var(--card)] focus:border-[var(--primary)] outline-none"
              >
                {KIND_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--muted-foreground)]">
              {saveStatus === 'saving'
                ? 'Saving…'
                : saveStatus === 'saved'
                ? 'Saved'
                : saveStatus === 'error'
                ? 'Save failed'
                : ''}
            </span>
            <button
              type="button"
              onClick={destroy}
              title="Delete reusable block"
              className="inline-flex items-center justify-center w-8 h-8 rounded-md text-rose-300 hover:bg-rose-500/10 transition-colors"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          {error ? (
            <div className="p-6 text-sm text-rose-300">
              Reusable block could not be loaded.
            </div>
          ) : isLoading || !template ? (
            <div className="p-6 text-sm text-[var(--muted-foreground)]">Loading…</div>
          ) : (
            <LandingPageEditorShell
              template={template}
              onChange={(next) => {
                // We accept the full LandingPageTemplate from the
                // shell but only keep blocks — settings/title aren't
                // persisted on snippets. The fake settings object
                // sticks around in local state for the editor's
                // benefit only.
                if ('blocks' in next) {
                  setTemplate((curr) =>
                    curr ? { ...curr, blocks: next.blocks } : null,
                  );
                }
              }}
              accountKey={snippet?.accountKey ?? null}
            />
          )}
        </div>
      </div>
    </AdminOnly>
  );
}
