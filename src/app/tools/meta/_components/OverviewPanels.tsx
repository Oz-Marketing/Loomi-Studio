'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  ScaleIcon,
} from '@heroicons/react/24/outline';
import { fmt, fmtDate, num, sourceColor, sourceLabel, sourceTint } from '../_lib/helpers';
import { fmtPeriodLong, isValidPeriod } from '../_lib/period';
import { effMarkupOf } from '../_lib/markup';
import { effectiveActual, effectiveTarget } from '../_lib/pacer-calc';
import { COLORS, AD_COLORS } from '../_lib/constants';
import { applyFilters, activeFilterCount } from '../_lib/filters';
import type { PacerAd, DirectoryUser } from '../_lib/types';
import type { PlanFilters } from '../_lib/filters';
import { SectionLabel, StatusBattery, AdStatusPill } from './primitives';
import { AccountNotesButton, AccountNotesDrawer } from './AccountNotes';

// ─── Over/Under Spend panel ────────────────────────────────────────────────
export interface YearMonthRow {
  period: string;
  clientBudget: number; // gross client budget (Base + Added) — context only
  spendTarget: number; // margin-adjusted target (client budget × markup)
  actual: number; // actual spend
}

export interface MonthAd {
  id: string;
  name: string;
  budgetSource: 'base' | 'added' | 'split';
  budgetType: 'Daily' | 'Lifetime';
  // When budgetSource === 'split', this is the dollar portion of
  // `allocation` drawn from Base. The rest comes from Added. Spend
  // apportions proportionally for the Over/Under math.
  splitBaseAmount: string | null;
  allocation: number;
  actual: number;
  // §3: a lifetime ad still running — excluded from the over/under base (both
  // its actual slice AND its allocation) while in progress; books its single
  // variance once it completes. Still counted in total month spend.
  lifetimeInProgress: boolean;
  // §2a: the YYYY-MM the ad's full run was counted in (resolved straddler), or
  // null. Drives the 'full run → applied to [month]' badge on the row.
  fullRunAppliedToMonth: string | null;
  // Cross-month clarity: this ad's over/under contribution + WHY it differs from
  // plan. Computed server-side (classifyAdVariance) so every surface agrees.
  variance?: {
    inMonthSpend: number;
    billedActual: number;
    contribution: number;
    klass: 'real' | 'billed-cross-month' | 'lifetime-in-progress';
  };
}

export interface MonthPlanData {
  baseBudgetGoal: number;
  addedBudgetGoal: number;
  // Per-account markup override; null = fall back to the agency default markup.
  // Needed for the Over/Under math because pacerActual is in actual-spend
  // dollars while the budget goals are gross client dollars.
  markup: number | null;
  // All-accounts mode only: a pre-summed spend target where each account's own
  // markup was already applied before summing (a single cross-account markup
  // would be wrong). When set, it's the variance basis instead of
  // gross × markup. null in single-account mode (computed from the goals).
  spendTargetOverride: number | null;
  ads: MonthAd[];
}

export function daysInPeriod(period: string): number {
  if (!isValidPeriod(period)) return 30;
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function daysElapsedInPeriod(period: string): number {
  if (!isValidPeriod(period)) return 0;
  const [y, m] = period.split('-').map(Number);
  const today = new Date();
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 0);
  if (today < monthStart) return 0;
  if (today > monthEnd) return monthEnd.getDate();
  return today.getDate();
}

export function ComparePanel({
  accountKey,
  period,
}: {
  accountKey: string | null;
  period: string;
}) {
  // §6: the Over/Under page is a within-month, per-ad diagnostic only. Everything
  // cross-month/annual (running balance, adjusted targets, apply/undo, audit
  // trail) lives on the Reconciliation page, which owns it — so the old "Year"
  // tab here (an unadjusted, no-reconcile duplicate of that table) is removed.
  return (
    <div>
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <h2 className="m-0 flex items-center gap-2 text-base font-bold tracking-tight text-[var(--foreground)]">
          <ScaleIcon className="w-4 h-4" />
          {accountKey ? 'Over/Under Spend' : 'Over/Under Spend — all accounts'}
        </h2>
      </div>
      <OverUnderMonthView accountKey={accountKey} period={period} />
    </div>
  );
}

