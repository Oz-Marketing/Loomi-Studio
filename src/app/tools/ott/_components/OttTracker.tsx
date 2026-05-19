'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAccount } from '@/contexts/account-context';
import {
  OTT_STATUS_LABELS,
  OTT_PLATFORM_LABELS,
  groupForStatus,
} from '@/lib/ott-ads-client';
import { actualSpend, fmtCurrency, periodShort, todayPeriod } from '../_lib/calc';
import type { OttAd, OttGroup, OttOverviewAccount } from '../_lib/types';

interface FilterState {
  group: OttGroup | 'all';
  account: string;
  platform: string;
  status: string;
  period: string;
  search: string;
}

const STATUS_OPTIONS = Object.entries(OTT_STATUS_LABELS) as [string, string][];
const PLATFORM_OPTIONS = Object.entries(OTT_PLATFORM_LABELS) as [string, string][];

function statusPillClass(status: string): string {
  switch (status) {
    case 'live':
      return 'bg-green-500/15 text-green-600 dark:text-green-400';
    case 'complete':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
    case 'waiting_on_video':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-400';
    case 'working_on_it':
      return 'bg-sky-500/15 text-sky-700 dark:text-sky-400';
    case 'on_hold':
      return 'bg-orange-500/15 text-orange-700 dark:text-orange-400';
    case 'past_due':
      return 'bg-pink-500/15 text-pink-700 dark:text-pink-400';
    case 'cancelled':
      return 'bg-rose-500/15 text-rose-700 dark:text-rose-400';
    case 'new_request':
    default:
      return 'bg-gray-500/15 text-gray-700 dark:text-gray-300';
  }
}

interface FlatAd extends OttAd {
  accountKey: string;
  dealer: string;
  markup: number | null;
}

