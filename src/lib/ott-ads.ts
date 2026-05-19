import type { Session } from 'next-auth';
import { prisma } from '@/lib/prisma';

export {
  OTT_STATUSES,
  OTT_STATUS_LABELS,
  OTT_PLATFORMS,
  OTT_PLATFORM_LABELS,
  OTT_GROUPS,
  OTT_BENCHMARKS,
  groupForStatus,
} from '@/lib/ott-ads-client';
export type { OttStatus, OttPlatform, OttGroup } from '@/lib/ott-ads-client';

export function canAccessOttAds(
  session: Session | null,
  accountKey: string,
): boolean {
  if (!session?.user) return false;
  const { role, accountKeys = [] } = session.user;
  if (role !== 'developer' && role !== 'super_admin' && role !== 'admin') return false;
  if (role === 'developer' || role === 'super_admin') return true;
  if (accountKeys.length === 0) return true;
  return accountKeys.includes(accountKey);
}

export function accessibleAccountKeys(
  session: Session | null,
  allAccountKeys: string[],
): string[] {
  if (!session?.user) return [];
  const { role, accountKeys = [] } = session.user;
  if (role !== 'developer' && role !== 'super_admin' && role !== 'admin') return [];
  if (role === 'developer' || role === 'super_admin') return allAccountKeys;
  if (accountKeys.length === 0) return allAccountKeys;
  return allAccountKeys.filter((k) => accountKeys.includes(k));
}

export async function getOrCreatePlan(accountKey: string) {
  const existing = await prisma.ottAdsPlan.findUnique({ where: { accountKey } });
  if (existing) return existing;
  return prisma.ottAdsPlan.create({ data: { accountKey } });
}

export function isValidPeriod(period: string): boolean {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return false;
  const year = Number(period.slice(0, 4));
  return year >= 2000 && year <= 2100;
}

export function isValidMonth(month: string): boolean {
  return isValidPeriod(month);
}

/**
 * Build the admin overview payload — one row per account with its ads. Unlike
 * Meta's pacer overview which is per-period, OTT shows all ads across all
 * periods in one grid (filterable client-side by group/period/status).
 */
export async function fetchOverview(accountKeys: string[]) {
  if (accountKeys.length === 0) return [];
  const [accounts, plans] = await Promise.all([
    prisma.account.findMany({
      where: { key: { in: accountKeys } },
      select: { key: true, dealer: true, markup: true },
    }),
    prisma.ottAdsPlan.findMany({
      where: { accountKey: { in: accountKeys } },
      select: { id: true, accountKey: true },
    }),
  ]);
  const planByKey = new Map(plans.map((p) => [p.accountKey, p.id]));
  const planIds = plans.map((p) => p.id);
  const ads =
    planIds.length > 0
      ? await prisma.ottAdsAd.findMany({
          where: { planId: { in: planIds } },
          orderBy: [{ period: 'desc' }, { position: 'asc' }],
        })
      : [];
  const adsByPlanId = new Map<string, typeof ads>();
  for (const ad of ads) {
    const arr = adsByPlanId.get(ad.planId) ?? [];
    arr.push(ad);
    adsByPlanId.set(ad.planId, arr);
  }
  return accounts
    .map((acct) => {
      const planId = planByKey.get(acct.key);
      return {
        accountKey: acct.key,
        dealer: acct.dealer,
        markup: acct.markup,
        ads: planId ? (adsByPlanId.get(planId) ?? []) : [],
      };
    })
    .sort((a, b) => a.dealer.localeCompare(b.dealer));
}

/**
 * Fetch a single ad with all its analytics children for the deep-dive view.
 */
export async function fetchAdAnalytics(adId: string) {
  return prisma.ottAdsAd.findUnique({
    where: { id: adId },
    include: {
      plan: { include: { account: { select: { dealer: true, key: true, markup: true } } } },
      performance: { orderBy: { month: 'asc' } },
      geoPerf: { orderBy: [{ month: 'asc' }, { county: 'asc' }] },
      propertyPerf: { orderBy: [{ month: 'asc' }, { rank: 'asc' }] },
      optimizations: { orderBy: { date: 'asc' } },
    },
  });
}
