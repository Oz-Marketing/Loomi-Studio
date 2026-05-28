import { NextRequest, NextResponse } from 'next/server';
import { getAccountScope, requireRole } from '@/lib/api-auth';
import {
  LpTemplateServiceError,
  createLpTemplateFromLandingPage,
} from '@/lib/services/lp-templates';

/**
 * POST /api/landing-pages/[id]/save-as-template
 *
 * Snapshot the source LP's schema into a new dealer-saved template.
 * Body: { name, description? }
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireRole('developer', 'super_admin', 'admin');
  if (error) return error;

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === 'string' ? body.name : '';
  const description =
    typeof body?.description === 'string' ? body.description : undefined;

  try {
    const template = await createLpTemplateFromLandingPage({
      lpId: id,
      accountKeys: getAccountScope(session!),
      name,
      description,
      createdByUserId: session!.user.id,
    });
    return NextResponse.json({ template }, { status: 201 });
  } catch (err) {
    if (err instanceof LpTemplateServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
