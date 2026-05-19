'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { OTT_PLATFORM_LABELS, OTT_STATUS_LABELS, OTT_BENCHMARKS } from '@/lib/ott-ads-client';
import {
  actualSpend,
  deriveKpis,
  fmtCurrency,
  fmtNumber,
  fmtPercent,
  fmtMultiplier,
  parseNum,
  periodLabel,
  rateCpm,
  rateFrequency,
  rateVcr,
  todayPeriod,
  type HealthRating,
} from '../_lib/calc';
import type {
  OttAdAnalytics,
  OttGeoRow,
  OttOverviewAccount,
  OttPerformanceRow,
  OttPropertyRow,
  OttOptimizationRow,
} from '../_lib/types';

type Tab = 'tracker' | 'geo' | 'properties' | 'log';

export function OttAnalytics() {
  const router = useRouter();
  const sp = useSearchParams();
  const adId = sp.get('adId');
  const accountKey = sp.get('accountKey');

  if (!adId || !accountKey) {
    return <CampaignPicker />;
  }
  return (
    <DeepDive
      adId={adId}
      accountKey={accountKey}
      onBack={() => router.push('/tools/ott/analytics')}
    />
  );
}

function CampaignPicker() {
  const [overview, setOverview] = useState<OttOverviewAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const r = await fetch('/api/ott-ads/overview');
        const data = (await r.json()) as { accounts?: OttOverviewAccount[] };
        setOverview(data.accounts ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const flat = useMemo(() => {
    const out: { id: string; accountKey: string; dealer: string; name: string; period: string; platform: string; status: string }[] = [];
    for (const acct of overview) {
      for (const ad of acct.ads) {
        out.push({
          id: ad.id,
          accountKey: acct.accountKey,
          dealer: acct.dealer,
          name: ad.name,
          period: ad.period,
          platform: ad.platform,
          status: ad.status,
        });
      }
    }
    if (!search.trim()) return out;
    const q = search.toLowerCase();
    return out.filter(
      (a) => a.name.toLowerCase().includes(q) || a.dealer.toLowerCase().includes(q),
    );
  }, [overview, search]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">OTT Analytics</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
          Per-campaign performance review. Pick a campaign to drill in.
        </p>
      </div>
      <input
        type="text"
        placeholder="Search campaigns or accounts…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="px-3 py-2 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] text-sm w-full max-w-md"
      />
      {loading ? (
        <div className="text-sm text-[var(--muted-foreground)]">Loading…</div>
      ) : flat.length === 0 ? (
        <div className="text-sm text-[var(--muted-foreground)]">No campaigns found.</div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] border-b border-[var(--border)]">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Campaign</th>
                <th className="text-left px-2 py-2 font-medium">Account</th>
                <th className="text-left px-2 py-2 font-medium">Platform</th>
                <th className="text-left px-2 py-2 font-medium">Period</th>
                <th className="text-left px-2 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {flat.map((ad) => (
                <tr key={ad.id} className="border-b border-[var(--border)] hover:bg-[var(--background-secondary)]/40">
                  <td className="px-3 py-2">
                    <Link
                      href={`/tools/ott/analytics?adId=${ad.id}&accountKey=${ad.accountKey}`}
                      className="text-[var(--primary)] hover:underline font-medium"
                    >
                      {ad.name || 'Untitled'}
                    </Link>
                  </td>
                  <td className="px-2 py-2 text-[var(--muted-foreground)]">{ad.dealer}</td>
                  <td className="px-2 py-2 text-[var(--muted-foreground)]">
                    {OTT_PLATFORM_LABELS[ad.platform as keyof typeof OTT_PLATFORM_LABELS] ?? ad.platform}
                  </td>
                  <td className="px-2 py-2 text-[var(--muted-foreground)]">{ad.period || '—'}</td>
                  <td className="px-2 py-2 text-[var(--muted-foreground)]">
                    {OTT_STATUS_LABELS[ad.status as keyof typeof OTT_STATUS_LABELS] ?? ad.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DeepDive({
  adId,
  accountKey,
  onBack,
}: {
  adId: string;
  accountKey: string;
  onBack: () => void;
}) {
  const [data, setData] = useState<OttAdAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('tracker');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/ott-ads/${accountKey}/ads/${adId}/analytics`);
      const j = (await r.json()) as { ad?: OttAdAnalytics };
      setData(j.ad ?? null);
    } finally {
      setLoading(false);
    }
  }, [adId, accountKey]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <div className="text-sm text-[var(--muted-foreground)]">Loading…</div>;
  if (!data)
    return (
      <div className="text-sm text-[var(--muted-foreground)]">
        Campaign not found.{' '}
        <button onClick={onBack} className="text-[var(--primary)] hover:underline">
          Back
        </button>
      </div>
    );

  return (
    <div className="space-y-4">
      <div>
        <button
          onClick={onBack}
          className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-1"
        >
          ← All campaigns
        </button>
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{data.name || 'Untitled campaign'}</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
              {data.dealer} ·{' '}
              {OTT_PLATFORM_LABELS[data.platform as keyof typeof OTT_PLATFORM_LABELS] ?? data.platform} ·{' '}
              Period {data.period || '—'} · Gross{' '}
              {fmtCurrency(parseNum(data.grossBudget))} · Actual{' '}
              {fmtCurrency(actualSpend(data.grossBudget, data.markup))}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-[var(--border)]">
        {(
          [
            ['tracker', 'Monthly Tracker'],
            ['geo', 'Geographic'],
            ['properties', 'Top Properties'],
            ['log', 'Optimization Log'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
              tab === key
                ? 'border-[var(--primary)] text-[var(--foreground)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'tracker' && (
        <TrackerTab
          ad={data}
          onChanged={load}
        />
      )}
      {tab === 'geo' && <GeoTab ad={data} onChanged={load} />}
      {tab === 'properties' && <PropertiesTab ad={data} onChanged={load} />}
      {tab === 'log' && <LogTab ad={data} onChanged={load} />}
    </div>
  );
}

// ────────────────────────────────────────────────────
// Monthly Tracker tab
// ────────────────────────────────────────────────────

const MONTHLY_FIELDS: Array<{ key: keyof OttPerformanceRow; label: string; align: 'left' | 'right' }> = [
  { key: 'spend', label: 'Spend', align: 'right' },
  { key: 'impressions', label: 'Impressions', align: 'right' },
  { key: 'completedViews', label: 'Completed Views', align: 'right' },
  { key: 'uniqueReach', label: 'Unique Reach', align: 'right' },
  { key: 'footfallVisits', label: 'Footfall Visits', align: 'right' },
  { key: 'siteVisits', label: 'Site Visits', align: 'right' },
];

function TrackerTab({ ad, onChanged }: { ad: OttAdAnalytics; onChanged: () => void }) {
  const months = useMemo(() => {
    // Show all stored months + the campaign period if missing + current month for entry.
    const set = new Set<string>();
    for (const p of ad.performance) set.add(p.month);
    if (ad.period) set.add(ad.period);
    set.add(todayPeriod());
    return [...set].sort();
  }, [ad.performance, ad.period]);

  const byMonth = useMemo(() => {
    const m = new Map<string, OttPerformanceRow>();
    for (const r of ad.performance) m.set(r.month, r);
    return m;
  }, [ad.performance]);

  const totals = useMemo(() => {
    let spend = 0,
      impressions = 0,
      completedViews = 0,
      uniqueReach = 0,
      footfallVisits = 0,
      siteVisits = 0;
    for (const r of ad.performance) {
      spend += parseNum(r.spend) ?? 0;
      impressions += parseNum(r.impressions) ?? 0;
      completedViews += parseNum(r.completedViews) ?? 0;
      uniqueReach += parseNum(r.uniqueReach) ?? 0;
      footfallVisits += parseNum(r.footfallVisits) ?? 0;
      siteVisits += parseNum(r.siteVisits) ?? 0;
    }
    return { spend, impressions, completedViews, uniqueReach, footfallVisits, siteVisits };
  }, [ad.performance]);

  const totalsDerived = deriveKpis({
    id: 'totals',
    month: 'total',
    spend: String(totals.spend),
    impressions: String(totals.impressions),
    completedViews: String(totals.completedViews),
    uniqueReach: String(totals.uniqueReach),
    footfallVisits: String(totals.footfallVisits),
    siteVisits: String(totals.siteVisits),
    notes: null,
  });

  return (
    <div className="space-y-4">
      <BenchmarkBar totals={totalsDerived} />
      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] border-b border-[var(--border)]">
            <tr>
              <th className="text-left px-3 py-2 font-medium sticky left-0 bg-[var(--background)]">Month</th>
              {MONTHLY_FIELDS.map((f) => (
                <th key={f.key} className={`px-2 py-2 font-medium text-${f.align}`}>
                  {f.label}
                </th>
              ))}
              <th className="px-2 py-2 font-medium text-right">CPM</th>
              <th className="px-2 py-2 font-medium text-right">VCR</th>
              <th className="px-2 py-2 font-medium text-right">CPCV</th>
              <th className="px-2 py-2 font-medium text-right">Freq.</th>
              <th className="px-2 py-2 font-medium text-right">$/Visit</th>
              <th className="px-2 py-2 font-medium text-right">$/Site</th>
              <th className="px-2 py-2 font-medium text-left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {months.map((month) => (
              <PerformanceRow
                key={month}
                ad={ad}
                month={month}
                existing={byMonth.get(month)}
                onSaved={onChanged}
              />
            ))}
            <tr className="bg-[var(--background-secondary)]/40 font-semibold border-t border-[var(--border)]">
              <td className="px-3 py-2 sticky left-0 bg-[var(--background-secondary)]/80">Total</td>
              <td className="px-2 py-2 text-right">{fmtCurrency(totals.spend)}</td>
              <td className="px-2 py-2 text-right">{fmtNumber(totals.impressions)}</td>
              <td className="px-2 py-2 text-right">{fmtNumber(totals.completedViews)}</td>
              <td className="px-2 py-2 text-right">{fmtNumber(totals.uniqueReach)}</td>
              <td className="px-2 py-2 text-right">{fmtNumber(totals.footfallVisits)}</td>
              <td className="px-2 py-2 text-right">{fmtNumber(totals.siteVisits)}</td>
              <td className={`px-2 py-2 text-right ${rateClass(rateCpm(totalsDerived.cpm))}`}>
                {fmtCurrency(totalsDerived.cpm, { decimals: 2 })}
              </td>
              <td className={`px-2 py-2 text-right ${rateClass(rateVcr(totalsDerived.vcr))}`}>
                {fmtPercent(totalsDerived.vcr)}
              </td>
              <td className="px-2 py-2 text-right">{fmtCurrency(totalsDerived.cpcv, { decimals: 3 })}</td>
              <td className={`px-2 py-2 text-right ${rateClass(rateFrequency(totalsDerived.frequency))}`}>
                {fmtMultiplier(totalsDerived.frequency)}
              </td>
              <td className="px-2 py-2 text-right">{fmtCurrency(totalsDerived.costPerVisit, { decimals: 2 })}</td>
              <td className="px-2 py-2 text-right">{fmtCurrency(totalsDerived.costPerSiteVisit, { decimals: 2 })}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <BenchmarkNotes />
    </div>
  );
}

function PerformanceRow({
  ad,
  month,
  existing,
  onSaved,
}: {
  ad: OttAdAnalytics;
  month: string;
  existing: OttPerformanceRow | undefined;
  onSaved: () => void;
}) {
  const [row, setRow] = useState<OttPerformanceRow>(
    existing ?? {
      id: 'new',
      month,
      spend: '',
      impressions: '',
      completedViews: '',
      uniqueReach: '',
      footfallVisits: '',
      siteVisits: '',
      notes: '',
    },
  );
  useEffect(() => {
    if (existing) setRow(existing);
  }, [existing]);

  const derived = deriveKpis(row);

  const save = async (next: OttPerformanceRow) => {
    await fetch(`/api/ott-ads/${ad.accountKey}/ads/${ad.id}/performance/${month}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        spend: next.spend,
        impressions: next.impressions,
        completedViews: next.completedViews,
        uniqueReach: next.uniqueReach,
        footfallVisits: next.footfallVisits,
        siteVisits: next.siteVisits,
        notes: next.notes,
      }),
    });
    onSaved();
  };

  const setField = (key: keyof OttPerformanceRow, value: string) => {
    setRow((r) => ({ ...r, [key]: value }));
  };
  const blur = () => {
    void save(row);
  };

  return (
    <tr className="border-b border-[var(--border)] hover:bg-[var(--background-secondary)]/30">
      <td className="px-3 py-2 sticky left-0 bg-[var(--background)] font-medium whitespace-nowrap">
        {periodLabel(month)}
      </td>
      {MONTHLY_FIELDS.map((f) => (
        <td key={f.key} className={`px-2 py-2 text-${f.align}`}>
          <input
            value={(row[f.key] as string) ?? ''}
            onChange={(e) => setField(f.key, e.target.value)}
            onBlur={blur}
            placeholder="—"
            className="w-24 text-right bg-transparent focus:bg-[var(--background-secondary)] rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
        </td>
      ))}
      <td className={`px-2 py-2 text-right tabular-nums ${rateClass(rateCpm(derived.cpm))}`}>
        {fmtCurrency(derived.cpm, { decimals: 2 })}
      </td>
      <td className={`px-2 py-2 text-right tabular-nums ${rateClass(rateVcr(derived.vcr))}`}>
        {fmtPercent(derived.vcr)}
      </td>
      <td className="px-2 py-2 text-right tabular-nums">{fmtCurrency(derived.cpcv, { decimals: 3 })}</td>
      <td className={`px-2 py-2 text-right tabular-nums ${rateClass(rateFrequency(derived.frequency))}`}>
        {fmtMultiplier(derived.frequency)}
      </td>
      <td className="px-2 py-2 text-right tabular-nums">
        {fmtCurrency(derived.costPerVisit, { decimals: 2 })}
      </td>
      <td className="px-2 py-2 text-right tabular-nums">
        {fmtCurrency(derived.costPerSiteVisit, { decimals: 2 })}
      </td>
      <td className="px-2 py-2">
        <input
          value={row.notes ?? ''}
          onChange={(e) => setField('notes', e.target.value)}
          onBlur={blur}
          placeholder="—"
          className="w-40 bg-transparent focus:bg-[var(--background-secondary)] rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-[var(--primary)]"
        />
      </td>
    </tr>
  );
}

