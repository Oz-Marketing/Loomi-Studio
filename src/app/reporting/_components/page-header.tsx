/**
 * Standard reporting page header — icon + title + optional subtitle. Mirrors
 * the studio page-header pattern (e.g. FormsPageHeader) so the reporting
 * surface matches studio: sticky header bar, primary-tinted icon beside a bold
 * h2 title, muted subtitle underneath.
 */
import type { ComponentType, SVGProps } from 'react';

export function ReportingPageHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="page-sticky-header mb-6">
      <div className="flex flex-wrap items-center gap-3">
        {Icon && <Icon className="h-7 w-7 text-[var(--primary)]" />}
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          {subtitle && <p className="mt-1 text-[var(--muted-foreground)]">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
