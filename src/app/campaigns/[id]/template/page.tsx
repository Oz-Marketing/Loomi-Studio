'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TemplateStepPage({ params }: PageProps) {
  const { id } = use(params);
  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <div className="mb-6">
        <Link
          href={`/campaigns/${encodeURIComponent(id)}/recipients`}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          Back to Recipients
        </Link>
        <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mt-4 mb-1">
          Step 2 of 4 — Template
        </p>
        <h1 className="text-2xl font-bold">Choose a template</h1>
      </div>

      <div className="glass-section-card rounded-2xl p-10 border border-dashed border-[var(--border)] text-center">
        <DocumentTextIcon className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-3 opacity-50" />
        <h2 className="text-base font-semibold">Template picker coming next commit</h2>
        <p className="text-sm text-[var(--muted-foreground)] mt-1.5 max-w-md mx-auto">
          Search + sort + grid/list view of saved templates, plus a preview modal and
          a &quot;Create new&quot; CTA. Mirrors Klaviyo&apos;s template selection.
        </p>
        <p className="text-xs text-[var(--muted-foreground)] mt-4">
          Draft ID: <code className="text-[10px]">{id}</code>
        </p>
      </div>
    </div>
  );
}
