'use client';

import Link from 'next/link';
import { PlusIcon } from '@heroicons/react/24/outline';
import type { ProjectOptions } from './use-project-options';

/** Shared account/team filter row used by the board, table, and calendar. */
export function ProjectsFilterBar({
  options,
  accountKey,
  teamKey,
  onAccountKey,
  onTeamKey,
  title,
  subtitle,
}: {
  options: ProjectOptions | undefined;
  accountKey: string;
  teamKey: string;
  onAccountKey: (v: string) => void;
  onTeamKey: (v: string) => void;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 py-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--foreground)]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--muted-foreground)]">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={accountKey}
          onChange={(e) => onAccountKey(e.target.value)}
          className="loomi-input !w-auto !py-1.5 text-xs"
          aria-label="Filter by account"
        >
          <option value="">All accounts</option>
          {options?.accounts.map((a) => (
            <option key={a.key} value={a.key}>
              {a.dealer}
            </option>
          ))}
        </select>
        <select
          value={teamKey}
          onChange={(e) => onTeamKey(e.target.value)}
          className="loomi-input !w-auto !py-1.5 text-xs"
          aria-label="Filter by team"
        >
          <option value="">All teams</option>
          {options?.teams.map((t) => (
            <option key={t.key} value={t.key}>
              {t.name}
            </option>
          ))}
        </select>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-3 py-2 text-xs font-medium text-white shadow-[0_2px_8px_rgba(59,130,246,0.3)] transition hover:opacity-90"
        >
          <PlusIcon className="h-4 w-4" />
          New ticket
        </Link>
      </div>
    </div>
  );
}
