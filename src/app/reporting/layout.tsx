import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAuthSession } from '@/lib/api-auth';
import { ReportingUserMenu } from './_components/reporting-user-menu';

export const metadata = {
  title: 'Loomi Reporting',
  description: 'Client-facing reporting for Loomi accounts',
};

export default async function ReportingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAuthSession();
  if (!session?.user) {
    redirect('/login?callbackUrl=/reporting');
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-6">
          <Link href="/reporting" className="text-sm font-semibold tracking-tight">
            Loomi Reporting
          </Link>
          <ReportingUserMenu
            name={session.user.name}
            email={session.user.email}
            avatarUrl={session.user.avatarUrl}
          />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
    </div>
  );
}
