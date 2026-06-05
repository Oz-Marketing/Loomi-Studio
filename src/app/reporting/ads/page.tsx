'use client';

/**
 * Ads reporting — tabbed by paid platform (Meta, StackAdapt, … Google later).
 *
 * The shell owns the shared date range + comparison controls and the active
 * tab; each platform tab fetches its own live report (margin applied
 * server-side) and renders its own visuals. Range/comparison persist across
 * tab switches so you can compare the same window platform-to-platform.
 */

import { useMemo, useState } from 'react';
import { MegaphoneIcon, TvIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { useAccount } from '@/contexts/account-context';
import { useTheme } from '@/contexts/theme-context';
import { ReportingPageHeader } from '../_components/page-header';
import {
  type DateRangeKey,
  type CustomDateRange,
  RangeControls,
  EmptyState,
  metaLookbackFloor,
  resolveBounds,
} from './_components/shared';
import { MetaReport } from './_components/meta-report';
import { StackAdaptReport } from './_components/stackadapt-report';

type Tab = 'meta' | 'stackadapt';

const TABS: { key: Tab; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
  { key: 'meta', label: 'Meta', icon: MegaphoneIcon },
  { key: 'stackadapt', label: 'StackAdapt', icon: TvIcon },
];

export default function ReportingAdsPage() {
  const { accountKey, accountData } = useAccount();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [tab, setTab] = useState<Tab>('meta');
  const [rangeKey, setRangeKey] = useState<DateRangeKey>('6m');
  const [customRange, setCustomRange] = useState<CustomDateRange | null>(null);
  const [compareTo, setCompareTo] = useState<string>('none');
  const floor = useMemo(() => metaLookbackFloor(), []);
  const { from, to } = useMemo(() => resolveBounds(rangeKey, customRange), [rangeKey, customRange]);

  // Clamp a custom range's start to the lookback floor before it hits the API.
  const handleCustomRange = (r: CustomDateRange) => {
    const floorDate = new Date(`${floor}T00:00:00`);
    setCustomRange({ start: r.start < floorDate ? floorDate : r.start, end: r.end });
  };
  const onJump = (k: DateRangeKey) => {
    setCustomRange(null);
    setRangeKey(k);
  };

  const dealer = accountData?.dealer || 'all accounts';

  return (
    <>
      <ReportingPageHeader
        eyebrow="Ads"
        title="Ad reporting"
        subtitle={`Paid performance across Meta and StackAdapt — ${accountKey ? dealer : 'select an account'}.`}
      />

      {!accountKey ? (
        <EmptyState
          icon={ChartBarIcon}
          title="Pick an account"
          body="Choose a sub-account from the top bar to see its paid-media performance."
        />
      ) : (
        <>
          {/* Tabs + controls */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-[var(--border)] p-0.5">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    tab === t.key
                      ? 'bg-[var(--primary)] text-white'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              ))}
            </div>
            <RangeControls
              rangeKey={rangeKey}
              onRangeKey={setRangeKey}
              customRange={customRange}
              onCustomRange={handleCustomRange}
              compareTo={compareTo}
              onCompareTo={setCompareTo}
              floor={floor}
            />
          </div>

          <div className="mt-8">
            {tab === 'meta' ? (
              <MetaReport accountKey={accountKey} from={from} to={to} compareTo={compareTo} isDark={isDark} onJump={onJump} />
            ) : (
              <StackAdaptReport accountKey={accountKey} from={from} to={to} compareTo={compareTo} isDark={isDark} onJump={onJump} />
            )}
          </div>
        </>
      )}
    </>
  );
}