function rateClass(rating: HealthRating): string {
  switch (rating) {
    case 'good':
      return 'text-green-600 dark:text-green-400';
    case 'warn':
      return 'text-amber-600 dark:text-amber-400';
    case 'bad':
      return 'text-rose-600 dark:text-rose-400';
    case 'neutral':
    default:
      return '';
  }
}

function BenchmarkBar({ totals }: { totals: ReturnType<typeof deriveKpis> }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
      <KpiCard label="CPM" value={fmtCurrency(totals.cpm, { decimals: 2 })} rating={rateCpm(totals.cpm)} hint={`$${OTT_BENCHMARKS.cpm.min}–$${OTT_BENCHMARKS.cpm.max}`} />
      <KpiCard label="VCR" value={fmtPercent(totals.vcr)} rating={rateVcr(totals.vcr)} hint={`${OTT_BENCHMARKS.vcr.min}–${OTT_BENCHMARKS.vcr.max}%`} />
      <KpiCard label="CPCV" value={fmtCurrency(totals.cpcv, { decimals: 3 })} rating="neutral" />
      <KpiCard label="Frequency" value={fmtMultiplier(totals.frequency)} rating={rateFrequency(totals.frequency)} hint={`${OTT_BENCHMARKS.frequency.min}–${OTT_BENCHMARKS.frequency.max}x`} />
      <KpiCard label="Cost / Visit" value={fmtCurrency(totals.costPerVisit, { decimals: 2 })} rating="neutral" />
      <KpiCard label="Cost / Site" value={fmtCurrency(totals.costPerSiteVisit, { decimals: 2 })} rating="neutral" />
    </div>
  );
}

