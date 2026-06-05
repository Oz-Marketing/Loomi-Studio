'use client';

/**
 * Ads reporting — Meta (Facebook) paid performance.
 *
 * Port of Oz Dealer Tools' Facebook Ads report. Pulls live Insights for the
 * active sub-account from /api/reporting/ads (margin already applied server-
 * side) and renders headline KPIs, a daily trend, top-campaign + device +
 * demographic visuals, a campaign table, and a conversions breakdown. Range is
 * driven by presets or an explicit custom window; an optional comparison
 * period overlays deltas on the KPIs.
 */

import { useMemo, useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import useSWR from 'swr';
import {
  CurrencyDollarIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  ChartBarIcon,
  BoltIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  LinkSlashIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  InboxStackIcon,
  ArrowsRightLeftIcon,
  ChevronDownIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import type { ApexOptions } from 'apexcharts';
import { useAccount } from '@/contexts/account-context';
import { useTheme } from '@/contexts/theme-context';
import {
  DashboardToolbar,
  type CustomDateRange,
} from '@/components/filters/dashboard-toolbar';
import {
  type DateRangeKey,
  getDateRangeBounds,
} from '@/lib/date-ranges';
import { ReportingPageHeader } from '../_components/page-header';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

// ── Response types (mirror /api/reporting/ads) ──

interface Metrics {
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  spend: number;
  cpm: number;
  conversions: number;
  cost_per_conversion: number;
  offline_leads: number;
  offline_purchases: number;
  offline_purchase_value: number;
}
interface CampaignRow extends Metrics {
  id: string;
  name: string;
}
interface DeviceRow {
  device: string;
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
}
interface DailyRow {
  date: string;
  label: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
}
interface DemographicRow {
  age: string;
  gender: string;
  impressions: number;
  clicks: number;
  spend: number;
}
interface AdsReport {
  accountKey: string;
  dealer: string;
  margin: number;
  startDate: string;
  endDate: string;
  compareTo: string;
  accountMetrics: Metrics;
  campaigns: CampaignRow[];
  devices: DeviceRow[];
  daily: DailyRow[];
  demographics: DemographicRow[];
  compare: {
    label: string;
    accountMetrics: Metrics;
    campaigns: CampaignRow[];
    daily: DailyRow[];
  } | null;
}

// ── Date range ──

/** API floor for the "All time" preset (start is unbounded → no Meta data predates this). */
const ALL_TIME_FLOOR = '2015-01-01';

function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

/**
 * Earliest date the Meta Insights API serves (~37 months back). Custom ranges
 * are clamped to this; older starts make Graph return a "beyond 37 months"
 * error. Computed once per load — close enough for a date-only floor.
 */
function metaLookbackFloor(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 37);
  return localIso(d);
}

/** Resolve the dashboard range key (+ optional custom window) to API date strings. */
function resolveBounds(key: DateRangeKey, custom: CustomDateRange | null): { from: string; to: string } {
  const b =
    key === 'custom' && custom
      ? getDateRangeBounds('custom', custom.start, custom.end)
      : getDateRangeBounds(key);
  return { from: b.start ? localIso(b.start) : ALL_TIME_FLOOR, to: localIso(b.end) };
}

const COMPARE_LABELS: Record<string, string> = {
  none: 'No comparison',
  previous_period: 'Previous period',
  previous_month: 'Previous month',
  previous_year: 'Previous year',
};

// ── Formatters ──

const usd = (v: number) =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const usd0 = (v: number) =>
  v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const num = (v: number) => Math.round(v).toLocaleString('en-US');
const compact = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(Math.round(v));
const pctText = (v: number) => `${v.toFixed(2)}%`;
const prettyDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.error || `HTTP ${res.status}`) as Error & { code?: string };
    err.code = body?.code;
    throw err;
  }
  return body as AdsReport;
};

// ── Page ──

