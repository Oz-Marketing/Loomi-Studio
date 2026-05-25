import { NextRequest, NextResponse } from 'next/server';
import {
  canAccessAccount,
  forbidden,
  getAccountScope,
  requireRole,
} from '@/lib/api-auth';
import { createForm, FormServiceError } from '@/lib/services/forms';

export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/websites/forms', req.url));
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole('developer', 'super_admin', 'admin');
  if (error) return error;

  const formData = await req.formData();
  const accountKey = String(formData.get('accountKey') || '').trim();
  const name = String(formData.get('name') || 'Untitled form').trim() || 'Untitled form';

  if (!accountKey) {
    return NextResponse.redirect(new URL('/websites/forms?error=missing-account', req.url));
  }
  const scope = getAccountScope(session!);
  if (!canAccessAccount(scope, accountKey)) return forbidden();

  try {
    const form = await createForm({
      accountKey,
      name,
      createdByUserId: session!.user.id,
    });
    return NextResponse.redirect(new URL(`/websites/forms/${form.id}`, req.url));
  } catch (err) {
    if (err instanceof FormServiceError) {
      const url = new URL('/websites/forms', req.url);
      url.searchParams.set('error', err.message);
      return NextResponse.redirect(url);
    }
    throw err;
  }
}
