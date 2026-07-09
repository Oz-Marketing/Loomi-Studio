/**
 * Per-landing-page analytics.
 *
 * Aggregates raw LandingPageEvent rows + LP-attributed FormSubmissions
 * for a given page over a time range. Each section is its own Prisma
 * query rather than one giant join — the page-detail call only fires
 * on tab click, so a handful of indexed counts is well within budget
 * vs. precomputing a roll-up table. Once page volumes get into the
 * "millions of events per LP" territory we'll layer a daily roll-up
 * (LandingPageStats) on top of this service.
 */
import { prisma } from '@/lib/prisma';

export type AnalyticsRange = '7d' | '28d' | '90d';

const RANGE_TO_DAYS: Record<AnalyticsRange, number> = {
  '7d': 7,
  '28d': 28,
  '90d': 90,
};

export interface LpAnalyticsSummary {
  range: AnalyticsRange;
  from: string;
  to: string;
  totals: {
    views: number;
    uniqueVisitors: number;
    conversions: number;
    /** views → conversions percentage (0–100). Null when no views. */
    conversionRatePct: number | null;
  };
  /** Per-day breakdown spanning the full range (zero-filled). */
  byDay: Array<{
    date: string; // YYYY-MM-DD
    views: number;
    conversions: number;
  }>;
  /** Sessions that reached each scroll milestone. Use to draw a
   *  funnel — sessions typically dwindle as depth increases. */
  scrollFunnel: {
    reached25: number;
    reached50: number;
    reached75: number;
    reached100: number;
  };
  /** Top UTM tuples by view volume. Source is most often the bucket
   *  marketing teams care about (facebook / google / direct). */
  topUtmSources: Array<{
    source: string;
    medium: string | null;
    campaign: string | null;
    views: number;
  }>;
  topReferrers: Array<{
    referrer: string;
    views: number;
  }>;
  topCtas: Array<{
    label: string | null;
    href: string | null;
    clicks: number;
  }>;
  /** Latest submissions attributed to this LP. Anonymous rows
   *  (no contact) still surface with a placeholder name. */
  recentSubmissions: Array<{
    id: string;
    createdAt: string;
    contactName: string | null;
    contactEmail: string | null;
    formName: string | null;
    utmSource: string | null;
    utmCampaign: string | null;
  }>;
}

