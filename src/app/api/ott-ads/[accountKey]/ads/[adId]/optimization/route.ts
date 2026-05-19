import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { canAccessOttAds } from '@/lib/ott-ads';

interface IncomingOpt {
  date?: string;
  changeMade?: string;
  reason?: string | null;
  result?: string | null;
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ accountKey: string; adId: string }> },
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const { accountKey, adId } = await params;
  if (!canAccessOttAds(session, accountKey)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
  if (!(await verifyAd(adId, accountKey))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const body = (await req.json()) as IncomingOpt;
  if (!body.date || !body.changeMade || !body.changeMade.trim()) {
    return NextResponse.json({ error: 'date and changeMade are required' }, { status: 400 });
  }

  const row = await prisma.ottAdsOptimization.create({
    data: {
      adId,
      date: body.date,
      changeMade: body.changeMade.trim(),
      reason: nullable(body.reason),
      result: nullable(body.result),
      authorUserId: session!.user.id,
    },
  });
  return NextResponse.json({ optimization: row });
}
