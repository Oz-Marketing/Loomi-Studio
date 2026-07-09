'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowTopRightOnSquareIcon,
  CalendarIcon,
  ChartBarIcon,
  ChatBubbleOvalLeftIcon,
  CheckBadgeIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PaintBrushIcon,
  PencilSquareIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { DatePicker, toIso as datePickerToIso } from '@/components/ui/date-picker';
import { fmt, num, calcDays, autoDueDateFromFlightStart } from '../_lib/helpers';
import { effMarkupOf } from '../_lib/markup';
import {
  COLORS,
  AD_STATUSES,
  DESIGN_STATUSES,
  APPROVAL_STATUSES,
  ACTION_NEEDED,
  RECURRING_OPTS,
  COOP_OPTS,
  AD_STATUS_COLORS,
} from '../_lib/constants';
import { flightDatePresets, TODAY_PRESET } from '../_lib/period';
import type { PacerAd, DirectoryUser, ActivityEntry } from '../_lib/types';
import { usePacerReadOnly } from './pacer-context';
import {
  DollarInput,
  Field,
  ApprovalPill,
  StatusSelect,
  MetricBox,
  Divider,
  BudgetTypeToggle,
  BudgetSourceToggle,
  UserPicker,
  inputClass,
  readonlyClass,
  DESIGN_STATUS_COLORS,
  APPROVAL_STATUS_COLORS,
} from './primitives';
import { ActivityLogPanel } from './ActivityLogPanel';

