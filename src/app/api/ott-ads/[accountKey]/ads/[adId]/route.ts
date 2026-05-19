import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { canAccessOttAds, isValidPeriod, OTT_PLATFORMS, OTT_STATUSES } from '@/lib/ott-ads';

interface IncomingAd {
  name?: string;
  platform?: string;
  period?: string;
  status?: string;
  assignedToUserId?: string | null;
  recurring?: string;
  flightStart?: string | null;
  flightEnd?: string | null;
  dueDate?: string | null;
  completeDate?: string | null;
  grossBudget?: string | null;
  videoUrl?: string | null;
  projectLink?: string | null;
  notes?: string | null;
}

function nullable(v: string | null | undefined): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t.length === 0 ? null : t;
}

async function verifyAdInAccount(adId: string, accountKey: string): Promise<boolean> {
  const ad = await prisma.ottAdsAd.findUnique({
    where: { id: adId },
    select: { plan: { select: { accountKey: true } } },
  });
  return !!ad && ad.plan.accountKey === accountKey;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ accountKey: string; adId: string }> },
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const { accountKey, adId } = await params;
  if (!canAccessOttAds(session, accountKey)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
  if (!(await verifyAdInAccount(adId, accountKey))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = (await req.json()) as IncomingAd;
  const data: Record<string, string | null> = {};

  if (body.name !== undefined) data.name = nullable(body.name) ?? '';
  if (body.platform !== undefined) {
    data.platform = (OTT_PLATFORMS as readonly string[]).includes(body.platform!)
      ? body.platform!
      : 'stackadapt';
  }
  if (body.period !== undefined) data.period = isValidPeriod(body.period!) ? body.period! : '';
  if (body.status !== undefined) {
    data.status = (OTT_STATUSES as readonly string[]).includes(body.status!)
      ? body.status!
      : 'new_request';
  }
  if (body.assignedToUserId !== undefined) data.assignedToUserId = nullable(body.assignedToUserId);
  if (body.recurring !== undefined) data.recurring = body.recurring || 'No';
  if (body.flightStart !== undefined) data.flightStart = nullable(body.flightStart);
  if (body.flightEnd !== undefined) data.flightEnd = nullable(body.flightEnd);
  if (body.dueDate !== undefined) data.dueDate = nullable(body.dueDate);
  if (body.completeDate !== undefined) data.completeDate = nullable(body.completeDate);
  if (body.grossBudget !== undefined) data.grossBudget = nullable(body.grossBudget);
  if (body.videoUrl !== undefined) data.videoUrl = nullable(body.videoUrl);
  if (body.projectLink !== undefined) data.projectLink = nullable(body.projectLink);
  if (body.notes !== undefined) data.notes = nullable(body.notes);

  const ad = await prisma.ottAdsAd.update({ where: { id: adId }, data });
  return NextResponse.json({ ad });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ accountKey: string; adId: string }> },
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const { accountKey, adId } = await params;
  if (!canAccessOttAds(session, accountKey)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
  if (!(await verifyAdInAccount(adId, accountKey))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  await prisma.ottAdsAd.delete({ where: { id: adId } });
  return NextResponse.json({ ok: true });
}
