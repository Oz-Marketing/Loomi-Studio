'use client';

/**
 * Digital Ads report registry. The single source of truth for the hub cards,
 * the per-report tab bar, and the /reporting/ads/[report] routes. Adding a
 * platform is one entry here (+ its Report component); flip `status` to 'live'
 * when it's ready. New report GROUPS later reuse the same hub/layout machinery
 * with their own array.
 */

import type { ComponentType, SVGProps } from 'react';
import {
  MegaphoneIcon,
  TvIcon,
  MagnifyingGlassIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import type { DateRangeKey } from './shared';
import { MetaReport } from './meta-report';
import { StackAdaptReport } from './stackadapt-report';

export interface ReportComponentProps {
  accountKey: string;
  from: string;
  to: string;
  compareTo: string;
  isDark: boolean;
  onJump: (k: DateRangeKey) => void;
}

export interface ReportDef {
  /** URL slug + stable key, e.g. "meta" → /reporting/ads/meta. */
  key: string;
  label: string;
  blurb: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** 'live' renders Report; 'soon' shows a disabled "coming soon" card. */
  status: 'live' | 'soon';
  Report?: ComponentType<ReportComponentProps>;
}

export const DIGITAL_ADS_REPORTS: ReportDef[] = [
  {
    key: 'meta',
    label: 'Meta',
    blurb: 'Facebook & Instagram paid performance',
    icon: MegaphoneIcon,
    status: 'live',
    Report: MetaReport,
  },
  {
    key: 'stackadapt',
    label: 'OTT / CTV',
    blurb: 'StackAdapt programmatic display & connected TV',
    icon: TvIcon,
    status: 'live',
    Report: StackAdaptReport,
  },
  {
    key: 'google',
    label: 'Google Ads',
    blurb: 'Search, Display & Performance Max',
    icon: MagnifyingGlassIcon,
    status: 'soon',
  },
  {
    key: 'email',
    label: 'Email Campaigns',
    blurb: 'GoHighLevel email performance',
    icon: EnvelopeIcon,
    status: 'soon',
  },
];

export function findReport(key: string): ReportDef | undefined {
  return DIGITAL_ADS_REPORTS.find((r) => r.key === key);
}

/** Live reports only — used for the tab bar (you can't open a "soon" report). */
export const LIVE_REPORTS = DIGITAL_ADS_REPORTS.filter((r) => r.status === 'live');