export function OttTracker() {
  const { accounts: contextAccounts } = useAccount();
  const [overview, setOverview] = useState<OttOverviewAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    group: 'current',
    account: '',
    platform: '',
    status: '',
    period: '',
    search: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/ott-ads/overview');
      const data = (await r.json()) as { accounts?: OttOverviewAccount[] };
      setOverview(data.accounts ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const flat: FlatAd[] = useMemo(() => {
    const out: FlatAd[] = [];
    for (const acct of overview) {
      for (const ad of acct.ads) {
        out.push({
          ...ad,
          accountKey: acct.accountKey,
          dealer: acct.dealer,
          markup: acct.markup,
        });
      }
    }
    return out;
  }, [overview]);

  const allPeriods = useMemo(() => {
    const set = new Set<string>();
    for (const ad of flat) {
      if (ad.period) set.add(ad.period);
    }
    return [...set].sort((a, b) => (a < b ? 1 : -1));
  }, [flat]);

  const filtered = useMemo(() => {
    return flat.filter((ad) => {
      if (filters.group !== 'all' && groupForStatus(ad.status) !== filters.group) return false;
      if (filters.account && ad.accountKey !== filters.account) return false;
      if (filters.platform && ad.platform !== filters.platform) return false;
      if (filters.status && ad.status !== filters.status) return false;
      if (filters.period && ad.period !== filters.period) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!ad.name.toLowerCase().includes(q) && !ad.dealer.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [flat, filters]);

  const counts = useMemo(() => {
    let upcoming = 0,
      current = 0,
      done = 0;
    for (const ad of flat) {
      const g = groupForStatus(ad.status);
      if (g === 'upcoming') upcoming++;
      else if (g === 'current') current++;
      else done++;
    }
    return { upcoming, current, done, all: flat.length };
  }, [flat]);

  const totals = useMemo(() => {
    let gross = 0;
    let actual = 0;
    let count = 0;
    for (const ad of filtered) {
      const g = parseFloat((ad.grossBudget ?? '').replace(/[$,\s]/g, ''));
      if (Number.isFinite(g)) {
        gross += g;
        const a = actualSpend(ad.grossBudget, ad.markup) ?? 0;
        actual += a;
      }
      count++;
    }
    return { gross, actual, count };
  }, [filtered]);

  const patchAd = useCallback(
    async (ad: FlatAd, patch: Partial<OttAd>) => {
      setSavingId(ad.id);
      try {
        const r = await fetch(`/api/ott-ads/${ad.accountKey}/ads/${ad.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (!r.ok) throw new Error(await r.text());
        // Optimistic update
        setOverview((prev) =>
          prev.map((acct) =>
            acct.accountKey === ad.accountKey
              ? {
                  ...acct,
                  ads: acct.ads.map((a) => (a.id === ad.id ? { ...a, ...patch } : a)),
                }
              : acct,
          ),
        );
      } catch (e) {
        console.error('[ott patch]', e);
        await load();
      } finally {
        setSavingId(null);
      }
    },
    [load],
  );

  const deleteAd = useCallback(
    async (ad: FlatAd) => {
      if (!confirm(`Delete "${ad.name || 'Untitled'}"?`)) return;
      await fetch(`/api/ott-ads/${ad.accountKey}/ads/${ad.id}`, { method: 'DELETE' });
      setOverview((prev) =>
        prev.map((acct) =>
          acct.accountKey === ad.accountKey
            ? { ...acct, ads: acct.ads.filter((a) => a.id !== ad.id) }
            : acct,
        ),
      );
    },
    [],
  );

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">OTT Tracker</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            All OTT/CTV campaigns across accounts. StackAdapt and other platforms.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="px-3 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90"
        >
          + New Campaign
        </button>
      </div>

      {/* Group tabs */}
      <div className="flex gap-1 border-b border-[var(--border)]">
        {(
          [
            ['current', 'Current', counts.current],
            ['upcoming', 'Upcoming', counts.upcoming],
            ['done', 'Done', counts.done],
            ['all', 'All', counts.all],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setFilters((f) => ({ ...f, group: key }))}
            className={`px-3 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
              filters.group === key
                ? 'border-[var(--primary)] text-[var(--foreground)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            {label}
            <span className="ml-1.5 text-xs opacity-70">({count})</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Search name or account…"
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="px-3 py-1.5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] text-sm w-64"
        />
        <select
          value={filters.account}
          onChange={(e) => setFilters((f) => ({ ...f, account: e.target.value }))}
          className="px-2 py-1.5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] text-sm"
        >
          <option value="">All accounts</option>
          {overview.map((a) => (
            <option key={a.accountKey} value={a.accountKey}>
              {a.dealer}
            </option>
          ))}
        </select>
        <select
          value={filters.platform}
          onChange={(e) => setFilters((f) => ({ ...f, platform: e.target.value }))}
          className="px-2 py-1.5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] text-sm"
        >
          <option value="">All platforms</option>
          {PLATFORM_OPTIONS.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="px-2 py-1.5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] text-sm"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={filters.period}
          onChange={(e) => setFilters((f) => ({ ...f, period: e.target.value }))}
          className="px-2 py-1.5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] text-sm"
        >
          <option value="">All periods</option>
          {allPeriods.map((p) => (
            <option key={p} value={p}>
              {periodShort(p)}
            </option>
          ))}
        </select>
        <div className="ml-auto text-xs text-[var(--muted-foreground)]">
          {totals.count} campaigns ·{' '}
          <span className="text-[var(--foreground)] font-medium">{fmtCurrency(totals.gross)}</span>{' '}
          gross / {fmtCurrency(totals.actual)} actual
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-16 text-sm text-[var(--muted-foreground)]">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-sm text-[var(--muted-foreground)]">
          No campaigns match these filters.
        </div>
      ) : (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] border-b border-[var(--border)]">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Campaign</th>
                <th className="text-left px-2 py-2 font-medium">Account</th>
                <th className="text-left px-2 py-2 font-medium">Platform</th>
                <th className="text-left px-2 py-2 font-medium">Period</th>
                <th className="text-left px-2 py-2 font-medium">Flight</th>
                <th className="text-left px-2 py-2 font-medium">Status</th>
                <th className="text-right px-2 py-2 font-medium">Gross</th>
                <th className="text-right px-2 py-2 font-medium">Actual</th>
                <th className="text-left px-2 py-2 font-medium">Due</th>
                <th className="text-left px-2 py-2 font-medium">Recurring</th>
                <th className="text-right px-2 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ad) => (
                <AdRow
                  key={ad.id}
                  ad={ad}
                  onPatch={(patch) => patchAd(ad, patch)}
                  onDelete={() => deleteAd(ad)}
                  saving={savingId === ad.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && (
        <NewAdModal
          accounts={Object.entries(contextAccounts).map(([key, a]) => ({ key, dealer: a.dealer }))}
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            void load();
          }}
        />
      )}
    </div>
  );
}

function AdRow({
  ad,
  onPatch,
  onDelete,
  saving,
}: {
  ad: FlatAd;
  onPatch: (patch: Partial<OttAd>) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(ad.name);
  const [gross, setGross] = useState(ad.grossBudget ?? '');
  useEffect(() => setName(ad.name), [ad.name]);
  useEffect(() => setGross(ad.grossBudget ?? ''), [ad.grossBudget]);
  const actual = actualSpend(ad.grossBudget, ad.markup);
  const flight =
    ad.flightStart || ad.flightEnd
      ? `${ad.flightStart ?? '?'} → ${ad.flightEnd ?? '?'}`
      : '—';

  return (
    <tr className="border-b border-[var(--border)] hover:bg-[var(--background-secondary)]/40 transition-colors">
      <td className="px-3 py-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => {
            if (name !== ad.name) onPatch({ name });
          }}
          className="w-full bg-transparent focus:bg-[var(--background-secondary)] rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-[var(--primary)]"
        />
      </td>
      <td className="px-2 py-2 text-[var(--muted-foreground)]">{ad.dealer}</td>
      <td className="px-2 py-2">
        <select
          value={ad.platform}
          onChange={(e) => onPatch({ platform: e.target.value })}
          className="bg-transparent text-sm px-1 py-0.5 rounded outline-none hover:bg-[var(--background-secondary)]"
        >
          {PLATFORM_OPTIONS.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-2">
        <input
          type="month"
          value={ad.period || ''}
          onChange={(e) => onPatch({ period: e.target.value })}
          className="bg-transparent text-sm px-1 py-0.5 rounded outline-none hover:bg-[var(--background-secondary)]"
        />
      </td>
      <td className="px-2 py-2 text-xs text-[var(--muted-foreground)]">
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={ad.flightStart ?? ''}
            onChange={(e) => onPatch({ flightStart: e.target.value || null })}
            className="bg-transparent text-xs px-1 py-0.5 rounded outline-none hover:bg-[var(--background-secondary)]"
          />
          <span>→</span>
          <input
            type="date"
            value={ad.flightEnd ?? ''}
            onChange={(e) => onPatch({ flightEnd: e.target.value || null })}
            className="bg-transparent text-xs px-1 py-0.5 rounded outline-none hover:bg-[var(--background-secondary)]"
          />
        </div>
        <span className="sr-only">{flight}</span>
      </td>
      <td className="px-2 py-2">
        <select
          value={ad.status}
          onChange={(e) => onPatch({ status: e.target.value })}
          className={`text-xs px-2 py-0.5 rounded-full font-medium outline-none cursor-pointer ${statusPillClass(ad.status)}`}
        >
          {STATUS_OPTIONS.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-2 text-right">
        <input
          value={gross}
          onChange={(e) => setGross(e.target.value)}
          onBlur={() => {
            if (gross !== (ad.grossBudget ?? '')) onPatch({ grossBudget: gross || null });
          }}
          placeholder="0"
          className="w-20 text-right bg-transparent focus:bg-[var(--background-secondary)] rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-[var(--primary)]"
        />
      </td>
      <td className="px-2 py-2 text-right text-[var(--muted-foreground)] tabular-nums">
        {fmtCurrency(actual)}
      </td>
      <td className="px-2 py-2">
        <input
          type="date"
          value={ad.dueDate ?? ''}
          onChange={(e) => onPatch({ dueDate: e.target.value || null })}
          className="bg-transparent text-xs px-1 py-0.5 rounded outline-none hover:bg-[var(--background-secondary)]"
        />
      </td>
      <td className="px-2 py-2">
        <select
          value={ad.recurring}
          onChange={(e) => onPatch({ recurring: e.target.value })}
          className="bg-transparent text-xs px-1 py-0.5 rounded outline-none hover:bg-[var(--background-secondary)]"
        >
          <option value="No">No</option>
          <option value="Yes">Yes</option>
          <option value="Unknown">Unknown</option>
        </select>
      </td>
      <td className="px-2 py-2 text-right">
        <div className="flex justify-end items-center gap-1">
          {saving && <span className="text-xs text-[var(--muted-foreground)]">saving…</span>}
          <Link
            href={`/tools/ott/analytics?adId=${ad.id}&accountKey=${ad.accountKey}`}
            className="text-xs px-2 py-1 rounded hover:bg-[var(--background-secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            title="Analytics"
          >
            📊
          </Link>
          <button
            onClick={onDelete}
            className="text-xs px-2 py-1 rounded hover:bg-rose-500/15 text-[var(--muted-foreground)] hover:text-rose-600"
            title="Delete"
          >
            ✕
          </button>
        </div>
      </td>
    </tr>
  );
}

function NewAdModal({
  accounts,
  onClose,
  onCreated,
}: {
  accounts: { key: string; dealer: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [accountKey, setAccountKey] = useState(accounts[0]?.key ?? '');
  const [name, setName] = useState('');
  const [platform, setPlatform] = useState('stackadapt');
  const [period, setPeriod] = useState(todayPeriod());
  const [grossBudget, setGrossBudget] = useState('');
  const [flightStart, setFlightStart] = useState('');
  const [flightEnd, setFlightEnd] = useState('');
  const [saving, setSaving] = useState(false);

  const sortedAccounts = useMemo(
    () => [...accounts].sort((a, b) => a.dealer.localeCompare(b.dealer)),
    [accounts],
  );

  const submit = async () => {
    if (!accountKey || !name.trim()) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/ott-ads/${accountKey}/ads`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          platform,
          period,
          grossBudget: grossBudget || null,
          flightStart: flightStart || null,
          flightEnd: flightEnd || null,
          status: 'new_request',
        }),
      });
      if (!r.ok) throw new Error(await r.text());
      onCreated();
    } catch (e) {
      console.error(e);
      alert('Failed to create. Check console.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="glass-card max-w-md w-full p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">New OTT Campaign</h2>
        <div className="space-y-2 text-sm">
          <label className="block">
            <span className="text-xs text-[var(--muted-foreground)]">Account</span>
            <select
              value={accountKey}
              onChange={(e) => setAccountKey(e.target.value)}
              className="w-full mt-1 px-2 py-1.5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)]"
            >
              {sortedAccounts.map((a) => (
                <option key={a.key} value={a.key}>
                  {a.dealer}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-[var(--muted-foreground)]">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q3 Branding"
              className="w-full mt-1 px-2 py-1.5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)]"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs text-[var(--muted-foreground)]">Platform</span>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full mt-1 px-2 py-1.5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)]"
              >
                {PLATFORM_OPTIONS.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-[var(--muted-foreground)]">Period</span>
              <input
                type="month"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full mt-1 px-2 py-1.5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)]"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs text-[var(--muted-foreground)]">Flight start</span>
              <input
                type="date"
                value={flightStart}
                onChange={(e) => setFlightStart(e.target.value)}
                className="w-full mt-1 px-2 py-1.5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)]"
              />
            </label>
            <label className="block">
              <span className="text-xs text-[var(--muted-foreground)]">Flight end</span>
              <input
                type="date"
                value={flightEnd}
                onChange={(e) => setFlightEnd(e.target.value)}
                className="w-full mt-1 px-2 py-1.5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)]"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-xs text-[var(--muted-foreground)]">Gross budget</span>
            <input
              value={grossBudget}
              onChange={(e) => setGrossBudget(e.target.value)}
              placeholder="$0"
              className="w-full mt-1 px-2 py-1.5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)]"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-sm hover:bg-[var(--background-secondary)]"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!name.trim() || !accountKey || saving}
            className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
