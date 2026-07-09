'use client';

import { createPortal } from 'react-dom';
import {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { AD_STATUS_COLORS, STATUS_PRIORITY, COLORS, USER_DEPT_FILTERS } from '../_lib/constants';
import type { PacerAd, DirectoryUser } from '../_lib/types';
import { shiftPeriod } from '../_lib/period';
import { usePacerReadOnly } from './pacer-context';

/**
 * Shared presentational + form primitives for the Meta Ad Planner / Pacer.
 * Extracted from MetaAdsPlannerTool so the large row/panel components can reuse
 * them without prop-drilling. The DESIGN/APPROVAL status color maps live here
 * (they intentionally diverge from _lib's translucent variants — these are the
 * solid pill treatment).
 */

export function Tooltip({
  label,
  placement = 'top',
  children,
}: {
  label: string;
  placement?: 'top' | 'bottom';
  children: ReactNode;
}) {
  const pos = placement === 'bottom' ? 'top-full mt-1.5' : 'bottom-full mb-1.5';
  return (
    <span className="relative inline-flex group/tip">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 ${pos} z-[200] w-max max-w-[340px] whitespace-normal text-center rounded-md border border-[var(--border)] bg-[var(--card)] px-2.5 py-1.5 text-[10px] font-medium leading-snug text-[var(--foreground)] opacity-0 shadow-lg transition-opacity duration-100 group-hover/tip:opacity-100`}
      >
        {label}
      </span>
    </span>
  );
}

// ─── Shared input chrome ───────────────────────────────────────────────────
export const inputClass =
  'w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--input)] focus:outline-none focus:border-[var(--primary)] text-[var(--foreground)]';
// Drop-in for places where we render a value inside a Field but the field
// is read-only (computed totals, "N/A" placeholders, etc.). Borderless +
// transparent bg + muted text + no horizontal padding so the value sits
// flush with the Field's label, not indented like an editable input.
export const readonlyClass =
  'w-full py-2 text-sm bg-transparent text-[var(--muted-foreground)] cursor-default';
export const labelClass =
  'block text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1.5';

// ─── Atomic UI ─────────────────────────────────────────────────────────────
/** Compact "synced 2h ago" relative time from an ISO timestamp. */
export function fmtSyncedAgo(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 45) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function DollarInput({
  value,
  onChange,
  placeholder,
}: {
  value: string | null;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const readOnly = usePacerReadOnly();
  const hasValue = value != null && value !== '';
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-foreground)] pointer-events-none">
        $
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={value ?? ''}
        disabled={readOnly}
        onChange={(e) => {
          const v = e.target.value;
          // Accept only digits + a single decimal point. Reject anything else
          // so the field stays numeric without using <input type="number">
          // (which adds the spinner arrows we want gone).
          if (v === '' || /^\d*\.?\d*$/.test(v)) onChange(v);
        }}
        placeholder={placeholder ?? '0.00'}
        className={`${inputClass} pl-6 ${hasValue && !readOnly ? 'pr-8' : ''} ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
      />
      {hasValue && !readOnly && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear amount"
          title="Clear"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
        >
          <XMarkIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export function Field({ label, color, children }: { label: string; color?: string; children: ReactNode }) {
  return (
    <div>
      <label className={labelClass} style={color ? { color } : undefined}>
        {label}
      </label>
      {children}
    </div>
  );
}

/**
 * Status color tables: [bg, fg] pairs used by AdStatusPill, the StatusSelect
 * dropdown's colored options, and the StatusBattery overview bar. Adding a
 * status here automatically tints it everywhere it's rendered.
 */
// Design statuses use the same solid bg + white text family as ad statuses
// and approval pills so the three sit together visually as one signal set.
export const DESIGN_STATUS_COLORS: Record<string, [string, string]> = {
  Approved: ['#22c55e', '#ffffff'],
  'Work In Progress': ['#fb923c', '#ffffff'],
  Stuck: ['#ef4444', '#ffffff'],
  'Revisions Needed': ['#facc15', '#ffffff'],
  'Not Started': ['var(--muted)', 'var(--muted-foreground)'],
  'In Proofing/Pending Approval': ['#0ea5e9', '#ffffff'],
  'N/A': ['var(--muted)', 'var(--muted-foreground)'],
};

// Internal & client approval pills share the same solid bg + white text
// treatment as ad statuses so the two read as the same family of signal.
export const APPROVAL_STATUS_COLORS: Record<string, [string, string]> = {
  Approved: ['#22c55e', '#ffffff'],
  'Pending Approval': ['#f59e0b', '#ffffff'],
  'Does Not Approve': ['#ef4444', '#ffffff'],
  'Changes Requested': ['#0ea5e9', '#ffffff'],
};


export function AdStatusPill({ status }: { status: string }) {
  const [bg, color] = AD_STATUS_COLORS[status] ?? ['var(--muted)', 'var(--muted-foreground)'];
  return (
    <span
      className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded whitespace-nowrap"
      style={{ background: bg, color }}
    >
      {status || '—'}
    </span>
  );
}

export function ApprovalPill({ status }: { status: string }) {
  const [bg, color] =
    APPROVAL_STATUS_COLORS[status] ?? ['var(--muted)', 'var(--muted-foreground)'];
  return (
    <span
      className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded whitespace-nowrap"
      style={{ background: bg, color }}
    >
      {status || '—'}
    </span>
  );
}

export function DesignPill({ status }: { status: string }) {
  const [bg, color] =
    DESIGN_STATUS_COLORS[status] ?? ['var(--muted)', 'var(--muted-foreground)'];
  return (
    <span
      className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded whitespace-nowrap"
      style={{ background: bg, color }}
    >
      {status || '—'}
    </span>
  );
}

/**
 * Monday-style status dropdown. The trigger renders the current value as a
 * full-width colored chip (matching the chosen status's theme). The popover
 * shows every option as its own colored chip — click to commit. Falls back
 * to the muted treatment when a status isn't in the colorMap.
 */
export function StatusSelect({
  value,
  options,
  onChange,
  colorMap,
  className,
  size = 'md',
  ariaLabel,
}: {
  value: string;
  options: readonly string[];
  onChange: (next: string) => void;
  /** [bg, fg] tuple per option. Missing keys fall back to muted. */
  colorMap: Record<string, [string, string]>;
  className?: string;
  size?: 'sm' | 'md';
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const margin = 8;
    const popoverHeight = Math.min(360, options.length * 40 + 16);
    let top = rect.bottom + 4;
    if (top + popoverHeight > window.innerHeight - margin) {
      top = Math.max(margin, rect.top - popoverHeight - 4);
    }
    setPos({ top, left: rect.left, width: rect.width });
  }, [options.length]);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onScroll = () => updatePosition();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
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

  const [bg, fg] = colorMap[value] ?? ['var(--muted)', 'var(--muted-foreground)'];
  const heightClass = size === 'sm' ? 'py-1.5' : 'py-2';

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ?? value}
        className={`w-full inline-flex items-center justify-center gap-1.5 rounded-lg ${heightClass} px-3 text-xs font-bold uppercase tracking-wider transition-opacity hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 ${className ?? ''}`}
        style={{ background: bg, color: fg }}
      >
        <span className="truncate">{value || '—'}</span>
        <ChevronDownIcon className="w-3 h-3 flex-shrink-0 opacity-70" />
      </button>

      {open && pos && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={popoverRef}
              role="listbox"
              className="fixed z-[200] rounded-xl border border-[var(--border)] bg-[var(--background)] shadow-2xl p-1.5"
              style={{
                top: pos.top,
                left: pos.left,
                width: Math.max(pos.width, 200),
              }}
            >
              <div className="max-h-[360px] overflow-y-auto themed-scrollbar space-y-1">
                {options.map((option) => {
                  const [optBg, optFg] = colorMap[option] ?? [
                    'var(--muted)',
                    'var(--muted-foreground)',
                  ];
                  const selected = option === value;
                  return (
                    <button
                      key={option}
                      role="option"
                      type="button"
                      aria-selected={selected}
                      onClick={() => {
                        onChange(option);
                        setOpen(false);
                      }}
                      className="w-full inline-flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity focus:outline-none"
                      style={{
                        background: optBg,
                        color: optFg,
                        boxShadow: selected
                          ? `inset 0 0 0 2px ${optFg}`
                          : undefined,
                      }}
                    >
                      <span className="truncate text-left">{option}</span>
                      {selected && (
                        <CheckIcon className="w-3.5 h-3.5 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export function MetricBox({
  label,
  value,
  sub,
  detail,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  /** Optional faint second line — e.g. the arithmetic basis behind `value`. */
  detail?: string;
  color?: string;
}) {
  return (
    // No border + softer bg so it reads as a passive computed-info card,
    // not as another fillable field. Editable inputs stay bordered+filled.
    // `metric-box` lets the pacer card recess these into darker wells (see
    // `.pacer-ad-card .metric-box` in globals.css); harmless elsewhere.
    <div className="metric-box rounded-lg bg-[var(--muted)]/40 px-3 py-2.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-1">
        {label}
      </div>
      <div className="text-lg font-bold leading-tight" style={{ color: color ?? 'var(--foreground)' }}>
        {value}
      </div>
      {sub && (
        <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{sub}</div>
      )}
      {detail && (
        <div className="text-[10px] text-[var(--muted-foreground)]/75 mt-0.5 tabular-nums">
          {detail}
        </div>
      )}
    </div>
  );
}

// Tighter than MetricBox — single-line label + value, no sub text. Used
// in the Budget Calculator's stat strip where vertical space is
// precious (5+ stats in one row above a scrollable ad list).
export function CompactStat({
  label,
  value,
  color,
  title,
}: {
  label: string;
  value: string;
  color?: string;
  title?: string;
}) {
  return (
    <div className="min-w-0 bg-[var(--muted)]/40 px-3 py-2.5" title={title}>
      <div className="text-[9px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] truncate mb-0.5">
        {label}
      </div>
      <div
        className="text-sm font-bold tabular-nums leading-snug whitespace-nowrap"
        style={{ color: color ?? 'var(--foreground)' }}
      >
        {value}
      </div>
    </div>
  );
}

export function SectionLabel({ icon, text }: { icon?: ReactNode; text: string }) {
  return (
    <h2 className="m-0 mb-3.5 flex items-center gap-2 text-base font-bold tracking-tight text-[var(--foreground)]">
      {icon}
      {text}
    </h2>
  );
}

/**
 * Battery-style segmented bar showing the breakdown of Ad Statuses across an
 * account's full ad list. Width of each segment = proportion of ads in that
 * status. Ordered by status priority (worst → best) so problems are visible
 * on the left.
 */
/** Period selector — prev/next chevrons + native month input. */
export function PeriodSelector({
  period,
  onChange,
}: {
  period: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="inline-flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <button
        type="button"
        onClick={() => onChange(shiftPeriod(period, -1))}
        className="px-2 py-1.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        aria-label="Previous month"
      >
        <ChevronLeftIcon className="w-4 h-4" />
      </button>
      <input
        type="month"
        value={period}
        onChange={(e) => {
          const v = e.target.value;
          if (v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v)) onChange(v);
        }}
        className="bg-transparent text-sm font-semibold text-[var(--foreground)] px-2 py-1.5 focus:outline-none border-x border-[var(--border)] min-w-[140px]"
      />
      <button
        type="button"
        onClick={() => onChange(shiftPeriod(period, 1))}
        className="px-2 py-1.5 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        aria-label="Next month"
      >
        <ChevronRightIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

export function StatusBattery({ ads, size = 'sm' }: { ads: PacerAd[]; size?: 'sm' | 'lg' }) {
  const total = ads.length;
  const breakdown = useMemo(() => {
    const counts = new Map<string, number>();
    ads.forEach((a) => {
      const s = a.adStatus || 'In Draft';
      counts.set(s, (counts.get(s) ?? 0) + 1);
    });
    return STATUS_PRIORITY.flatMap((status) => {
      const count = counts.get(status) ?? 0;
      return count > 0 ? [{ status, count }] : [];
    });
  }, [ads]);

  const barHeight = size === 'lg' ? 'h-3.5' : 'h-2.5';
  const labelText = size === 'lg' ? 'text-[11px]' : 'text-[10px]';

  if (total === 0) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
        <div className={`${barHeight} w-64 rounded-full border border-dashed border-[var(--border)]`} />
        <span>No ads yet</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 min-w-0 w-full">
      <div className="flex flex-col gap-1 min-w-[320px] flex-1">
        <div className={`flex ${barHeight} w-full rounded-full overflow-hidden bg-[var(--muted)] border border-[var(--border)]`}>
          {breakdown.map(({ status, count }) => {
            const w = (count / total) * 100;
            // [0] = bg color (the solid status color); [1] is the text color
            // (now #ffffff for every status, which would render the bar blank).
            const color = AD_STATUS_COLORS[status]?.[0] ?? 'var(--muted-foreground)';
            return (
              <div
                key={status}
                title={`${status}: ${count} of ${total} (${w.toFixed(0)}%)`}
                className="h-full transition-[width] duration-500"
                style={{ width: `${w}%`, background: color }}
              />
            );
          })}
        </div>
        <div className={`flex items-center gap-x-2 gap-y-0.5 ${labelText} text-[var(--muted-foreground)] flex-wrap`}>
          <span className="font-semibold text-[var(--foreground)]">
            {total} ad{total !== 1 ? 's' : ''}
          </span>
          {breakdown.map(({ status, count }) => {
            const color = AD_STATUS_COLORS[status]?.[0] ?? 'var(--muted-foreground)';
            return (
              <span
                key={status}
                className="inline-flex items-center gap-1 whitespace-nowrap"
              >
                <span
                  className="w-1.5 h-1.5 rounded-sm flex-shrink-0"
                  style={{ background: color }}
                />
                {count} {status}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function Divider({ icon, label }: { icon?: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2.5 my-4">
      <div className="h-px flex-1 bg-[var(--border)]" />
      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] whitespace-nowrap">
        {icon}
        {label}
      </span>
      <div className="h-px flex-1 bg-[var(--border)]" />
    </div>
  );
}

export function BudgetTypeToggle({
  value,
  onChange,
}: {
  value: 'Daily' | 'Lifetime';
  onChange: (v: 'Daily' | 'Lifetime') => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--input)] overflow-hidden">
      {(['Daily', 'Lifetime'] as const).map((t) => {
        const active = value === t;
        const tint = t === 'Daily' ? 'rgba(56,189,248,0.18)' : 'rgba(167,139,250,0.18)';
        const fg = t === 'Daily' ? COLORS.daily : COLORS.lifetime;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors"
            style={{
              background: active ? tint : 'transparent',
              color: active ? fg : 'var(--muted-foreground)',
              borderRight: t === 'Daily' ? '1px solid var(--border)' : 'none',
            }}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

export function BudgetSourceToggle({
  value,
  onChange,
}: {
  value: 'base' | 'added' | 'split';
  onChange: (v: 'base' | 'added' | 'split') => void;
}) {
  const opts = ['base', 'added', 'split'] as const;
  return (
    <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--input)] overflow-hidden">
      {opts.map((t, i) => {
        const active = value === t;
        const tint =
          t === 'base'
            ? 'rgba(56,189,248,0.18)'
            : t === 'added'
              ? 'rgba(52,211,153,0.18)'
              : 'rgba(167,139,250,0.22)';
        const fg =
          t === 'base'
            ? COLORS.base
            : t === 'added'
              ? COLORS.added
              : COLORS.lifetime;
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className="px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors"
            style={{
              background: active ? tint : 'transparent',
              color: active ? fg : 'var(--muted-foreground)',
              borderRight: i < opts.length - 1 ? '1px solid var(--border)' : 'none',
            }}
            title={
              t === 'split'
                ? 'Split — allocation drawn from both Base and Added budgets'
                : undefined
            }
          >
            {t === 'base' ? 'Base' : t === 'added' ? 'Added' : 'Split'}
          </button>
        );
      })}
    </div>
  );
}

// ─── User picker (department-filtered) ─────────────────────────────────────
// Each role's picker pre-filters the directory to people in these departments
// (with a "Show all users" toggle to fall back to the full list). Mappings
// reflect the renamed PACER_DEPARTMENTS list.
export function UserPicker({
  users,
  value,
  onChange,
  filterFor,
  placeholder = '— Unassigned —',
}: {
  users: DirectoryUser[];
  value: string | null;
  onChange: (v: string | null) => void;
  filterFor: keyof typeof USER_DEPT_FILTERS;
  placeholder?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const allowedDepts = USER_DEPT_FILTERS[filterFor];

  const filteredUsers = useMemo(() => {
    const matched = users.filter((u) =>
      u.department ? (allowedDepts as readonly string[]).includes(u.department) : false,
    );
    return showAll ? users : matched;
  }, [users, showAll, allowedDepts]);

  // If selected user isn't in filtered list, ensure they still render
  const selected = users.find((u) => u.id === value);
  const finalList = useMemo(() => {
    if (selected && !filteredUsers.some((u) => u.id === selected.id)) {
      return [selected, ...filteredUsers];
    }
    return filteredUsers;
  }, [selected, filteredUsers]);

  return (
    <div className="space-y-1.5">
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className={inputClass}
      >
        <option value="">{placeholder}</option>
        {finalList.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
            {u.department ? ` · ${u.department}` : ''}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setShowAll((p) => !p)}
        className="text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
      >
        {showAll ? 'Showing all users · filter to department' : 'Show all users'}
      </button>
    </div>
  );
}
