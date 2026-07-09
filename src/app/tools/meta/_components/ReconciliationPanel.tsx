'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import {
  ArrowPathIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import { InvestmentIcon } from '@/components/icons/investment';
import { fmt } from '../_lib/helpers';
import { fmtPeriodLong, currentPeriod } from '../_lib/period';
import { COLORS } from '../_lib/constants';

// ─── Reconciliation panel (Phase 2b) ───────────────────────────────────────
export interface ReconMonth {
  period: string;
  state: 'current' | 'grace' | 'closed' | 'future';
  isBackfilled: boolean;
  hasTarget: boolean;
  hasActual: boolean;
  clientBudget: number;
  spendTarget: number;
  adjustedSpendTarget: number;
  actual: number;
  variance: number;
  carryover: number;
  exceedsThreshold: boolean;
  appliedOut: number;
  unapplied: number;
  appliedIn: number;
  // §3: month has a lifetime ad still running — excluded from the over/under
  // base (books once on completion); drives the 'lifetime · in progress' badge.
  hasLifetimeInProgress: boolean;
  // CM4: per-ad over/under contributions for this month — the row drill-down.
  ads?: {
    name: string;
    inMonthSpend: number;
    billedActual: number;
    contribution: number;
    klass: 'real' | 'billed-cross-month' | 'lifetime-in-progress';
  }[];
}
export interface CarryoverApplication {
  id: string;
  sourceMonth: string;
  targetMonth: string;
  bucket: 'base' | 'added';
  amount: number;
  appliedAt: string;
}
export interface ReconData {
  year: number;
  markup: number;
  targetPeriod: string;
  months: ReconMonth[];
  ytdVariance: number;
  ytdCarryover: number;
  ytdUnapplied: number;
  // §4: lifetime drift incl. the in-progress live month (health gauge), and the
  // settled months still carrying unapplied over/under (named in the UI).
  ytdVarianceInclLive: number;
  unappliedMonths: string[];
  appliedThisMonth: { base: number; added: number; total: number };
  // §5: individual ledger entries, newest first — powers both-ends provenance.
  applications: CarryoverApplication[];
}

/**
 * Year reconciliation: per-month over/under (tracked + backfilled), a YTD net
 * still to reconcile, and apply/undo controls. Applying rolls a month's (or all
 * months') over/under into the live month's bucket via the ledger, correcting
 * the account's running annual variance.
 */
