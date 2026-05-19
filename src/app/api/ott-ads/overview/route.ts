import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { accessibleAccountKeys, fetchOverview } from '@/lib/ott-ads';

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const allAccounts = await prisma.account.findMany({ select: { key: true } });
  const allKeys = allAccounts.filter((a) => !a.key.startsWith('_')).map((a) => a.key);
  const allowed = accessibleAccountKeys(session, allKeys);

  if (allowed.length === 0) {
    return NextResponse.json({ accounts: [] });
  }

  const accounts = await fetchOverview(allowed);
  return NextResponse.json({ accounts });
}
