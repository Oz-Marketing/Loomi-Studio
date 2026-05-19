import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { canAccessOttAds, isValidMonth } from '@/lib/ott-ads';

interface IncomingPerf {
  spend?: string | null;
  impressions?: string | null;
  completedViews?: string | null;
  uniqueReach?: string | null;
  footfallVisits?: string | null;
  siteVisits?: string | null;
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

  const body = (await req.json()) as IncomingPerf;
  const data = {
    spend: nullable(body.spend),
    impressions: nullable(body.impressions),
    completedViews: nullable(body.completedViews),
    uniqueReach: nullable(body.uniqueReach),
    footfallVisits: nullable(body.footfallVisits),
    siteVisits: nullable(body.siteVisits),
    notes: nullable(body.notes),
  };

  const row = await prisma.ottAdsPerformance.upsert({
    where: { adId_month: { adId, month } },
    create: { adId, month, ...data },
    update: data,
  });
  return NextResponse.json({ performance: row });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ accountKey: string; adId: string; month: string }> },
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const { accountKey, adId, month } = await params;
  if (!canAccessOttAds(session, accountKey)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
  if (!(await verifyAd(adId, accountKey))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  await prisma.ottAdsPerformance.deleteMany({ where: { adId, month } });
  return NextResponse.json({ ok: true });
}
