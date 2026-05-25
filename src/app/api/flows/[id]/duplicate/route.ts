import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { duplicateFlow, getFlow } from '@/lib/services/loomi-flows';

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
  const name = typeof body?.name === 'string' ? body.name : undefined;

  const flow = await duplicateFlow(id, {
    name,
    createdByUserId: session!.user.id,
  });
  return NextResponse.json({ flow }, { status: 201 });
}
