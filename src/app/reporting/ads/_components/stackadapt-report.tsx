'use client';

/**
 * StackAdapt (OTT/CTV/display) tab of the Ads report. Fetches
 * /api/reporting/stackadapt and renders KPIs, daily trend, top campaigns,
 * spend by campaign group, and top creatives. StackAdapt's delivery API has no
 * device/demographic breakdowns, so those sections are absent (Oz parity).
 */

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
  ArrowTrendingUpIcon,
  InboxStackIcon,
  RectangleGroupIcon,
  FilmIcon,
} from '@heroicons/react/24/outline';
import {
  type DateRangeKey,
  fetcher,
  usd,
  num,
  compact,
  pctText,
  prettyDate,
  pctDelta,
  pointDelta,
  Kpi,
  Section,
  Muted,
  EmptyState,
  LoadingState,
  DailyChart,
  SpendBar,
  SpendDonut,
} from './shared';

interface Metrics {
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  spend: number;
  cpm: number;
  conversions: number;
  cost_per_conversion: number;
  unique_impressions: number;
  frequency: number;
}
interface Row extends Metrics {
  id: string;
  name: string;
}
interface DailyRow extends Metrics {
  date: string;
  label: string;
}
interface StackAdaptData {
  dealer: string;
  margin: number;
  startDate: string;
  endDate: string;
  accountMetrics: Metrics;
  campaigns: Row[];
  campaignGroups: Row[];
  daily: DailyRow[];
  creatives: Row[];
  compare: { label: string; accountMetrics: Metrics } | null;
}

export function StackAdaptReport({
  accountKey,
  from,
  to,
  compareTo,
  isDark,
  onJump,
}: {
  accountKey: string;
  from: string;
  to: string;
  compareTo: string;
  isDark: boolean;
  onJump: (k: DateRangeKey) => void;
}) {
  const { data, error, isLoading } = useSWR<StackAdaptData, Error & { code?: string }>(
    `/api/reporting/stackadapt?accountKey=${encodeURIComponent(accountKey)}&start_date=${from}&end_date=${to}&compare_to=${compareTo}`,
    fetcher,
  );

  if (isLoading) return <LoadingState />;
  if (error) {
    return error.code === 'not_configured' || error.code === 'no_advertiser' ? (
      <EmptyState icon={LinkSlashIcon} title="StackAdapt not connected" body={error.message} />
    ) : (
      <EmptyState icon={ExclamationTriangleIcon} title="Couldn't load StackAdapt report" body={error.message} tone="error" />
    );
  }
  if (!data) return null;

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
        )}. Widen the range to find this advertiser's active flights.`}
        action={{ label: 'View last 12 months', onClick: () => onJump('12m') }}
      />
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-xs text-[var(--muted-foreground)]">
        <span className="font-medium text-[var(--foreground)]">{prettyDate(data.startDate)}</span> →{' '}
        <span className="font-medium text-[var(--foreground)]">{prettyDate(data.endDate)}</span>
        {data.compare && (
          <>
            {' '}· vs. <span className="font-medium text-[var(--foreground)]">{data.compare.label}</span>
          </>
        )}
      </p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Kpi icon={CurrencyDollarIcon} label="Spend" value={usd(m.spend)} secondary={`${usd(m.cpm)} CPM`} tone="primary" delta={pctDelta(m.spend, cmp?.spend)} />
        <Kpi icon={EyeIcon} label="Impressions" value={compact(m.impressions)} secondary={num(m.impressions)} tone="sky" delta={pctDelta(m.impressions, cmp?.impressions)} />
        <Kpi icon={CursorArrowRaysIcon} label="Clicks" value={compact(m.clicks)} secondary={num(m.clicks)} tone="violet" delta={pctDelta(m.clicks, cmp?.clicks)} />
        <Kpi icon={ChartBarIcon} label="CTR" value={pctText(m.ctr)} tone="emerald" delta={pointDelta(m.ctr, cmp?.ctr)} />
        <Kpi icon={BoltIcon} label="CPC" value={usd(m.cpc)} tone="amber" delta={pctDelta(m.cpc, cmp?.cpc, true)} />
        <Kpi icon={CheckBadgeIcon} label="Conversions" value={num(m.conversions)} secondary={m.conversions > 0 ? `${usd(m.cost_per_conversion)} / conv` : `${m.frequency.toFixed(1)} freq.`} tone="zinc" delta={pctDelta(m.conversions, cmp?.conversions)} />
      </div>

      {data.daily.length > 1 && (
        <Section title="Daily performance" icon={ArrowTrendingUpIcon} subtitle={`${data.daily.length} days`}>
          <DailyChart rows={data.daily} isDark={isDark} />
        </Section>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Section title="Top campaigns" icon={ChartBarIcon} subtitle={`${data.campaigns.length} total`}>
          {data.campaigns.length === 0 ? (
            <Muted>No campaigns delivered in this period.</Muted>
          ) : (
            <>
              <SpendBar items={data.campaigns.slice(0, 8).map((c) => ({ label: c.name, value: c.spend }))} isDark={isDark} />
              <PerfTable rows={data.campaigns} />
            </>
          )}
        </Section>

        <Section title="Spend by campaign group" icon={RectangleGroupIcon}>
          {data.campaignGroups.length === 0 ? (
            <Muted>No campaign groups in this period.</Muted>
          ) : (
            <SpendDonut items={data.campaignGroups.slice(0, 6).map((g) => ({ label: g.name, value: g.spend }))} isDark={isDark} />
          )}
        </Section>
      </div>

      {data.creatives.length > 0 && (
        <Section title="Top creatives" icon={FilmIcon} subtitle={`${data.creatives.length} shown`}>
          <PerfTable rows={data.creatives} firstCol="Creative" />
        </Section>
      )}
    </div>
  );
}

/** Shared spend/impr/clicks/ctr/conv table for campaigns, groups, creatives. */
function PerfTable({ rows, firstCol = 'Campaign' }: { rows: Row[]; firstCol?: string }) {
  const sorted = [...rows].sort((a, b) => b.spend - a.spend);
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
            <th className="py-2 pr-3">{firstCol}</th>
            <th className="px-3 py-2 text-right">Spend</th>
            <th className="px-3 py-2 text-right">Impr.</th>
            <th className="px-3 py-2 text-right">Clicks</th>
            <th className="px-3 py-2 text-right">CTR</th>
            <th className="py-2 pl-3 text-right">Conv.</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id || r.name} className="border-t border-[var(--border)]">
              <td className="max-w-[260px] truncate py-2.5 pr-3" title={r.name}>{r.name}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{usd(r.spend)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{num(r.impressions)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{num(r.clicks)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{pctText(r.ctr)}</td>
              <td className="py-2.5 pl-3 text-right tabular-nums">{num(r.conversions)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
