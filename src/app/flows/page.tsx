'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { AdminOnly } from '@/components/route-guard';
import { useAccount } from '@/contexts/account-context';
import {
  FlowsTable,
  type FlowsTableRow,
  type BulkActionContext,
} from '@/components/flows/flows-table';
import type { BulkActionDockItem } from '@/components/bulk-action-dock';
import {
  PlusIcon,
  PlayIcon,
  PauseIcon,
  ArchiveBoxIcon,
} from '@heroicons/react/24/outline';
import { FlowIcon } from '@/components/icon-map';

// Loomi-native flows live behind `/api/flows`. Page mirrors the
// Contacts page chrome: a single sticky header with title + primary
// CTA, then the contacts-style FlowsTable renders directly below.

interface FlowApiRow {
  id: string;
  name: string;
  description: string;
  status: string;
  accountKey: string;
  parentTemplateId: string;
  lastSyncedAt: string;
  publishedAt: string;
  archivedAt: string;
  createdAt: string;
  updatedAt: string;
  nodeCount: number;
  activeEnrollments: number;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
};

// Map the API shape onto the row shape FlowsTable speaks.
function flowsToRows(
  flows: FlowApiRow[],
  accountNames: Record<string, string>,
): FlowsTableRow[] {
  return flows.map((f) => ({
    id: f.id,
    name: f.name,
    status: f.status,
    source: 'loomi',
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
    accountKey: f.accountKey || undefined,
    dealer: f.accountKey ? accountNames[f.accountKey] : undefined,
    parentTemplateId: f.parentTemplateId || undefined,
  }));
}

