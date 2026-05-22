'use client';

import { useEffect, useState } from 'react';
import {
  ArrowPathIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import PrimaryButton from '@/components/primary-button';

interface TemplatePreviewModalProps {
  design: string;
  onClose: () => void;
  onUse: () => void;
  applying: boolean;
}

/**
 * Preview modal opened from the TemplateLibraryPanel. Compiles the
 * template via /api/preview and renders the resulting HTML in a
 * sandboxed iframe with a desktop/mobile toggle. "Use template"
 * delegates to the parent, which owns the per-page apply logic
 * (PATCH the draft, navigate to the editor, etc.).
 */
export function TemplatePreviewModal({
  design,
  onClose,
  onUse,
  applying,
}: TemplatePreviewModalProps) {
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(design);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const rawRes = await fetch(
          `/api/templates?design=${encodeURIComponent(design)}&format=raw`,
        );
        const rawData = await rawRes.json().catch(() => ({}));
        if (!rawRes.ok || !rawData?.raw) {
          throw new Error(rawData?.error || 'Failed to load template');
        }
        const raw = String(rawData.raw);
        const titleMatch = raw.match(/^---\s*\n([\s\S]*?)\n---/);
        if (titleMatch) {
          const line = titleMatch[1].match(/^title:\s*(.+)$/m);
          if (line) setName(line[1].trim().replace(/^["']|["']$/g, ''));
        }
        const previewRes = await fetch('/api/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html: raw, previewValues: {} }),
        });
        const previewData = await previewRes.json().catch(() => ({}));
        if (!previewRes.ok || !previewData?.html) {
          throw new Error(previewData?.error || 'Failed to compile preview');
        }
        if (!cancelled) setHtml(String(previewData.html));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load preview');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [design]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 animate-overlay-in p-6"
      onClick={onClose}
    >
      <div
        className="glass-modal w-[1100px] max-w-full h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] flex-shrink-0">
          <h3 className="text-base font-semibold truncate pr-4">{name}</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={applying}
            className="p-1 rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-50"
            aria-label="Close"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-center px-6 py-2.5 border-b border-[var(--border)] flex-shrink-0">
          <div className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] p-0.5">
            <button
              type="button"
              onClick={() => setPreviewMode('desktop')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
                previewMode === 'desktop'
                  ? 'bg-[var(--primary)]/15 text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
              aria-pressed={previewMode === 'desktop'}
            >
              <ComputerDesktopIcon className="w-4 h-4" />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('mobile')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-colors ${
                previewMode === 'mobile'
                  ? 'bg-[var(--primary)]/15 text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
              aria-pressed={previewMode === 'mobile'}
            >
              <DevicePhoneMobileIcon className="w-4 h-4" />
              Mobile
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto bg-[var(--muted)]/30 p-4 flex justify-center">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-[var(--muted-foreground)] inline-flex items-center gap-2">
                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                Loading preview…
              </p>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          ) : (
            <iframe
              title="Template preview"
              srcDoc={html}
              sandbox=""
              className={`bg-white rounded-lg border border-[var(--border)] h-full ${
                previewMode === 'mobile' ? 'w-[390px]' : 'w-full'
              }`}
            />
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[var(--border)] flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={applying}
            className="px-4 h-10 text-sm rounded-lg border border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted-foreground)] disabled:opacity-50"
          >
            Cancel
          </button>
          <PrimaryButton onClick={onUse} disabled={applying || loading || Boolean(error)}>
            {applying ? 'Applying…' : 'Use template'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
