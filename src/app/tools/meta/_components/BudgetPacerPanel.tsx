'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  BoltIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from '@/lib/toast';
import { useLoomiDialog } from '@/contexts/loomi-dialog-context';
import { fmt, num } from '../_lib/helpers';
import { classifyPacerHealth } from '../_lib/health';
import { effMarkupOf, effectiveSpendTarget } from '../_lib/markup';
import { buildPacerCalc, effectiveActual, isLifetimeInProgress } from '../_lib/pacer-calc';
import { COLORS } from '../_lib/constants';
import { EMPTY_FILTERS, applyFilters } from '../_lib/filters';
import type { PlanFilters } from '../_lib/filters';
import type { PacerAd, PacerPlan } from '../_lib/types';
import { usePacerReadOnly } from './pacer-context';
import { FilterStatus } from './FilterSidebar';
import { PacerRow } from './PacerRow';
import type { MetaAdSetOption } from './AdSetLinkPicker';

// ─── Budget Pacer panel ────────────────────────────────────────────────────
export interface AccountPacing {
  // 'final' = a settled (frozen/closed) month's final variance (colored
  // over/under verdict). 'progress' = a LIVE month's plain spend-of-target
  // readout — deliberately NOT a pace verdict, so a mid-month "60% spent" can't
  // false-alarm as "under"; the per-ad pacing badges carry the on-pace judgment.
  mode: 'progress' | 'final';
  pct: number; // spent ÷ target × 100
  status: 'on-track' | 'over' | 'under' | 'neutral'; // 'progress' is always neutral
  spent: number; // account actual spend
  target: number; // effective spend target (client budget × markup + carryover)
  dayElapsed: number; // live only: day-of-month so the % reads in context
  dayTotal: number;
}

export function PacerSpendTotals({
  base,
  added,
  actual,
  pacing,
}: {
  base: number;
  added: number;
  actual: number;
  // Account-wide pacing vs TIME-ADJUSTED expected spend (Change 9), aggregated
  // per-ad (finished ads contribute full target, mid-flight ads prorated).
  pacing?: AccountPacing | null;
}) {
  const isFinal = pacing?.mode === 'final';
  const isProgress = pacing?.mode === 'progress';
  // 'final' = a colored over/under verdict; 'progress' = a neutral readout.
  const pacingColor =
    pacing == null
      ? undefined
      : isProgress
        ? 'var(--muted-foreground)'
        : pacing.status === 'on-track'
          ? COLORS.success
          : pacing.status === 'over'
            ? COLORS.error
            : COLORS.warn;
  const pacingHeader = isFinal ? 'Final variance' : 'Spend progress';
  const pacingTitle = isFinal
    ? "Settled month: total actual spend vs the account's effective target (client budget × markup + carryover) — the final over/under, matching the Over/Under page."
    : "Account spend so far vs the month's effective target (client budget × markup + carryover), with day-of-month context. A plain progress readout — NOT a pace verdict; read the per-ad pacing badges for on-track health.";
  const pacingLabel =
    pacing == null
      ? ''
      : isFinal
        ? pacing.status === 'on-track'
          ? 'On target'
          : `${pacing.pct - 100 > 0 ? '+' : ''}${(pacing.pct - 100).toFixed(1)}% ${
              pacing.status === 'over' ? 'over' : 'under'
            }`
        : `${pacing.pct.toFixed(0)}% of target · day ${pacing.dayElapsed}/${pacing.dayTotal}`;
  return (
    <div className="flex flex-wrap gap-6 items-center justify-end">
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
          Total Spend
        </div>
        <div className="text-lg font-bold text-[var(--foreground)]">
          {fmt(base + added)}
        </div>
      </div>
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
          Actual (Pacer)
        </div>
        <div className="text-lg font-bold" style={{ color: COLORS.lifetime }}>
          {fmt(actual)}
        </div>
      </div>
      {pacing && pacingColor && (
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
            {pacingHeader}
          </div>
          <span
            className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded mt-0.5"
            style={
              isProgress
                ? { background: 'var(--muted)', color: 'var(--foreground)' }
                : { background: `${pacingColor}22`, color: pacingColor }
            }
            title={pacingTitle}
          >
            {pacingLabel}
          </span>
        </div>
      )}
    </div>
  );
}

