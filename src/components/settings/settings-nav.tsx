'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { SidebarTooltip } from '@/components/sidebar-collapsed-ui';
import { useSettingsTabs } from '@/components/settings/use-settings-tabs';

/** True when the path is a Settings route (admin `/settings` or sub-account `/…/settings`). */
export function isSettingsPath(pathname: string): boolean {
  return pathname === '/settings' || /\/settings(\/|$)/.test(pathname);
}

/**
 * Settings-mode sidebar nav: a "Back to {surface}" button + the settings tabs
 * as links. Replaces the normal nav while on a /settings route, so the settings
 * tabs ARE the main nav and the content spans full width.
 */
export function SettingsNav({
  backHref,
  backLabel,
  collapsed = false,
}: {
  backHref: string;
  backLabel: string;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const tabs = useSettingsTabs();

  // Settings base path (handles admin `/settings` + sub-account `/…/settings`),
  // so tab links + active state work on either.
  const idx = pathname.indexOf('/settings');
  const base = idx >= 0 ? pathname.slice(0, idx + '/settings'.length) : '/settings';
  const activeKey = pathname.slice(base.length).split('/').filter(Boolean)[0];

  const backBtn = (
    <Link
      href={backHref}
      className={`mb-1 flex items-center ${collapsed ? 'justify-center px-2' : 'gap-2 px-3'} rounded-xl py-2 text-sm font-medium text-[var(--sidebar-muted-foreground)] transition hover:bg-[var(--sidebar-muted)] hover:text-[var(--sidebar-foreground)]`}
    >
      <ArrowLeftIcon className="h-5 w-5 flex-shrink-0" />
      {!collapsed && backLabel}
    </Link>
  );

  return (
    <div className="space-y-px">
      {collapsed ? <SidebarTooltip label={backLabel}>{backBtn}</SidebarTooltip> : backBtn}
      {!collapsed && (
        <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--sidebar-muted-foreground)]">
          Settings
        </p>
      )}
      {tabs.map((t) => {
        const active = activeKey === t.key;
        const link = (
          <Link
            key={t.key}
            href={`${base}/${t.key}`}
            className={`flex items-center ${collapsed ? 'justify-center px-2' : 'gap-3 px-3'} rounded-xl py-2 text-sm font-normal transition-all duration-200 ${
              active
                ? 'bg-[var(--primary)]/10 text-[var(--primary)] font-medium'
                : 'text-[var(--sidebar-muted-foreground)] hover:bg-[var(--sidebar-muted)] hover:text-[var(--sidebar-foreground)]'
            }`}
          >
            <t.icon className="h-5 w-5 flex-shrink-0" />
            {!collapsed && t.label}
          </Link>
        );
        return collapsed ? (
          <SidebarTooltip key={t.key} label={t.label}>
            {link}
          </SidebarTooltip>
        ) : (
          link
        );
      })}
    </div>
  );
}
