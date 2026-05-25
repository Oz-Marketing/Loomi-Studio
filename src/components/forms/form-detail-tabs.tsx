'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Cog6ToothIcon,
  InboxStackIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { useSubaccountHref } from '@/hooks/use-subaccount-href';

const TABS = [
  { key: 'builder', label: 'Builder', href: '', Icon: PencilSquareIcon },
  { key: 'settings', label: 'Settings', href: '/settings', Icon: Cog6ToothIcon },
  { key: 'submissions', label: 'Submissions', href: '/submissions', Icon: InboxStackIcon },
] as const;

export function FormDetailTabs({ formId }: { formId: string }) {
  const pathname = usePathname();
  const subHref = useSubaccountHref();
  const base = subHref(`/websites/forms/${formId}`);

  return (
    <div className="flex items-center gap-1 border-b border-[var(--border)] bg-[var(--card)]/80 px-4">
      {TABS.map((tab) => {
        const href = `${base}${tab.href}`;
        const active = tab.href ? pathname === href : pathname === base;
        return (
          <Link
            key={tab.key}
            href={href}
            className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
              active
                ? 'border-[var(--primary)] text-[var(--foreground)]'
                : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            <tab.Icon className="w-4 h-4" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
