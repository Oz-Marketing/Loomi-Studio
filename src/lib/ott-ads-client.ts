/**
 * Client-safe constants for OTT Ads. No server-only imports (no prisma).
 * Both the server-side ott-ads.ts and the client components import from here.
 */

export const OTT_STATUSES = [
  'new_request',
  'waiting_on_video',
  'working_on_it',
  'live',
  'on_hold',
  'past_due',
  'cancelled',
  'complete',
] as const;
export type OttStatus = (typeof OTT_STATUSES)[number];

export const OTT_STATUS_LABELS: Record<OttStatus, string> = {
  new_request: 'New Request',
  waiting_on_video: 'Waiting on Video',
  working_on_it: 'Working on It',
  live: 'Live',
  on_hold: 'On Hold',
  past_due: 'Past Due',
  cancelled: 'Cancelled',
  complete: 'Complete',
};

export const OTT_PLATFORMS = [
  'stackadapt',
  'hulu',
  'tiktok',
  'spotify',
  'choozle',
  'other',
] as const;
export type OttPlatform = (typeof OTT_PLATFORMS)[number];

export const OTT_PLATFORM_LABELS: Record<OttPlatform, string> = {
  stackadapt: 'StackAdapt',
  hulu: 'Hulu',
  tiktok: 'TikTok',
  spotify: 'Spotify',
  choozle: 'Choozle',
  other: 'Other',
};

export const OTT_GROUPS = ['upcoming', 'current', 'done'] as const;
export type OttGroup = (typeof OTT_GROUPS)[number];

export function groupForStatus(status: string): OttGroup {
  if (status === 'live' || status === 'on_hold' || status === 'past_due') return 'current';
  if (status === 'complete' || status === 'cancelled') return 'done';
  return 'upcoming';
}

// Healthy benchmarks from the YPS Euro Ducati CTV tracker (StackAdapt). Used
// by the Analytics page to highlight metrics outside healthy ranges. Unique
// reach scales linearly with monthly budget, anchored at $1,540.
export const OTT_BENCHMARKS = {
  cpm: { min: 25, max: 45, unit: '$' as const },
  vcr: { min: 90, max: 96, unit: '%' as const },
  frequency: { min: 3, max: 6, unit: 'x' as const },
  uniqueReachPer1540Budget: { min: 8_000, max: 17_000 },
  footfallVisits: { min: 5, max: 25 },
} as const;
