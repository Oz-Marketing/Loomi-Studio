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

async function verifyEntry(entryId: string, adId: string, accountKey: string): Promise<boolean> {
  const row = await prisma.ottAdsOptimization.findUnique({
    where: { id: entryId },
    select: { adId: true, ad: { select: { plan: { select: { accountKey: true } } } } },
  });
  return !!row && row.adId === adId && row.ad.plan.accountKey === accountKey;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ accountKey: string; adId: string; entryId: string }> },
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const { accountKey, adId, entryId } = await params;
  if (!canAccessOttAds(session, accountKey)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
  if (!(await verifyEntry(entryId, adId, accountKey))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const body = (await req.json()) as IncomingOpt;
  const data: Record<string, string | null> = {};
  if (body.date !== undefined) data.date = body.date;
  if (body.changeMade !== undefined) data.changeMade = body.changeMade?.trim() || '';
  if (body.reason !== undefined) data.reason = nullable(body.reason);
  if (body.result !== undefined) data.result = nullable(body.result);
  const row = await prisma.ottAdsOptimization.update({ where: { id: entryId }, data });
  return NextResponse.json({ optimization: row });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ accountKey: string; adId: string; entryId: string }> },
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const { accountKey, adId, entryId } = await params;
  if (!canAccessOttAds(session, accountKey)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
  if (!(await verifyEntry(entryId, adId, accountKey))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  await prisma.ottAdsOptimization.delete({ where: { id: entryId } });
  return NextResponse.json({ ok: true });
}
