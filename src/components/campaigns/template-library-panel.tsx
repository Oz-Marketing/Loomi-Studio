'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

export interface TemplateLibraryItem {
  id: string;
  design: string;
  name: string;
  category?: string | null;
  type?: string;
  published?: boolean;
  publishedAt?: string | null;
  updatedAt: string;
}

type SortKey = 'updated' | 'name';

function formatUpdated(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface TemplateLibraryPanelProps {
  onSelect: (design: string) => void;
}

/**
 * Embedded template picker used by the Message step (both standalone-email
 * and multi-channel Email tab). Fetches /api/templates, renders cards with
 * iframe thumbnails, includes search + sort. Calls onSelect with the
 * design slug when the user clicks a card.
 */
export function TemplateLibraryPanel({ onSelect }: TemplateLibraryPanelProps) {
  const [templates, setTemplates] = useState<TemplateLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('updated');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch('/api/templates')
      .then((r) => (r.ok ? r.json() : []))
      .then((items: unknown) => {
        if (cancelled) return;
        setTemplates(Array.isArray(items) ? (items as TemplateLibraryItem[]) : []);
      })
      .catch(() => {
        if (!cancelled) setTemplates([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? templates.filter(
          (t) =>
            t.name?.toLowerCase().includes(query) ||
            t.design?.toLowerCase().includes(query) ||
            t.category?.toLowerCase().includes(query),
        )
      : templates;
    return [...filtered].sort((a, b) => {
      if (sort === 'name') return (a.name || a.design).localeCompare(b.name || b.design);
      return (b.updatedAt || '').localeCompare(a.updatedAt || '');
    });
  }, [templates, search, sort]);

  return (
    <div className="glass-section-card rounded-2xl border border-[var(--border)] overflow-hidden">    
      <div className="flex items-center justify-between gap-3 p-4 border-b border-[var(--border)] flex-wrap">
        <div className='flex items-center gap-3'>
            <p className="text-base font-semibold">Templates</p>
            <div className='inline-flex items-center gap-2 h-10 px-4 text-sm font-medium rounded-lg border border-[var(--primary)] bg-[var(--primary)]/90 text-white hover:bg-[var(--primary)] transition-colors mt-3 cursor-pointer'>
              <a href="/templates" target="_blank">Add</a>
            </div>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[260px] max-w-[460px]">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates…"
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20"
          >
            <option value="updated">Recently updated</option>
            <option value="name">Name (A–Z)</option>
          </select>
        </div>
      </div>
      <div className="p-5">
        {loading ? (
          <p className="text-sm text-[var(--muted-foreground)] inline-flex items-center gap-2 py-8">
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
            Loading templates…
          </p>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">
              {search ? 'No templates match that search.' : 'No templates in the library yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTemplates.map((t) => (
              <TemplateCard key={t.id} template={t} onClick={() => onSelect(t.design)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateCard({
  template,
  onClick,
}: {
  template: TemplateLibraryItem;
  onClick: () => void;
}) {
  const [thumbHtml, setThumbHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rawRes = await fetch(
          `/api/templates?design=${encodeURIComponent(template.design)}&format=raw`,
        );
        const rawData = await rawRes.json().catch(() => ({}));
        if (!rawRes.ok || !rawData?.raw) return;
        const previewRes = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html: String(rawData.raw), previewValues: {} }),
        });
        const previewData = await previewRes.json().catch(() => ({}));
        if (!previewRes.ok || !previewData?.html) return;
        if (!cancelled) setThumbHtml(String(previewData.html));
      } catch {
        // Thumbnail is decorative — silent failure is fine.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [template.design]);

  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden hover:border-[var(--primary)]/60 transition-colors group flex flex-col"
    >
      <div className="aspect-[3/4] relative overflow-hidden bg-white border-b border-[var(--border)]">
        {thumbHtml ? (
          <iframe
            title=""
            aria-hidden
            srcDoc={thumbHtml}
            sandbox=""
            className="absolute top-0 left-0 origin-top-left pointer-events-none"
            style={{
              width: '600px',
              height: '800px',
              transform: 'scale(0.45)',
              transformOrigin: 'top left',
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ArrowPathIcon className="w-5 h-5 text-[var(--muted-foreground)] animate-spin opacity-50" />
          </div>
        )}
      </div>
      <div className="p-3 flex-1">
        <p className="text-sm font-medium text-[var(--foreground)] truncate">
          {template.name || template.design}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {template.published && (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300/90">
              <CheckCircleIcon className="w-3 h-3" />
              Published
            </span>
          )}
          {template.updatedAt && (
            <span className="text-[10px] text-[var(--muted-foreground)]">
              Updated {formatUpdated(template.updatedAt)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
