import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { canAccessOttAds, getOrCreatePlan, isValidPeriod, OTT_PLATFORMS, OTT_STATUSES } from '@/lib/ott-ads';

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

function normalizeStatus(s: string | undefined): string {
  if (!s) return 'new_request';
  return (OTT_STATUSES as readonly string[]).includes(s) ? s : 'new_request';
}

function normalizePlatform(p: string | undefined): string {
  if (!p) return 'stackadapt';
  return (OTT_PLATFORMS as readonly string[]).includes(p) ? p : 'stackadapt';
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ accountKey: string }> },
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const { accountKey } = await params;
  if (!canAccessOttAds(session, accountKey)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const body = (await req.json()) as IncomingAd;
  const period = body.period && isValidPeriod(body.period) ? body.period : '';
  const plan = await getOrCreatePlan(accountKey);

  const maxPos = await prisma.ottAdsAd.aggregate({
    where: { planId: plan.id },
    _max: { position: true },
  });
  const position = (maxPos._max.position ?? -1) + 1;

  const ad = await prisma.ottAdsAd.create({
    data: {
      planId: plan.id,
      position,
      name: nullable(body.name) ?? '',
      platform: normalizePlatform(body.platform),
      period,
      status: normalizeStatus(body.status),
      assignedToUserId: nullable(body.assignedToUserId),
      recurring: body.recurring || 'No',
      flightStart: nullable(body.flightStart),
      flightEnd: nullable(body.flightEnd),
      dueDate: nullable(body.dueDate),
      completeDate: nullable(body.completeDate),
      grossBudget: nullable(body.grossBudget),
      videoUrl: nullable(body.videoUrl),
      projectLink: nullable(body.projectLink),
      notes: nullable(body.notes),
    },
  });
  return NextResponse.json({ ad });
}