function KpiCard({
  label,
  value,
  rating,
  hint,
}: {
  label: string;
  value: string;
  rating: HealthRating;
  hint?: string;
}) {
  return (
    <div className="glass-card p-3">
      <div className="text-xs text-[var(--muted-foreground)] uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-semibold tabular-nums ${rateClass(rating)}`}>{value}</div>
      {hint && <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">target {hint}</div>}
    </div>
  );
}

function BenchmarkNotes() {
  return (
    <div className="glass-card p-4 text-xs text-[var(--muted-foreground)] space-y-1">
      <div className="font-semibold text-[var(--foreground)]">CTV benchmarks (StackAdapt)</div>
      <div>CPM ${OTT_BENCHMARKS.cpm.min}–${OTT_BENCHMARKS.cpm.max} · VCR {OTT_BENCHMARKS.vcr.min}–{OTT_BENCHMARKS.vcr.max}% · Frequency {OTT_BENCHMARKS.frequency.min}–{OTT_BENCHMARKS.frequency.max}x/mo</div>
      <div>Unique Reach scales with budget (8k–17k for ~$1.5k gross) · Footfall {OTT_BENCHMARKS.footfallVisits.min}–{OTT_BENCHMARKS.footfallVisits.max}/mo · takes 7–14 days to populate</div>
    </div>
  );
}

// ────────────────────────────────────────────────────
// Geographic tab
// ────────────────────────────────────────────────────

function GeoTab({ ad, onChanged }: { ad: OttAdAnalytics; onChanged: () => void }) {
  const months = useMemo(() => {
    const set = new Set<string>();
    for (const r of ad.geoPerf) set.add(r.month);
    for (const r of ad.performance) set.add(r.month);
    if (ad.period) set.add(ad.period);
    set.add(todayPeriod());
    return [...set].sort();
  }, [ad.geoPerf, ad.performance, ad.period]);

  const [month, setMonth] = useState<string>(months[months.length - 1] ?? todayPeriod());
  useEffect(() => {
    if (!months.includes(month)) setMonth(months[months.length - 1] ?? todayPeriod());
  }, [months, month]);

  const initial = useMemo(() => ad.geoPerf.filter((r) => r.month === month), [ad.geoPerf, month]);
  const [rows, setRows] = useState<OttGeoRow[]>(initial);
  useEffect(() => setRows(initial), [initial]);

  const addRow = () => {
    setRows((r) => [
      ...r,
      {
        id: `new-${Date.now()}`,
        month,
        county: '',
        impressions: '',
        spend: '',
        vcr: '',
        footfallVisits: '',
        notes: '',
      },
    ]);
  };

  const removeRow = (idx: number) => setRows((r) => r.filter((_, i) => i !== idx));
  const updateRow = (idx: number, patch: Partial<OttGeoRow>) =>
    setRows((r) => r.map((x, i) => (i === idx ? { ...x, ...patch } : x)));

  const save = async () => {
    await fetch(`/api/ott-ads/${ad.accountKey}/ads/${ad.id}/geo/${month}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rows }),
    });
    onChanged();
  };

  const totals = useMemo(() => {
    let impressions = 0,
      spend = 0,
      footfallVisits = 0;
    for (const r of rows) {
      impressions += parseNum(r.impressions) ?? 0;
      spend += parseNum(r.spend) ?? 0;
      footfallVisits += parseNum(r.footfallVisits) ?? 0;
    }
    return { impressions, spend, footfallVisits };
  }, [rows]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--muted-foreground)]">Month</label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-2 py-1 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] text-sm"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {periodLabel(m)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addRow}
            className="text-xs px-2 py-1 rounded-lg hover:bg-[var(--background-secondary)] text-[var(--muted-foreground)]"
          >
            + County
          </button>
          <button
            onClick={save}
            className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90"
          >
            Save month
          </button>
        </div>
      </div>
      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] border-b border-[var(--border)]">
            <tr>
              <th className="text-left px-3 py-2 font-medium">County</th>
              <th className="text-right px-2 py-2 font-medium">Impressions</th>
              <th className="text-right px-2 py-2 font-medium">Spend</th>
              <th className="text-right px-2 py-2 font-medium">VCR</th>
              <th className="text-right px-2 py-2 font-medium">Footfall</th>
              <th className="text-left px-2 py-2 font-medium">Next month action</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-6 text-xs text-[var(--muted-foreground)]">
                  No counties yet. Click + County to add one.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.id} className="border-b border-[var(--border)]">
                  <td className="px-3 py-1.5">
                    <input
                      value={r.county}
                      onChange={(e) => updateRow(i, { county: e.target.value })}
                      placeholder="e.g. Weber County, UT"
                      className="w-full bg-transparent focus:bg-[var(--background-secondary)] rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-[var(--primary)]"
                    />
                  </td>
                  <NumCell value={r.impressions} onChange={(v) => updateRow(i, { impressions: v })} />
                  <NumCell value={r.spend} onChange={(v) => updateRow(i, { spend: v })} />
                  <NumCell value={r.vcr} onChange={(v) => updateRow(i, { vcr: v })} suffix="%" />
                  <NumCell value={r.footfallVisits} onChange={(v) => updateRow(i, { footfallVisits: v })} />
                  <td className="px-2 py-1.5">
                    <input
                      value={r.notes ?? ''}
                      onChange={(e) => updateRow(i, { notes: e.target.value })}
                      placeholder="—"
                      className="w-full bg-transparent focus:bg-[var(--background-secondary)] rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-[var(--primary)]"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <button
                      onClick={() => removeRow(i)}
                      className="text-xs px-1.5 py-0.5 rounded hover:bg-rose-500/15 text-[var(--muted-foreground)] hover:text-rose-600"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))
            )}
            {rows.length > 0 && (
              <tr className="font-semibold border-t border-[var(--border)] bg-[var(--background-secondary)]/40">
                <td className="px-3 py-2">Total</td>
                <td className="px-2 py-2 text-right tabular-nums">{fmtNumber(totals.impressions)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{fmtCurrency(totals.spend)}</td>
                <td className="px-2 py-2 text-right text-[var(--muted-foreground)]">—</td>
                <td className="px-2 py-2 text-right tabular-nums">{fmtNumber(totals.footfallVisits)}</td>
                <td colSpan={2}></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────
// Top Properties tab
// ────────────────────────────────────────────────────

function PropertiesTab({ ad, onChanged }: { ad: OttAdAnalytics; onChanged: () => void }) {
  const months = useMemo(() => {
    const set = new Set<string>();
    for (const r of ad.propertyPerf) set.add(r.month);
    for (const r of ad.performance) set.add(r.month);
    if (ad.period) set.add(ad.period);
    set.add(todayPeriod());
    return [...set].sort();
  }, [ad.propertyPerf, ad.performance, ad.period]);

  const [month, setMonth] = useState<string>(months[months.length - 1] ?? todayPeriod());
  useEffect(() => {
    if (!months.includes(month)) setMonth(months[months.length - 1] ?? todayPeriod());
  }, [months, month]);

  const initial = useMemo(
    () => ad.propertyPerf.filter((r) => r.month === month),
    [ad.propertyPerf, month],
  );
  const [rows, setRows] = useState<OttPropertyRow[]>(initial);
  useEffect(() => setRows(initial), [initial]);

  const addRow = () =>
    setRows((r) => [
      ...r,
      {
        id: `new-${Date.now()}`,
        month,
        rank: r.length + 1,
        property: '',
        impressions: '',
        spend: '',
        vcr: '',
        decision: null,
      },
    ]);
  const removeRow = (idx: number) =>
    setRows((r) => r.filter((_, i) => i !== idx).map((x, i) => ({ ...x, rank: i + 1 })));
  const updateRow = (idx: number, patch: Partial<OttPropertyRow>) =>
    setRows((r) => r.map((x, i) => (i === idx ? { ...x, ...patch } : x)));

  const save = async () => {
    await fetch(`/api/ott-ads/${ad.accountKey}/ads/${ad.id}/property/${month}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rows }),
    });
    onChanged();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs text-[var(--muted-foreground)]">Month</label>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="px-2 py-1 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)] text-sm"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {periodLabel(m)}
              </option>
            ))}
          </select>
          <span className="text-xs text-[var(--muted-foreground)]">
            Top 15 by impressions (StackAdapt &gt; Property Performance)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={addRow}
            className="text-xs px-2 py-1 rounded-lg hover:bg-[var(--background-secondary)] text-[var(--muted-foreground)]"
          >
            + Property
          </button>
          <button
            onClick={save}
            className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90"
          >
            Save month
          </button>
        </div>
      </div>
      <div className="glass-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] border-b border-[var(--border)]">
            <tr>
              <th className="text-left px-3 py-2 font-medium w-10">#</th>
              <th className="text-left px-2 py-2 font-medium">Property</th>
              <th className="text-right px-2 py-2 font-medium">Impressions</th>
              <th className="text-right px-2 py-2 font-medium">Spend</th>
              <th className="text-right px-2 py-2 font-medium">VCR</th>
              <th className="text-left px-2 py-2 font-medium">Decision</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-6 text-xs text-[var(--muted-foreground)]">
                  No properties yet. Click + Property to add one.
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r.id} className="border-b border-[var(--border)]">
                  <td className="px-3 py-1.5 text-[var(--muted-foreground)]">{i + 1}</td>
                  <td className="px-2 py-1.5">
                    <input
                      value={r.property}
                      onChange={(e) => updateRow(i, { property: e.target.value })}
                      placeholder="Property name"
                      className="w-full bg-transparent focus:bg-[var(--background-secondary)] rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-[var(--primary)]"
                    />
                  </td>
                  <NumCell value={r.impressions} onChange={(v) => updateRow(i, { impressions: v })} />
                  <NumCell value={r.spend} onChange={(v) => updateRow(i, { spend: v })} />
                  <NumCell value={r.vcr} onChange={(v) => updateRow(i, { vcr: v })} suffix="%" />
                  <td className="px-2 py-1.5">
                    <select
                      value={r.decision ?? ''}
                      onChange={(e) => updateRow(i, { decision: e.target.value || null })}
                      className="bg-transparent text-sm px-1 py-0.5 rounded outline-none hover:bg-[var(--background-secondary)]"
                    >
                      <option value="">—</option>
                      <option value="keep">Keep</option>
                      <option value="watch">Watch</option>
                      <option value="cut">Cut</option>
                    </select>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <button
                      onClick={() => removeRow(i)}
                      className="text-xs px-1.5 py-0.5 rounded hover:bg-rose-500/15 text-[var(--muted-foreground)] hover:text-rose-600"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────