export default function ReportingAdsPage() {
  const { accountKey, accountData } = useAccount();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Date range mirrors the dashboard's DateRangeFilter (preset pills + custom
  // picker); we resolve its key to concrete API dates.
  const [rangeKey, setRangeKey] = useState<DateRangeKey>('6m');
  const [customRange, setCustomRange] = useState<CustomDateRange | null>(null);
  const [compareTo, setCompareTo] = useState<string>('none');
  const floor = useMemo(() => metaLookbackFloor(), []);
  const { from, to } = useMemo(
    () => resolveBounds(rangeKey, customRange),
    [rangeKey, customRange],
  );

  // Clamp a custom range's start to Meta's lookback floor before it ever
  // reaches the API (the picker's minDate guards the UI; this guards typing).
  const handleCustomRange = (r: CustomDateRange) => {
    const floorDate = new Date(`${floor}T00:00:00`);
    setCustomRange({ start: r.start < floorDate ? floorDate : r.start, end: r.end });
  };

  const query = accountKey
    ? `?accountKey=${encodeURIComponent(accountKey)}&start_date=${from}&end_date=${to}&compare_to=${compareTo}`
    : null;
  const { data, error, isLoading } = useSWR<AdsReport, Error & { code?: string }>(
    query ? `/api/reporting/ads${query}` : null,
    fetcher,
  );

  const dealer = accountData?.dealer || 'all accounts';

  return (
    <>
      <ReportingPageHeader
        eyebrow="Ads"
        title="Ad reporting"
        subtitle={`Meta ad spend, impressions, and CTR — ${accountKey ? dealer : 'select an account'}.`}
      />

      {/* ── Controls ── */}
      {accountKey && (
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <DashboardToolbar
            dateRange={rangeKey}
            onDateRangeChange={setRangeKey}
            customRange={customRange}
            onCustomRangeChange={handleCustomRange}
            showReset={false}
            align="left"
            hidePresets={['all']}
            minDate={floor}
          />
          <CompareDropdown value={compareTo} onChange={setCompareTo} />
          {data && data.margin > 0 && (
            <span className="rounded-full bg-[var(--primary)]/10 px-2.5 py-1 text-[11px] font-medium text-[var(--primary)]">
              {data.margin}% margin
            </span>
          )}
        </div>
      )}

      {/* ── Body ── */}
      {!accountKey ? (
        <EmptyState
          icon={ChartBarIcon}
          title="Pick an account"
          body="Choose a sub-account from the top bar to see its Meta ad performance."
        />
      ) : isLoading ? (
        <LoadingState />
      ) : error ? (
        error.code === 'not_configured' || error.code === 'no_ad_account' ? (
          <EmptyState icon={LinkSlashIcon} title="Meta not connected" body={error.message} />
        ) : (
          <EmptyState
            icon={ExclamationTriangleIcon}
            title="Couldn't load Meta report"
            body={error.message}
            tone="error"
          />
        )
      ) : data ? (
        <Report
          data={data}
          isDark={isDark}
          onJump={(k) => {
            setCustomRange(null);
            setRangeKey(k);
          }}
        />
      ) : null}
    </>
  );
}

// ── Report body ──

function Report({
  data,
  isDark,
  onJump,
}: {
  data: AdsReport;
  isDark: boolean;
  onJump: (k: DateRangeKey) => void;
}) {
  const m = data.accountMetrics;
  const cmp = data.compare?.accountMetrics ?? null;
  const hasData = m.impressions > 0 || m.spend > 0 || data.campaigns.length > 0;

  if (!hasData) {
    return (
      <EmptyState
        icon={InboxStackIcon}
        title="No delivery in this window"
        body={`Nothing ran for ${data.dealer} between ${prettyDate(data.startDate)} and ${prettyDate(
          data.endDate,
        )}. Widen the range to find this account's active flights.`}
        action={{ label: 'View last 12 months', onClick: () => onJump('12m') }}
      />
    );
  }

  return (
    <div className="mt-8 space-y-8">
      {/* Range recap */}
      <p className="text-xs text-[var(--muted-foreground)]">
        <span className="font-medium text-[var(--foreground)]">{prettyDate(data.startDate)}</span> →{' '}
        <span className="font-medium text-[var(--foreground)]">{prettyDate(data.endDate)}</span>
        {data.compare && (
          <>
            {' '}· vs.{' '}
            <span className="font-medium text-[var(--foreground)]">{data.compare.label}</span>
          </>
        )}
      </p>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Kpi icon={CurrencyDollarIcon} label="Spend" value={usd(m.spend)} secondary={`${usd(m.cpm)} CPM`} tone="primary" delta={pctDelta(m.spend, cmp?.spend)} />
        <Kpi icon={EyeIcon} label="Impressions" value={compact(m.impressions)} secondary={num(m.impressions)} tone="sky" delta={pctDelta(m.impressions, cmp?.impressions)} />
        <Kpi icon={CursorArrowRaysIcon} label="Clicks" value={compact(m.clicks)} secondary={num(m.clicks)} tone="violet" delta={pctDelta(m.clicks, cmp?.clicks)} />
        <Kpi icon={ChartBarIcon} label="CTR" value={pctText(m.ctr)} tone="emerald" delta={pointDelta(m.ctr, cmp?.ctr)} />
        <Kpi icon={BoltIcon} label="CPC" value={usd(m.cpc)} tone="amber" delta={pctDelta(m.cpc, cmp?.cpc, true)} />
        <Kpi icon={CheckBadgeIcon} label="Conversions" value={num(m.conversions)} secondary={m.conversions > 0 ? `${usd(m.cost_per_conversion)} / conv` : undefined} tone="zinc" delta={pctDelta(m.conversions, cmp?.conversions)} />
      </div>

      {/* Daily trend */}
      {data.daily.length > 1 && (
        <Section title="Daily performance" icon={ArrowTrendingUpIcon} subtitle={`${data.daily.length} days`}>
          <DailyChart rows={data.daily} isDark={isDark} />
        </Section>
      )}

      {/* Campaigns + device */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr] items-start">
        <Section title="Top campaigns" icon={ChartBarIcon} subtitle={`${data.campaigns.length} total`}>
          {data.campaigns.length === 0 ? (
            <Muted>No campaigns delivered in this period.</Muted>
          ) : (
            <>
              <CampaignBarChart rows={data.campaigns} isDark={isDark} />
              <CampaignTable rows={data.campaigns} />
            </>
          )}
        </Section>

        <Section title="Spend by device" icon={EyeIcon}>
          {data.devices.length === 0 ? <Muted>No device data.</Muted> : <DeviceChart rows={data.devices} isDark={isDark} />}
        </Section>
      </div>

      {/* Conversions */}
      <Section title="Conversions" icon={CheckBadgeIcon}>
        <ConversionsPanel m={m} />
      </Section>

      {/* Demographics */}
      {data.demographics.length > 0 && (
        <Section title="Audience" icon={UsersIcon} subtitle="Spend by age & gender">
          <DemographicsChart rows={data.demographics} isDark={isDark} />
        </Section>
      )}
    </div>
  );
}

