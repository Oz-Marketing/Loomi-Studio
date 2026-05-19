'use client';

import { AdminOnly } from '@/components/route-guard';
import { OttTracker } from '../_components/OttTracker';

export default function OttTrackerPage() {
  return (
    <AdminOnly>
      <OttTracker />
    </AdminOnly>
  );
}
