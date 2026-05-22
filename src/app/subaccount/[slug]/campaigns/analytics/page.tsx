import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SubaccountCampaignsAnalyticsRedirect({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/subaccount/${slug}/messaging/analytics`);
}
