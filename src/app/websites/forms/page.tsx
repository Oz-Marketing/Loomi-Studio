'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { AdminOnly } from '@/components/route-guard';
import { useAccount } from '@/contexts/account-context';
import { FormsList } from '@/components/forms/forms-list';
import { FormsPageHeader } from '@/components/forms/forms-page-header';
import type { FormSummary } from '@/lib/services/forms';

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
};

export default function FormsPage() {
  const { accountKey, accounts } = useAccount();
  const query = accountKey ? `?accountKey=${encodeURIComponent(accountKey)}` : '';
  const { data, isLoading, error } = useSWR<{
    forms: FormSummary[];
    total: number;
  }>(`/api/forms${query}`, fetcher);

  const accountNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [key, account] of Object.entries(accounts)) {
      map[key] = account.dealer;
    }
    return map;
  }, [accounts]);

  return (
    <AdminOnly>
      <FormsPageHeader
        accountKey={accountKey}
        disabledReason="Select a sub-account before creating a form."
      />
      {error ? (
        <div className="glass-card rounded-2xl p-6 text-sm text-rose-300">
          Forms could not be loaded.
        </div>
      ) : (
        <FormsList
          forms={data?.forms ?? []}
          loading={isLoading}
          accountNames={accountNames}
        />
      )}
    </AdminOnly>
  );
}
