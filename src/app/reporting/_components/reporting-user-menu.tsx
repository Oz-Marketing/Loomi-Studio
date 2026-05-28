'use client';

import { useEffect, useState } from 'react';
import { signOut } from 'next-auth/react';
import { ArrowTopRightOnSquareIcon, Squares2X2Icon } from '@heroicons/react/24/outline';
import { getOtherSurfaceUrl } from '@/lib/cross-site';

export function ReportingUserMenu({
  name,
  email,
  avatarUrl,
}: {
  name: string;
  email: string;
  avatarUrl: string | null;
}) {
  const [studioUrl, setStudioUrl] = useState<string | null>(null);
  useEffect(() => {
    setStudioUrl(getOtherSurfaceUrl());
  }, []);

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <div className="text-xs font-medium text-[var(--foreground)]">{name}</div>
        <div className="text-[10px] text-[var(--muted-foreground)]">{email}</div>
      </div>
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={name}
          className="h-8 w-8 rounded-full border border-[var(--border)] object-cover"
        />
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--muted)] text-xs font-semibold">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      {studioUrl && (
        <a
          href={studioUrl}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--muted)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] transition hover:border-[var(--primary)]/50 hover:bg-[var(--accent)]"
        >
          <Squares2X2Icon className="h-3.5 w-3.5" />
          Studio
          <ArrowTopRightOnSquareIcon className="h-3 w-3 text-[var(--muted-foreground)]" />
        </a>
      )}
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="rounded-md border border-[var(--border)] bg-[var(--muted)] px-2.5 py-1 text-xs font-medium text-[var(--foreground)] transition hover:border-[var(--primary)]/50 hover:bg-[var(--accent)]"
      >
        Sign out
      </button>
    </div>
  );
}
