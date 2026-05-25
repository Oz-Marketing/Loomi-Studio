import { notFound, redirect } from 'next/navigation';
import { getAccountScope, getAuthSession } from '@/lib/api-auth';
import { getForm } from '@/lib/services/forms';
import { FormDetailHeader } from '@/components/forms/form-detail-header';
import { FormDetailProvider } from '@/components/forms/form-detail-context';
import { FormDetailTabs } from '@/components/forms/form-detail-tabs';

export default async function FormDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const session = await getAuthSession();
  if (!session?.user) redirect('/login');
  if (!['developer', 'super_admin', 'admin'].includes(session.user.role)) notFound();

  const { id } = await params;
  const form = await getForm(id, getAccountScope(session));
  if (!form) notFound();

  return (
    <FormDetailProvider initialForm={form}>
      <div className="min-h-screen overflow-hidden bg-[var(--background)]">
        <FormDetailHeader />
        <FormDetailTabs formId={form.id} />
        {children}
      </div>
    </FormDetailProvider>
  );
}
