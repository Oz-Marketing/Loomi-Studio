import { getAuthSession } from '@/lib/api-auth';

export default async function ReportingHomePage() {
  const session = await getAuthSession();
  const accountKeys = session?.user.accountKeys ?? [];

  return (
    <div className="flex flex-col gap-8">
      <section className="animate-fade-in-up">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--primary)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
          <span>Reporting</span>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Welcome, {session?.user.name?.split(' ')[0] ?? 'there'}.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted-foreground)] sm:text-base">
          This is the home of your account&apos;s reporting. We&apos;ll wire real
          dashboards in here next.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="glass-card animate-fade-in-up animate-stagger-1 p-6">
          <div className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            Accounts in scope
          </div>
          <div className="mt-2 text-3xl font-semibold">{accountKeys.length}</div>
        </div>
        <div className="glass-card animate-fade-in-up animate-stagger-2 p-6">
          <div className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            Role
          </div>
          <div className="mt-2 text-2xl font-semibold capitalize">
            {session?.user.role ?? '—'}
          </div>
        </div>
        <div className="glass-card animate-fade-in-up animate-stagger-3 p-6">
          <div className="text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
            Status
          </div>
          <div className="mt-2 text-2xl font-semibold">Coming soon</div>
        </div>
      </section>
    </div>
  );
}
