'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  CalculatorIcon,
  CalendarIcon,
  ChartBarIcon,
  CheckBadgeIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PaintBrushIcon,
  PlusIcon,
  TrashIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from '@/lib/toast';
import { useLoomiDialog } from '@/contexts/loomi-dialog-context';
import BulkActionDock from '@/components/bulk-action-dock';
import { fmt, num, makeAd, newAdId } from '../_lib/helpers';
import { adContribution } from '../_lib/contribution';
import { effMarkupOf } from '../_lib/markup';
import { COLORS, AD_COLORS } from '../_lib/constants';
import { shiftPeriod, fmtPeriodLong, fmtPeriodShort } from '../_lib/period';
import { EMPTY_FILTERS, applyFilters } from '../_lib/filters';
import type { PlanFilters } from '../_lib/filters';
import type { PacerAd, PacerPlan, DirectoryUser, PeriodSummary, ActivityEntry } from '../_lib/types';
import { usePacerReadOnly } from './pacer-context';
import { useDragReorder } from '../_hooks/useDragReorder';
import { DollarInput, Field, MetricBox, readonlyClass } from './primitives';
import { AdSummaryRow } from './AdSummaryRow';
import { AdEditorModal } from './AdEditorModal';
import { CopyPlanModal } from './CopyPlanModal';
import type { CopyFieldOptions } from './CopyPlanModal';
import { BudgetCalculatorModal } from './BudgetCalculatorModal';
import { BulkEditModal } from './BulkEditModal';
import type { BulkField } from './BulkEditModal';
import { FilterStatus } from './FilterSidebar';

