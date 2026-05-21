import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import {
  getCampaignEngagement,
  getEngagementTotals,
} from '@/lib/services/email-analytics';

/**
 * GET /api/campaigns/loomi/engagement?accountKey=&start=&end=
 *
 * Returns aggregated engagement metrics for the requested account
 * over the given date range:
 *   - totals: KPIs across all campaigns in range
 *   - series: per-day time series for charting
 *   - topUrls: most-clicked URLs
 *   - campaigns: per-campaign table rows
 *
 * Auth + visibility scoping mirrors the loomi list endpoint: clients
 * are constrained to their assigned account keys; admins to their
 * assigned set (when scoped). Developers + super_admins see everything.
 */
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const accountKey = req.nextUrl.searchParams.get('accountKey');
  const startParam = req.nextUrl.searchParams.get('start');
  const endParam = req.nextUrl.searchParams.get('end');
  const role = session!.user.role;
  const userAccountKeys: string[] = session!.user.accountKeys ?? [];

  // Role-based account scoping.
  let visibilityScope: string[] | null = null;
  if (accountKey) {
    if (role === 'client' && !userAccountKeys.includes(accountKey)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (role === 'admin' && userAccountKeys.length > 0 && !userAccountKeys.includes(accountKey)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    visibilityScope = [accountKey];
  } else if (role === 'client' || (role === 'admin' && userAccountKeys.length > 0)) {
    visibilityScope = userAccountKeys;
  }

  const start = parseDate(startParam);
  const end = parseDate(endParam);

  const input = { accountKeys: visibilityScope, start, end };
  const [{ totals, series, topUrls }, campaigns] = await Promise.all([
    getEngagementTotals(input),
    getCampaignEngagement(input),
  ]);

  return NextResponse.json({ totals, series, topUrls, campaigns });
}

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
