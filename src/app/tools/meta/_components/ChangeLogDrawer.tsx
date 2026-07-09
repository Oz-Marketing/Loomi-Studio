'use client';

import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { ClockIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { COLORS } from '../_lib/constants';
import { fmtPeriodLong } from '../_lib/period';
import { fmtSyncedAgo } from './primitives';

export interface AuditEntryView {
  id: string;
  adId: string | null;
  adName: string | null;
  action: string;
  field: string | null;
  fromValue: string | null;
  toValue: string | null;
  summary: string;
  groupId: string | null;
  authorName: string;
  createdAt: string;
}

export const AUDIT_ACTION_COLORS: Record<string, string> = {
  edit: 'var(--muted-foreground)',
  created: COLORS.success,
  deleted: COLORS.error,
  carryover: COLORS.lifetime,
  freeze: COLORS.warn,
  reopen: COLORS.warn,
  sync: COLORS.daily,
};

export function ChangeLogDrawer({
  accountKey,
  accountLabel,
  period,
  onClose,
}: {
  accountKey: string;
  accountLabel: string;
  period: string;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<AuditEntryView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/meta-ads-pacer/${accountKey}/audit?period=${period}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ entries: AuditEntryView[] }>;
      })
      .then((data) => {
        if (!cancelled) setEntries(Array.isArray(data?.entries) ? data.entries : []);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load');
      });
    return () => {
      cancelled = true;
    };
  }, [accountKey, period]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-modal relative h-full w-full max-w-md flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-bold text-[var(--foreground)] flex items-center gap-2">
              <ClockIcon className="w-4 h-4" />
              Change log
            </div>
            <div className="text-[11px] text-[var(--muted-foreground)] truncate">
              {accountLabel} · {fmtPeriodLong(period)} · automatic history
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            aria-label="Close"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto themed-scrollbar p-4">
          {error ? (
            <div className="text-xs text-[#ef4444] text-center py-8">{error}</div>
          ) : entries == null ? (
            <div className="text-xs text-[var(--muted-foreground)] text-center py-8">
              Loading…
            </div>
          ) : entries.length === 0 ? (
            <div className="text-xs text-[var(--muted-foreground)] text-center py-8">
              No changes recorded yet this month.
            </div>
          ) : (
            <div className="space-y-1.5">
              {entries.map((e) => (
                <div
                  key={e.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2"
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span
                      className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{
                        background: `${AUDIT_ACTION_COLORS[e.action] ?? 'var(--muted-foreground)'}22`,
                        color: AUDIT_ACTION_COLORS[e.action] ?? 'var(--muted-foreground)',
                      }}
                    >
                      {e.action}
                    </span>
                    <span className="text-[10px] text-[var(--muted-foreground)] whitespace-nowrap">
                      {fmtSyncedAgo(e.createdAt)}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--foreground)] leading-snug">
                    {e.summary}
                  </div>
                  <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                    {e.authorName}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