export async function getLandingPageAnalytics(
  pageId: string,
  range: AnalyticsRange,
): Promise<LpAnalyticsSummary> {
  const days = RANGE_TO_DAYS[range];
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

  // ── Totals + per-day series ────────────────────────────────
  // Single raw query for the day breakdown so we get one row per
  // day with view/conversion counts side-by-side. Date_trunc to
  // UTC midnight keeps days aligned across timezones.
  const byDayRows = await prisma.$queryRaw<
    Array<{ day: Date; views: bigint; conversions: bigint }>
  >`
    SELECT
      date_trunc('day', "createdAt") AS day,
      COUNT(*) FILTER (WHERE type = 'view') AS views,
      COUNT(*) FILTER (WHERE type = 'form_submit') AS conversions
    FROM "LandingPageEvent"
    WHERE "pageId" = ${pageId}
      AND "createdAt" >= ${from}
      AND "createdAt" <= ${to}
    GROUP BY day
    ORDER BY day ASC
  `;
  const byDayMap = new Map<string, { views: number; conversions: number }>();
  for (const row of byDayRows) {
    const key = row.day.toISOString().slice(0, 10);
    byDayMap.set(key, {
      views: Number(row.views ?? 0),
      conversions: Number(row.conversions ?? 0),
    });
  }
  const byDay: LpAnalyticsSummary['byDay'] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from.getTime() + i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    const hit = byDayMap.get(key);
    byDay.push({ date: key, views: hit?.views ?? 0, conversions: hit?.conversions ?? 0 });
  }
  const totalViews = byDay.reduce((sum, d) => sum + d.views, 0);
  const totalConversions = byDay.reduce((sum, d) => sum + d.conversions, 0);

  // ── Unique visitors ────────────────────────────────────────
  // anonId is a browser-scoped cookie — counting distinct anonIds
  // approximates "unique people". Prisma's count() can't COUNT
  // DISTINCT directly, so we groupBy + .length.
  const uniqueRows = await prisma.landingPageEvent.findMany({
    where: {
      pageId,
      type: 'view',
      createdAt: { gte: from, lte: to },
      anonId: { not: null },
    },
    select: { anonId: true },
    distinct: ['anonId'],
  });
  const uniqueVisitors = uniqueRows.length;

  // ── Scroll funnel ──────────────────────────────────────────
  // Distinct sessions per milestone — a session is what reached
  // each depth (vs raw event counts which could over-state).
  const scrollRows = await prisma.$queryRaw<
    Array<{ type: string; sessions: bigint }>
  >`
    SELECT type, COUNT(DISTINCT "sessionId") AS sessions
    FROM "LandingPageEvent"
    WHERE "pageId" = ${pageId}
      AND "createdAt" >= ${from}
      AND "createdAt" <= ${to}
      AND "sessionId" IS NOT NULL
      AND type IN ('scroll_25', 'scroll_50', 'scroll_75', 'scroll_100')
    GROUP BY type
  `;
  const scrollMap: Record<string, number> = {};
  for (const row of scrollRows) {
    scrollMap[row.type] = Number(row.sessions ?? 0);
  }
  const scrollFunnel = {
    reached25: scrollMap['scroll_25'] ?? 0,
    reached50: scrollMap['scroll_50'] ?? 0,
    reached75: scrollMap['scroll_75'] ?? 0,
    reached100: scrollMap['scroll_100'] ?? 0,
  };

  // ── Top UTM sources ────────────────────────────────────────
  const utmGroups = await prisma.landingPageEvent.groupBy({
    by: ['utmSource', 'utmMedium', 'utmCampaign'],
    where: {
      pageId,
      type: 'view',
      createdAt: { gte: from, lte: to },
      utmSource: { not: null },
    },
    _count: { _all: true },
    orderBy: { _count: { utmSource: 'desc' } },
    take: 10,
  });
  const topUtmSources: LpAnalyticsSummary['topUtmSources'] = utmGroups
    .filter((g) => g.utmSource != null)
    .map((g) => ({
      source: g.utmSource as string,
      medium: g.utmMedium,
      campaign: g.utmCampaign,
      views: g._count._all,
    }));

  // ── Top referrers ──────────────────────────────────────────
  const referrerGroups = await prisma.landingPageEvent.groupBy({
    by: ['referrer'],
    where: {
      pageId,
      type: 'view',
      createdAt: { gte: from, lte: to },
      referrer: { not: null },
    },
    _count: { _all: true },
    orderBy: { _count: { referrer: 'desc' } },
    take: 10,
  });
  const topReferrers: LpAnalyticsSummary['topReferrers'] = referrerGroups
    .filter((g) => g.referrer != null)
    .map((g) => ({
      referrer: g.referrer as string,
      views: g._count._all,
    }));

  // ── Top CTAs ───────────────────────────────────────────────
  // CTA label + href live in the event's JSON meta column —
  // group on that via a raw query since Prisma's groupBy can't
  // reach into nested JSON keys.
  const ctaRows = await prisma.$queryRaw<
    Array<{ label: string | null; href: string | null; clicks: bigint }>
  >`
    SELECT
      meta->>'ctaLabel' AS label,
      meta->>'ctaHref' AS href,
      COUNT(*) AS clicks
    FROM "LandingPageEvent"
    WHERE "pageId" = ${pageId}
      AND type = 'cta_click'
      AND "createdAt" >= ${from}
      AND "createdAt" <= ${to}
    GROUP BY label, href
    ORDER BY clicks DESC
    LIMIT 10
  `;
  const topCtas: LpAnalyticsSummary['topCtas'] = ctaRows.map((r) => ({
    label: r.label,
    href: r.href,
    clicks: Number(r.clicks ?? 0),
  }));

  // ── Recent submissions ─────────────────────────────────────
  const submissions = await prisma.formSubmission.findMany({
    where: {
      lpId: pageId,
      createdAt: { gte: from, lte: to },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      contact: { select: { firstName: true, lastName: true, email: true } },
      form: { select: { name: true } },
    },
  });
  const recentSubmissions: LpAnalyticsSummary['recentSubmissions'] = submissions.map(
    (s) => {
      const first = s.contact?.firstName?.trim() ?? '';
      const last = s.contact?.lastName?.trim() ?? '';
      const fullName = [first, last].filter(Boolean).join(' ');
      return {
        id: s.id,
        createdAt: s.createdAt.toISOString(),
        contactName: fullName.length > 0 ? fullName : null,
        contactEmail: s.contact?.email ?? null,
        formName: s.form?.name ?? null,
        utmSource: s.utmSource,
        utmCampaign: s.utmCampaign,
      };
    },
  );

  return {
    range,
    from: from.toISOString(),
    to: to.toISOString(),
    totals: {
      views: totalViews,
      uniqueVisitors,
      conversions: totalConversions,
      conversionRatePct:
        totalViews > 0 ? Math.round((totalConversions / totalViews) * 1000) / 10 : null,
    },
    byDay,
    scrollFunnel,
    topUtmSources,
    topReferrers,
    topCtas,
    recentSubmissions,
  };
}

