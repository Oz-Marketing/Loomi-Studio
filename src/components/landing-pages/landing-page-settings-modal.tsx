'use client';

/**
 * Modal wrapper around <LandingPageSettings>.
 *
 * The LP detail page no longer uses this — the cog icon there became
 * a Settings tab that mounts <LandingPageSettings> inline. The
 * builder pages (blocks + HTML) still surface settings via a cog
 * button in the editor header, since they don't have room for a tab
 * strip alongside the canvas. This wrapper exists for those cases.
 */
import * as React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import type { LandingPageDetail } from '@/lib/services/landing-pages';
import { LandingPageSettings } from './landing-page-settings';

interface LandingPageSettingsModalProps {
  open: boolean;
  onClose: () => void;
  page: LandingPageDetail | null;
  /** Called whenever a PATCH succeeds so the parent can refresh its
   *  copy of the LP (typically via SWR.mutate or setForm). */
  onUpdated?: (page: LandingPageDetail) => void;
}

export function LandingPageSettingsModal({
  open,
  onClose,
  page,
  onUpdated,
}: LandingPageSettingsModalProps) {
  // Esc to close. Active only while the modal is open.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !page) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="glass-modal w-[640px] max-w-[calc(100vw-3rem)] flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-6 py-5 border-b border-[var(--border)] flex-shrink-0">
          <div>
            <h3 className="text-lg font-semibold">Page settings</h3>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              Edit name, slug, publish status, SEO, and tracking.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </header>

        <div className="px-6 py-5 overflow-y-auto">
          <LandingPageSettings page={page} onUpdated={onUpdated} />
        </div>
      </div>
    </div>
  );
}
