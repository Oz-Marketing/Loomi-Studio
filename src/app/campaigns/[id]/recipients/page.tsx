'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, UsersIcon } from '@heroicons/react/24/outline';
import { toast } from '@/lib/toast';

interface CampaignDraft {
  id: string;
  name: string;
  status: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function RecipientsStepPage({ params }: PageProps) {
  const { id } = use(params);
  const [campaign, setCampaign] = useState<CampaignDraft | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/campaigns/email?limit=50`)
      .then((r) => (r.ok ? r.json() : { campaigns: [] }))
      .then((data: { campaigns?: CampaignDraft[] }) => {
        if (cancelled) return;
        const found = (data.campaigns || []).find((c) => c.id === id) || null;
        setCampaign(found);
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load campaign draft');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <div className="mb-6">
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          Back to Campaigns
        </Link>
        <h1 className="text-2xl font-bold mt-3">
          {loading ? 'Loading campaign…' : campaign?.name || 'Campaign'}
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Step 1 of 4 — Recipients
        </p>
      </div>

      <div className="glass-section-card rounded-2xl p-10 border border-dashed border-[var(--border)] text-center">
        <UsersIcon className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-3 opacity-50" />
        <h2 className="text-base font-semibold">Recipients picker coming next commit</h2>
        <p className="text-sm text-[var(--muted-foreground)] mt-1.5 max-w-md mx-auto">
          You&apos;ll pick a List, Segment, or Smart List here. Selection persists to this
          campaign draft and feeds the audience for the send.
        </p>
        <p className="text-xs text-[var(--muted-foreground)] mt-4">
          Draft ID: <code className="text-[10px]">{id}</code>
        </p>
      </div>
    </div>
  );
}
