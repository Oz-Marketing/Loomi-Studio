import { NextRequest, NextResponse } from 'next/server';
import {
  canAccessAccount,
  forbidden,
  getAccountScope,
  requireRole,
} from '@/lib/api-auth';
import {
  createForm,
  FormServiceError,
  listForms,
} from '@/lib/services/forms';

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole('developer', 'super_admin', 'admin');
  if (error) return error;

  const scope = getAccountScope(session!);
  const accountKey = req.nextUrl.searchParams.get('accountKey');
  if (accountKey && !canAccessAccount(scope, accountKey)) return forbidden();

  const page = Number(req.nextUrl.searchParams.get('page') || 1);
  const pageSize = Number(req.nextUrl.searchParams.get('pageSize') || 25);
  const result = await listForms({
    accountKeys: accountKey ? null : scope,
    accountKey,
    page,
    pageSize,
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole('developer', 'super_admin', 'admin');
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const accountKey = typeof body?.accountKey === 'string' ? body.accountKey.trim() : '';
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
  if (!accountKey) {
    return NextResponse.json({ error: 'accountKey is required' }, { status: 400 });
  }

  const scope = getAccountScope(session!);
  if (!canAccessAccount(scope, accountKey)) return forbidden();

  try {
    const form = await createForm({
      accountKey,
      name,
      createdByUserId: session!.user.id,
    });
    return NextResponse.json({ form }, { status: 201 });
  } catch (err) {
    if (err instanceof FormServiceError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }
}
