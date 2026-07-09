'use client';

import { DocumentDuplicateIcon, TrashIcon } from '@heroicons/react/24/outline';
import { fmt, fmtDate, num, sourceColor, sourceLabel, sourceTint } from '../_lib/helpers';
import { COLORS, AD_COLORS } from '../_lib/constants';
import type { PacerAd } from '../_lib/types';
import type { DragReorderApi, DropEdge } from '../_hooks/useDragReorder';
import { usePacerReadOnly } from './pacer-context';
import { AdStatusPill, ApprovalPill, DesignPill } from './primitives';
import { DueDateChip } from './DueDateChip';
import { UpdatesIndicator } from './FilterSidebar';

export function AdSummaryRow({
  ad,
  index,
  onClick,
  onRemove,
  onClone,
  dragProps,
  isDragging,
  isDropTarget,
  dropEdge,
  isSelected,
  onSelectToggle,
}: {
  ad: PacerAd;
  index: number;
  onClick: () => void;
  onRemove: (id: string) => void;
  onClone: (id: string) => void;
  dragProps?: ReturnType<DragReorderApi['rowProps']>;
  isDragging?: boolean;
  isDropTarget?: boolean;
  dropEdge?: DropEdge | null;
  isSelected: boolean;
  onSelectToggle: () => void;
}) {
  const readOnly = usePacerReadOnly();
  const allocation = num(ad.allocation);
  const isLifetime = ad.budgetType === 'Lifetime';
  const updatesCount = ad.activityLog.length;
  const showTopLine = isDropTarget && dropEdge === 'top';
  const showBottomLine = isDropTarget && dropEdge === 'bottom';

  // Drop indicator for table rows: a 2px primary-colored box-shadow on the
  // top or bottom edge. Using box-shadow (instead of border) avoids shifting
  // the row's height during drag.
  const dropShadow = showTopLine
    ? 'inset 0 2px 0 0 var(--primary)'
    : showBottomLine
      ? 'inset 0 -2px 0 0 var(--primary)'
      : undefined;

  return (
    <tr
      onClick={onClick}
      {...(dragProps && !readOnly ? dragProps : {})}
      style={{ boxShadow: dropShadow }}
      className={`group border-b border-[var(--border)] last:border-b-0 transition-colors hover:bg-[var(--muted)]/50 ${
        readOnly ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
      } ${isSelected ? 'bg-[var(--primary)]/8' : ''} ${
        isDragging ? 'bg-[var(--primary)]/10' : ''
      }`}
    >
      {/* Bulk-selection checkbox (clicking it stops the row's click-to-edit) */}
      <td
        className="w-9 pl-3 pr-1 py-2 align-middle"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          aria-label={`Select ${ad.name || 'Untitled Ad'}`}
          checked={isSelected}
          onChange={onSelectToggle}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-[var(--border)] bg-[var(--input)] text-[var(--primary)] cursor-pointer accent-[var(--primary)]"
        />
      </td>

      {/* Color + name */}
      <td className="px-3 py-2 align-middle min-w-[200px]">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-2 h-2 rounded-sm flex-shrink-0"
            style={{ background: AD_COLORS[index % AD_COLORS.length] }}
          />
          <span className="text-sm font-semibold text-[var(--foreground)] truncate">
            {ad.name || 'Untitled Ad'}
          </span>
        </div>
      </td>

      {/* Updates indicator (own column so icons align across rows; no header) */}
      <td className="w-10 px-2 py-2 align-middle">
        <UpdatesIndicator
          count={updatesCount}
          hasAttachments={ad.activityLog.some((e) => e.attachmentKey)}
        />
      </td>

      {/* Status */}
      <td className="px-3 py-2 align-middle whitespace-nowrap">
        <AdStatusPill status={ad.adStatus} />
      </td>

      {/* Due date chip */}
      <td className="px-3 py-2 align-middle whitespace-nowrap">
        <DueDateChip ad={ad} />
      </td>

      {/* Budget tags */}
      <td className="px-3 py-2 align-middle whitespace-nowrap">
        <div className="flex items-center gap-1">
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{
              background: isLifetime
                ? 'rgba(167,139,250,0.18)'
                : 'rgba(56,189,248,0.18)',
              color: isLifetime ? COLORS.lifetime : COLORS.daily,
            }}
          >
            {ad.budgetType}
          </span>
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{
              background: sourceTint(ad.budgetSource),
              color: sourceColor(ad.budgetSource),
            }}
          >
            {sourceLabel(ad.budgetSource)}
          </span>
        </div>
      </td>

      {/* Allocation */}
      <td
        className="px-3 py-2 align-middle text-xs font-semibold whitespace-nowrap"
        style={{
          color: sourceColor(ad.budgetSource),
        }}
      >
        {allocation != null ? fmt(allocation) : '—'}
      </td>

      {/* Flight */}
      <td className="px-3 py-2 align-middle text-xs text-[var(--foreground)] whitespace-nowrap">
        {ad.flightStart && ad.flightEnd
          ? `${fmtDate(ad.flightStart)} – ${fmtDate(ad.flightEnd)}`
          : '—'}
      </td>

      {/* Design */}
      <td className="px-3 py-2 align-middle whitespace-nowrap">
        <DesignPill status={ad.designStatus} />
      </td>

      {/* Approvals */}
      <td className="px-3 py-2 align-middle whitespace-nowrap">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <span className="text-[8px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] w-5 flex-shrink-0">
              Int
            </span>
            <ApprovalPill status={ad.internalApproval} />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[8px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] w-5 flex-shrink-0">
              Cli
            </span>
            <ApprovalPill status={ad.clientApproval} />
          </div>
        </div>
      </td>

      {/* Hover-only actions — hidden on a frozen month (read-only). */}
      <td className="px-3 py-2 align-middle whitespace-nowrap text-right">
        {!readOnly && (
          <span className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClone(ad.id);
              }}
              className="text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--muted)] rounded p-1 transition-colors"
              aria-label="Clone ad"
              title="Clone ad"
            >
              <DocumentDuplicateIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(ad.id);
              }}
              className="text-[var(--muted-foreground)] hover:text-red-400 hover:bg-[var(--muted)] rounded p-1 transition-colors"
              aria-label="Remove ad"
              title="Remove ad"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </span>
        )}
      </td>
    </tr>
  );
}
