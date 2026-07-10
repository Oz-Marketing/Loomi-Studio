'use client';

import { useSession } from 'next-auth/react';
import { DevImpersonate } from '@/components/dev-impersonate';

/**
 * Inline impersonation escape for the client view (minimal chrome — no top
 * utility bar / profile menu to exit from). Renders ONLY while actually
 * impersonating: because starting impersonation is developer-gated, a set
 * `originalUserId` proves a developer is behind the session, so a real client
 * never sees this. A developer who "views as" a client gets the amber
 * "Viewing as… ✕" control here to switch back.
 */
export function ImpersonationEscape() {
  const { data: session } = useSession();
  if (!session?.user?.originalUserId) return null;
  return (
    <div className="w-64 flex-shrink-0">
      <DevImpersonate bare />
    </div>
  );
}
