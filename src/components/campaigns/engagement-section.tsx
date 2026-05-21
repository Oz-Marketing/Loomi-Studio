'use client';

// Engagement metrics surface — sits on the Campaigns Analytics page
// below the existing campaign-status overview.
//
// Data comes from /api/campaigns/loomi/engagement which aggregates the
// EmailEvent rows (delivered, open, click, bounce, etc.) populated by
// the SendGrid Event webhook. For sub-accounts with no SendGrid wiring
// the section renders an empty state rather than disappearing — gives
// users an obvious cue to configure SendGrid in Sending settings.

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  EnvelopeOpenIcon,
  CursorArrowRaysIcon,
  ExclamationTriangleIcon,
  NoSymbolIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  ChartBarIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { useTheme } from '@/contexts/theme-context';
import type { ApexOptions } from 'apexcharts';
import {
  type DateRangeKey,
  getDateRangeBounds,
} from '@/lib/date-ranges';
import type { CustomDateRange } from '@/components/filters/dashboard-toolbar';

const ReactApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

// ── Types ──

interface EngagementTotals {
  sent: number;
  delivered: number;
  uniqueOpens: number;
  totalOpens: number;
  uniqueClicks: number;
  totalClicks: number;
  bounces: number;
  dropped: number;
  spamReports: number;
  unsubscribes: number;
  skipped: number;
  failed: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  clickToOpenRate: number;
  bounceRate: number;
  unsubscribeRate: number;
}

interface TimeSeriesPoint {
  date: string;
  delivered: number;
  opens: number;
  clicks: number;
  bounces: number;
}

interface CampaignRow extends EngagementTotals {
  campaignId: string;
  campaignName: string | null;
  sentAt: string | null;
}

interface TopUrl {
  url: string;
  clicks: number;
}

interface EngagementResponse {
  totals: EngagementTotals;
  series: TimeSeriesPoint[];
  topUrls: TopUrl[];
  campaigns: CampaignRow[];
}

interface EngagementSectionProps {
  accountKey?: string;
  dateRange?: DateRangeKey;
  customRange?: CustomDateRange | null;
}

// ── Helpers ──

function pct(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0%';
  return `${(value * 100).toFixed(value >= 0.1 ? 1 : 2)}%`;
}

