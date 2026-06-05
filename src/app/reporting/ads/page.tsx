'use client';

/**
 * Digital Ads hub — the landing for the paid-media report group. Shows one
 * card per platform (live ones link into their report; upcoming ones are
 * disabled "coming soon"). The cards, tab bar, and routes all derive from the
 * report registry in _components/reports-config.
 */

import Link from 'next/link';
import { ChartBarIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { useAccount } from '@/contexts/account-context';
import { ReportingPageHeader } from '../_components/page-header';
import { EmptyState } from './_components/shared';
import { DIGITAL_ADS_REPORTS, type ReportDef } from './_components/reports-config';

export default function DigitalAdsHub() {
  const { accountKey, accountData } = useAccount();
  const dealer = accountData?.dealer || 'all accounts';

  return (
    <>
      <ReportingPageHeader
        eyebrow="Ads"
        title="Digital Ads"
        subtitle={`Paid-media performance across every platform — ${accountKey ? dealer : 'select an account'}.`}
      />

      {!accountKey ? (
        <EmptyState
          icon={ChartBarIcon}
          title="Pick an account"
          body="Choose a sub-account from the top bar to see its paid-media performance."
        />
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {DIGITAL_ADS_REPORTS.map((r) => (
            <ReportCard key={r.key} report={r} />
          ))}
        </div>
      )}
    </>
  );
}

function ReportCard({ report }: { report: ReportDef }) {
  const { icon: Icon, label, blurb, status } = report;

  const inner = (
    <>
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
          <Icon className="h-5 w-5" />
        </div>
        {status === 'soon' ? (
          <span className="rounded-full bg-[var(--muted)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]">
            Coming soon
          </span>
        ) : (
          <ArrowRightIcon className="h-4 w-4 text-[var(--muted-foreground)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--primary)]" />
        )}
      </div>
      <div className="mt-4">
        <p className="text-base font-semibold text-[var(--foreground)]">{label}</p>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">{blurb}</p>
      </div>
    </>
  );

  if (status !== 'live') {
    return (
      <div className="glass-section-card rounded-2xl border border-dashed border-[var(--border)] p-5 opacity-60">
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={`/ads/${report.key}`}
      className="glass-section-card group rounded-2xl border border-[var(--border)] p-5 transition-colors hover:border-[var(--primary)]/40"
    >
      {inner}
    </Link>
  );
}
