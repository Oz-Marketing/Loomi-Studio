/**
 * Ad Generator OEM compliance rule — GET /api/ad-generator/oem-rules?make=
 *
 * Returns the active `AdOemOfferRule` for a make (case-insensitive), parsed
 * into { make, requiredFields }, or `{ rule: null }` when none exists. The
 * generator unions the rule with the code-defined baseline to decide which
 * fields must be filled before export. Resilient: returns null (→ baseline
 * only) if the table isn't migrated in this environment.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-auth';
import { AD_GENERATOR_ENABLED } from '@/lib/feature-flags';
import { prisma } from '@/lib/prisma';
import { parseOemRule } from '@/lib/ad-generator/compliance';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!AD_GENERATOR_ENABLED) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const make = (req.nextUrl.searchParams.get('make') || '').trim();
  if (!make) return NextResponse.json({ rule: null });

  try {
    const row = await prisma.adOemOfferRule.findFirst({
      where: { isActive: true, make: { equals: make, mode: 'insensitive' } },
    });
    return NextResponse.json({ rule: row ? parseOemRule(row.make, row.requiredFields) : null });
  } catch (err) {
    console.warn('[api/ad-generator/oem-rules] falling back to null:', err);
    return NextResponse.json({ rule: null });
  }
}
