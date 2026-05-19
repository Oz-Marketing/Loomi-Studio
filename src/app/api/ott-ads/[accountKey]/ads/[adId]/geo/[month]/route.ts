import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { canAccessOttAds, isValidMonth } from '@/lib/ott-ads';

interface IncomingGeoRow {
  county?: string;
  impressions?: string | null;
  spend?: string | null;
  vcr?: string | null;
  footfallVisits?: string | null;
  notes?: string | null;
}

function nullable(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t.length === 0 ? null : t;
}

async function verifyAd(adId: string, accountKey: string): Promise<boolean> {
  const ad = await prisma.ottAdsAd.findUnique({
    where: { id: adId },
    select: { plan: { select: { accountKey: true } } },
  });
  return !!ad && ad.plan.accountKey === accountKey;
}

// Bulk replace all rows for a (ad, month). Simpler client-side than per-row
// CRUD when the user is filling in 8 counties at once from a StackAdapt report.
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ accountKey: string; adId: string; month: string }> },
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const { accountKey, adId, month } = await params;
  if (!canAccessOttAds(session, accountKey)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
  if (!isValidMonth(month)) {
    return NextResponse.json({ error: 'Invalid month (expected YYYY-MM)' }, { status: 400 });
  }
  if (!(await verifyAd(adId, accountKey))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = (await req.json()) as { rows?: IncomingGeoRow[] };
  const rows = Array.isArray(body.rows) ? body.rows : [];
  const cleaned = rows
    .filter((r) => r.county && r.county.trim().length > 0)
    .map((r) => ({
      adId,
      month,
      county: r.county!.trim(),
      impressions: nullable(r.impressions),
      spend: nullable(r.spend),
      vcr: nullable(r.vcr),
      footfallVisits: nullable(r.footfallVisits),
      notes: nullable(r.notes),
    }));

  await prisma.$transaction(async (tx) => {
    await tx.ottAdsGeoPerformance.deleteMany({ where: { adId, month } });
    if (cleaned.length > 0) {
      await tx.ottAdsGeoPerformance.createMany({ data: cleaned });
    }
  });

  const out = await prisma.ottAdsGeoPerformance.findMany({
    where: { adId, month },
    orderBy: { county: 'asc' },
  });
  return NextResponse.json({ rows: out });
}