// ── Delta helpers ──

interface Delta {
  text: string;
  good: boolean;
}
function pctDelta(curr: number, prev?: number, lowerIsBetter = false): Delta | undefined {
  if (prev === undefined || prev === null) return undefined;
  if (prev === 0) return curr === 0 ? { text: '0%', good: true } : undefined;
  const change = ((curr - prev) / prev) * 100;
  const up = change >= 0;
  return { text: `${up ? '+' : ''}${change.toFixed(1)}%`, good: lowerIsBetter ? !up : up };
}
function pointDelta(curr: number, prev?: number): Delta | undefined {
  if (prev === undefined || prev === null) return undefined;
  const change = curr - prev;
  const up = change >= 0;
  return { text: `${up ? '+' : ''}${change.toFixed(2)} pts`, good: up };
}

// ── Presentational pieces ──

const TONE: Record<string, { bg: string; text: string }> = {
  primary: { bg: 'bg-[var(--primary)]/10', text: 'text-[var(--primary)]' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  sky: { bg: 'bg-sky-500/10', text: 'text-sky-400' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-400' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  zinc: { bg: 'bg-zinc-500/10', text: 'text-zinc-400' },
};

function Kpi({
  icon: Icon,
  label,
  value,
  secondary,
  tone,
  delta,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
  secondary?: string;
  tone: keyof typeof TONE;
  delta?: Delta;
}) {
  const t = TONE[tone];
  return (
    <div className="glass-section-card rounded-xl border border-[var(--border)] p-4 transition-colors hover:border-[var(--primary)]/30">
      <div className="mb-2 flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-md ${t.bg} ${t.text}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">{label}</p>
      </div>
      <div className="flex items-baseline gap-2">
        <p className="text-xl font-bold tabular-nums">{value}</p>
        {delta && (
          <span className={`text-[11px] font-medium tabular-nums ${delta.good ? 'text-emerald-400' : 'text-red-400'}`}>
            {delta.text}
          </span>
        )}
      </div>
      {secondary && <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)] tabular-nums">{secondary}</p>}
    </div>
  );
}

function Section({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-section-card rounded-2xl border border-[var(--border)] p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-[var(--muted-foreground)]" />}
          <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
        </div>
        {subtitle && <p className="text-[11px] text-[var(--muted-foreground)]">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-[var(--muted-foreground)]">{children}</p>;
}

/**
 * Comparison-period picker. Trigger + panel intentionally mirror the date
 * DashboardToolbar dropdown (same classes / glass-dropdown / check rows) so the
 * two controls read as a matched pair.
 */
function CompareDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = value !== 'none';

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors ${
          open || active
            ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]'
            : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--foreground)]'
        }`}
      >
        <ArrowsRightLeftIcon className="h-3.5 w-3.5" />
        <span className="max-w-[160px] truncate">{COMPARE_LABELS[value]}</span>
        <ChevronDownIcon className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="glass-dropdown animate-fade-in-up absolute top-full left-0 z-50 mt-2 shadow-lg"
          style={{ minWidth: '220px' }}
        >
          <div className="p-1.5">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
              Compare to
            </p>
            {Object.entries(COMPARE_LABELS).map(([val, label]) => (
              <button
                key={val}
                onClick={() => {
                  onChange(val);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors ${
                  value === val
                    ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                    : 'text-[var(--foreground)] hover:bg-[var(--muted)]'
                }`}
              >
                {label}
                {value === val && <CheckIcon className="h-3.5 w-3.5" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
  tone = 'muted',
  action,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  body: string;
  tone?: 'muted' | 'error';
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div
      className={`glass-card mt-8 flex flex-col items-center gap-3 p-10 text-center ${
        tone === 'error' ? 'border border-red-500/20' : ''
      }`}
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full ${
          tone === 'error' ? 'bg-red-500/10 text-red-400' : 'bg-[var(--muted)] text-[var(--muted-foreground)]'
        }`}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
        <p className="mx-auto mt-1 max-w-md text-xs text-[var(--muted-foreground)]">{body}</p>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-1 rounded-lg bg-[var(--primary)] px-3.5 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mt-8 space-y-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-[88px] animate-pulse rounded-xl bg-[var(--muted)]" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-2xl bg-[var(--muted)]" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="h-80 animate-pulse rounded-2xl bg-[var(--muted)]" />
        <div className="h-80 animate-pulse rounded-2xl bg-[var(--muted)]" />
      </div>
    </div>
  );
}

// ── Conversions panel ──

function ConversionsPanel({ m }: { m: Metrics }) {
  const hasAny =
    m.conversions > 0 || m.offline_leads > 0 || m.offline_purchases > 0 || m.offline_purchase_value > 0;
  if (!hasAny) {
    return <Muted>No conversions tracked in this window.</Muted>;
  }
  const tiles: { label: string; value: string }[] = [
    { label: 'Total conversions', value: num(m.conversions) },
    { label: 'Cost / conversion', value: m.cost_per_conversion > 0 ? usd(m.cost_per_conversion) : '—' },
    { label: 'Offline leads', value: num(m.offline_leads) },
    { label: 'Offline purchases', value: num(m.offline_purchases) },
    { label: 'Offline revenue', value: usd0(m.offline_purchase_value) },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-xl border border-[var(--border)] p-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">{t.label}</p>
          <p className="mt-1 text-lg font-bold tabular-nums">{t.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Campaign table ──

function CampaignTable({ rows }: { rows: CampaignRow[] }) {
  const sorted = [...rows].sort((a, b) => b.spend - a.spend);
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
            <th className="py-2 pr-3">Campaign</th>
            <th className="py-2 px-3 text-right">Spend</th>
            <th className="py-2 px-3 text-right">Impr.</th>
            <th className="py-2 px-3 text-right">Clicks</th>
            <th className="py-2 px-3 text-right">CTR</th>
            <th className="py-2 pl-3 text-right">Conv.</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => (
            <tr key={c.id || c.name} className="border-t border-[var(--border)]">
              <td className="max-w-[260px] truncate py-2.5 pr-3" title={c.name}>
                {c.name}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">{usd(c.spend)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{num(c.impressions)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{num(c.clicks)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{pctText(c.ctr)}</td>
              <td className="pl-3 py-2.5 text-right tabular-nums">{num(c.conversions)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Charts ──

function DailyChart({ rows, isDark }: { rows: DailyRow[]; isDark: boolean }) {
  const series = useMemo(
    () => [
      { name: 'Spend', type: 'area', data: rows.map((r) => [new Date(`${r.date}T00:00:00Z`).getTime(), Number(r.spend.toFixed(2))]) },
      { name: 'Clicks', type: 'line', data: rows.map((r) => [new Date(`${r.date}T00:00:00Z`).getTime(), r.clicks]) },
    ],
    [rows],
  );
  const options: ApexOptions = useMemo(
    () => ({
      chart: { type: 'line', toolbar: { show: false }, zoom: { enabled: false }, foreColor: isDark ? '#9ca3af' : '#525252' },
      stroke: { curve: 'smooth', width: [2, 2] },
      fill: { type: ['gradient', 'solid'], gradient: { opacityFrom: 0.3, opacityTo: 0.05 } },
      dataLabels: { enabled: false },
      legend: { position: 'top', horizontalAlign: 'left' },
      colors: ['#6366f1', '#38bdf8'],
      xaxis: { type: 'datetime', labels: { format: 'MMM d' } },
      yaxis: [
        { labels: { formatter: (v: number) => `$${Math.round(v).toLocaleString()}` } },
        { opposite: true, labels: { formatter: (v: number) => Math.round(v).toLocaleString() } },
      ],
      tooltip: { theme: isDark ? 'dark' : 'light', x: { format: 'MMM d, yyyy' }, y: { formatter: (v: number, { seriesIndex }) => (seriesIndex === 0 ? usd(v) : num(v)) } },
      grid: { borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', strokeDashArray: 4 },
    }),
    [isDark],
  );
  return <ReactApexChart options={options} series={series} type="line" height={300} />;
}

function CampaignBarChart({ rows, isDark }: { rows: CampaignRow[]; isDark: boolean }) {
  const top = useMemo(() => [...rows].sort((a, b) => b.spend - a.spend).slice(0, 8), [rows]);
  const series = useMemo(() => [{ name: 'Spend', data: top.map((c) => Number(c.spend.toFixed(2))) }], [top]);
  const options: ApexOptions = useMemo(
    () => ({
      chart: { type: 'bar', toolbar: { show: false }, foreColor: isDark ? '#9ca3af' : '#525252' },
      plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '62%' } },
      colors: ['#6366f1'],
      dataLabels: { enabled: true, formatter: (v: number) => usd0(Number(v)), style: { fontSize: '10px' }, offsetX: 28 },
      xaxis: {
        categories: top.map((c) => (c.name.length > 30 ? `${c.name.slice(0, 29)}…` : c.name)),
        labels: { formatter: (v: string) => `$${Math.round(Number(v)).toLocaleString()}` },
      },
      grid: { borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', strokeDashArray: 4 },
      tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (v: number) => usd(v) } },
    }),
    [top, isDark],
  );
  return <ReactApexChart options={options} series={series} type="bar" height={Math.max(180, top.length * 38)} />;
}

function DeviceChart({ rows, isDark }: { rows: DeviceRow[]; isDark: boolean }) {
  const labels = rows.map((r) => r.device);
  const series = rows.map((r) => Number(r.spend.toFixed(2)));
  const options: ApexOptions = useMemo(
    () => ({
      chart: { type: 'donut', foreColor: isDark ? '#9ca3af' : '#525252' },
      labels,
      legend: { position: 'bottom' },
      colors: ['#6366f1', '#38bdf8', '#a78bfa', '#fbbf24', '#34d399'],
      dataLabels: { enabled: true, formatter: (v: number) => `${Number(v).toFixed(0)}%` },
      plotOptions: { pie: { donut: { labels: { show: true, total: { show: true, label: 'Total', formatter: () => usd0(series.reduce((a, b) => a + b, 0)) } } } } },
      tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (v: number) => usd(v) } },
      stroke: { width: 0 },
    }),
    // labels/series derive from rows; recompute when either changes
    [isDark, labels.join('|')],
  );
  return <ReactApexChart options={options} series={series} type="donut" height={300} />;
}

function DemographicsChart({ rows, isDark }: { rows: DemographicRow[]; isDark: boolean }) {
  const { categories, series } = useMemo(() => {
    const ages = [...new Set(rows.map((r) => r.age))].sort();
    const genders = [...new Set(rows.map((r) => r.gender))];
    const byKey = new Map(rows.map((r) => [`${r.age}|${r.gender}`, r.spend]));
    const palette: Record<string, string> = { male: '#38bdf8', female: '#f472b6', unknown: '#a1a1aa' };
    return {
      categories: ages,
      series: genders.map((g) => ({
        name: g.charAt(0).toUpperCase() + g.slice(1),
        color: palette[g] ?? '#6366f1',
        data: ages.map((age) => Number((byKey.get(`${age}|${g}`) ?? 0).toFixed(2))),
      })),
    };
  }, [rows]);

  const options: ApexOptions = useMemo(
    () => ({
      chart: { type: 'bar', stacked: true, toolbar: { show: false }, foreColor: isDark ? '#9ca3af' : '#525252' },
      plotOptions: { bar: { borderRadius: 3, columnWidth: '58%' } },
      dataLabels: { enabled: false },
      legend: { position: 'top', horizontalAlign: 'left' },
      xaxis: { categories },
      yaxis: { labels: { formatter: (v: number) => `$${Math.round(v).toLocaleString()}` } },
      grid: { borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', strokeDashArray: 4 },
      tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (v: number) => usd(v) } },
    }),
    [categories, isDark],
  );
  return <ReactApexChart options={options} series={series} type="bar" height={300} />;
}
