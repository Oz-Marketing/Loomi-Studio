import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { listEmailCampaigns, type EmailCampaignSummary } from '@/lib/services/email-campaigns';
import { listSmsCampaigns, type SmsCampaignSummary } from '@/lib/services/sms-campaigns';

/**
 * GET /api/campaigns/loomi/list?accountKey=<key>
 *
 * Returns every Loomi-native campaign (EmailCampaign + SmsCampaign) for
 * the given account, mapped into the same Campaign shape the campaigns
 * list page already renders. Drafts are included on purpose — without
 * this, the user has no way to resume them from the campaigns list.
 *
 * If accountKey is omitted, returns campaigns across every account the
 * caller can see (used by the admin-level Campaigns page).
 */
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const accountKey = req.nextUrl.searchParams.get('accountKey');
  const role = session!.user.role;
  const userAccountKeys: string[] = session!.user.accountKeys ?? [];

  // Role-based access check on the requested accountKey, then defer the
  // actual filtering to JS so we can include orphan campaigns (empty
  // accountKeys) alongside scoped ones. Campaigns created from the
  // admin-level Campaigns page have no accountKey by default, and users
  // expect to see those when they drill into any sub-account.
  if (accountKey) {
    if (role === 'client' && !userAccountKeys.includes(accountKey)) {
      return NextResponse.json({ campaigns: [] });
    }
    if (role === 'admin' && userAccountKeys.length > 0 && !userAccountKeys.includes(accountKey)) {
      return NextResponse.json({ campaigns: [] });
    }
  }

  // Scope at the service layer to the user's visible accounts (when
  // applicable), but DON'T filter to a single account here — we want
  // orphans through too.
  let visibilityScope: string[] | undefined;
  if (role === 'client' || (role === 'admin' && userAccountKeys.length > 0)) {
    visibilityScope = userAccountKeys;
  }

  const [emails, sms] = await Promise.all([
    listEmailCampaigns({ limit: 500, accountKeys: visibilityScope }),
    listSmsCampaigns({ limit: 500, accountKeys: visibilityScope }),
  ]);

  function matchesAccount(accountKeys: string[]): boolean {
    if (!accountKey) return true;
    if (accountKeys.length === 0) return true; // orphan — show in every subaccount view
    return accountKeys.includes(accountKey);
  }

  const campaigns = [
    ...emails.filter((c) => matchesAccount(c.accountKeys)).map((c) => mapEmail(c)),
    ...sms.filter((c) => matchesAccount(c.accountKeys)).map((c) => mapSms(c)),
  ];

  // Newest first (createdAt desc). Drafts and scheduled mix in by time.
  campaigns.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  return NextResponse.json({ campaigns });
}

function mapEmail(c: EmailCampaignSummary) {
  return {
    id: c.id,
    campaignId: c.id,
    name: c.name || '(Untitled email campaign)',
    status: c.status,
    provider: 'loomi-email',
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    scheduledAt: c.scheduledFor || undefined,
    sentAt: c.completedAt || undefined,
    sentCount: c.sentCount,
    accountKey: c.accountKeys[0] || undefined,
    totalRecipients: c.totalRecipients,
    failedCount: c.failedCount,
    channel: 'email' as const,
  };
}

function mapSms(c: SmsCampaignSummary) {
  return {
    id: c.id,
    campaignId: c.id,
    name: c.name || '(Untitled SMS campaign)',
    status: c.status,
    provider: 'loomi-sms',
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    scheduledAt: c.scheduledFor || undefined,
    sentAt: c.completedAt || undefined,
    sentCount: c.sentCount,
    accountKey: c.accountKeys[0] || undefined,
    totalRecipients: c.totalRecipients,
    failedCount: c.failedCount,
    channel: 'sms' as const,
  };
}
