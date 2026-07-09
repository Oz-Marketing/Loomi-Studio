import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';
import { getFlowAnalytics, listFlows } from '@/lib/services/loomi-flows';

// Aggregate analytics across every flow in scope. Fans out per-flow
// `getFlowAnalytics()` calls so the page can render a sortable table
// of per-flow performance alongside top-level KPI tiles.
//
// Scoping mirrors the GET on /api/flows: a `?accountKey=...` param
// limits to one account; client / admin sessions get auto-filtered
// to their assigned account keys; developer / super_admin see
// everything.

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(
    'developer',
    'super_admin',
    'admin',
    'client',
  );
  if (error) return error;

  const accountKeyParam = req.nextUrl.searchParams.get('accountKey');
  const scoped =
    session!.user.role === 'client' || session!.user.role === 'admin'
      ? (session!.user.accountKeys ?? [])
      : undefined;
  const accountKeys = accountKeyParam ? [accountKeyParam] : scoped;

  if (scoped && accountKeyParam && !scoped.includes(accountKeyParam)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // We always include archived flows here so the analytics page can
  // show historical performance for paused / archived series.
  const flows = await listFlows({
    accountKeys: accountKeys ?? null,
    includeArchived: true,
  });

  // Fan-out — each per-flow analytics call is independent so we run
  // them in parallel. The shape returned per flow:
  //   { active, completed, exited, failed, totalSends, totalOpens, totalClicks }
  const perFlow = await Promise.all(
    flows.map(async (flow) => {
      const a = await getFlowAnalytics(flow.id);
      return {
        id: flow.id,
        name: flow.name,
        status: flow.status,
        accountKey: flow.accountKey,
        publishedAt: flow.publishedAt,
        archivedAt: flow.archivedAt,
        createdAt: flow.createdAt,
        updatedAt: flow.updatedAt,
        nodeCount: flow.nodeCount,
        active: a.active,
        completed: a.completed,
        exited: a.exited,
        failed: a.failed,
        totalSends: a.totalSends,
        totalOpens: a.totalOpens,
        totalClicks: a.totalClicks,
      };
    }),
  );

  return NextResponse.json({ flows: perFlow });
}
