/**
 * GET /api/reporting/me
 *
 * Returns the authenticated user and their reporting scope. Useful as a
 * smoke-test endpoint and as the pattern reference for every future
 * reporting route:
 *
 *   const { ctx, error } = await requireReportingAccess();
 *   if (error) return error;
 *   // ctx.accountKeys → null (unrestricted) | string[] (scope filter)
 */
import { NextResponse } from 'next/server';
import { requireReportingAccess } from '../_lib/guard';

export async function GET() {
  const { ctx, error } = await requireReportingAccess();
  if (error) return error;

  return NextResponse.json({
    user: ctx.user,
    accountKeys: ctx.accountKeys,
    unrestricted: ctx.accountKeys === null,
  });
}
