import type { OttDerivedKpis, OttPerformanceRow } from './types';

const DEFAULT_MARKUP = 0.77;

export function parseNum(v: string | null | undefined): number | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  // Strip $, commas, % so users can paste from StackAdapt exports.
  const cleaned = s.replace(/[$,%\s]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function actualSpend(grossBudget: string | null, accountMarkup: number | null): number | null {
  const gross = parseNum(grossBudget);
  if (gross == null) return null;
  const markup = accountMarkup ?? DEFAULT_MARKUP;
  return gross * markup;
}

export function deriveKpis(row: OttPerformanceRow): OttDerivedKpis {
  const spend = parseNum(row.spend);
  const impressions = parseNum(row.impressions);
  const completedViews = parseNum(row.completedViews);
  const uniqueReach = parseNum(row.uniqueReach);
  const footfallVisits = parseNum(row.footfallVisits);
  const siteVisits = parseNum(row.siteVisits);

  return {
    cpm: spend != null && impressions != null && impressions > 0 ? (spend / impressions) * 1000 : null,
    vcr: completedViews != null && impressions != null && impressions > 0
      ? (completedViews / impressions) * 100
      : null,
    cpcv: spend != null && completedViews != null && completedViews > 0
      ? spend / completedViews
      : null,
    frequency: impressions != null && uniqueReach != null && uniqueReach > 0
      ? impressions / uniqueReach
      : null,
    costPerVisit: spend != null && footfallVisits != null && footfallVisits > 0
      ? spend / footfallVisits
      : null,
    costPerSiteVisit: spend != null && siteVisits != null && siteVisits > 0
      ? spend / siteVisits
      : null,
  };
}

export function fmtCurrency(n: number | null, opts: { decimals?: number } = {}): string {
  if (n == null) return '—';
  const decimals = opts.decimals ?? (n % 1 === 0 ? 0 : 2);
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function fmtNumber(n: number | null, decimals = 0): string {
  if (n == null) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtPercent(n: number | null, decimals = 1): string {
  if (n == null) return '—';
  return `${n.toFixed(decimals)}%`;
}

export function fmtMultiplier(n: number | null, decimals = 1): string {
  if (n == null) return '—';
  return `${n.toFixed(decimals)}x`;
}

export type HealthRating = 'good' | 'warn' | 'bad' | 'neutral';

export function rateMetric(
  value: number | null,
  min: number,
  max: number,
): HealthRating {
  if (value == null) return 'neutral';
  if (value >= min && value <= max) return 'good';
  // 10% tolerance counts as a warning, anything beyond is bad.
  const tolerance = Math.max(min * 0.1, max * 0.1, 1);
  if (value >= min - tolerance && value <= max + tolerance) return 'warn';
  return 'bad';
}

export function rateCpm(cpm: number | null): HealthRating {
  return rateMetric(cpm, 25, 45);
}
export function rateVcr(vcr: number | null): HealthRating {
  return rateMetric(vcr, 90, 96);
}
export function rateFrequency(freq: number | null): HealthRating {
  return rateMetric(freq, 3, 6);
}

export function periodLabel(period: string): string {
  if (!/^\d{4}-\d{2}$/.test(period)) return period;
  const [y, m] = period.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function periodShort(period: string): string {
  if (!/^\d{4}-\d{2}$/.test(period)) return period;
  const [y, m] = period.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function todayPeriod(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
