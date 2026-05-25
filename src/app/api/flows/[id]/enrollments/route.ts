import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { getFlow } from '@/lib/services/loomi-flows';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireRole('developer', 'super_admin', 'admin', 'client');
  if (error) return error;

  const { id } = await context.params;
  const scope =
    session!.user.role === 'client' || session!.user.role === 'admin'
      ? (session!.user.accountKeys ?? [])
      : null;
  const existing = await getFlow(id, scope);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const limitRaw = Number(req.nextUrl.searchParams.get('limit') || '50');
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, limitRaw)) : 50;
  const statusFilter = req.nextUrl.searchParams.get('status') || undefined;

  const enrollments = await prisma.loomiFlowEnrollment.findMany({
    where: {
      flowId: id,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    orderBy: { enrolledAt: 'desc' },
    take: limit,
    include: {
      steps: {
        orderBy: { executedAt: 'desc' },
        take: 10,
      },
    },
  });

  return NextResponse.json({
    enrollments: enrollments.map((e) => ({
      id: e.id,
      contactId: e.contactId,
      status: e.status,
      currentNodeId: e.currentNodeId,
      nextRunAt: e.nextRunAt?.toISOString() || '',
      enrolledAt: e.enrolledAt.toISOString(),
      completedAt: e.completedAt?.toISOString() || '',
      steps: e.steps.map((s) => ({
        id: s.id,
        nodeId: s.nodeId,
        status: s.status,
        branch: s.branch,
        emailRecipientId: s.emailRecipientId,
        executedAt: s.executedAt.toISOString(),
      })),
    })),
  });
}