// Optimization Log tab
// ────────────────────────────────────────────────────

function LogTab({ ad, onChanged }: { ad: OttAdAnalytics; onChanged: () => void }) {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [changeMade, setChangeMade] = useState('');
  const [reason, setReason] = useState('');
  const [result, setResult] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!changeMade.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/ott-ads/${ad.accountKey}/ads/${ad.id}/optimization`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          date,
          changeMade: changeMade.trim(),
          reason: reason.trim() || null,
          result: result.trim() || null,
        }),
      });
      setChangeMade('');
      setReason('');
      setResult('');
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (entry: OttOptimizationRow) => {
    if (!confirm('Delete this entry?')) return;
    await fetch(`/api/ott-ads/${ad.accountKey}/ads/${ad.id}/optimization/${entry.id}`, {
      method: 'DELETE',
    });
    onChanged();
  };

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 space-y-2">
        <div className="font-semibold text-sm">Log a change</div>
        <div className="grid grid-cols-12 gap-2 text-sm">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="col-span-2 px-2 py-1.5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)]"
          />
          <input
            placeholder="What did you change? (required)"
            value={changeMade}
            onChange={(e) => setChangeMade(e.target.value)}
            className="col-span-4 px-2 py-1.5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)]"
          />
          <input
            placeholder="Why?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="col-span-3 px-2 py-1.5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)]"
          />
          <input
            placeholder="Result / observation"
            value={result}
            onChange={(e) => setResult(e.target.value)}
            className="col-span-3 px-2 py-1.5 rounded-lg bg-[var(--background-secondary)] border border-[var(--border)]"
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={submit}
            disabled={!changeMade.trim() || saving}
            className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Add entry'}
          </button>
        </div>
      </div>

      {ad.optimizations.length === 0 ? (
        <div className="text-sm text-[var(--muted-foreground)] text-center py-6">
          No entries yet.
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-[var(--muted-foreground)] border-b border-[var(--border)]">
              <tr>
                <th className="text-left px-3 py-2 font-medium w-28">Date</th>
                <th className="text-left px-2 py-2 font-medium">Change</th>
                <th className="text-left px-2 py-2 font-medium">Reason</th>
                <th className="text-left px-2 py-2 font-medium">Result / Observation</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {ad.optimizations.map((row) => (
                <tr key={row.id} className="border-b border-[var(--border)]">
                  <td className="px-3 py-2 whitespace-nowrap">{row.date}</td>
                  <td className="px-2 py-2">{row.changeMade}</td>
                  <td className="px-2 py-2 text-[var(--muted-foreground)]">{row.reason ?? '—'}</td>
                  <td className="px-2 py-2 text-[var(--muted-foreground)]">{row.result ?? '—'}</td>
                  <td className="px-2 py-2 text-right">
                    <button
                      onClick={() => remove(row)}
                      className="text-xs px-1.5 py-0.5 rounded hover:bg-rose-500/15 text-[var(--muted-foreground)] hover:text-rose-600"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function NumCell({
  value,
  onChange,
  suffix,
}: {
  value: string | null;
  onChange: (v: string) => void;
  suffix?: string;
}) {
  return (
    <td className="px-2 py-1.5 text-right">
      <div className="inline-flex items-center gap-0.5">
        <input
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="—"
          className="w-20 text-right bg-transparent focus:bg-[var(--background-secondary)] rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-[var(--primary)]"
        />
        {suffix && <span className="text-xs text-[var(--muted-foreground)]">{suffix}</span>}
      </div>
    </td>
  );
}
