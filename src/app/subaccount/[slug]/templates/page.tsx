import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function SubaccountTemplatesRedirect({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/subaccount/${slug}/email/templates`);
}
