/**
 * Auth + scope guard for the reporting API surface.
 *
 * Wraps `getAuthSession()` + `getAccountScope()` from the shared
 * `api-auth` module and standardises the response shape every
 * reporting route uses. Route handlers should treat `error` as the
 * short-circuit response and otherwise destructure `ctx`.
 *
 *   const { ctx, error } = await requireReportingAccess();
 *   if (error) return error;
 *   // use ctx.accountKeys to scope DB queries; null = unrestricted
 *
 * Roles:
 *   - developer / super_admin → `accountKeys: null` (see all accounts)
 *   - admin / client          → `accountKeys: string[]` (scoped)
 *   - admin / client with no assignments → 403
 */
import { NextResponse } from 'next/server';
import { getAuthSession, getAccountScope } from '@/lib/api-auth';
import type { UserRole } from '@/lib/roles';

export interface ReportingContext {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  /** `null` when unrestricted (developer/super_admin); else the keys the caller may query. */
  accountKeys: string[] | null;
}

type GuardResult =
  | { ctx: ReportingContext; error: null }
  | { ctx: null; error: NextResponse };

export async function requireReportingAccess(): Promise<GuardResult> {
  const session = await getAuthSession();
  if (!session?.user) {
    return {
      ctx: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const accountKeys = getAccountScope(session);

  // Scoped role with no account assignments — block rather than
  // silently returning empty data, so the caller sees the real reason.
  if (accountKeys !== null && accountKeys.length === 0) {
    return {
      ctx: null,
      error: NextResponse.json(
        { error: 'No accounts assigned to this user' },
        { status: 403 },
      ),
    };
  }

  return {
    ctx: {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      },
      accountKeys,
    },
    error: null,
  };
}