// ─── Plan Ad Form — full editable form, used inside the editor modal ───────
export function PlanAdForm({
  ad,
  users,
  onUpdate,
  markup,
}: {
  ad: PacerAd;
  users: DirectoryUser[];
  onUpdate: (ad: PacerAd) => void;
  // §0.1: resolved per-account factor (override, else agency default), passed
  // down so the Gross Allocation display grosses up at the right rate.
  markup: number | null;
}) {
  const days = calcDays(ad.flightStart, ad.flightEnd);
  const allocation = num(ad.allocation) ?? 0;

  const userById = useMemo(() => {
    const m = new Map<string, DirectoryUser>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);
  const accountRepUser = ad.accountRepUserId ? userById.get(ad.accountRepUserId) : null;

  const designOverdue = (() => {
    if (!ad.creativeDueDate || ad.designStatus === 'Approved') return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(ad.creativeDueDate + 'T00:00:00');
    const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000);
    if (diff < 0)
      return {
        icon: <ExclamationTriangleIcon className="w-3.5 h-3.5" />,
        label: `Overdue ${Math.abs(diff)}d`,
        bg: 'rgba(239,68,68,0.18)',
        color: '#fca5a5',
      };
    if (diff === 0)
      return {
        icon: <ExclamationTriangleIcon className="w-3.5 h-3.5" />,
        label: 'Due today',
        bg: 'rgba(252,211,77,0.18)',
        color: '#fcd34d',
      };
    if (diff <= 3)
      return {
        icon: <ClockIcon className="w-3.5 h-3.5" />,
        label: `Due in ${diff}d`,
        bg: 'rgba(252,211,77,0.18)',
        color: '#fcd34d',
      };
    if (diff <= 7)
      return {
        icon: <CalendarIcon className="w-3.5 h-3.5" />,
        label: `Due in ${diff}d`,
        bg: 'rgba(190,242,100,0.18)',
        color: '#bef264',
      };
    return null;
  })();

  return (
    <div>
          <Divider
            icon={<ClipboardDocumentListIcon className="w-3 h-3" />}
            label="Ad Details"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-3 max-w-2xl">
            <Field label="Owner / Assigned To">
              <UserPicker
                users={users}
                value={ad.ownerUserId}
                filterFor="owner"
                onChange={(v) => onUpdate({ ...ad, ownerUserId: v })}
              />
            </Field>
          </div>

          <div className="mb-3">
            <Field label="Digital Details">
              <textarea
                value={ad.digitalDetails ?? ''}
                onChange={(e) =>
                  onUpdate({ ...ad, digitalDetails: e.target.value || null })
                }
                rows={4}
                placeholder="Goal, audience, targeting notes, copy direction…"
                className={`${inputClass} resize-y leading-relaxed min-h-[88px]`}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-3">
            <Field label="Action Needed">
              <select
                value={ad.actionNeeded ?? ''}
                onChange={(e) =>
                  onUpdate({ ...ad, actionNeeded: e.target.value || null })
                }
                className={inputClass}
              >
                <option value="">—</option>
                {ACTION_NEEDED.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Recurring?">
              <select
                value={ad.recurring}
                onChange={(e) => onUpdate({ ...ad, recurring: e.target.value })}
                className={inputClass}
              >
                {RECURRING_OPTS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Co-op?">
              <select
                value={ad.coop}
                onChange={(e) => onUpdate({ ...ad, coop: e.target.value })}
                className={inputClass}
              >
                {COOP_OPTS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ad Status">
              <StatusSelect
                value={ad.adStatus}
                options={AD_STATUSES}
                colorMap={AD_STATUS_COLORS}
                onChange={(newStatus) => {
                  const today = datePickerToIso(new Date());
                  onUpdate({
                    ...ad,
                    adStatus: newStatus,
                    dateCompleted:
                      newStatus === 'Live' && !ad.dateCompleted
                        ? today
                        : ad.dateCompleted,
                  });
                }}
                ariaLabel="Ad status"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-3 max-w-2xl">
            <Field label="Due Date">
              <div className="relative">
                <DatePicker
                  value={ad.dueDate}
                  onChange={(v) => onUpdate({ ...ad, dueDate: v })}
                  placeholder="Pick a date"
                  presets={[TODAY_PRESET]}
                />
                {ad.dueDate &&
                  ad.flightStart &&
                  ad.dueDate === autoDueDateFromFlightStart(ad.flightStart) && (
                    <span
                      className="mt-1 inline-block text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: COLORS.daily }}
                    >
                      ● Auto-set from flight start
                    </span>
                  )}
              </div>
            </Field>
            <Field label="Date Completed">
              <div className="relative">
                <DatePicker
                  value={ad.dateCompleted}
                  onChange={(v) => onUpdate({ ...ad, dateCompleted: v })}
                  placeholder="Pick a date"
                  presets={[TODAY_PRESET]}
                />
                {ad.dateCompleted && ad.adStatus === 'Live' && (
                  <span
                    className="mt-1 inline-block text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: COLORS.success }}
                  >
                    ● Auto-filled when set Live
                  </span>
                )}
              </div>
            </Field>
          </div>

          {/* Flight Dates */}
          <Divider icon={<CalendarIcon className="w-3 h-3" />} label="Flight Dates" />
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-2.5 mb-3">
            <Field label="Flight Range (Start – End)">
              <DatePicker
                mode="range"
                value={{ start: ad.flightStart, end: ad.flightEnd }}
                onChange={(r) => {
                  const next = r.start;
                  const previousAuto = autoDueDateFromFlightStart(ad.flightStart);
                  const dueDateIsAuto =
                    ad.dueDate == null || ad.dueDate === previousAuto;
                  onUpdate({
                    ...ad,
                    flightStart: r.start,
                    flightEnd: r.end,
                    dueDate: dueDateIsAuto
                      ? autoDueDateFromFlightStart(next)
                      : ad.dueDate,
                  });
                }}
                placeholder="Click & drag to select flight window"
                presets={flightDatePresets(ad.period)}
              />
            </Field>
            <Field label="Actual Live Date" color={COLORS.success}>
              <DatePicker
                value={ad.liveDate}
                onChange={(v) => onUpdate({ ...ad, liveDate: v })}
                placeholder="Not yet live"
                presets={[TODAY_PRESET]}
              />
              {ad.liveDate && ad.flightStart && ad.liveDate > ad.flightStart && (
                <span
                  className="mt-1 inline-block text-[10px] font-bold"
                  style={{ color: COLORS.warn }}
                >
                  +{calcDays(ad.flightStart, ad.liveDate) - 1}d late
                </span>
              )}
            </Field>
            <Field label="Effective Duration">
              <div
                className={`${readonlyClass} font-bold`}
                style={{
                  color:
                    ad.liveDate && ad.flightEnd
                      ? COLORS.success
                      : days > 0
                        ? COLORS.daily
                        : 'var(--muted-foreground)',
                }}
              >
                {ad.liveDate && ad.flightEnd
                  ? `${calcDays(ad.liveDate, ad.flightEnd)} days`
                  : days > 0
                    ? `${days} days`
                    : 'Set dates'}
              </div>
            </Field>
          </div>

          {/* Budget */}
          <Divider icon={<ChartBarIcon className="w-3 h-3" />} label="Budget" />
          <div className="flex flex-wrap gap-2.5 mb-3 items-end">
            <Field label="Budget Type">
              <BudgetTypeToggle
                value={ad.budgetType}
                onChange={(v) => onUpdate({ ...ad, budgetType: v })}
              />
            </Field>
            <Field label="Budget Source">
              <BudgetSourceToggle
                value={ad.budgetSource}
                onChange={(v) => onUpdate({ ...ad, budgetSource: v })}
              />
            </Field>
          </div>
          <div className="mb-3 flex flex-wrap gap-3 items-end">
            <Field
              label="Actual Spend Amount"
              color={
                ad.budgetSource === 'base'
                  ? COLORS.base
                  : ad.budgetSource === 'added'
                    ? COLORS.added
                    : COLORS.lifetime
              }
            >
              {/* Sized for ~$999,999.99 — wide enough for 6 digits + cents
                  without dominating the form like a full-width input. */}
              <div className="w-[180px]">
                <DollarInput
                  value={ad.allocation}
                  onChange={(v) => onUpdate({ ...ad, allocation: v })}
                  placeholder="0.00"
                />
              </div>
            </Field>
            {ad.budgetSource === 'split' && (
              <Field label="Base Portion" color={COLORS.base}>
                <div className="w-[160px]">
                  <DollarInput
                    value={ad.splitBaseAmount}
                    onChange={(v) =>
                      onUpdate({ ...ad, splitBaseAmount: v ?? null })
                    }
                    placeholder="0.00"
                  />
                </div>
              </Field>
            )}
          </div>

          {ad.budgetSource === 'split' && allocation > 0 && (
            <div className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30 px-3 py-2 text-[11px] text-[var(--muted-foreground)]">
              {(() => {
                const baseAlloc = Math.min(
                  Math.max(0, num(ad.splitBaseAmount) ?? 0),
                  allocation,
                );
                const addedAlloc = allocation - baseAlloc;
                return (
                  <>
                    <span style={{ color: COLORS.base }} className="font-semibold">
                      Base: {fmt(baseAlloc)}
                    </span>
                    {' · '}
                    <span style={{ color: COLORS.added }} className="font-semibold">
                      Added: {fmt(addedAlloc)}
                    </span>
                    {baseAlloc > allocation && (
                      <span style={{ color: COLORS.error }} className="ml-2">
                        Base Portion exceeds the total allocation
                      </span>
                    )}
                  </>
                );
              })()}
            </div>
          )}

          {allocation > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
              <MetricBox
                label="Gross Allocation"
                value={
                  effMarkupOf(markup) > 0
                    ? fmt(Math.round((allocation / effMarkupOf(markup)) * 100) / 100)
                    : '—'
                }
                sub="client budget"
              />
              <MetricBox
                label="Actual Spend"
                value={fmt(allocation)}
                color={
                  ad.budgetSource === 'base'
                    ? COLORS.base
                    : ad.budgetSource === 'added'
                      ? COLORS.added
                      : COLORS.lifetime
                }
              />
            </div>
          )}

          {/* Creative & Design */}
          <Divider
            icon={<PaintBrushIcon className="w-3 h-3" />}
            label="Creative & Design"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 mb-3">
            <Field label="Design Status">
              <StatusSelect
                value={ad.designStatus}
                options={DESIGN_STATUSES}
                colorMap={DESIGN_STATUS_COLORS}
                onChange={(v) => onUpdate({ ...ad, designStatus: v })}
                ariaLabel="Design status"
              />
            </Field>
            <Field label="Designer Assigned">
              <UserPicker
                users={users}
                value={ad.designerUserId}
                filterFor="designer"
                onChange={(v) => onUpdate({ ...ad, designerUserId: v })}
              />
            </Field>
            <Field label="Creative Due Date">
              <DatePicker
                value={ad.creativeDueDate}
                onChange={(v) => onUpdate({ ...ad, creativeDueDate: v })}
                placeholder="Pick a date"
                presets={[TODAY_PRESET]}
              />
              {designOverdue && (
                <div
                  className="mt-1.5 flex items-center gap-1.5 px-2 py-1 rounded-md border"
                  style={{
                    background: designOverdue.bg,
                    borderColor: `${designOverdue.color}60`,
                    color: designOverdue.color,
                  }}
                >
                  {designOverdue.icon}
                  <span className="text-[10px] font-bold">{designOverdue.label}</span>
                </div>
              )}
            </Field>
          </div>
          <div className="mb-3 max-w-xl">
            <Field label="Creative Link">
              <div className="relative">
                <input
                  value={ad.creativeLink ?? ''}
                  onChange={(e) =>
                    onUpdate({ ...ad, creativeLink: e.target.value || null })
                  }
                  placeholder="https://…"
                  className={`${inputClass} ${ad.creativeLink ? 'pr-10' : ''}`}
                />
                {ad.creativeLink && (
                  <a
                    href={ad.creativeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open creative link in new tab"
                    title="Open in new tab"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded text-[var(--primary)] hover:bg-[var(--muted)] transition-colors"
                  >
                    <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                  </a>
                )}
              </div>
            </Field>
          </div>

          {/* Approvals */}
          <Divider icon={<CheckBadgeIcon className="w-3 h-3" />} label="Approvals" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-3 max-w-2xl">
            <Field label="Account Rep">
              <UserPicker
                users={users}
                value={ad.accountRepUserId}
                filterFor="accountRep"
                onChange={(v) => onUpdate({ ...ad, accountRepUserId: v })}
              />
            </Field>
            <Field label="Client Name">
              <input
                value={ad.clientName ?? ''}
                onChange={(e) =>
                  onUpdate({ ...ad, clientName: e.target.value || null })
                }
                placeholder="Client decision-maker name…"
                className={inputClass}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mb-3 max-w-2xl">
            <Field label="Internal Approval">
              <StatusSelect
                value={ad.internalApproval}
                options={APPROVAL_STATUSES}
                colorMap={APPROVAL_STATUS_COLORS}
                onChange={(v) => onUpdate({ ...ad, internalApproval: v })}
                ariaLabel="Internal approval"
              />
            </Field>
            <Field label="Client Approval">
              <StatusSelect
                value={ad.clientApproval}
                options={APPROVAL_STATUSES}
                colorMap={APPROVAL_STATUS_COLORS}
                onChange={(v) => onUpdate({ ...ad, clientApproval: v })}
                ariaLabel="Client approval"
              />
            </Field>
          </div>
          {/* Approval status summary — clearly labeled by source */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-1 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <UserCircleIcon className="w-3.5 h-3.5" />
                Internal
                {accountRepUser && (
                  <span className="ml-1 text-[var(--foreground)] normal-case tracking-normal">
                    · {accountRepUser.name}
                  </span>
                )}
              </span>
              <ApprovalPill status={ad.internalApproval} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                <UserCircleIcon className="w-3.5 h-3.5" />
                Client
                {ad.clientName && (
                  <span className="ml-1 text-[var(--foreground)] normal-case tracking-normal">
                    · {ad.clientName}
                  </span>
                )}
              </span>
              <ApprovalPill status={ad.clientApproval} />
            </div>
          </div>

    </div>
  );
}

// ─── Ad Editor Modal — full-screen modal wrapping PlanAdForm ───────────────
/**
 * Editor modal with a local draft. Form edits stay in the modal until the
 * user clicks Save; Cancel/X with no changes closes immediately, with
 * changes prompts to discard. The parent autosave is paused while this
 * modal is mounted so debounced PUTs don't fire on transient draft state.
 *
 * `mode='create'` means the ad isn't in the plan yet — Save appends it.
 * `mode='edit'` means it's an existing ad — Save replaces it in place.
 */
export function AdEditorModal({
  initialAd,
  markup,
  liveActivityLog,
  mode,
  users,
  currentUserId,
  onSave,
  onCancel,
  onAddActivity,
  onEditActivity,
  onDeleteActivity,
}: {
  initialAd: PacerAd;
  /** §0.1 resolved per-account markup factor, threaded to PlanAdForm. */
  markup: number | null;
  /**
   * The current activity log for this ad pulled from the parent plan. The
   * modal's draft state is for form fields only — activity entries persist
   * immediately and need to read live data so newly posted/edited/deleted
   * entries appear without closing the modal.
   */
  liveActivityLog?: ActivityEntry[];
  mode: 'create' | 'edit';
  users: DirectoryUser[];
  currentUserId: string | null;
  onSave: (ad: PacerAd) => void;
  onCancel: () => void;
  onAddActivity: (adId: string, text: string, file: File | null) => Promise<void>;
  onEditActivity: (adId: string, entryId: string, text: string) => Promise<void>;
  onDeleteActivity: (adId: string, entryId: string) => Promise<void>;
}) {
  const readOnly = usePacerReadOnly();
  const [draft, setDraft] = useState<PacerAd>(initialAd);
  const [editingTitle, setEditingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  // Reset draft if the parent swaps in a different ad while the modal is
  // mounted (e.g. opens a different row). Cheap stringify is enough since
  // PacerAd is plain data with no functions.
  const initialKey = initialAd.id;
  useEffect(() => {
    setDraft(initialAd);
    setEditingTitle(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialKey]);

  useEffect(() => {
    if (editingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [editingTitle]);

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(initialAd),
    [draft, initialAd],
  );

  const tryClose = () => {
    if (
      isDirty &&
      typeof window !== 'undefined' &&
      !window.confirm('Discard unsaved changes?')
    ) {
      return;
    }
    onCancel();
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') tryClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // tryClose is recreated each render; rebinding is fine and cheap.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, initialAd]);

  if (typeof document === 'undefined') return null;

  const accentColor = AD_STATUS_COLORS[draft.adStatus]?.[1] ?? 'var(--border)';

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-stretch justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={tryClose}
      />
      <div className="glass-modal relative my-6 mx-4 w-full max-w-6xl rounded-2xl flex flex-col overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{ background: accentColor }}
        />
        {/* Modal header */}
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <ClipboardDocumentListIcon className="w-5 h-5 text-[var(--primary)] flex-shrink-0" />
            <div className="min-w-0 flex-1">
              {editingTitle ? (
                <input
                  ref={titleInputRef}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  onBlur={() => setEditingTitle(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'Escape') {
                      e.preventDefault();
                      setEditingTitle(false);
                    }
                  }}
                  placeholder="New Ad"
                  className="w-full bg-transparent text-xl font-bold text-[var(--foreground)] focus:outline-none border-b border-[var(--primary)] py-0.5"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingTitle(true)}
                  disabled={readOnly}
                  className="group/title inline-flex items-center gap-2 text-xl font-bold text-[var(--foreground)] truncate max-w-full hover:text-[var(--primary)] transition-colors text-left disabled:hover:text-[var(--foreground)] disabled:cursor-default"
                  title={readOnly ? draft.name?.trim() || 'New Ad' : 'Click to edit ad name'}
                >
                  <span className="truncate">
                    {draft.name?.trim() || 'New Ad'}
                  </span>
                  {!readOnly && (
                    <PencilSquareIcon className="w-4 h-4 flex-shrink-0 opacity-0 group-hover/title:opacity-100 transition-opacity text-[var(--muted-foreground)]" />
                  )}
                </button>
              )}
              <div className="text-[10px] text-[var(--muted-foreground)]">
                {mode === 'create'
                  ? 'Cancel discards this ad. Save adds it to the plan.'
                  : isDirty
                    ? 'Unsaved changes — Save to commit, Cancel to discard.'
                    : 'Click the title to rename.'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={tryClose}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent text-xs font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              Cancel
            </button>
            {!readOnly && (
              <button
                type="button"
                onClick={() => onSave(draft)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--primary)] bg-[var(--primary)]/90 text-white text-xs font-medium hover:bg-[var(--primary)] transition-colors"
              >
                Save
              </button>
            )}
            <button
              type="button"
              onClick={tryClose}
              className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              aria-label="Close"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal body — form on the left, activity log on the right */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[1fr_340px]">
          <div className="themed-scrollbar overflow-y-auto p-5">
            {/* A disabled fieldset (display:contents → no layout change)
                locks every form control at once when the month is frozen. */}
            <fieldset disabled={readOnly} className="contents">
              <PlanAdForm ad={draft} users={users} onUpdate={setDraft} markup={markup} />
            </fieldset>
          </div>
          {mode === 'create' ? (
            <aside className="flex flex-col h-full border-l border-[var(--border)] bg-[var(--muted)]/30 p-6 text-center justify-center">
              <ChatBubbleOvalLeftIcon className="w-8 h-8 text-[var(--muted-foreground)] mx-auto mb-2" />
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                Activity log unlocks once the ad is saved. Click <b>Save</b> to add
                this ad to the plan, then re-open it to leave comments or
                attachments.
              </p>
            </aside>
          ) : (
            <ActivityLogPanel
              // Render with the LIVE activity log (from parent plan) so
              // posts/edits/deletes show up immediately. Form-field draft
              // is unaffected.
              ad={{ ...draft, activityLog: liveActivityLog ?? draft.activityLog }}
              users={users}
              currentUserId={currentUserId}
              onAdd={onAddActivity}
              onEdit={onEditActivity}
              onDelete={onDeleteActivity}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