// ─── Budget Panel (base / added) ───────────────────────────────────────────
export function BudgetPanel({
  title,
  source,
  color,
  goalKey,
  plan,
  onChange,
}: {
  title: string;
  source: 'base' | 'added';
  color: string;
  goalKey: 'baseBudgetGoal' | 'addedBudgetGoal';
  plan: PacerPlan;
  onChange: (p: PacerPlan) => void;
}) {
  const goal = num(plan[goalKey]);
  // Include split ads here too — their per-source portion contributes
  // to this pool's totals via adContribution. Pure-source ads only
  // contribute to one side, but a split ad contributes to both.
  const srcAds = plan.ads.filter(
    (a) => a.budgetSource === source || a.budgetSource === 'split',
  );
  const totalAlloc = plan.ads.reduce((s, a) => {
    const c = adContribution(a);
    return s + (source === 'base' ? c.baseAllocation : c.addedAllocation);
  }, 0);
  // Per-account markup override when set, else the global default.
  const effMarkup = effMarkupOf(plan.markup);
  // Carryover (Change 7) adjusts the DERIVED spend target only — the client
  // budget goal stays untouched. target = goal × markup + carryover.
  const carryover =
    num(source === 'base' ? plan.baseCarryover : plan.addedCarryover) ?? 0;
  const baseTarget = goal != null ? goal * effMarkup : null;
  const spendTarget = baseTarget != null ? baseTarget + carryover : null;
  const grossAlloc = Math.round((totalAlloc / effMarkup) * 100) / 100;
  const remaining = spendTarget != null ? spendTarget - totalAlloc : null;
  const allocPct =
    spendTarget != null && spendTarget > 0
      ? (totalAlloc / spendTarget) * 100
      : null;
  const allocStatus =
    allocPct == null ? null : allocPct > 105 ? 'over' : allocPct >= 95 ? 'perfect' : 'under';
  const statusColor =
    allocStatus === 'over'
      ? COLORS.error
      : allocStatus === 'perfect'
        ? COLORS.success
        : COLORS.warn;

  return (
    <div
      className="glass-section-card relative flex-1 min-w-[280px] rounded-xl px-5 py-4 overflow-hidden"
      style={{ borderColor: `${color}40` }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: color }}
      />

      <div className="flex items-center justify-between mb-3.5">
        <span
          className="text-sm font-bold uppercase tracking-wider"
          style={{ color }}
        >
          {title}
        </span>
        {allocStatus && (
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
            style={{
              background:
                allocStatus === 'over'
                  ? 'rgba(239,68,68,0.18)'
                  : allocStatus === 'perfect'
                    ? 'rgba(34,197,94,0.18)'
                    : 'rgba(245,158,11,0.18)',
              color: statusColor,
            }}
          >
            {allocStatus === 'over'
              ? 'Over'
              : allocStatus === 'perfect'
                ? 'Full'
                : 'Under'}
          </span>
        )}
      </div>

      {/* Goal input row */}
      <div className="grid grid-cols-2 gap-2.5 mb-3.5">
        <Field label="Client Budget Goal (Gross)">
          <DollarInput
            value={plan[goalKey]}
            onChange={(v) => onChange({ ...plan, [goalKey]: v })}
            placeholder="0.00"
          />
        </Field>
        <Field label="Actual Spend Budget">
          <div
            className={`${readonlyClass} font-bold`}
            style={{ color }}
          >
            {spendTarget != null
              ? fmt(Math.round(spendTarget * 100) / 100)
              : '—'}
          </div>
          {/* When a carryover is applied, show the traceable breakdown so the
              target always reads as "base × markup + carryover", never a
              silently moved number. */}
          {carryover !== 0 && baseTarget != null && (
            <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5 leading-snug">
              {fmt(Math.round(baseTarget * 100) / 100)}{' '}
              {carryover >= 0 ? '+' : '−'} {fmt(Math.abs(carryover))} carried
              from {fmtPeriodShort(shiftPeriod(plan.period, -1))}
            </div>
          )}
        </Field>
      </div>

      {/* Metric boxes */}
      <div
        className="grid grid-cols-2 md:grid-cols-3 gap-2"
        style={{ marginBottom: goal != null && goal > 0 ? 14 : 0 }}
      >
        <MetricBox
          label="Gross Allocation"
          value={fmt(grossAlloc)}
          sub={carryover !== 0 ? 'client budget + carryover' : 'client budget'}
        />
        <MetricBox
          label="Total Allocated"
          value={fmt(totalAlloc)}
          sub="actual spend"
          color={
            allocPct != null
              ? allocPct > 105
                ? COLORS.error
                : allocPct >= 95
                  ? COLORS.success
                  : COLORS.warn
              : color
          }
        />
        {goal != null && (
          <MetricBox
            label="Remaining Budget"
            value={fmt(Math.abs(remaining ?? 0))}
            sub={remaining != null && remaining < 0 ? 'over budget' : 'unallocated'}
            color={remaining != null && remaining < 0 ? COLORS.error : COLORS.success}
          />
        )}
      </div>

      {/* Allocation bar — shows only this pool's portion of each ad's
          allocation. For split ads, that's `splitBaseAmount` (Base card)
          or `allocation − splitBaseAmount` (Added card), so a single
          $192.50 split ad with $92.50 to base appears as $92.50 on the
          Base card and $100.00 on the Added card. */}
      {goal != null && goal > 0 && (() => {
        const budgetCap = goal * effMarkup;
        const poolEntries = srcAds
          .map((a, i) => {
            const c = adContribution(a);
            const portion = source === 'base' ? c.baseAllocation : c.addedAllocation;
            return { ad: a, portion, colorIdx: i };
          })
          .filter((e) => e.portion > 0);
        return (
          <>
            <div className="flex justify-between mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                Allocation
              </span>
              <span
                className="text-[10px] font-bold"
                style={{ color: statusColor }}
              >
                {allocPct != null ? `${allocPct.toFixed(1)}%` : ''}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden bg-[var(--muted)] flex mb-2">
              {poolEntries.map(({ ad, portion, colorIdx }) => {
                const w = budgetCap > 0 ? Math.min((portion / budgetCap) * 100, 100) : 0;
                const pct = budgetCap > 0 ? (portion / budgetCap) * 100 : 0;
                const isSplit = ad.budgetSource === 'split';
                return w > 0 ? (
                  <div
                    key={ad.id}
                    title={`${ad.name || 'Untitled Ad'}${isSplit ? ` (split — ${source} portion)` : ''}: ${fmt(portion)} (${pct.toFixed(1)}% of budget)`}
                    className="h-full transition-[width] duration-500"
                    style={{
                      width: `${w}%`,
                      background: AD_COLORS[colorIdx % AD_COLORS.length],
                      borderRight: '1px solid var(--background)',
                    }}
                  />
                ) : null;
              })}
            </div>
            <div className="flex flex-wrap gap-2">
              {poolEntries.map(({ ad, portion, colorIdx }) => {
                const pct = budgetCap > 0 ? (portion / budgetCap) * 100 : 0;
                const isSplit = ad.budgetSource === 'split';
                return (
                  <div
                    key={ad.id}
                    className="flex items-center gap-1 text-[10px] text-[var(--muted-foreground)]"
                    title={`${pct.toFixed(1)}% of budget${isSplit ? ' (split portion)' : ''}`}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-sm flex-shrink-0"
                      style={{ background: AD_COLORS[colorIdx % AD_COLORS.length] }}
                    />
                    <span className="max-w-[110px] overflow-hidden text-ellipsis whitespace-nowrap text-[var(--foreground)]">
                      {ad.name || 'Untitled Ad'}
                      {isSplit && (
                        <span className="text-[var(--muted-foreground)] ml-0.5">·split</span>
                      )}
                    </span>
                    <span>{fmt(portion)}</span>
                    <span className="text-[var(--muted-foreground)]">
                      ({pct.toFixed(1)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        );
      })()}
    </div>
  );
}

// ─── Total Account Allocation header ───────────────────────────────────────
export function TotalAllocationHeader({ plan }: { plan: PacerPlan }) {
  // Walk every ad once and sum via adContribution so split ads add to
  // both pool totals proportionally.
  const { totalBase, totalAdded } = plan.ads.reduce(
    (acc, a) => {
      const c = adContribution(a);
      acc.totalBase += c.baseAllocation;
      acc.totalAdded += c.addedAllocation;
      return acc;
    },
    { totalBase: 0, totalAdded: 0 },
  );
  const totalActual = totalBase + totalAdded;
  if (totalActual === 0) return null;
  // Match BudgetPanel exactly so the total bar agrees with the per-source
  // cards: per-account markup, and carryover folded into each source's spend
  // target (target = goal × markup + carryover). The total budget is the SUM of
  // the two cards' targets — applying an over/under carryover therefore grows
  // the total allocation cap the same way it grows the source card it lands in.
  const effMarkup = effMarkupOf(plan.markup);
  const totalGross = Math.round((totalActual / effMarkup) * 100) / 100;
  const baseGoal = num(plan.baseBudgetGoal);
  const addedGoal = num(plan.addedBudgetGoal);
  const baseCarry = num(plan.baseCarryover) ?? 0;
  const addedCarry = num(plan.addedCarryover) ?? 0;
  const baseTarget = baseGoal != null ? baseGoal * effMarkup + baseCarry : null;
  const addedTarget = addedGoal != null ? addedGoal * effMarkup + addedCarry : null;
  const combinedActualBudget =
    baseTarget != null || addedTarget != null
      ? Math.round(((baseTarget ?? 0) + (addedTarget ?? 0)) * 100) / 100
      : null;
  const allocPct =
    combinedActualBudget != null && combinedActualBudget > 0
      ? (totalActual / combinedActualBudget) * 100
      : null;
  const pctColor =
    allocPct == null
      ? 'var(--muted-foreground)'
      : allocPct > 105
        ? COLORS.error
        : allocPct >= 95
          ? COLORS.success
          : COLORS.warn;
  // Bar widths are computed against the COMBINED budget cap so partial
  // allocation visually leaves empty space (matching the per-source bars
  // inside BudgetPanel). Falls back to share-of-total when there's no
  // budget goal set yet so the bar still has something to render.
  const widthDenominator =
    combinedActualBudget != null && combinedActualBudget > 0
      ? combinedActualBudget
      : totalActual;
  const baseW = widthDenominator > 0
    ? Math.min(100, (totalBase / widthDenominator) * 100)
    : 0;
  const addedW = widthDenominator > 0
    ? Math.min(100 - baseW, (totalAdded / widthDenominator) * 100)
    : 0;
  // Percent of total budget — used for the legend %.
  const basePctOfBudget = widthDenominator > 0
    ? (totalBase / widthDenominator) * 100
    : 0;
  const addedPctOfBudget = widthDenominator > 0
    ? (totalAdded / widthDenominator) * 100
    : 0;

  return (
    <div className="glass-section-card rounded-xl px-5 py-4 mb-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2.5">
        <span className="text-sm font-bold uppercase tracking-wider text-[var(--foreground)]">
          Total Account Allocation
        </span>
        <div className="flex gap-3 flex-wrap">
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
              Total Gross
            </div>
            <div className="text-base font-bold text-[var(--foreground)]">
              {fmt(totalGross)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
              Total Actual Spend
            </div>
            <div className="text-base font-bold text-[var(--foreground)]">
              {fmt(totalActual)}
            </div>
          </div>
          {allocPct != null && (
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                Allocated
              </div>
              <div className="text-base font-bold" style={{ color: pctColor }}>
                {allocPct.toFixed(1)}%
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden bg-[var(--muted)] flex mb-2">
        {baseW > 0 && (
          <div
            className="h-full transition-[width] duration-500"
            title={`Base: ${fmt(totalBase)} (${basePctOfBudget.toFixed(1)}% of budget)`}
            style={{
              width: `${baseW}%`,
              background: `linear-gradient(90deg, rgba(56,189,248,0.4), ${COLORS.base})`,
              borderRight: addedW > 0 ? '1px solid var(--background)' : 'none',
            }}
          />
        )}
        {addedW > 0 && (
          <div
            className="h-full transition-[width] duration-500"
            title={`Added: ${fmt(totalAdded)} (${addedPctOfBudget.toFixed(1)}% of budget)`}
            style={{
              width: `${addedW}%`,
              background: `linear-gradient(90deg, rgba(52,211,153,0.4), ${COLORS.added})`,
            }}
          />
        )}
      </div>
      <div className="flex gap-4 flex-wrap">
        {totalBase > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)]">
            <div
              className="w-2 h-2 rounded-sm flex-shrink-0"
              style={{ background: COLORS.base }}
            />
            <span>Base</span>
            <span className="font-bold" style={{ color: COLORS.base }}>
              {fmt(totalBase)}
            </span>
            <span>({basePctOfBudget.toFixed(1)}%)</span>
          </div>
        )}
        {totalAdded > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--muted-foreground)]">
            <div
              className="w-2 h-2 rounded-sm flex-shrink-0"
              style={{ background: COLORS.added }}
            />
            <span>Added</span>
            <span className="font-bold" style={{ color: COLORS.added }}>
              {fmt(totalAdded)}
            </span>
            <span>({addedPctOfBudget.toFixed(1)}%)</span>
          </div>
        )}
        {combinedActualBudget != null && (
          <div className="text-[10px] text-[var(--muted-foreground)] ml-auto">
            of {fmt(combinedActualBudget)} actual spend budget
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Empty period state ────────────────────────────────────────────────────
export function EmptyPeriodState({
  period,
  periodSummaries,
  onAddAd,
  onOpenCopy,
}: {
  period: string;
  periodSummaries: PeriodSummary[];
  onAddAd: () => void;
  onOpenCopy: () => void;
}) {
  const readOnly = usePacerReadOnly();
  const hasSources = periodSummaries.some(
    (p) => p.period !== period && p.adCount > 0,
  );
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] py-10 px-6 text-center mb-3">
      <ClipboardDocumentListIcon className="w-10 h-10 mx-auto mb-3 text-[var(--muted-foreground)]" />
      <p className="text-sm text-[var(--foreground)] font-medium mb-1">
        No ads planned for {fmtPeriodLong(period)} yet.
      </p>
      <p className="text-xs text-[var(--muted-foreground)] mb-5">
        {readOnly
          ? 'This month is frozen — reopen it to add ads.'
          : 'Start fresh, or copy ads from a previous month.'}
      </p>
      {!readOnly && (
        <div className="flex flex-wrap gap-2 justify-center items-center">
          <button
            type="button"
            onClick={onAddAd}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--primary)] bg-[var(--primary)]/10 px-3 py-2 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Add first ad
          </button>
          {hasSources && (
            <button
              type="button"
              onClick={onOpenCopy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              <DocumentDuplicateIcon className="w-3.5 h-3.5" />
              Copy from another month
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add Plan dropdown + Copy modal ────────────────────────────────────────
export function AddPlanButton({
  onCreateNew,
  onOpenCopy,
  hasOtherPeriods,
}: {
  onCreateNew: () => void;
  onOpenCopy: () => void;
  hasOtherPeriods: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--primary)] bg-[var(--primary)]/90 text-white px-3 py-1.5 text-xs font-medium hover:bg-[var(--primary)] transition-colors"
      >
        <PlusIcon className="w-3.5 h-3.5" />
        Add Plan
        <ChevronDownIcon className="w-3 h-3" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 w-64 rounded-lg border border-[var(--border)] bg-[var(--background)] shadow-2xl py-1 z-30"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onCreateNew();
            }}
            className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-[var(--muted)] transition-colors"
          >
            <PlusIcon className="w-4 h-4 text-[var(--primary)] flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-[var(--foreground)]">
                Create a new plan
              </div>
              <div className="text-[10px] text-[var(--muted-foreground)]">
                Start with a blank ad
              </div>
            </div>
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!hasOtherPeriods}
            onClick={() => {
              setOpen(false);
              onOpenCopy();
            }}
            className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-[var(--muted)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            <DocumentDuplicateIcon className="w-4 h-4 text-[var(--primary)] flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-[var(--foreground)]">
                Copy plan from another month
              </div>
              <div className="text-[10px] text-[var(--muted-foreground)]">
                {hasOtherPeriods
                  ? 'Pick ads to bring into this month'
                  : 'No other months with ads yet'}
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}



// ─── Ad Planner panel ──────────────────────────────────────────────────────
export type EditorState =
  | { mode: 'create'; draft: PacerAd }
  | { mode: 'edit'; adId: string; original: PacerAd };

export function AdPlannerPanel({
  plan,
  period,
  users,
  filters,
  onFiltersChange,
  currentUserId,
  periodSummaries,
  onChange,
  onCopyFrom,
  onModalOpenChange,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
}: {
  plan: PacerPlan;
  period: string;
  users: DirectoryUser[];
  filters: PlanFilters;
  onFiltersChange: (next: PlanFilters) => void;
  currentUserId: string | null;
  periodSummaries: PeriodSummary[];
  onChange: (p: PacerPlan) => void;
  onCopyFrom: (
    from: string,
    adIds: string[] | undefined,
    fields: CopyFieldOptions,
  ) => Promise<void> | void;
  onModalOpenChange?: (open: boolean) => void;
  onAddActivity: (adId: string, text: string, file: File | null) => Promise<void>;
  onEditActivity: (adId: string, entryId: string, text: string) => Promise<void>;
  onDeleteActivity: (adId: string, entryId: string) => Promise<void>;
}) {
  const readOnly = usePacerReadOnly();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showCalcModal, setShowCalcModal] = useState(false);

  const handleReorder = (nextAds: PacerAd[]) => {
    if (readOnly) return; // frozen month — reorder is a no-op
    onChange({ ...plan, ads: nextAds });
  };
  const drag = useDragReorder(plan.ads, handleReorder);

  // Notify parent so it can pause autosave while a modal owns the in-flight edits.
  useEffect(() => {
    onModalOpenChange?.(editor !== null);
  }, [editor, onModalOpenChange]);

  // Always-current ref to the plan so the soft-delete undo callback can
  // splice into the latest state even if the user kept editing after the
  // delete fired.
  const planRef = useRef(plan);
  useEffect(() => {
    planRef.current = plan;
  }, [plan]);

  const removeAd = (id: string) => {
    if (readOnly) return; // frozen month — deletion is disabled
    const idx = plan.ads.findIndex((a) => a.id === id);
    if (idx === -1) return;
    const removed = plan.ads[idx];
    onChange({ ...plan, ads: plan.ads.filter((a) => a.id !== id) });
    if (editor?.mode === 'edit' && editor.adId === id) setEditor(null);

    // Soft-delete UX: surface an undo affordance via a sonner toast that
    // reinserts the ad at its original index. The autosave debounce fires
    // again on undo to re-persist the row.
    toast.success(`Removed "${removed.name || 'Untitled Ad'}"`, {
      duration: 6000,
      action: {
        label: 'Undo',
        onClick: () => {
          const current = planRef.current;
          // Bail if the row somehow already exists (shouldn't, but guard
          // against double-undo race).
          if (current.ads.some((a) => a.id === removed.id)) return;
          const next = [...current.ads];
          const insertAt = Math.min(idx, next.length);
          next.splice(insertAt, 0, removed);
          onChange({ ...current, ads: next });
        },
      },
    });
  };
  const openCreate = () => {
    const fresh = makeAd(plan.ads.length, period);
    setEditor({ mode: 'create', draft: fresh });
  };
  const openEdit = (id: string) => {
    const original = plan.ads.find((a) => a.id === id);
    if (!original) return;
    setEditor({ mode: 'edit', adId: id, original });
  };
  const cloneAd = (id: string) => {
    const src = plan.ads.find((a) => a.id === id);
    if (!src) return;
    const cloneName = `${src.name || 'Ad'} (copy)`;
    const cloned: PacerAd = {
      ...src,
      id: newAdId(),
      position: plan.ads.length,
      name: cloneName,
      // Dates reset — a fresh copy shouldn't inherit the source's schedule
      flightStart: null,
      flightEnd: null,
      liveDate: null,
      creativeDueDate: null,
      dueDate: null,
      dateCompleted: null,
      // Budget + pacer fields reset — start blank so we don't apply stale spend
      allocation: null,
      pacerActual: null,
      pacerDailyBudget: null,
      pacerTodayDate: null,
      pacerEndDate: null,
      // Facebook link reset — a copy must not inherit the source's campaign
      // mapping, or both rows would sync the same spend onto themselves.
      metaObjectType: null,
      metaObjectId: null,
      metaEffectiveStatus: null,
      pacerSyncedAt: null,
      // Activity log + design notes are tied to the original — start fresh
      activityLog: [],
      designNotes: [],
    };
    onChange({ ...plan, ads: [...plan.ads, cloned] });
  };

  const handleSave = (draft: PacerAd) => {
    if (!editor) return;
    if (editor.mode === 'create') {
      onChange({ ...plan, ads: [...plan.ads, draft] });
    } else {
      // Preserve the LIVE activity log from plan — the modal's draft still
      // holds the snapshot from when it opened, but updates posted while
      // editing live in plan and shouldn't be overwritten on Save.
      onChange({
        ...plan,
        ads: plan.ads.map((a) =>
          a.id === editor.adId
            ? {
                ...draft,
                activityLog: a.activityLog,
                designNotes: a.designNotes,
              }
            : a,
        ),
      });
    }
    setEditor(null);
  };

  const [search, setSearch] = useState('');
  const visibleAds = useMemo(() => {
    const filtered = applyFilters(plan.ads, filters, currentUserId);
    const q = search.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter((a) => (a.name || '').toLowerCase().includes(q));
  }, [plan.ads, filters, currentUserId, search]);

  // ── Bulk selection ──────────────────────────────────────────────────────
  const { confirm } = useLoomiDialog();
  const [selectedAdIds, setSelectedAdIds] = useState<Set<string>>(new Set());
  const [bulkField, setBulkField] = useState<BulkField | null>(null);

  // Drop selections that fall out of view (e.g., a filter hides them) so
  // bulk actions never silently affect rows the user can't see.
  useEffect(() => {
    setSelectedAdIds((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(visibleAds.map((a) => a.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (visible.has(id)) next.add(id);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [visibleAds]);

  const allVisibleSelected =
    visibleAds.length > 0 && visibleAds.every((a) => selectedAdIds.has(a.id));
  const someVisibleSelected = visibleAds.some((a) => selectedAdIds.has(a.id));

  const toggleSelectAd = (id: string) => {
    setSelectedAdIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAllVisible = () => {
    setSelectedAdIds((prev) => {
      if (visibleAds.every((a) => prev.has(a.id))) {
        const next = new Set(prev);
        visibleAds.forEach((a) => next.delete(a.id));
        return next;
      }
      const next = new Set(prev);
      visibleAds.forEach((a) => next.add(a.id));
      return next;
    });
  };
  const clearSelection = () => setSelectedAdIds(new Set());

  const handleBulkDelete = async () => {
    const n = selectedAdIds.size;
    if (n === 0) return;
    const ok = await confirm({
      title: `Delete ${n} ad${n !== 1 ? 's' : ''}?`,
      message: 'You can undo each removal individually from the toast notifications.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;

    // Calling removeAd(id) in a forEach loop creates N separate onChange
    // calls, each reading `plan.ads` from the stale closure — React batches
    // them and the last call wins, leaving N-1 ads still alive. Snapshot
    // the removed rows once, then do a single batched state update.
    const idSet = selectedAdIds;
    const removedItems: Array<{ ad: PacerAd; idx: number }> = [];
    plan.ads.forEach((ad, idx) => {
      if (idSet.has(ad.id)) removedItems.push({ ad, idx });
    });
    if (removedItems.length === 0) {
      clearSelection();
      return;
    }

    onChange({
      ...plan,
      ads: plan.ads.filter((a) => !idSet.has(a.id)),
    });
    if (editor?.mode === 'edit' && idSet.has(editor.adId)) setEditor(null);

    // Per-row undo toasts, same UX as single-row delete — undo uses
    // planRef.current so each one splices into the latest state.
    for (const { ad: removed, idx } of removedItems) {
      toast.success(`Removed "${removed.name || 'Untitled Ad'}"`, {
        duration: 6000,
        action: {
          label: 'Undo',
          onClick: () => {
            const current = planRef.current;
            if (current.ads.some((a) => a.id === removed.id)) return;
            const next = [...current.ads];
            const insertAt = Math.min(idx, next.length);
            next.splice(insertAt, 0, removed);
            onChange({ ...current, ads: next });
          },
        },
      });
    }

    clearSelection();
  };

  const applyBulkPatch = (patch: Partial<PacerAd>) => {
    const n = selectedAdIds.size;
    if (n === 0) return;
    onChange({
      ...plan,
      ads: plan.ads.map((a) => (selectedAdIds.has(a.id) ? { ...a, ...patch } : a)),
    });
    toast.success(`Updated ${n} ad${n !== 1 ? 's' : ''}`);
    setBulkField(null);
    clearSelection();
  };

  const editorInitialAd: PacerAd | null =
    editor?.mode === 'create' ? editor.draft : editor?.original ?? null;

  // Re-pull the activity log from plan on every render so newly posted /
  // edited / deleted updates appear in the modal without a refresh.
  const editorLiveActivityLog: ActivityEntry[] | undefined =
    editor?.mode === 'edit'
      ? plan.ads.find((a) => a.id === editor.adId)?.activityLog
      : undefined;

  const otherPeriodsWithAds = useMemo(
    () =>
      periodSummaries.filter((p) => p.period !== period && p.adCount > 0).length >
      0,
    [periodSummaries, period],
  );

  return (
    <div>
      {/* Header row: Ad Plan label + Add Plan CTA on the right */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <h2 className="m-0 flex items-center gap-2 text-base font-bold tracking-tight text-[var(--foreground)]">
          <ClipboardDocumentListIcon className="w-4 h-4" />
          {`Ad Plan · ${fmtPeriodLong(period)} (${visibleAds.length}${
            visibleAds.length !== plan.ads.length ? ` of ${plan.ads.length}` : ''
          } ad${plan.ads.length !== 1 ? 's' : ''})`}
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick search by ad name — applied on top of the active filters. */}
          <div className="relative">
            <MagnifyingGlassIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ads…"
              aria-label="Search ads by name"
              className="pl-8 pr-7 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] w-44"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
              >
                <XMarkIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowCalcModal(true)}
            disabled={plan.ads.length === 0 || readOnly}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title={
              readOnly
                ? 'This month is frozen'
                : 'Spread a budget evenly or with locked amounts/percentages'
            }
          >
            <CalculatorIcon className="w-3.5 h-3.5" />
            Calculator
          </button>
          {!readOnly && (
            <AddPlanButton
              onCreateNew={openCreate}
              onOpenCopy={() => setShowCopyModal(true)}
              hasOtherPeriods={otherPeriodsWithAds}
            />
          )}
        </div>
      </div>

      {plan.ads.length > 0 && (
        <FilterStatus
          filters={filters}
          onClear={() => onFiltersChange(EMPTY_FILTERS)}
          filteredCount={visibleAds.length}
          totalCount={plan.ads.length}
        />
      )}

      {plan.ads.length === 0 ? (
        <EmptyPeriodState
          period={period}
          periodSummaries={periodSummaries}
          onAddAd={openCreate}
          onOpenCopy={() => setShowCopyModal(true)}
        />
      ) : visibleAds.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] py-10 px-6 text-center text-sm text-[var(--muted-foreground)] mb-3">
          No ads match the current filters.
        </div>
      ) : (
        <div className="glass-table">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                  <th className="w-9 pl-3 pr-1 py-2">
                    <input
                      type="checkbox"
                      aria-label={
                        allVisibleSelected ? 'Deselect all ads' : 'Select all ads'
                      }
                      checked={allVisibleSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
                      }}
                      onChange={toggleSelectAllVisible}
                      className="h-4 w-4 rounded border-[var(--border)] bg-[var(--input)] text-[var(--primary)] cursor-pointer accent-[var(--primary)]"
                    />
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                    Ad
                  </th>
                  {/* Updates icon column — no header, just kept aligned */}
                  <th className="w-10 px-2 py-2"></th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                    Due
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                    Allocation
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                    Flight
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                    Design
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                    Approvals
                  </th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {visibleAds.map((ad) => (
                  <AdSummaryRow
                    key={ad.id}
                    ad={ad}
                    index={plan.ads.findIndex((a) => a.id === ad.id)}
                    onClick={() => openEdit(ad.id)}
                    onRemove={removeAd}
                    onClone={cloneAd}
                    dragProps={drag.rowProps(ad.id)}
                    isDragging={drag.draggedId === ad.id}
                    isDropTarget={
                      drag.dropTargetId === ad.id && drag.draggedId !== ad.id
                    }
                    dropEdge={
                      drag.dropTargetId === ad.id ? drag.dropEdge : null
                    }
                    isSelected={selectedAdIds.has(ad.id)}
                    onSelectToggle={() => toggleSelectAd(ad.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editor && editorInitialAd && (
        <AdEditorModal
          initialAd={editorInitialAd}
          markup={plan.markup}
          liveActivityLog={editorLiveActivityLog}
          mode={editor.mode}
          users={users}
          currentUserId={currentUserId}
          onSave={handleSave}
          onCancel={() => setEditor(null)}
          onAddActivity={onAddActivity}
          onEditActivity={onEditActivity}
          onDeleteActivity={onDeleteActivity}
        />
      )}

      {showCopyModal && (
        <CopyPlanModal
          accountKey={plan.accountKey}
          targetPeriod={period}
          periods={periodSummaries}
          onClose={() => setShowCopyModal(false)}
          onCopy={(from, adIds, fields) =>
            Promise.resolve(onCopyFrom(from, adIds, fields))
          }
        />
      )}

      {showCalcModal && (
        <BudgetCalculatorModal
          plan={plan}
          onClose={() => setShowCalcModal(false)}
          onApply={(updates) => {
            onChange({
              ...plan,
              ads: plan.ads.map((a) => {
                const u = updates[a.id];
                if (u == null) return a;
                return {
                  ...a,
                  allocation: u.allocation.toFixed(2),
                  ...(u.splitBaseAmount != null
                    ? { splitBaseAmount: u.splitBaseAmount.toFixed(2) }
                    : {}),
                };
              }),
            });
            setShowCalcModal(false);
          }}
        />
      )}

      {bulkField && (
        <BulkEditModal
          field={bulkField}
          count={selectedAdIds.size}
          users={users}
          onClose={() => setBulkField(null)}
          onApply={applyBulkPatch}
        />
      )}

      {selectedAdIds.size > 0 && (
        <BulkActionDock
          count={selectedAdIds.size}
          itemLabel={selectedAdIds.size === 1 ? 'ad' : 'ads'}
          onClose={clearSelection}
          actions={[
            {
              id: 'select-all',
              label: allVisibleSelected ? 'Deselect all' : 'Select all',
              icon: <CheckIcon className="h-4 w-4" />,
              onClick: toggleSelectAllVisible,
              disabled: visibleAds.length === 0,
            },
            {
              id: 'flight',
              label: 'Flight Dates',
              icon: <CalendarIcon className="h-4 w-4" />,
              onClick: () => setBulkField('flight'),
            },
            {
              id: 'budget-type',
              label: 'Budget Type',
              icon: <ChartBarIcon className="h-4 w-4" />,
              onClick: () => setBulkField('budgetType'),
            },
            {
              id: 'budget-source',
              label: 'Budget Source',
              icon: <FunnelIcon className="h-4 w-4" />,
              onClick: () => setBulkField('budgetSource'),
            },
            {
              id: 'owner',
              label: 'Owner',
              icon: <UserCircleIcon className="h-4 w-4" />,
              onClick: () => setBulkField('owner'),
            },
            {
              id: 'ad-status',
              label: 'Ad Status',
              icon: <ClockIcon className="h-4 w-4" />,
              onClick: () => setBulkField('adStatus'),
            },
            {
              id: 'design-status',
              label: 'Design Status',
              icon: <PaintBrushIcon className="h-4 w-4" />,
              onClick: () => setBulkField('designStatus'),
            },
            {
              id: 'internal-status',
              label: 'Internal Status',
              icon: <CheckBadgeIcon className="h-4 w-4" />,
              onClick: () => setBulkField('internalApproval'),
            },
            {
              id: 'client-status',
              label: 'Client Status',
              icon: <CheckBadgeIcon className="h-4 w-4" />,
              onClick: () => setBulkField('clientApproval'),
            },
            {
              id: 'delete',
              label: 'Delete',
              icon: <TrashIcon className="h-4 w-4" />,
              onClick: handleBulkDelete,
              danger: true,
            },
          ]}
        />
      )}
    </div>
  );
}