export function BudgetPacerPanel({
  plan,
  filters,
  onFiltersChange,
  currentUserId,
  onChange,
  totals,
  accountKey,
}: {
  plan: PacerPlan;
  filters: PlanFilters;
  onFiltersChange: (next: PlanFilters) => void;
  currentUserId: string | null;
  onChange: (p: PacerPlan) => void;
  totals: { base: number; added: number; actual: number };
  accountKey: string;
}) {
  const { confirm } = useLoomiDialog();
  // Per-ad expand state. Auto-seeded on first render (and on plan
  // changes) so rows that need attention are open by default; rep can
  // still toggle each manually.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const seededExpandedRef = useRef(false);
  // Cross-month reassurance note is dismissible (X) — once closed it stays
  // hidden for this view.
  const [crossMonthNoteDismissed, setCrossMonthNoteDismissed] = useState(false);

  const updateAd = (u: PacerAd) =>
    onChange({ ...plan, ads: plan.ads.map((a) => (a.id === u.id ? u : a)) });

  // Lazy-loaded Meta ad-set list for the per-row link picker. Fetched once on
  // first picker focus, then shared across every row.
  const [metaAdSets, setMetaAdSets] = useState<MetaAdSetOption[] | null>(null);
  const [adSetsLoading, setAdSetsLoading] = useState(false);
  const [adSetsError, setAdSetsError] = useState<string | null>(null);
  const loadMetaAdSets = useCallback(async () => {
    if (metaAdSets || adSetsLoading) return;
    setAdSetsLoading(true);
    setAdSetsError(null);
    try {
      const res = await fetch(`/api/meta-ads-pacer/${accountKey}/meta-adsets`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setAdSetsError(data?.error || 'Failed to load ad sets.');
        return;
      }
      setMetaAdSets(Array.isArray(data?.adSets) ? data.adSets : []);
    } catch {
      setAdSetsError('Failed to load ad sets.');
    } finally {
      setAdSetsLoading(false);
    }
  }, [accountKey, metaAdSets, adSetsLoading]);

  // Write a row's edited daily budget back to its linked Meta ad set. Returns a
  // result the row renders inline (the agency token needs `ads_management`, so
  // a read-only token surfaces Meta's permission error here).
  const pushDailyBudget = useCallback(
    async (adId: string, value: string): Promise<{ ok: boolean; text: string }> => {
      try {
        const res = await fetch(
          `/api/meta-ads-pacer/${accountKey}/push-budget?period=${plan.period}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adId, dailyBudget: value }),
          },
        );
        const data = await res.json().catch(() => null);
        if (!res.ok) return { ok: false, text: data?.error || 'Push failed.' };
        return { ok: true, text: 'Pushed to Meta ✓' };
      } catch {
        return { ok: false, text: 'Push failed — network error.' };
      }
    },
    [accountKey, plan.period],
  );

  // §2: resolve a cross-month straddler (count its full run in its own month),
  // set a lifetime planned split, or clear. Optimistically updates the ad's
  // persisted resolution fields, then writes through the dedicated endpoint
  // (server-authoritative, so a re-sync or autosave can't clobber it).
  const resolveCrossMonth = useCallback(
    async (
      adId: string,
      action: 'apply_full_run' | 'split' | 'clear',
      splitMap?: Record<string, number>,
    ) => {
      // The CTA is disabled when frozen and the endpoint rejects a frozen
      // month (409), so no client-side readOnly guard is needed here.
      const prior = plan.ads.find((a) => a.id === adId);
      onChange({
        ...plan,
        ads: plan.ads.map((a) =>
          a.id === adId
            ? {
                ...a,
                fullRunAppliedToMonth:
                  action === 'apply_full_run' ? plan.period : null,
                lifetimeMonthSplit:
                  action === 'split' ? JSON.stringify(splitMap ?? {}) : null,
              }
            : a,
        ),
      });
      try {
        const res = await fetch(
          `/api/meta-ads-pacer/${accountKey}/resolve-cross-month?period=${plan.period}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              adId,
              action,
              ...(action === 'split' ? { splitMap } : {}),
            }),
          },
        );
        if (!res.ok) {
          const d = await res.json().catch(() => null);
          toast.error(d?.error || 'Failed to update cross-month resolution.');
          if (prior) {
            onChange({
              ...plan,
              ads: plan.ads.map((a) => (a.id === adId ? prior : a)),
            });
          }
        }
      } catch {
        toast.error('Failed to update cross-month resolution — network error.');
        if (prior) {
          onChange({
            ...plan,
            ads: plan.ads.map((a) => (a.id === adId ? prior : a)),
          });
        }
      }
    },
    [accountKey, plan, onChange],
  );

  const visibleAds = useMemo(
    () => applyFilters(plan.ads, filters, currentUserId),
    [plan.ads, filters, currentUserId],
  );
  const readOnly = usePacerReadOnly();

  // Account-wide pacing (§7): roll up per-ad pace over §0.2-ELIGIBLE ads only
  // (live, started, daily) so a completed run, a lifetime ad, or a not-yet-
  // started ad can't drag the account into a false under. Each eligible ad is
  // prorated against its OWN flight window (clampToMonth), never the calendar
  // month, and TOTAL SPEND is never the denominator. A frozen/closed month
  // isn't paced — it shows the settled final variance vs the effective target
  // (§0.1), the same number the Over/Under page reports.
  const accountPacing = useMemo<AccountPacing | null>(() => {
    const nowMs = Date.now();

    if (plan.frozen) {
      const gross =
        (num(plan.baseBudgetGoal) ?? 0) + (num(plan.addedBudgetGoal) ?? 0);
      const carry =
        (num(plan.baseCarryover) ?? 0) + (num(plan.addedCarryover) ?? 0);
      const target = effectiveSpendTarget(gross, effMarkupOf(plan.markup), carry);
      // §3: exclude any lifetime ad still in progress from BOTH sides — rare in
      // a settled month, but a flight extending past month-end can linger — so
      // this Final-variance badge matches the Over/Under + Reconciliation pages
      // (a no-op when no lifetime ad is mid-run).
      let ipLifeActual = 0;
      let ipLifeAlloc = 0;
      for (const ad of plan.ads) {
        if (!isLifetimeInProgress(ad, nowMs, plan.timeZone)) continue;
        ipLifeActual += effectiveActual(ad);
        ipLifeAlloc += num(ad.allocation) ?? 0;
      }
      const baseTarget = target - ipLifeAlloc;
      if (baseTarget <= 0) return null;
      const pct = ((totals.actual - ipLifeActual) / baseTarget) * 100;
      const delta = pct - 100;
      // Settled: report the exact final variance, no pacing tolerance band.
      const status =
        Math.abs(delta) < 0.5 ? 'on-track' : delta > 0 ? 'over' : 'under';
      return {
        mode: 'final',
        pct,
        status,
        spent: totals.actual - ipLifeActual,
        target: baseTarget,
        dayElapsed: 0,
        dayTotal: 0,
      };
    }

    // Live month: a plain spend-of-target progress readout — NOT a pace verdict.
    // The per-ad pacing badges carry the "are we on pace?" judgment; this just
    // answers "how much of the month's target have we spent, and how far into
    // the month are we" — neutral, so it can't false-alarm. (The §9 account-pace
    // alert still uses computeAccountPace server-side — a separate surface.)
    const gross =
      (num(plan.baseBudgetGoal) ?? 0) + (num(plan.addedBudgetGoal) ?? 0);
    const carry =
      (num(plan.baseCarryover) ?? 0) + (num(plan.addedCarryover) ?? 0);
    const target = effectiveSpendTarget(gross, effMarkupOf(plan.markup), carry);
    // §3 / §0.4: exclude in-progress lifetime ads from BOTH sides, exactly like
    // the frozen path + the Over/Under page — their variance books on completion,
    // so they aren't part of the settle-able spend progress yet (keeps the badge
    // agreeing with those surfaces).
    let ipLifeActual = 0;
    let ipLifeAlloc = 0;
    for (const ad of plan.ads) {
      if (!isLifetimeInProgress(ad, nowMs, plan.timeZone)) continue;
      ipLifeActual += effectiveActual(ad);
      ipLifeAlloc += num(ad.allocation) ?? 0;
    }
    const baseTarget = target - ipLifeAlloc;
    const baseSpent = totals.actual - ipLifeActual;
    if (baseTarget <= 0) return null;
    const now = new Date(nowMs);
    const [py, pm] = plan.period.split('-').map(Number);
    const dayTotal = new Date(py, pm, 0).getDate();
    const todayMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const dayElapsed =
      todayMonth === plan.period ? now.getDate() : todayMonth > plan.period ? dayTotal : 0;
    return {
      mode: 'progress',
      pct: (baseSpent / baseTarget) * 100,
      status: 'neutral',
      spent: baseSpent,
      target: baseTarget,
      dayElapsed,
      dayTotal,
    };
  }, [plan, totals.actual]);

  // Auto-expand needs-attention rows ONCE per mount so the rep lands on
  // the things that need work. Re-running on plan change would fight
  // the user's manual collapses; we instead seed once and let the user
  // own the state from there.
  useEffect(() => {
    if (seededExpandedRef.current) return;
    if (plan.ads.length === 0) return;
    seededExpandedRef.current = true;
    const next = new Set<string>();
    const nowMs = Date.now();
    plan.ads.forEach((ad) => {
      const c = buildPacerCalc(ad, nowMs, plan.timeZone);
      const h = classifyPacerHealth(ad, c);
      if (h.state === 'over-budget' || h.state === 'overpacing') {
        next.add(ad.id);
      }
    });
    if (next.size > 0) setExpandedIds(next);
  }, [plan.ads, plan.timeZone]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Bulk "Set all dailies to Rec." — applies recommended daily to every
  // visible non-lifetime, non-stopped ad that has a valid recDaily.
  const bulkSetDailies = async () => {
    if (readOnly) return; // frozen month — bulk apply is disabled
    const nowMs = Date.now();
    const candidates = visibleAds.filter((ad) => {
      if (ad.budgetType !== 'Daily') return false;
      if (ad.adStatus === 'Off' || ad.adStatus === 'Completed Run') return false;
      const c = buildPacerCalc(ad, nowMs, plan.timeZone);
      return c.daysLeft > 0 && c.budget > 0 && c.recDaily > 0;
    });
    if (candidates.length === 0) {
      toast.error('No visible ads have a recommended daily to apply');
      return;
    }
    // Guardrail: a >20% single-day budget change can reset Meta's learning
    // phase. Preview how many ads jump that much (from a non-zero current
    // daily) so a blind "set all" can't quietly reset several at once.
    const bigJumps = candidates.filter((ad) => {
      const current = num(ad.pacerDailyBudget) ?? 0;
      if (current <= 0) return false; // first-time set, not a learning-reset jump
      const rec = buildPacerCalc(ad, nowMs, plan.timeZone).recDaily;
      return Math.abs(rec - current) / current > 0.2;
    });
    const adWord = candidates.length === 1 ? 'ad' : 'ads';
    const message =
      bigJumps.length > 0
        ? `This will change ${candidates.length} ${adWord}. ${bigJumps.length} ${
            bigJumps.length === 1 ? 'is a' : 'are'
          } >20% jump${bigJumps.length === 1 ? '' : 's'} — large changes can reset Meta's learning phase: ${bigJumps
            .map((a) => a.name || 'Untitled')
            .join(', ')}.`
        : `Apply the recommended daily budget to ${candidates.length} visible ${adWord}?`;
    const ok = await confirm({
      title: 'Set dailies to recommended',
      message,
      confirmLabel: `Apply to ${candidates.length} ${adWord}`,
    });
    if (!ok) return;
    const candidateIds = new Set(candidates.map((a) => a.id));
    onChange({
      ...plan,
      ads: plan.ads.map((ad) => {
        if (!candidateIds.has(ad.id)) return ad;
        const c = buildPacerCalc(ad, nowMs, plan.timeZone);
        return {
          ...ad,
          pacerDailyBudget: c.recDaily.toFixed(2),
        };
      }),
    });
    toast.success(
      `Set daily budget on ${candidates.length} ad${candidates.length === 1 ? '' : 's'} to recommended`,
    );
  };

  // Budget Log + Change Log moved to the account scope row (lifted to the
  // parent), so they're no longer rendered from this panel.
  const bulkDailyButton = readOnly ? null : (
    <button
      type="button"
      onClick={bulkSetDailies}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium rounded-lg border border-[var(--primary)]/30 bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors"
      title="Set every visible ad's daily budget to its recommended value"
    >
      <BoltIcon className="w-3.5 h-3.5" />
      Set all dailies to Rec.
    </button>
  );

  if (plan.ads.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <h2 className="m-0 flex items-center gap-2 text-base font-bold tracking-tight text-[var(--foreground)]">
            <ChartBarIcon className="w-4 h-4" />
            Spend Pacing
          </h2>
          <div className="flex items-center gap-4 flex-wrap">
            <PacerSpendTotals
              base={totals.base}
              added={totals.added}
              actual={totals.actual}
            />
          </div>
        </div>
        <div className="glass-section-card rounded-xl px-6 py-12 text-center">
          <ClipboardDocumentListIcon className="w-10 h-10 mx-auto mb-3 text-[var(--muted-foreground)]" />
          <div className="text-sm text-[var(--foreground)] font-medium mb-1">
            No ads in your plan yet.
          </div>
          <div className="text-xs text-[var(--muted-foreground)]">
            Add ads in the Ad Planner tab and they'll appear here automatically.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <h2 className="m-0 flex items-center gap-2 text-base font-bold tracking-tight text-[var(--foreground)]">
          <ChartBarIcon className="w-4 h-4" />
          {`Spend Pacing (${visibleAds.length}${
            visibleAds.length !== plan.ads.length ? ` of ${plan.ads.length}` : ''
          } ad${plan.ads.length !== 1 ? 's' : ''})`}
        </h2>
        <div className="flex items-center gap-4 flex-wrap">
          <PacerSpendTotals
            base={totals.base}
            added={totals.added}
            actual={totals.actual}
            pacing={accountPacing}
          />
        </div>
      </div>
      {(() => {
        // Reassurance that an odd-looking total is explained — driven by the
        // user's MANUAL cross-month marks (no auto-detection): a billed
        // cross-month ad counts its full run in the over/under though only its
        // in-month slice lands in the month total.
        const crossMonthCount = visibleAds.filter(
          (a) => a.fullRunAppliedToMonth != null,
        ).length;
        if (crossMonthCount === 0 || crossMonthNoteDismissed) return null;
        return (
          <div
            className="mb-3 flex items-start justify-between gap-3 rounded-md border px-2.5 py-1.5 text-[11px]"
            style={{
              borderColor: 'rgba(249,115,22,0.3)',
              background: 'rgba(249,115,22,0.08)',
              color: '#f97316',
            }}
          >
            <span>
              {crossMonthCount} ad{crossMonthCount === 1 ? '' : 's'} billed
              cross-month — the full run is counted in the over/under though part
              spent in another month, so the monthly total can differ (expand a
              flagged row for details).
            </span>
            <button
              type="button"
              onClick={() => setCrossMonthNoteDismissed(true)}
              aria-label="Dismiss"
              title="Dismiss"
              className="flex-shrink-0 -mr-0.5 rounded p-0.5 hover:bg-[var(--muted)] transition-colors"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })()}
      <FilterStatus
        filters={filters}
        onClear={() => onFiltersChange(EMPTY_FILTERS)}
        filteredCount={visibleAds.length}
        totalCount={plan.ads.length}
      />
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <p className="m-0 text-[11px] text-[var(--muted-foreground)] max-w-[640px]">
          Click any row to expand. Rows that need attention (overpacing or
          over-budget) are auto-expanded; the rest stay collapsed.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() =>
              setExpandedIds(new Set(visibleAds.map((a) => a.id)))
            }
            className="text-[11px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline-offset-2 hover:underline"
          >
            Expand all
          </button>
          <button
            type="button"
            onClick={() => setExpandedIds(new Set())}
            className="text-[11px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline-offset-2 hover:underline"
          >
            Collapse all
          </button>
          {bulkDailyButton}
        </div>
      </div>
      {visibleAds.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] py-10 px-6 text-center text-sm text-[var(--muted-foreground)]">
          No ads match the current filters.
        </div>
      ) : (
        visibleAds.map((ad) => (
          <PacerRow
            key={`${ad.id}-${ad.budgetType}`}
            ad={ad}
            index={plan.ads.findIndex((a) => a.id === ad.id)}
            timeZone={plan.timeZone}
            onActualChange={(v) => updateAd({ ...ad, pacerActual: v })}
            onDailyBudgetChange={(v) => updateAd({ ...ad, pacerDailyBudget: v })}
            expanded={expandedIds.has(ad.id)}
            onToggleExpanded={() => toggleExpanded(ad.id)}
            adSets={metaAdSets}
            adSetsLoading={adSetsLoading}
            adSetsError={adSetsError}
            onLoadAdSets={loadMetaAdSets}
            onLinkChange={(adSetId) =>
              updateAd({
                ...ad,
                metaObjectId: adSetId,
                metaObjectType: adSetId ? 'adset' : null,
              })
            }
            onMuteToggle={() =>
              updateAd({ ...ad, alertsMuted: !ad.alertsMuted })
            }
            onMarkOff={() => updateAd({ ...ad, adStatus: 'Off' })}
            onPushDailyBudget={(value) => pushDailyBudget(ad.id, value)}
            onResolveCrossMonth={(action, splitMap) =>
              resolveCrossMonth(ad.id, action, splitMap)
            }
            siblings={plan.siblingsByName?.[ad.name] ?? null}
          />
        ))
      )}
    </div>
  );
}
