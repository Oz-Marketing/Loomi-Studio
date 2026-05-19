import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { canAccessOttAds, fetchAdAnalytics } from '@/lib/ott-ads';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ accountKey: string; adId: string }> },
) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const { accountKey, adId } = await params;
  if (!canAccessOttAds(session, accountKey)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }
  const ad = await fetchAdAnalytics(adId);
  if (!ad || ad.plan.accountKey !== accountKey) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  // Flatten plan/account fields into the response so the client doesn't
  // need to walk plan.account.
  const { plan, ...rest } = ad;
  return NextResponse.json({
    ad: {
      ...rest,
      accountKey: plan.account?.key ?? accountKey,
      dealer: plan.account?.dealer ?? accountKey,
      markup: plan.account?.markup ?? null,
    },
  });
}
