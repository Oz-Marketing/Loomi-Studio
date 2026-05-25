import { NextRequest, NextResponse } from 'next/server';
import {
  canAccessAccount,
  forbidden,
  getAccountScope,
  requireRole,
} from '@/lib/api-auth';
import { createForm, FormServiceError } from '@/lib/services/forms';

/**
 * Prefixes a Forms route with /subaccount/<slug> when the caller came
 * from a sub-account-scoped page. Slug validation is conservative —
 * only [a-z0-9-]+ — so we don't echo arbitrary header content into a
 * redirect URL.
 */
function withSubaccountPrefix(path: string, rawSlug: string | null): string {
  const slug = rawSlug?.trim() ?? '';
  if (!slug || !/^[a-z0-9-]+$/i.test(slug)) return path;
  return `/subaccount/${slug}${path}`;
}

export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/websites/forms', req.url));
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole('developer', 'super_admin', 'admin');
  if (error) return error;

  const formData = await req.formData();
  const accountKey = String(formData.get('accountKey') || '').trim();
  const name = String(formData.get('name') || 'Untitled form').trim() || 'Untitled form';
  // Threaded through from forms-page-header so the redirect lands in the
  // same sub-account URL space the user came from.
  const subaccountSlug = String(formData.get('subaccountSlug') || '');

  if (!accountKey) {
    return NextResponse.redirect(
      new URL(
        withSubaccountPrefix('/websites/forms?error=missing-account', subaccountSlug),
        req.url,
      ),
    );
  }
  const scope = getAccountScope(session!);
  if (!canAccessAccount(scope, accountKey)) return forbidden();

  try {
    const form = await createForm({
      accountKey,
      name,
      createdByUserId: session!.user.id,
    });
    return NextResponse.redirect(
      new URL(withSubaccountPrefix(`/websites/forms/${form.id}`, subaccountSlug), req.url),
    );
  } catch (err) {
    if (err instanceof FormServiceError) {
      const url = new URL(
        withSubaccountPrefix('/websites/forms', subaccountSlug),
        req.url,
      );
      url.searchParams.set('error', err.message);
      return NextResponse.redirect(url);
    }
    throw err;
  }
}
