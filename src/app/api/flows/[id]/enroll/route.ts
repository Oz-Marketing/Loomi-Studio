import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { enrollContacts, getFlow } from '@/lib/services/loomi-flows';

/**
 * POST /api/flows/[id]/enroll
 *
 * Body shape (one of):
 *   { contactIds: string[] }
 *   { listId: string }
 *
 * Returns counts of enrolled / skipped / reason map.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireRole('developer', 'super_admin', 'admin');
  if (error) return error;

  const { id } = await context.params;
  const scope =
    session!.user.role === 'client' || session!.user.role === 'admin'
      ? (session!.user.accountKeys ?? [])
      : null;
  const existing = await getFlow(id, scope);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));

  let contactIds: string[] = [];
  if (Array.isArray(body?.contactIds)) {
    contactIds = body.contactIds
      .filter((v: unknown): v is string => typeof v === 'string')
      .map((v: string) => v.trim())
      .filter(Boolean);
  } else if (typeof body?.listId === 'string' && body.listId.trim()) {
    const memberships = await prisma.contactListMembership.findMany({
      where: { listId: body.listId.trim() },
      select: { contactId: true },
    });
    contactIds = memberships.map((m) => m.contactId);
  } else {
    return NextResponse.json(
      { error: 'Provide either contactIds[] or listId' },
      { status: 400 },
    );
  }

  if (contactIds.length === 0) {
    return NextResponse.json({ enrolled: 0, skipped: 0, reason: {} });
  }

  // Cap manual enrollments at 1000 per request — anything larger
  // should batch or use the worker's list-trigger poller instead.
  if (contactIds.length > 1000) {
    return NextResponse.json(
      { error: 'Manual enrollment limit is 1000 contacts per request' },
      { status: 400 },
    );
  }

  const result = await enrollContacts(id, contactIds);
  return NextResponse.json(result);
}