function num(value: number): string {
  return value.toLocaleString();
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

// ── Component ──

export function EngagementSection({
  accountKey,
  dateRange = '6m',
  customRange,
}: EngagementSectionProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [data, setData] = useState<EngagementResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bounds = useMemo(
    () =>
      dateRange === 'custom' && customRange
        ? getDateRangeBounds('custom', customRange.start, customRange.end)
        : getDateRangeBounds(dateRange),
    [dateRange, customRange],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (accountKey) params.set('accountKey', accountKey);
    if (bounds.start) params.set('start', bounds.start.toISOString());
    if (bounds.end) params.set('end', bounds.end.toISOString());

    fetch(`/api/campaigns/loomi/engagement?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        return res.json() as Promise<EngagementResponse>;
      })
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load engagement');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [accountKey, bounds.start, bounds.end]);

  if (loading) {
    return (
      <div className="glass-section-card rounded-2xl p-6 border border-[var(--border)] animate-pulse">
        <div className="h-5 w-40 bg-[var(--muted)] rounded mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-[var(--muted)] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-section-card rounded-2xl p-6 border border-red-500/20">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">
              Couldn&apos;t load engagement metrics
            </p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.totals.sent === 0) {
    return (
      <div className="glass-section-card rounded-2xl p-8 border border-[var(--border)] text-center">
        <ChartBarIcon className="w-10 h-10 mx-auto text-[var(--muted-foreground)] opacity-40 mb-3" />
        <p className="text-sm font-semibold text-[var(--foreground)]">
          No engagement data yet
        </p>
        <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-md mx-auto">
          Once a Loomi-native campaign sends through SendGrid, opens, clicks, bounces,
          and unsubscribes will show up here.
        </p>
      </div>
    );
  }

  const { totals, series, topUrls, campaigns } = data;

  return (
    <div className="space-y-5">
      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          icon={PaperAirplaneIcon}
          label="Sent"
          primary={num(totals.sent)}
          tone="primary"
        />
        <KpiCard
          icon={CheckCircleIcon}
          label="Delivered"
          primary={num(totals.delivered)}
          secondary={pct(totals.deliveryRate)}
          tone="emerald"
        />
        <KpiCard
          icon={EnvelopeOpenIcon}
          label="Open rate"
          primary={pct(totals.openRate)}
          secondary={`${num(totals.uniqueOpens)} unique`}
          tone="sky"
        />
        <KpiCard
          icon={CursorArrowRaysIcon}
          label="Click rate"
          primary={pct(totals.clickRate)}
          secondary={`${num(totals.uniqueClicks)} unique`}
          tone="violet"
        />
        <KpiCard
          icon={ExclamationTriangleIcon}
          label="Bounce rate"
          primary={pct(totals.bounceRate)}
          secondary={num(totals.bounces)}
          tone="amber"
        />
        <KpiCard
          icon={NoSymbolIcon}
          label="Unsub rate"
          primary={pct(totals.unsubscribeRate)}
          secondary={num(totals.unsubscribes)}
          tone="zinc"
        />
      </div>

      {/* ── Time series chart ── */}
      {series.length > 1 && (
        <div className="glass-section-card rounded-2xl p-5 border border-[var(--border)]">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              Engagement over time
            </h3>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              {series.length} day{series.length === 1 ? '' : 's'}
            </p>
          </div>
          <EngagementChart series={series} isDark={isDark} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(280px,360px)] gap-5 items-start">
        {/* ── Per-campaign engagement table ── */}
        <div className="glass-section-card rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              Campaign performance
            </h3>
            <p className="text-[11px] text-[var(--muted-foreground)]">
              {campaigns.length} campaign{campaigns.length === 1 ? '' : 's'}
            </p>
          </div>
          {campaigns.length === 0 ? (
            <p className="px-5 py-6 text-xs text-[var(--muted-foreground)]">
              No campaigns sent in this date range.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px]">
                <thead>
                  <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                    <th className="text-left px-4 py-2 text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                      Campaign
                    </th>
                    <th className="text-right px-3 py-2 text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                      Sent
                    </th>
                    <th className="text-right px-3 py-2 text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                      Open
                    </th>
                    <th className="text-right px-3 py-2 text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                      Click
                    </th>
                    <th className="text-right px-3 py-2 text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                      Bounce
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.slice(0, 25).map((c) => (
                    <tr key={c.campaignId} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/40 transition-colors">
                      <td className="px-4 py-2.5 align-middle min-w-0">
                        <p className="text-sm font-medium truncate">
                          {c.campaignName || '(Untitled)'}
                        </p>
                        {c.sentAt && (
                          <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
                            {shortDate(c.sentAt)}
                          </p>
                        )}
                      </td>
                      <td className="px-3 py-2.5 align-middle text-right text-xs tabular-nums">{num(c.sent)}</td>
                      <td className="px-3 py-2.5 align-middle text-right text-xs tabular-nums">
                        <span className="font-medium text-[var(--foreground)]">{pct(c.openRate)}</span>
                        <span className="block text-[10px] text-[var(--muted-foreground)]">{num(c.uniqueOpens)}</span>
                      </td>
                      <td className="px-3 py-2.5 align-middle text-right text-xs tabular-nums">
                        <span className="font-medium text-[var(--foreground)]">{pct(c.clickRate)}</span>
                        <span className="block text-[10px] text-[var(--muted-foreground)]">{num(c.uniqueClicks)}</span>
                      </td>
                      <td className="px-3 py-2.5 align-middle text-right text-xs tabular-nums">
                        <span className={c.bounceRate > 0.02 ? 'text-amber-400 font-medium' : 'text-[var(--muted-foreground)]'}>
                          {pct(c.bounceRate)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Top URLs ── */}
        <div className="glass-section-card rounded-2xl p-5 border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-3">
            <LinkIcon className="w-4 h-4 text-[var(--muted-foreground)]" />
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              Most-clicked links
            </h3>
          </div>
          {topUrls.length === 0 ? (
            <p className="text-xs text-[var(--muted-foreground)]">
              No click events yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {topUrls.map((u) => (
                <li key={u.url} className="flex items-start justify-between gap-3 text-xs">
                  <a
                    href={u.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--primary)] hover:underline truncate min-w-0 flex-1"
                    title={u.url}
                  >
                    {truncate(u.url.replace(/^https?:\/\//, ''), 48)}
                  </a>
                  <span className="tabular-nums text-[var(--muted-foreground)] flex-shrink-0">
                    {num(u.clicks)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ── KPI card ──

const TONE_CLASSES: Record<string, { bg: string; text: string }> = {
  primary: { bg: 'bg-[var(--primary)]/10', text: 'text-[var(--primary)]' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  sky:     { bg: 'bg-sky-500/10',     text: 'text-sky-400' },
  violet:  { bg: 'bg-violet-500/10',  text: 'text-violet-400' },
  amber:   { bg: 'bg-amber-500/10',   text: 'text-amber-400' },
  zinc:    { bg: 'bg-zinc-500/10',    text: 'text-zinc-400' },
};

function KpiCard({
  icon: Icon,
  label,
  primary,
  secondary,
  tone,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  primary: string;
  secondary?: string;
  tone: keyof typeof TONE_CLASSES;
}) {
  const t = TONE_CLASSES[tone];
  return (
    <div className="glass-section-card rounded-xl p-4 border border-[var(--border)]">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-md ${t.bg} ${t.text} flex items-center justify-center`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <p className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">{label}</p>
      </div>
      <p className="text-xl font-bold tabular-nums">{primary}</p>
      {secondary && (
        <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5 tabular-nums">{secondary}</p>
      )}
    </div>
  );
}

// ── Chart ──

function EngagementChart({ series, isDark }: { series: TimeSeriesPoint[]; isDark: boolean }) {
  const seriesData = useMemo(
    () => [
      { name: 'Delivered', data: series.map((p) => [new Date(p.date).getTime(), p.delivered]) },
      { name: 'Opens',     data: series.map((p) => [new Date(p.date).getTime(), p.opens]) },
      { name: 'Clicks',    data: series.map((p) => [new Date(p.date).getTime(), p.clicks]) },
      { name: 'Bounces',   data: series.map((p) => [new Date(p.date).getTime(), p.bounces]) },
    ],
    [series],
  );

  const options: ApexOptions = useMemo(() => ({
    chart: {
      type: 'area',
      toolbar: { show: false },
      zoom: { enabled: false },
      foreColor: isDark ? '#9ca3af' : '#525252',
    },
    stroke: { curve: 'smooth', width: 2 },
    fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.05 } },
    dataLabels: { enabled: false },
    legend: { position: 'top', horizontalAlign: 'left' },
    xaxis: { type: 'datetime', labels: { format: 'MMM d' } },
    yaxis: { labels: { formatter: (v: number) => v.toLocaleString() } },
    colors: ['#34d399', '#38bdf8', '#a78bfa', '#fbbf24'],
    tooltip: { x: { format: 'MMM d, yyyy' } },
    grid: {
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      strokeDashArray: 4,
    },
  }), [isDark]);

  return <ReactApexChart options={options} series={seriesData} type="area" height={260} />;
}
