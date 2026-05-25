'use client';

import { PlusIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

export function FormsPageHeader({
  accountKey,
  disabledReason,
}: {
  accountKey: string | null;
  disabledReason?: string;
}) {
  const disabled = !accountKey;

  return (
    <div className="page-sticky-header mb-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <DocumentTextIcon className="w-7 h-7 text-[var(--primary)]" />
          <div>
            <h2 className="text-2xl font-bold">Forms</h2>
            <p className="text-[var(--muted-foreground)] mt-1">
              Build embeddable lead-capture forms for the selected account.
            </p>
          </div>
        </div>

        <form action="/websites/forms/new" method="post">
          <input type="hidden" name="accountKey" value={accountKey ?? ''} />
          <input type="hidden" name="name" value="Untitled form" />
          <button
            type="submit"
            disabled={disabled}
            title={disabled ? disabledReason : 'Create a new form'}
            className="flex items-center gap-1.5 px-3 h-10 text-sm rounded-lg border border-[var(--primary)] bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlusIcon className="w-4 h-4" />
            New Form
          </button>
        </form>
      </div>
    </div>
  );
}