function FlowsPageHeader({
  title,
  subtitle,
  onCreate,
  creating,
}: {
  title: string;
  subtitle: string;
  onCreate: () => void;
  creating: boolean;
}) {
  return (
    <div className="page-sticky-header mb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <FlowIcon className="w-7 h-7 text-[var(--primary)]" />
          <div>
            <h2 className="text-2xl font-bold">{title}</h2>
            <p className="text-[var(--muted-foreground)] mt-1">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={onCreate}
            disabled={creating}
            className="flex items-center gap-1.5 px-3 h-10 text-sm rounded-lg border border-[var(--primary)] bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 disabled:opacity-60"
          >
            <PlusIcon className="w-4 h-4" />
            {creating ? 'Creating…' : 'Create Flow'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FlowsPageBody({
  scopeKey,
  subtitle,
  presetAccountKey,
  hideInstances = false,
}: {
  scopeKey: string;
  subtitle: string;
  presetAccountKey: string | null;
  /** When true, drop rows that are deployed instances of a template
   *  (those have parentTemplateId set). The instances are still visible
   *  via the Adoption column on their parent template's row + via a
   *  hidden-count hint below the search. Admin view sets this; the
   *  per-account view shows everything. */
  hideInstances?: boolean;
}) {
  const router = useRouter();
  const { accounts } = useAccount();
  const [creating, setCreating] = useState(false);
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);

  const query = presetAccountKey
    ? `?accountKey=${encodeURIComponent(presetAccountKey)}`
    : '';
  const { data, error, mutate, isLoading } = useSWR<{ flows: FlowApiRow[] }>(
    `/api/flows${query}`,
    fetcher,
  );

  const accountNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [key, account] of Object.entries(accounts)) {
      map[key] = account.dealer;
    }
    return map;
  }, [accounts]);

  const accountMeta = useMemo(() => {
    const map: Record<
      string,
      {
        dealer: string;
        logos?: { light?: string; dark?: string; white?: string; black?: string };
        storefrontImage?: string;
        city?: string;
        state?: string;
        category?: string;
      }
    > = {};
    for (const [key, account] of Object.entries(accounts)) {
      map[key] = {
        dealer: account.dealer,
        logos: account.logos,
        city: account.city,
        state: account.state,
        category: account.category,
      };
    }
    return map;
  }, [accounts]);

  const allRows = useMemo(
    () => flowsToRows(data?.flows ?? [], accountNames),
    [data, accountNames],
  );

  // Visible rows = everything when hideInstances=false; otherwise drop
  // deployed instances. The hidden ones still ride along on the
  // template row's Adoption column so the admin doesn't lose access.
  const rows = useMemo(
    () => (hideInstances ? allRows.filter((r) => !r.parentTemplateId) : allRows),
    [allRows, hideInstances],
  );

  // Adoption map computed over the FULL list so the table can render
  // sub-account avatars on a template row even when those instances
  // are filtered out of the visible row set.
  const adoptionMap = useMemo(() => {
    const map = new Map<string, FlowsTableRow[]>();
    for (const r of allRows) {
      if (!r.parentTemplateId) continue;
      const arr = map.get(r.parentTemplateId) ?? [];
      arr.push(r);
      map.set(r.parentTemplateId, arr);
    }
    return map;
  }, [allRows]);

  const hiddenInstanceCount = hideInstances
    ? allRows.length - rows.length
    : 0;

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Untitled flow',
          accountKey: presetAccountKey ?? undefined,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        toast.error(payload.error || 'Failed to create flow');
        return;
      }
      const payload = await res.json();
      router.push(`/flows/${payload.flow.id}`);
    } finally {
      setCreating(false);
    }
  };

  // FlowsTable speaks "active|inactive"; our model is
  // draft|active|paused|archived. We treat "inactive" as pause.
  const handleToggleStatus = async (
    flow: FlowsTableRow,
    nextStatus: 'active' | 'inactive',
  ) => {
    const endpoint =
      nextStatus === 'active'
        ? `/api/flows/${flow.id}/publish`
        : `/api/flows/${flow.id}/pause`;

    setUpdatingIds((ids) => [...ids, flow.id]);
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        if (payload.details && Array.isArray(payload.details)) {
          toast.error(`Cannot publish: ${payload.details.join('; ')}`);
        } else {
          toast.error(payload.error || 'Status update failed');
        }
        return;
      }
      toast.success(
        nextStatus === 'active' ? 'Flow published' : 'Flow paused',
      );
      await mutate();
    } finally {
      setUpdatingIds((ids) => ids.filter((id) => id !== flow.id));
    }
  };

  // ── Bulk-action runner ──
  // Runs the same per-flow endpoint over a selection, sequentially.
  // We don't expose a true bulk endpoint yet, so this fans out
  // individual POST/DELETE calls and aggregates the results into one
  // toast at the end. Failures don't short-circuit — we report
  // succeeded/failed counts so the user can re-try the failures.
  const runBulk = async (
    label: 'publish' | 'pause' | 'archive',
    ids: string[],
    fetchFor: (id: string) => Promise<Response>,
    clearSelection: () => void,
  ) => {
    let succeeded = 0;
    let failed = 0;
    for (const id of ids) {
      try {
        const res = await fetchFor(id);
        if (res.ok) succeeded += 1;
        else failed += 1;
      } catch {
        failed += 1;
      }
    }
    if (failed === 0) {
      toast.success(`${succeeded} ${succeeded === 1 ? 'flow' : 'flows'} ${label}d`);
    } else if (succeeded === 0) {
      toast.error(`Failed to ${label} ${failed} ${failed === 1 ? 'flow' : 'flows'}`);
    } else {
      toast.error(`${succeeded} ${label}d, ${failed} failed`);
    }
    await mutate();
    clearSelection();
  };

  const buildBulkActions = (ctx: BulkActionContext): BulkActionDockItem[] => [
    {
      id: 'publish',
      label: 'Publish',
      icon: <PlayIcon className="w-3.5 h-3.5" />,
      onClick: () =>
        void runBulk('publish', ctx.selectedIds, (id) =>
          fetch(`/api/flows/${id}/publish`, { method: 'POST' }), ctx.clearSelection,
        ),
    },
    {
      id: 'pause',
      label: 'Pause',
      icon: <PauseIcon className="w-3.5 h-3.5" />,
      onClick: () =>
        void runBulk('pause', ctx.selectedIds, (id) =>
          fetch(`/api/flows/${id}/pause`, { method: 'POST' }), ctx.clearSelection,
        ),
    },
    {
      id: 'archive',
      label: 'Archive',
      danger: true,
      icon: <ArchiveBoxIcon className="w-3.5 h-3.5" />,
      onClick: () =>
        void runBulk('archive', ctx.selectedIds, (id) =>
          fetch(`/api/flows/${id}`, { method: 'DELETE' }), ctx.clearSelection,
        ),
    },
  ];

  const emptyState = {
    title: 'No flows yet',
    subtitle: 'Create a flow to start sending automated email drips.',
  };

  if (error) {
    return (
      <div className="text-center py-16 text-[var(--muted-foreground)]">
        <p>Failed to load flows: {error.message}</p>
      </div>
    );
  }

  return (
    <div key={scopeKey}>
      <FlowsPageHeader
        title="Flows"
        subtitle={subtitle}
        onCreate={handleCreate}
        creating={creating}
      />

      {hiddenInstanceCount > 0 && (
        <p className="text-[11px] text-[var(--muted-foreground)] mb-2 px-1">
          Showing templates + standalone flows. {hiddenInstanceCount} deployed{' '}
          {hiddenInstanceCount === 1 ? 'instance is' : 'instances are'} rolled up under{' '}
          {hiddenInstanceCount === 1 ? 'its' : 'their'} template — click the adoption
          avatars to open one.
        </p>
      )}

      <FlowsTable
        workflows={rows}
        loading={isLoading}
        accountMeta={accountMeta}
        showAccountColumn={presetAccountKey === null}
        onToggleStatus={handleToggleStatus}
        updatingStatusFlowIds={updatingIds}
        emptyState={emptyState}
        bulkActions={buildBulkActions}
        adoption={adoptionMap}
      />
    </div>
  );
}

function AdminFlowsPage() {
  return (
    <FlowsPageBody
      scopeKey="admin"
      subtitle="Templates + standalone flows across all accounts"
      presetAccountKey={null}
      hideInstances
    />
  );
}

function AccountFlowsPage() {
  const { accountKey, accountData } = useAccount();
  const dealerName = accountData?.dealer || 'Your Sub-Account';

  return (
    <FlowsPageBody
      scopeKey={accountKey ?? 'no-account'}
      subtitle={`Email drip series for ${dealerName}`}
      presetAccountKey={accountKey}
    />
  );
}

export default function FlowsPage() {
  const { isAdmin, isAccount } = useAccount();

  if (isAdmin) {
    return (
      <AdminOnly>
        <AdminFlowsPage />
      </AdminOnly>
    );
  }

  if (isAccount) {
    return <AccountFlowsPage />;
  }

  return null;
}
