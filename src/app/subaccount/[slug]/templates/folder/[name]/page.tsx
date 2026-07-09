import { redirect } from 'next/navigation';

// See ../../../../templates/folder/[name]/page.tsx for context.
export default async function SubaccountTemplatesFolderRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/subaccount/${slug}/templates`);
}
