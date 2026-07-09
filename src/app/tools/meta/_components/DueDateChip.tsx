'use client';

import { ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { PacerAd } from '../_lib/types';

/**
 * Classify the urgency of an ad's overall due date.
 * Returns null when there's nothing actionable to surface (no due date, or the
 * ad is already live/completed/off so the due date is moot). This is a
 * UI-specific variant (carries a display `label` and skips done statuses) —
 * intentionally distinct from `_lib/helpers.classifyDueDate`, which the data
 * layer uses for raw urgency without labels.
 */
export type DueDateUrgency = {
  label: string;
  level: 'overdue' | 'today' | 'soon' | 'upcoming';
};
export const DUE_DATE_DONE_STATUSES = new Set(['Live', 'Completed Run', 'Off']);
export function classifyDueDate(ad: PacerAd): DueDateUrgency | null {
  if (!ad.dueDate) return null;
  if (DUE_DATE_DONE_STATUSES.has(ad.adStatus)) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(ad.dueDate + 'T00:00:00');
  const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: `Overdue ${Math.abs(diff)}d`, level: 'overdue' };
  if (diff === 0) return { label: 'Due today', level: 'today' };
  if (diff <= 2) return { label: `Due in ${diff}d`, level: 'soon' };
  if (diff <= 7) return { label: `Due in ${diff}d`, level: 'upcoming' };
  return null;
}
export const DUE_DATE_CHIP_STYLES: Record<DueDateUrgency['level'], { bg: string; color: string }> = {
  overdue: { bg: 'rgba(239,68,68,0.18)', color: '#fca5a5' },
  today: { bg: 'rgba(252,211,77,0.22)', color: '#fcd34d' },
  soon: { bg: 'rgba(252,211,77,0.18)', color: '#fcd34d' },
  upcoming: { bg: 'rgba(190,242,100,0.18)', color: '#bef264' },
};
export function DueDateChip({ ad }: { ad: PacerAd }) {
  const urgency = classifyDueDate(ad);
  if (!urgency) return null;
  const { bg, color } = DUE_DATE_CHIP_STYLES[urgency.level];
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded whitespace-nowrap"
      style={{ background: bg, color }}
    >
      {urgency.level === 'overdue' || urgency.level === 'today' ? (
        <ExclamationTriangleIcon className="w-3 h-3" />
      ) : (
        <ClockIcon className="w-3 h-3" />
      )}
      {urgency.label}
    </span>
  );
}