export function OverUnderMonthView({
  accountKey,
  period,
}: {
  accountKey: string | null;
  // Driven by the page's sticky-header month selector — no separate in-page
  // selector (single source of truth for the active month).
  period: string;
}) {
  const [data, setData] = useState<MonthPlanData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setLoadError(null);

    const url = accountKey
      ? `/api/meta-ads-pacer/${accountKey}?period=${period}`
      : `/api/meta-ads-pacer/year-summary?year=${period.slice(0, 4)}`;

    fetch(url)
      .then(async (r) => {
        if (!r.ok) {
          const text = await r.text().catch(() => '');
          throw new Error(`HTTP ${r.status} ${text.slice(0, 200)}`);
        }
        return r.json();
      })
      .then((json) => {
        if (cancelled) return;
        if (accountKey) {
          const ads = Array.isArray(json?.ads) ? json.ads : [];
          setData({
            baseBudgetGoal: num(json?.baseBudgetGoal) ?? 0,
            addedBudgetGoal: num(json?.addedBudgetGoal) ?? 0,
            markup:
              typeof json?.markup === 'number' && Number.isFinite(json.markup)
                ? json.markup
                : null,
            // Single account: target is derived from goals × markup below.
            spendTargetOverride: null,
            ads: ads.map(
              (a: {
                id: string;
                name?: string | null;
                budgetSource?: string;
                budgetType?: string;
                period?: string;
                splitBaseAmount?: string | null;
                allocation?: string | null;
                pacerActual?: string | null;
                pacerRunSpend?: string | null;
                fullRunAppliedToMonth?: string | null;
                lifetimeInProgress?: boolean;
                variance?: {
                  inMonthSpend: number;
                  billedActual: number;
                  contribution: number;
                  klass: 'real' | 'billed-cross-month' | 'lifetime-in-progress';
                };
              }) => {
                const eff = { ...a, period: a.period ?? period };
                return {
                  id: a.id,
                  name: a.name || 'Untitled Ad',
                  budgetSource:
                    a.budgetSource === 'split'
                      ? ('split' as const)
                      : a.budgetSource === 'added'
                        ? ('added' as const)
                        : ('base' as const),
                  budgetType:
                    a.budgetType === 'Lifetime'
                      ? ('Lifetime' as const)
                      : ('Daily' as const),
                  splitBaseAmount: a.splitBaseAmount ?? null,
                  allocation: effectiveTarget(eff),
                  // Display/total = what actually spent THIS month (the slice);
                  // the over/under uses billedActual from `variance` below.
                  actual: a.variance?.inMonthSpend ?? effectiveActual(eff),
                  lifetimeInProgress: a.lifetimeInProgress === true,
                  fullRunAppliedToMonth: a.fullRunAppliedToMonth ?? null,
                  variance: a.variance,
                };
              },
            ),
          });
        } else {
          // All-accounts mode — fall back to the year-summary aggregate
          // for the selected month. No per-ad breakdown available here, but
          // the endpoint already applied each account's own markup to build
          // spendTarget, so we use that directly as the variance basis rather
          // than re-applying one blanket markup to the cross-account gross.
          const months: YearMonthRow[] = Array.isArray(json?.months) ? json.months : [];
          const row = months.find((m) => m.period === period);
          setData({
            baseBudgetGoal: row?.clientBudget ?? 0,
            addedBudgetGoal: 0,
            markup: null,
            spendTargetOverride: row?.spendTarget ?? 0,
            ads: row
              ? [
                  {
                    id: 'aggregate',
                    name: 'All tracked ads (aggregate)',
                    budgetSource: 'base' as const,
                    budgetType: 'Daily' as const,
                    splitBaseAmount: null,
                    allocation: row.clientBudget,
                    actual: row.actual,
                    lifetimeInProgress: false,
                    fullRunAppliedToMonth: null,
                  },
                ]
              : [],
          });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.error('[meta-ads-pacer] over/under month load failed', err);
        setLoadError(err instanceof Error ? err.message : 'Failed to load');
      });
    return () => {
      cancelled = true;
    };
  }, [accountKey, period]);

  // Budget goals are stored gross; pacerActual is actual-spend. Convert
  // budget through the account's effective markup so the comparison is
  // apples-to-apples (everything in actual-spend dollars).
  const effectiveMarkup = effMarkupOf(data?.markup);
  const budgetGross = data ? data.baseBudgetGoal + data.addedBudgetGoal : 0;
  // All-accounts mode supplies a pre-summed, per-account-correct target;
  // single-account mode derives it from this account's goals × markup.
  const budgetActual =
    data?.spendTargetOverride != null
      ? data.spendTargetOverride
      : budgetGross * effectiveMarkup;
  // The split (X2): two reconciling totals.
  //  • totalInMonth — what actually spent THIS calendar month (every ad's
  //    in-month slice). The honest "total spend".
  //  • overUnderActual — what the over/under is BILLED on: the full run for an
  //    ad the user billed cross-month (variance.billedActual), and $0 for an
  //    in-progress lifetime ad (§3, books on completion) — so both are handled
  //    without a separate subtraction.
  const allAds = data?.ads ?? [];
  const inProgressLifetime = allAds.filter((a) => a.lifetimeInProgress);
  const ipLifeAlloc = inProgressLifetime.reduce((s, a) => s + a.allocation, 0);
  const totalInMonth = allAds.reduce((s, a) => s + a.actual, 0);
  const overUnderActual = allAds.reduce(
    (s, a) => s + (a.variance?.billedActual ?? a.actual),
    0,
  );
  const daysIn = daysInPeriod(period);
  const daysElapsed = daysElapsedInPeriod(period);
  // Target nets out an in-progress lifetime ad's allocation (§3).
  const shouldHaveSpent = budgetActual - ipLifeAlloc;
  const variance = overUnderActual - shouldHaveSpent;

  // What explains total ≠ over/under basis: cross-month-billed runs (billed here
  // but spent in another month) + in-progress lifetime spend (spent this month,
  // not yet booked).
  const billedElsewhere = allAds.reduce(
    (s, a) =>
      a.variance?.klass === 'billed-cross-month'
        ? s + (a.variance.billedActual - a.variance.inMonthSpend)
        : s,
    0,
  );
  const heldOutLifetime = inProgressLifetime.reduce((s, a) => s + a.actual, 0);
  const crossMonthCount = allAds.filter(
    (a) => a.variance?.klass === 'billed-cross-month',
  ).length;

  const varianceColor = (v: number) =>
    Math.abs(v) < 0.005
      ? COLORS.success
      : v > 0
        ? COLORS.error
        : COLORS.warn;

  return (
    <div>
      {/* Month is controlled by the page's sticky-header selector — this is a
          read-only label for context, not a second selector. */}
      <div className="flex items-baseline justify-between gap-3 mb-4 flex-wrap">
        <span className="text-sm font-bold text-[var(--foreground)]">
          {fmtPeriodLong(period)}
        </span>
        <div className="text-[10px] text-[var(--muted-foreground)]">
          {daysElapsed} of {daysIn} day{daysIn === 1 ? '' : 's'} elapsed
        </div>
      </div>

      {loadError ? (
        <div className="glass-section-card rounded-xl text-center py-12 px-6">
          <ExclamationTriangleIcon className="w-8 h-8 mx-auto mb-3 text-red-400" />
          <p className="text-sm text-[var(--foreground)] font-medium mb-1">
            Could not load monthly over/under.
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">{loadError}</p>
        </div>
      ) : data == null ? (
        <div className="text-center py-12 text-[var(--muted-foreground)] text-sm">
          Loading…
        </div>
      ) : (
        <div className="space-y-4">
          {/* Per-ad spend block — denser 2-column grid so 10+ ads stay
              readable without a long scroll. Single-column on mobile. */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
            <div className="px-3 py-2 bg-[var(--muted)] border-b border-[var(--border)] text-[10px] font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              Spend by ad
            </div>
            {data.ads.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-[var(--muted-foreground)]">
                No ads in {fmtPeriodLong(period)}.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-px gap-y-px bg-[var(--border)]">
                  {data.ads.map((ad) => (
                    <div
                      key={ad.id}
                      className="flex items-center justify-between gap-2 px-3 py-1.5 bg-[var(--card)]"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-medium text-[var(--foreground)] truncate leading-tight">
                          {ad.name}
                        </div>
                        {ad.id !== 'aggregate' && (
                          <div className="text-[9px] leading-tight">
                            <span
                              className="font-semibold"
                              style={{ color: sourceColor(ad.budgetSource) }}
                            >
                              {sourceLabel(ad.budgetSource)}
                            </span>
                            <span className="text-[var(--muted-foreground)]">
                              {' · '}
                              {ad.allocation > 0 ? fmt(ad.allocation) : '—'}
                            </span>
                            {ad.lifetimeInProgress && (
                              <span
                                className="ml-1 font-semibold"
                                style={{ color: COLORS.lifetime }}
                                title="Lifetime ad still running — excluded from the over/under until its run completes (still counted in total spend)."
                              >
                                · lifetime · in progress
                              </span>
                            )}
                            {ad.fullRunAppliedToMonth && (
                              <span
                                className="ml-1 font-semibold"
                                style={{ color: '#f97316' }}
                                title="Full run counted in this month — the over/under compares the full run to the full target."
                              >
                                · full run → {fmtPeriodLong(ad.fullRunAppliedToMonth)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <div className="text-sm font-semibold text-[var(--foreground)] tabular-nums">
                          {fmt(ad.actual)}
                        </div>
                        {ad.id !== 'aggregate' &&
                          ad.variance &&
                          ad.variance.klass !== 'lifetime-in-progress' &&
                          Math.abs(ad.variance.contribution) >= 0.005 && (
                            <div
                              className="text-[9px] font-semibold tabular-nums leading-tight"
                              style={{ color: varianceColor(ad.variance.contribution) }}
                              title={
                                ad.variance.klass === 'billed-cross-month'
                                  ? "This ad's over/under on its FULL run vs target (billed in this month)."
                                  : "This ad's over/under vs its allocation."
                              }
                            >
                              {ad.variance.contribution >= 0 ? '+' : '−'}
                              {fmt(Math.abs(ad.variance.contribution))}
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3 px-3 py-2 bg-[var(--muted)]/40 border-t-2 border-[var(--border)]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--foreground)]">
                    Total spent this month · {data.ads.length} ad{data.ads.length === 1 ? '' : 's'}
                  </div>
                  <div className="text-sm font-bold tabular-nums text-[var(--foreground)]">
                    {fmt(totalInMonth)}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Client budget / should-have-spent (left) and the variance vs
              should-have-spent (right). */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                    Client Budget
                  </div>
                  <div className="text-base font-bold tabular-nums text-[var(--foreground)]">
                    {fmt(budgetGross)}
                  </div>
                  {accountKey && (
                    <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                      Base {fmt(data.baseBudgetGoal)} + Added{' '}
                      {fmt(data.addedBudgetGoal)}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                    Should have spent
                  </div>
                  <div
                    className="text-base font-bold tabular-nums"
                    style={{ color: COLORS.daily }}
                  >
                    {fmt(shouldHaveSpent)}
                  </div>
                  <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                    {`${fmt(budgetGross)} × ${effectiveMarkup}`}
                    {ipLifeAlloc > 0
                      ? ` − ${fmt(ipLifeAlloc)} lifetime in progress`
                      : ''}
                  </div>
                </div>
              </div>
            </div>
            {/* Variance — tracked spend vs should-have-spent. Positive =
                overspent; negative = underspent. */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
              <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                Variance vs Should Have Spent
              </div>
              <div
                className="text-2xl font-bold tabular-nums"
                style={{ color: varianceColor(variance) }}
              >
                {`${variance >= 0 ? '+' : '-'}${fmt(Math.abs(variance))}`}
                <span className="ml-2 text-xs font-normal text-[var(--muted-foreground)]">
                  {variance > 0.005
                    ? 'overspent'
                    : variance < -0.005
                      ? 'underspent'
                      : 'on target'}
                </span>
              </div>
              <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                billed{' '}
                <span className="font-semibold text-[var(--foreground)]">
                  {fmt(overUnderActual)}
                </span>
                {' − '}
                <span className="font-semibold text-[var(--foreground)]">
                  {fmt(shouldHaveSpent)}
                </span>
                {' should have spent'}
              </div>
              {crossMonthCount > 0 && (
                <div
                  className="text-[10px] mt-1"
                  style={{ color: '#f97316' }}
                  title="These ads are billed in this month though they ran across months — the over/under counts their full run, so the month's total spend is lower by the part that spent in another month."
                >
                  {crossMonthCount} ad{crossMonthCount === 1 ? '' : 's'} billed cross-month ·{' '}
                  <span className="font-semibold text-[var(--foreground)]">
                    {fmt(billedElsewhere)}
                  </span>{' '}
                  of the billed spend landed in another month (total spent this month{' '}
                  {fmt(totalInMonth)})
                </div>
              )}
              {inProgressLifetime.length > 0 && (
                <div
                  className="text-[10px] mt-1"
                  style={{ color: COLORS.lifetime }}
                  title="A lifetime ad still running is excluded from the over/under — both its spend and its target — until its run completes, when its single variance books once. Its spend is still counted in the tracked total above."
                >
                  Excludes {inProgressLifetime.length} lifetime ad
                  {inProgressLifetime.length === 1 ? '' : 's'} in progress ·{' '}
                  {fmt(heldOutLifetime)} spent · settles on completion
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Admin Overview ────────────────────────────────────────────────────────
export interface OverviewAccount {
  accountKey: string;
  dealer: string;
  // §0.1: resolved per-account markup factor for the gross-up display.
  markup: number;
  baseBudgetGoal: string | null;
  addedBudgetGoal: string | null;
  // Server-side aggregated count of account-level pacer notes — drives
  // the chat badge on the overview row without an extra round-trip.
  notesCount: number;
  ads: PacerAd[];
}

export function OverviewAccountRow({
  account,
  period,
  expanded,
  onToggle,
  onOpenAccount,
  filters,
  currentUserId,
  users,
}: {
  account: OverviewAccount;
  period: string;
  expanded: boolean;
  onToggle: () => void;
  onOpenAccount: () => void;
  filters: PlanFilters;
  currentUserId: string | null;
  users: DirectoryUser[];
}) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesCount, setNotesCount] = useState<number>(account.notesCount);
  useEffect(() => {
    setNotesCount(account.notesCount);
  }, [account.notesCount]);
  const visibleAds = useMemo(
    () => applyFilters(account.ads, filters, currentUserId),
    [account.ads, filters, currentUserId],
  );
  const filtersActive = activeFilterCount(filters) > 0;
  // When filters are active, the collapsed header reflects only the
  // matching subset so reps can scan which accounts have hits without
  // expanding each row. Default state (no filters) shows the full picture.
  const headerAds = filtersActive ? visibleAds : account.ads;
  const noMatches = filtersActive && visibleAds.length === 0;

  // Show the client's agreed budget goals (gross dollars) rather than the
  // running allocation total — easier for admins to see commitments at a
  // glance. The COMBINED Base+Added is the primary billing figure (Change 8);
  // Base/Added are shown as its components so the sum is visible at a glance.
  // Always the true client budget (gross) — never carryover/pacing-adjusted.
  const baseTotal = num(account.baseBudgetGoal) ?? 0;
  const addedTotal = num(account.addedBudgetGoal) ?? 0;
  const combinedTotal = baseTotal + addedTotal;

  return (
    <div
      className={`glass-section-card rounded-xl mb-2.5 overflow-hidden transition-opacity ${
        noMatches ? 'opacity-50' : ''
      }`}
    >
      {/* Header row — title + tag stay inline, status battery stacks below.
          Right cluster (Base/Added/Open) is vertically centered against the
          full card height. */}
      <div
        className="flex items-center justify-between gap-4 px-4 py-3.5 cursor-pointer"
        onClick={onToggle}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 flex-wrap min-w-0 mb-2">
            {expanded ? (
              <ChevronDownIcon className="w-4 h-4 text-[var(--muted-foreground)] flex-shrink-0" />
            ) : (
              <ChevronRightIcon className="w-4 h-4 text-[var(--muted-foreground)] flex-shrink-0" />
            )}
            <span className="text-lg font-bold text-[var(--foreground)] truncate min-w-0 max-w-[320px] tracking-tight">
              {account.dealer}
            </span>
            <span className="text-[11px] text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-0.5 rounded-full whitespace-nowrap">
              {filtersActive
                ? `${visibleAds.length} of ${account.ads.length} ad${account.ads.length !== 1 ? 's' : ''}`
                : `${account.ads.length} ad${account.ads.length !== 1 ? 's' : ''}`}
            </span>
          </div>
          {headerAds.length > 0 ? (
            <div className="pl-7 max-w-[440px]">
              <StatusBattery ads={headerAds} size="lg" />
            </div>
          ) : noMatches ? (
            <div className="pl-7 text-[11px] text-[var(--muted-foreground)] italic">
              No ads match the current filters.
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-5 flex-shrink-0">
          {combinedTotal > 0 && (
            <div
              className="text-right"
              title="Billing figure — combined Base + Added client budget (gross). Should match the planner for this account and month."
            >
              <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                Total Budget
              </div>
              <div className="text-xl font-bold tabular-nums text-[var(--foreground)]">
                {fmt(combinedTotal)}
              </div>
              {/* Components — the two add up to the total, in view for an
                  at-a-glance reconciliation. */}
              <div className="flex items-center justify-end gap-1.5 mt-0.5 text-[10px] tabular-nums">
                <span style={{ color: COLORS.base }}>Base {fmt(baseTotal)}</span>
                <span className="text-[var(--muted-foreground)]">·</span>
                <span style={{ color: COLORS.added }}>
                  Added {fmt(addedTotal)}
                </span>
              </div>
            </div>
          )}
          <div onClick={(e) => e.stopPropagation()}>
            <AccountNotesButton
              count={notesCount}
              onClick={() => setNotesOpen(true)}
              ariaLabel={`Open notes for ${account.dealer}`}
            />
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenAccount();
            }}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            title="Open account"
          >
            Open
          </button>
        </div>
      </div>

      {/* Drill-down: compact ad rows */}
      {expanded && (
        <div className="border-t border-[var(--border)] bg-[var(--muted)]/40 px-4 py-3">
          {account.ads.length === 0 ? (
            <div className="text-xs text-[var(--muted-foreground)] py-3 text-center">
              No ads in this period.
            </div>
          ) : visibleAds.length === 0 ? (
            <div className="text-xs text-[var(--muted-foreground)] py-3 text-center">
              No ads match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    {[
                      'Ad',
                      'Status',
                      'Source',
                      'Type',
                      'Client Budget',
                      'Allocation',
                      'Flight',
                      'Action',
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)] whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleAds.map((ad, i) => (
                    <tr key={ad.id} className="border-b border-[var(--border)]">
                      <td className="px-2 py-2 text-[var(--foreground)] max-w-[200px] truncate">
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-sm mr-1.5 align-middle"
                          style={{ background: AD_COLORS[i % AD_COLORS.length] }}
                        />
                        {ad.name}
                      </td>
                      <td className="px-2 py-2">
                        <AdStatusPill status={ad.adStatus} />
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{
                            background: sourceTint(ad.budgetSource),
                            color: sourceColor(ad.budgetSource),
                          }}
                        >
                          {sourceLabel(ad.budgetSource)}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-[var(--muted-foreground)]">
                        {ad.budgetType}
                      </td>
                      <td
                        className="px-2 py-2 font-semibold whitespace-nowrap"
                        style={{ color: COLORS.daily }}
                        title="Gross client-facing dollars (allocation grossed up by markup)"
                      >
                        {(() => {
                          const m = effMarkupOf(account.markup);
                          return num(ad.allocation) != null && m > 0
                            ? fmt(Math.round((num(ad.allocation)! / m) * 100) / 100)
                            : '—';
                        })()}
                      </td>
                      <td className="px-2 py-2 text-[var(--foreground)]">
                        {num(ad.allocation) != null ? fmt(num(ad.allocation)!) : '—'}
                      </td>
                      <td className="px-2 py-2 text-[var(--muted-foreground)] whitespace-nowrap">
                        {ad.flightStart && ad.flightEnd
                          ? `${fmtDate(ad.flightStart)} – ${fmtDate(ad.flightEnd)}`
                          : '—'}
                      </td>
                      <td className="px-2 py-2 text-[var(--muted-foreground)]">
                        {ad.actionNeeded || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {notesOpen && (
        <AccountNotesDrawer
          accountKey={account.accountKey}
          accountLabel={account.dealer}
          period={period}
          users={users}
          currentUserId={currentUserId}
          onClose={() => setNotesOpen(false)}
          onCountChange={setNotesCount}
        />
      )}
    </div>
  );
}

export function OverviewView({
  period,
  filters,
  currentUserId,
  onOpenAccount,
  users,
  accounts,
  loadError,
}: {
  period: string;
  filters: PlanFilters;
  currentUserId: string | null;
  onOpenAccount: (accountKey: string) => void;
  users: DirectoryUser[];
  // List + error are owned by the parent so the filter sidebar can
  // share the same ads — see MetaAdsPlannerTool for the fetch.
  accounts: OverviewAccount[] | null;
  loadError: string | null;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (loadError) {
    return (
      <div className="glass-section-card rounded-xl text-center py-16 px-6">
        <ExclamationTriangleIcon className="w-8 h-8 mx-auto mb-3 text-red-400" />
        <p className="text-sm text-[var(--foreground)] font-medium mb-1">
          Could not load overview.
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">{loadError}</p>
      </div>
    );
  }

  if (accounts == null) {
    return (
      <div className="text-center py-16 text-[var(--muted-foreground)] text-sm">
        Loading accounts…
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="glass-section-card rounded-xl text-center py-16 px-6">
        <p className="text-sm text-[var(--foreground)] font-medium mb-1">
          No accounts available.
        </p>
        <p className="text-xs text-[var(--muted-foreground)]">
          You don&apos;t have access to any accounts.
        </p>
      </div>
    );
  }

  // Sort: accounts with ads first, then by dealer name (already alphabetical)
  const sorted = [...accounts].sort((a, b) => {
    if (a.ads.length === 0 && b.ads.length > 0) return 1;
    if (a.ads.length > 0 && b.ads.length === 0) return -1;
    return 0;
  });

  return (
    <div className="space-y-2.5">
      <SectionLabel
        icon={<ClipboardDocumentListIcon className="w-3 h-3" />}
        text={`All Accounts · ${fmtPeriodLong(period)}`}
      />
      {sorted.map((acct) => (
        <OverviewAccountRow
          key={acct.accountKey}
          account={acct}
          period={period}
          expanded={expanded.has(acct.accountKey)}
          onToggle={() => toggleExpand(acct.accountKey)}
          onOpenAccount={() => onOpenAccount(acct.accountKey)}
          filters={filters}
          currentUserId={currentUserId}
          users={users}
        />
      ))}
    </div>
  );
}