export function ReconciliationPanel({ accountKey }: { accountKey: string }) {
  const [year, setYear] = useState<number>(() =>
    Number(currentPeriod().slice(0, 4)),
  );
  const [data, setData] = useState<ReconData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [bucket, setBucket] = useState<'base' | 'added'>('base');
  const [backfilling, setBackfilling] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // CM4: which month rows are expanded to their per-ad variance breakdown.
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    setData(null);
    setLoadError(null);
    fetch(`/api/meta-ads-pacer/${accountKey}/reconciliation?year=${year}`)
      .then(async (r) => {
        if (!r.ok) {
          const t = await r.text().catch(() => '');
          throw new Error(`HTTP ${r.status} ${t.slice(0, 160)}`);
        }
        return r.json();
      })
      .then((json: ReconData) => setData(json))
      .catch((err) =>
        setLoadError(
          err instanceof Error ? err.message : 'Failed to load reconciliation.',
        ),
      );
  }, [accountKey, year]);

  useEffect(() => {
    load();
  }, [load]);

  const post = async (body: Record<string, unknown>, key: string) => {
    setBusy(key);
    setActionError(null);
    try {
      const r = await fetch(
        `/api/meta-ads-pacer/${accountKey}/reconciliation?year=${year}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json?.error || `HTTP ${r.status}`);
      setData(json as ReconData);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setBusy(null);
    }
  };

  const backfill = async () => {
    setBackfilling(true);
    setActionError(null);
    try {
      const r = await fetch(
        `/api/meta-ads-pacer/${accountKey}/backfill-history?year=${year}`,
        { method: 'POST' },
      );
      const json = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(json?.error || `HTTP ${r.status}`);
      load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Backfill failed.');
    } finally {
      setBackfilling(false);
    }
  };

  // variance > 0 = overspent (warn); < 0 = underspent (lifetime/blue).
  const overUnder = (v: number) =>
    Math.abs(v) < 0.005
      ? { text: 'On target', color: 'var(--muted-foreground)' }
      : v > 0
        ? { text: `${fmt(v)} over`, color: COLORS.warn }
        : { text: `${fmt(-v)} under`, color: COLORS.lifetime };

  const net = data?.ytdUnapplied ?? 0;
  const netReconciled = Math.abs(net) < 0.005;
  const canApply = !!data?.targetPeriod && !netReconciled;
  // §4: the health-gauge total (lifetime drift incl. the in-progress live
  // month, variance convention) — distinct from `net` (the settle-able queue).
  const inclLive = data?.ytdVarianceInclLive ?? 0;
  const inclLiveGauge = overUnder(inclLive);
  // §4: name the settled months still carrying unapplied over/under.
  const unappliedMonthsLabel = (data?.unappliedMonths ?? [])
    .map((p) =>
      new Date(Number(p.slice(0, 4)), Number(p.slice(5, 7)) - 1, 1).toLocaleDateString(
        'en-US',
        { month: 'short' },
      ),
    )
    .join(', ');

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <h2 className="m-0 flex items-center gap-2 text-base font-bold tracking-tight text-[var(--foreground)]">
          <InvestmentIcon className="w-4 h-4" />
          Reconciliation
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--card)]">
            <button
              type="button"
              onClick={() => setYear((y) => y - 1)}
              className="px-2.5 py-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              aria-label="Previous year"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <span className="px-2 text-sm font-semibold text-[var(--foreground)] tabular-nums">
              {year}
            </span>
            <button
              type="button"
              onClick={() => setYear((y) => y + 1)}
              disabled={year >= Number(currentPeriod().slice(0, 4))}
              className="px-2.5 py-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Next year"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={backfill}
            disabled={backfilling}
            title="Pull account-total monthly spend from Meta for pre-tool months this year"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[11px] font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-3.5 h-3.5 ${backfilling ? 'animate-spin' : ''}`} />
            {backfilling ? 'Backfilling…' : 'Backfill historical spend'}
          </button>
        </div>
      </div>

      {loadError ? (
        <div className="text-center py-12 text-xs text-red-400">{loadError}</div>
      ) : !data ? (
        <div className="text-center py-12 text-xs text-[var(--muted-foreground)]">
          Loading…
        </div>
      ) : (
        <>
          {/* YTD net + apply-all controls */}
          <div className="mb-6 rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 flex items-start justify-between gap-5 flex-wrap">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                {year} net still to reconcile
              </div>
              <div
                className="text-3xl font-bold tabular-nums leading-tight mt-1"
                style={{
                  color: netReconciled
                    ? COLORS.success
                    : net > 0
                      ? COLORS.lifetime
                      : COLORS.warn,
                }}
              >
                {netReconciled
                  ? 'Fully reconciled'
                  : `${net > 0 ? '' : '−'}${fmt(Math.abs(net))}`}
              </div>
              <div className="text-xs text-[var(--muted-foreground)] mt-1">
                {netReconciled
                  ? 'No outstanding over/under across settled months.'
                  : net > 0
                    ? `Underspent ${unappliedMonthsLabel ? `across ${unappliedMonthsLabel}` : 'across settled months'} — apply to add ${fmt(net)} to ${data.targetPeriod ? fmtPeriodLong(data.targetPeriod) : 'the live month'}.`
                    : `Overspent ${unappliedMonthsLabel ? `across ${unappliedMonthsLabel}` : 'across settled months'} — apply to pull ${fmt(-net)} from ${data.targetPeriod ? fmtPeriodLong(data.targetPeriod) : 'the live month'}.`}
              </div>
              {data.appliedThisMonth.total !== 0 && data.targetPeriod && (
                <div className="text-[11px] text-[var(--muted-foreground)] mt-2 flex items-center gap-2 flex-wrap">
                  <span>
                    Applied into {fmtPeriodLong(data.targetPeriod)}:{' '}
                    <span className="font-semibold text-[var(--foreground)] tabular-nums">
                      {data.appliedThisMonth.total > 0 ? '+' : '−'}
                      {fmt(Math.abs(data.appliedThisMonth.total))}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => post({ type: 'unapply' }, 'clear-all')}
                    disabled={busy === 'clear-all'}
                    className="text-[var(--primary)] hover:underline disabled:opacity-50"
                  >
                    {busy === 'clear-all' ? 'Clearing…' : 'Clear all'}
                  </button>
                </div>
              )}
              {/* §4: health-gauge total — lifetime drift INCLUDING the
                  in-progress live month. Deliberately distinct from the
                  settle-able "net still to reconcile" above (which excludes the
                  open month) so the two can't be confused: one is the action
                  queue, this is the overall over/under reading. */}
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Net variance · incl. live month
                </div>
                <div className="flex items-baseline gap-2 mt-0.5 flex-wrap">
                  <span
                    className="text-base font-semibold tabular-nums"
                    style={{ color: inclLiveGauge.color }}
                  >
                    {inclLiveGauge.text}
                  </span>
                  <span className="text-[10px] text-[var(--muted-foreground)]">
                    health gauge — total drift including{' '}
                    {data.targetPeriod
                      ? `${fmtPeriodLong(data.targetPeriod)} in progress`
                      : 'the live month'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--background)] p-1">
                {(['base', 'added'] as const).map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setBucket(b)}
                    className={`px-3 py-1 text-[11px] font-medium rounded transition-colors ${
                      bucket === b
                        ? 'bg-[var(--primary)] text-white'
                        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    {b === 'base' ? 'Base' : 'Added'}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => post({ type: 'apply-all', bucket }, 'apply-all')}
                disabled={!canApply || busy === 'apply-all'}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3.5 py-2 text-[11px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy === 'apply-all'
                  ? 'Applying…'
                  : `Apply all unapplied → ${bucket === 'base' ? 'Base' : 'Added'}`}
              </button>
              <span className="text-[10px] text-[var(--muted-foreground)] text-right max-w-[200px]">
                Carryover lands in the {bucket === 'base' ? 'Base' : 'Added'} bucket of the live month.
              </span>
            </div>
          </div>

          {actionError && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-400">
              {actionError}
            </div>
          )}

          {/* Per-month table */}
          <div className="overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                  <th className="text-left font-semibold px-3 py-2.5">Month</th>
                  <th className="text-right font-semibold px-3 py-2.5">Spend Target</th>
                  <th className="text-right font-semibold px-3 py-2.5">Actual</th>
                  <th className="text-right font-semibold px-3 py-2.5">Over / Under</th>
                  <th className="text-right font-semibold px-3 py-2.5 w-[200px]">Reconcile</th>
                </tr>
              </thead>
              <tbody>
                {data.months.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-[var(--muted-foreground)]">
                      No months to show for {year} yet.
                    </td>
                  </tr>
                )}
                {data.months.map((m) => {
                  const isLive = m.period === data.targetPeriod;
                  const noData = !m.hasActual && !m.hasTarget;
                  const needsTarget = m.isBackfilled && !m.hasTarget;
                  const applied = Math.abs(m.appliedOut) >= 0.005;
                  const ou = overUnder(m.variance);
                  const hasAdDetail = (m.ads?.length ?? 0) > 0;
                  const expanded = expandedMonths.has(m.period);
                  return (
                    <Fragment key={m.period}>
                    <tr
                      className={`border-b border-[var(--border)] last:border-0 ${
                        isLive ? 'bg-[var(--primary)]/5' : ''
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-[var(--foreground)] flex items-center gap-2">
                          {hasAdDetail && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedMonths((s) => {
                                  const next = new Set(s);
                                  if (next.has(m.period)) next.delete(m.period);
                                  else next.add(m.period);
                                  return next;
                                })
                              }
                              aria-label={expanded ? 'Hide ad breakdown' : 'Show ad breakdown'}
                              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                              style={{ transform: expanded ? 'rotate(90deg)' : 'none' }}
                            >
                              <ChevronRightIcon className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {fmtPeriodLong(m.period)}
                          {isLive && (
                            <span className="text-[9px] font-medium uppercase tracking-wider rounded px-1.5 py-0.5 bg-[var(--primary)]/15 text-[var(--primary)]">
                              Live
                            </span>
                          )}
                          {m.isBackfilled && (
                            <span
                              className="text-[9px] font-medium uppercase tracking-wider rounded px-1.5 py-0.5 bg-[var(--muted)] text-[var(--muted-foreground)]"
                              title="Pre-tool month — actual pulled from Meta account spend"
                            >
                              Backfilled
                            </span>
                          )}
                          {m.hasLifetimeInProgress && (
                            <span
                              className="text-[9px] font-medium uppercase tracking-wider rounded px-1.5 py-0.5"
                              style={{
                                background: 'rgba(167,139,250,0.15)',
                                color: COLORS.lifetime,
                              }}
                              title="A lifetime ad is still running this month — excluded from the over/under base (its single variance books once when the run completes). Its spend still shows in the Pacer's total spend."
                            >
                              Lifetime in progress
                            </span>
                          )}
                        </div>
                        {isLive && (
                          <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                            target month — over/under lands here
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {needsTarget ? (
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-[var(--muted-foreground)]">$</span>
                            <input
                              value={drafts[m.period] ?? ''}
                              onChange={(e) =>
                                setDrafts((d) => ({ ...d, [m.period]: e.target.value }))
                              }
                              placeholder="budget"
                              inputMode="decimal"
                              className="w-20 rounded border border-[var(--border)] bg-[var(--background)] px-1.5 py-1 text-right text-xs text-[var(--foreground)]"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                post(
                                  {
                                    type: 'set-target',
                                    period: m.period,
                                    clientBudget: drafts[m.period] ?? '',
                                  },
                                  `target:${m.period}`,
                                )
                              }
                              disabled={busy === `target:${m.period}`}
                              className="text-[10px] text-[var(--primary)] hover:underline disabled:opacity-50"
                            >
                              Save
                            </button>
                          </div>
                        ) : m.hasTarget || m.appliedIn !== 0 ? (
                          <>
                            <div className="text-[var(--foreground)] font-semibold">
                              {fmt(m.adjustedSpendTarget)}
                            </div>
                            {m.hasTarget && (
                              <div className="text-[9px] text-[var(--muted-foreground)]">
                                {fmt(m.clientBudget)} × {Math.round(data.markup * 100)}%
                              </div>
                            )}
                            {m.appliedIn !== 0 && (
                              <div
                                className="text-[9px]"
                                style={{ color: COLORS.lifetime }}
                                title="Carryover applied INTO this month from a prior month's over/under (adjusts this month's target; the client budget is unchanged)."
                              >
                                ← {m.appliedIn > 0 ? '+' : '−'}
                                {fmt(Math.abs(m.appliedIn))} from{' '}
                                {(() => {
                                  const srcs = Array.from(
                                    new Set(
                                      (data.applications ?? [])
                                        .filter((a) => a.targetMonth === m.period)
                                        .map((a) => a.sourceMonth),
                                    ),
                                  );
                                  return srcs.length
                                    ? srcs.map((s) => fmtPeriodLong(s)).join(', ')
                                    : 'a prior month';
                                })()}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-[var(--muted-foreground)]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[var(--foreground)]">
                        {m.hasActual ? fmt(m.actual) : <span className="text-[var(--muted-foreground)]">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {noData || !m.hasTarget || !m.hasActual ? (
                          <span className="text-[var(--muted-foreground)]">—</span>
                        ) : (
                          <span style={{ color: ou.color }} className="font-semibold">
                            {ou.text}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {isLive ? (
                          <span className="text-[10px] text-[var(--muted-foreground)]">
                            In progress
                          </span>
                        ) : applied ? (
                          <div className="flex items-center justify-end gap-2">
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-semibold"
                              style={{ color: COLORS.success }}
                              title={`This month's over/under was applied into ${
                                data.targetPeriod
                                  ? fmtPeriodLong(data.targetPeriod)
                                  : 'the live month'
                              }`}
                            >
                              <CheckIcon className="w-3 h-3" />
                              Applied {m.appliedOut >= 0 ? '+' : '−'}
                              {fmt(Math.abs(m.appliedOut))} →{' '}
                              {(() => {
                                const tgts = Array.from(
                                  new Set(
                                    (data.applications ?? [])
                                      .filter((a) => a.sourceMonth === m.period)
                                      .map((a) => a.targetMonth),
                                  ),
                                );
                                return tgts.length
                                  ? tgts.map((t) => fmtPeriodLong(t)).join(', ')
                                  : data.targetPeriod
                                    ? fmtPeriodLong(data.targetPeriod)
                                    : 'live month';
                              })()}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                post(
                                  { type: 'unapply', sourceMonth: m.period },
                                  `unapply:${m.period}`,
                                )
                              }
                              disabled={busy === `unapply:${m.period}`}
                              className="text-[10px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:underline disabled:opacity-50"
                            >
                              {busy === `unapply:${m.period}` ? '…' : 'Undo'}
                            </button>
                          </div>
                        ) : noData ? (
                          <span className="text-[10px] text-[var(--muted-foreground)]">
                            No data
                          </span>
                        ) : (
                          <span className="text-[10px] text-[var(--muted-foreground)]">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                    {expanded && hasAdDetail && (
                      <tr className={isLive ? 'bg-[var(--primary)]/5' : ''}>
                        <td colSpan={5} className="px-3 pb-3 pt-0">
                          <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 overflow-hidden">
                            <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] border-b border-[var(--border)]">
                              Variance by ad
                            </div>
                            <div className="divide-y divide-[var(--border)]/60">
                              {(m.ads ?? []).map((av, i) => {
                                const amtColor =
                                  av.klass === 'lifetime-in-progress'
                                    ? COLORS.lifetime
                                    : av.klass === 'billed-cross-month'
                                      ? '#f97316'
                                      : overUnder(av.contribution).color;
                                return (
                                  <div
                                    key={`${m.period}-${i}`}
                                    className="flex items-center justify-between gap-3 px-3 py-1.5"
                                  >
                                    <div className="min-w-0 flex items-center gap-2">
                                      <span className="text-[11px] text-[var(--foreground)] truncate">
                                        {av.name || 'Untitled ad'}
                                      </span>
                                      {av.klass === 'billed-cross-month' && (
                                        <span
                                          className="text-[9px] font-semibold flex-shrink-0"
                                          style={{ color: '#f97316' }}
                                          title="Billed in this month though it ran across months — the over/under counts its full run; only part spent this month."
                                        >
                                          billed cross-month
                                        </span>
                                      )}
                                      {av.klass === 'lifetime-in-progress' && (
                                        <span
                                          className="text-[9px] font-semibold flex-shrink-0"
                                          style={{ color: COLORS.lifetime }}
                                          title="Lifetime ad still running — its spend is held out of the over/under until the run completes."
                                        >
                                          lifetime · books on completion
                                        </span>
                                      )}
                                    </div>
                                    <span
                                      className="text-[11px] font-semibold tabular-nums flex-shrink-0"
                                      style={{ color: amtColor }}
                                    >
                                      {av.klass === 'lifetime-in-progress'
                                        ? `${fmt(av.inMonthSpend)} held`
                                        : `${av.contribution >= 0 ? '+' : '−'}${fmt(Math.abs(av.contribution))}`}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[10px] text-[var(--muted-foreground)] leading-relaxed">
            Over/under is measured against the margin-adjusted spend target
            (client budget × {Math.round(data.markup * 100)}%). Applying a month
            rolls its over/under into the live month&apos;s budget via an
            auditable ledger entry — it never edits the original month&apos;s
            billing record. Backfilled months pull account-total spend from Meta;
            enter their client budget to compute a variance.
          </p>
        </>
      )}
    </div>
  );
}
