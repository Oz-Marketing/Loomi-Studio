import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { createFlow, listFlows } from '@/lib/services/loomi-flows';

function clientAccountKeysFromSession(session: {
  user: { role: string; accountKeys?: string[] };
}): string[] | undefined {
  if (session.user.role === 'client' || session.user.role === 'admin') {
    return session.user.accountKeys ?? [];
  }
  return undefined;
}

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole('developer', 'super_admin', 'admin', 'client');
  if (error) return error;

  const accountKeyParam = req.nextUrl.searchParams.get('accountKey');
  const includeArchived = req.nextUrl.searchParams.get('includeArchived') === '1';
  const scoped = clientAccountKeysFromSession(session!);
  const accountKeys = accountKeyParam ? [accountKeyParam] : scoped;

  // If role is account-scoped (client / admin with assignments) make
  // sure they can't request a flow outside their assigned scope by
  // intersecting the explicit accountKey param with their allowed set.
  if (scoped && accountKeyParam && !scoped.includes(accountKeyParam)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const flows = await listFlows({
    accountKeys: accountKeys ?? null,
    includeArchived,
  });
  return NextResponse.json({ flows });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole('developer', 'super_admin', 'admin');
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const description = typeof body?.description === 'string' ? body.description : '';
  const accountKey = typeof body?.accountKey === 'string' ? body.accountKey.trim() : null;

  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const scoped = clientAccountKeysFromSession(session!);
  if (accountKey && scoped && !scoped.includes(accountKey)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const flow = await createFlow({
    name,
    description,
    accountKey,
    createdByUserId: session!.user.id,
  });
  return NextResponse.json({ flow }, { status: 201 });
}
