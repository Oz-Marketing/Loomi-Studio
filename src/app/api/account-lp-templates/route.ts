import { NextRequest, NextResponse } from 'next/server';
import {
  canAccessAccount,
  forbidden,
  getAccountScope,
  requireRole,
} from '@/lib/api-auth';
import { listLpTemplatesForAccount } from '@/lib/services/lp-templates';

/**
 * GET /api/account-lp-templates?accountKey=<key>
 *
 * Lists the dealer-saved LP templates for one account. The New
 * Landing Page modal merges these with the static LP_TEMPLATE_PRESETS
 * to build its picker.
 */
export async function GET(req: NextRequest) {
  const { session, error } = await requireRole('developer', 'super_admin', 'admin');
  if (error) return error;

  const accountKey = req.nextUrl.searchParams.get('accountKey');
  if (!accountKey) {
    return NextResponse.json({ error: 'accountKey is required' }, { status: 400 });
  }
  if (!canAccessAccount(getAccountScope(session!), accountKey)) return forbidden();

  const templates = await listLpTemplatesForAccount(accountKey);
  return NextResponse.json({ templates });
}
