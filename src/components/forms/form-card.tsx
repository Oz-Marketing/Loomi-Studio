'use client';

import Link from 'next/link';
import {
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  InboxStackIcon,
} from '@heroicons/react/24/outline';
import type { FormSummary } from '@/lib/services/forms';

function formatRelativeDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  const diffMs = Date.now() - d.getTime();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  if (diffMs < hour) return 'just now';
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  const days = Math.floor(diffMs / day);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function FormCard({
  form,
  accountName,
}: {
  form: FormSummary;
  accountName?: string;
}) {
  const published = form.status === 'published';
  const StatusIcon = published ? CheckCircleIcon : DocumentTextIcon;

  return (
    <Link
      href={`/websites/forms/${form.id}`}
      className="glass-card group block rounded-xl p-4 transition-all hover:border-[var(--primary)]/40 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
            <DocumentTextIcon className="w-5 h-5 text-[var(--primary)]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate" title={form.name}>
              {form.name || 'Untitled form'}
            </h3>
            <p className="mt-1 text-xs text-[var(--muted-foreground)] truncate">
              /f/{form.slug}
            </p>
            {accountName && (
              <p className="mt-1 text-[11px] text-[var(--muted-foreground)] truncate">
                {accountName}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Open-live-form shortcut. Only meaningful when the form is
              published — draft forms 404 on the public route. Stops
              propagation so clicking it doesn't also fire the card link. */}
          {published && (
            <a
              href={`/f/${form.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Open live form"
              aria-label="Open live form in new tab"
              className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--muted)] transition-colors"
            >
              <ArrowTopRightOnSquareIcon className="w-3.5 h-3.5" />
            </a>
          )}
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
              published
                ? 'bg-green-500/10 text-green-400'
                : 'bg-zinc-500/10 text-zinc-400'
            }`}
          >
            <StatusIcon className="w-3 h-3" />
            {form.status}
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg border border-[var(--border)]/70 bg-[var(--muted)]/30 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
            <InboxStackIcon className="w-3.5 h-3.5" />
            Submissions
          </div>
          <div className="mt-1 text-lg font-semibold tabular-nums">
            {form.submissionCount}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--border)]/70 bg-[var(--muted)]/30 px-3 py-2">
          <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
            <ClockIcon className="w-3.5 h-3.5" />
            Updated
          </div>
          <div className="mt-1 text-sm font-semibold">
            {formatRelativeDate(form.updatedAt)}
          </div>
        </div>
      </div>
    </Link>
  );
}
