'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useSubaccountHref } from '@/hooks/use-subaccount-href';
import type { AccountSnippetSummary } from '@/lib/services/account-snippets';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
};

const inputClass =
  'w-full px-3 py-2 text-sm bg-transparent text-[var(--foreground)] border border-[var(--border)] rounded-md outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-colors';

const KIND_LABELS: Record<string, string> = {
  header: 'Header',
  footer: 'Footer',
  disclaimer: 'Disclaimer',
  generic: 'Generic',
};

/**
 * Dropdown of the account's reusable snippets — backs the `snippet`
 * block's snippetId prop. Snippets are account-scoped on the server,
 * so the listing only includes ones the user can already access.
 *
 * Empty state links to the Snippets page so users can spin one up
 * without leaving the editor permanently (next time they reopen the
 * picker the new snippet appears in the list).
 */
export function SnippetPickerInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const subHref = useSubaccountHref();
  const { data, isLoading } = useSWR<{ snippets: AccountSnippetSummary[] }>(
    '/api/account-snippets',
    fetcher,
  );
  const snippets = data?.snippets ?? [];

  if (isLoading) {
    return (
      <div className="text-[11px] text-[var(--muted-foreground)] py-2">
        Loading snippets…
      </div>
    );
  }

  if (snippets.length === 0) {
    return (
      <div className="text-[11px] text-[var(--muted-foreground)] py-2 space-y-1.5">
        <p>No reusable blocks saved yet.</p>
        <Link
          href={subHref('/websites/snippets')}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--primary)] hover:underline"
        >
          Create one →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      >
        <option value="">— Pick a reusable block —</option>
        {snippets.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name || 'Untitled'} · {KIND_LABELS[s.kind] ?? s.kind}
          </option>
        ))}
      </select>
      {value && (
        <Link
          href={subHref(`/websites/snippets/${value}/edit`)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-[var(--primary)] hover:underline"
        >
          Edit this snippet →
        </Link>
      )}
    </div>
  );
}
