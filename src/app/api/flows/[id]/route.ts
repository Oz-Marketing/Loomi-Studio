import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import {
  archiveFlow,
  getFlow,
  updateFlow,
  type FlowSettings,
} from '@/lib/services/loomi-flows';

function accountScope(session: {
  user: { role: string; accountKeys?: string[] };
}): string[] | null {
  if (session.user.role === 'client' || session.user.role === 'admin') {
    return session.user.accountKeys ?? [];
  }
  return null;
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireRole('developer', 'super_admin', 'admin', 'client');
  if (error) return error;

  const { id } = await context.params;
  const flow = await getFlow(id, accountScope(session!));
  if (!flow) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ flow });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireRole('developer', 'super_admin', 'admin');
  if (error) return error;

  const { id } = await context.params;
  // Confirm the flow exists + is accessible to this caller before
  // we let them mutate it.
  const existing = await getFlow(id, accountScope(session!));
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: {
    name?: string;
    description?: string | null;
    settings?: FlowSettings;
  } = {};
  if (typeof body?.name === 'string') data.name = body.name;
  if (body?.description === null || typeof body?.description === 'string') {
    data.description = body.description;
  }
  // Settings shape is trusted to be FlowSettings — parseFlowSettings
  // in the service normalises on read, so even partial/malformed
  // payloads survive a round-trip.
  if (body?.settings && typeof body.settings === 'object') {
    data.settings = body.settings as FlowSettings;
  }

  const flow = await updateFlow(id, data);
  return NextResponse.json({ flow });
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireRole('developer', 'super_admin', 'admin');
  if (error) return error;

  const { id } = await context.params;
  const existing = await getFlow(id, accountScope(session!));
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const flow = await archiveFlow(id);
  return NextResponse.json({ flow });
}
