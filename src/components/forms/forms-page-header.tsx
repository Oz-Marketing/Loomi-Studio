'use client';

import { PlusIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { usePathname } from 'next/navigation';
import { useAccount } from '@/contexts/account-context';
import {
  accountKeyToSlug,
  isSubaccountRoute,
  extractSlugFromPath,
} from '@/lib/account-slugs';

export function FormsPageHeader({
  accountKey,
  disabledReason,
}: {
  accountKey: string | null;
  disabledReason?: string;
}) {
  const disabled = !accountKey;
  const pathname = usePathname();
  const { accounts } = useAccount();

  // Where to send the user after the form is created. We mirror the
  // useSubaccountHref logic inline because the value has to land in a
  // hidden form field — the POST action attribute can't read hooks at
  // submit time on its own.
  const urlSlug = isSubaccountRoute(pathname) ? extractSlugFromPath(pathname) : null;
  const contextSlug = accountKey ? accountKeyToSlug(accountKey, accounts) : null;
  const subaccountSlug = urlSlug || contextSlug || '';

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
          {/* Tells the server route to redirect into the sub-account
              URL space after creating the form. Empty string means
              "redirect to the admin-level path". */}
          <input type="hidden" name="subaccountSlug" value={subaccountSlug} />
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
