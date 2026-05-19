'use client';

import { Suspense } from 'react';
import { AdminOnly } from '@/components/route-guard';
import { OttAnalytics } from '../_components/OttAnalytics';

export default function OttAnalyticsPage() {
  return (
    <AdminOnly>
      <Suspense fallback={<div className="text-sm text-[var(--muted-foreground)]">Loading…</div>}>
        <OttAnalytics />
      </Suspense>
    </AdminOnly>
  );
}
