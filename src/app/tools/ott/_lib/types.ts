/**
 * Client-side types for the OTT Tracker + Analytics pages.
 * Server routes use parallel `IncomingAd` shapes; this file is the
 * client-side source of truth.
 */

export interface OttAd {
  id: string;
  position: number;
  name: string;
  platform: string;
  period: string; // YYYY-MM
  status: string;
  assignedToUserId: string | null;
  recurring: string;
  flightStart: string | null;
  flightEnd: string | null;
  dueDate: string | null;
  completeDate: string | null;
  grossBudget: string | null;
  videoUrl: string | null;
  projectLink: string | null;
  notes: string | null;
  // Convenience — populated by the overview endpoint so the grid doesn't
  // need a second join. Per-ad endpoints leave these null.
  accountKey?: string;
  dealer?: string;
}

export interface OttOverviewAccount {
  accountKey: string;
  dealer: string;
  markup: number | null;
  ads: OttAd[];
}

export interface OttPerformanceRow {
  id: string;
  month: string;
  spend: string | null;
  impressions: string | null;
  completedViews: string | null;
  uniqueReach: string | null;
  footfallVisits: string | null;
  siteVisits: string | null;
  notes: string | null;
}

export interface OttGeoRow {
  id: string;
  month: string;
  county: string;
  impressions: string | null;
  spend: string | null;
  vcr: string | null;
  footfallVisits: string | null;
  notes: string | null;
}

export interface OttPropertyRow {
  id: string;
  month: string;
  rank: number;
  property: string;
  impressions: string | null;
  spend: string | null;
  vcr: string | null;
  decision: string | null;
}

export interface OttOptimizationRow {
  id: string;
  date: string;
  changeMade: string;
  reason: string | null;
  result: string | null;
  authorUserId: string | null;
}

export interface OttAdAnalytics extends OttAd {
  accountKey: string;
  dealer: string;
  markup: number | null;
  performance: OttPerformanceRow[];
  geoPerf: OttGeoRow[];
  propertyPerf: OttPropertyRow[];
  optimizations: OttOptimizationRow[];
}

export type OttGroup = 'upcoming' | 'current' | 'done';

/** Derived metrics computed from raw counts. All nullable when source missing. */
export interface OttDerivedKpis {
  cpm: number | null; // $ per 1000 impressions
  vcr: number | null; // % 0-100
  cpcv: number | null; // $ per completed view
  frequency: number | null; // impressions / unique reach
  costPerVisit: number | null; // $ per footfall visit
  costPerSiteVisit: number | null; // $ per site visit
}
