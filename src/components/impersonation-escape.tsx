'use client';

import { useSession } from 'next-auth/react';
import { DevImpersonate } from '@/components/dev-impersonate';

/**
 * Fixed, self-gating impersonation control for minimal-chrome pages (e.g. the
 * Ad Generator) that don't render the top utility bar / profile menu.
 *
 * Without it, an admin/developer who "views as" a client lands on a page with
 * no menu to exit from — they're stuck as that client with no way back. This
 * floats the existing DevImpersonate control (stop-impersonating banner +, for
 * developers, the user switcher) in the corner. It renders nothing unless the
 * viewer is a developer or is currently impersonating, so regular users and
 * clients never see it.
 */
export function ImpersonationEscape() {
  const { data: session } = useSession();
  const show = session?.user?.role === 'developer' || !!session?.user?.originalUserId;
  if (!show) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[60] w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-[var(--border)] bg-[var(--card-strong)] px-3 pb-2 shadow-xl backdrop-blur-2xl">
      <div className="px-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
        Admin
      </div>
      <DevImpersonate />
    </div>
  );
}
