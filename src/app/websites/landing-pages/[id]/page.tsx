'use client';

import * as React from 'react';
import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import {
  ArchiveBoxArrowDownIcon,
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClipboardIcon,
  ClockIcon,
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  EllipsisVerticalIcon,
  PencilSquareIcon,
  RectangleStackIcon,
  Squares2X2Icon,
} from '@heroicons/react/24/outline';
import { AdminOnly } from '@/components/route-guard';
import { useSubaccountHref } from '@/hooks/use-subaccount-href';
import { LandingPagePreviewThumbnail } from '@/components/landing-pages/landing-page-preview-thumbnail';
import { LandingPageAnalytics } from '@/components/landing-pages/landing-page-analytics';
import { LandingPageSettings } from '@/components/landing-pages/landing-page-settings';
import { HelpTip } from '@/components/ui/help-tip';
import type { LandingPageDetail } from '@/lib/services/landing-pages';

type DetailTab = 'overview' | 'analytics' | 'settings';
const TABS: { key: DetailTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'overview', label: 'Overview', icon: Squares2X2Icon },
  { key: 'analytics', label: 'Analytics', icon: ChartBarIcon },
  { key: 'settings', label: 'Settings', icon: Cog6ToothIcon },
];

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
};

export default function LandingPageOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const subHref = useSubaccountHref();
  const { data, mutate, isLoading } = useSWR<{ page: LandingPageDetail }>(
    `/api/landing-pages/${id}`,
    fetcher,
  );

  // Refetch on mount so a builder ↔ overview round-trip always sees
  // the latest server state (same pattern as the form overview).
  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/landing-pages/${id}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (cancelled || !payload?.page) return;
        const serverAt = new Date(payload.page.updatedAt).getTime();
        const localAt = new Date(data?.page?.updatedAt ?? 0).getTime();
        if (serverAt > localAt) void mutate({ page: payload.page }, { revalidate: false });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const [publishing, setPublishing] = React.useState(false);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);
  const [duplicating, setDuplicating] = React.useState(false);
  const [savingAsTemplate, setSavingAsTemplate] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<DetailTab>('overview');

  const page = data?.page;

  async function togglePublish() {
    if (!page || publishing) return;
    const next = page.status === 'published' ? 'draft' : 'published';
    setPublishing(true);
    try {
      const res = await fetch(`/api/landing-pages/${page.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload.error || 'Could not update status.');
        return;
      }
      await mutate({ page: payload.page }, { revalidate: false });
      toast.success(next === 'published' ? 'Page published.' : 'Page moved to draft.');
    } finally {
      setPublishing(false);
    }
  }

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1400);
    } catch {
      /* clipboard blocked — silent */
    }
  }

  async function duplicate() {
    if (!page || duplicating) return;
    setDuplicating(true);
    try {
      const res = await fetch(`/api/landing-pages/${page.id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload.error || 'Could not duplicate.');
        return;
      }
      // Land the user on the new page's overview so they can rename
      // / customize. The clone service starts the new LP as a draft
      // so the public URL doesn't immediately 200 with a duplicate
      // of an active page.
      toast.success('Duplicated.');
      router.push(subHref(`/websites/landing-pages/${payload.page.id}`));
    } finally {
      setDuplicating(false);
    }
  }

  async function saveAsTemplate() {
    if (!page || savingAsTemplate) return;
    const defaultName = page.name ? `${page.name} template` : 'My template';
    const name = window.prompt(
      'Save this landing page as a reusable template for the account? Give it a name (e.g. "Spring promo").',
      defaultName,
    );
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Template name is required.');
      return;
    }
    setSavingAsTemplate(true);
    try {
      const res = await fetch(`/api/landing-pages/${page.id}/save-as-template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(payload.error || 'Could not save template.');
        return;
      }
      toast.success(`Saved "${trimmed}" as a template.`);
    } finally {
      setSavingAsTemplate(false);
    }
  }

  if (isLoading || !page) {
    return (
      <AdminOnly>
        <div className="text-sm text-[var(--muted-foreground)]">Loading…</div>
      </AdminOnly>
    );
  }

  const published = page.status === 'published';
  const iframeSnippet = `<iframe src="${page.publicUrl}" width="100%" height="800" frameborder="0" style="border:0;width:100%;" loading="lazy" allowfullscreen></iframe>`;

  return (
    <AdminOnly>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={subHref('/websites/landing-pages')}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)] transition-colors flex-shrink-0"
              aria-label="Back to landing pages"
            >
              <ArrowLeftIcon className="w-4 h-4" />
            </Link>
            <RectangleStackIcon className="w-7 h-7 text-[var(--primary)] flex-shrink-0" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold truncate capitalize">
                  {page.name || 'Untitled landing page'}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    published
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-zinc-500/10 text-zinc-300'
                  }`}
                >
                  {published ? (
                    <CheckCircleIcon className="w-3 h-3" />
                  ) : (
                    <DocumentTextIcon className="w-3 h-3" />
                  )}
                  {page.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-[var(--muted-foreground)] truncate font-mono">
                /lp/{page.slug}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {published && (
              <a
                href={`/lp/${page.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 h-10 text-sm rounded-lg border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--muted)] transition-colors"
                title="Open live page in new tab"
              >
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
                Live
              </a>
            )}
            <HeaderActionsMenu
              onDuplicate={() => void duplicate()}
              onSaveAsTemplate={() => void saveAsTemplate()}
              duplicating={duplicating}
              savingAsTemplate={savingAsTemplate}
            />
            <Link
              href={subHref(`/websites/landing-pages/${page.id}/edit`)}
              className="inline-flex items-center gap-1.5 px-3 h-10 text-sm rounded-lg border border-[var(--primary)] bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90"
            >
              <PencilSquareIcon className="w-4 h-4" />
              Edit Page
            </Link>
          </div>
        </div>

        {/* Tab bar — Overview / Analytics / Settings on the left,
            Draft/Publish toggle on the right. Sharing the row keeps
            the publish state visually anchored to the page-level
            actions instead of floating up by the title. */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    active
                      ? 'border-[var(--primary)] text-[var(--foreground)]'
                      : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 pb-1">
            <span className="text-xs text-[var(--muted-foreground)]">
              {published ? 'Published' : 'Draft'}
            </span>
            <PublishSwitch
              active={published}
              updating={publishing}
              onToggle={() => void togglePublish()}
            />
          </div>
        </div>

        {activeTab === 'analytics' ? (
          <LandingPageAnalytics pageId={page.id} />
        ) : activeTab === 'settings' ? (
          <LandingPageSettings
            page={page}
            onUpdated={(next) => void mutate({ page: next }, { revalidate: false })}
          />
        ) : (
          <OverviewBody
            page={page}
            iframeSnippet={iframeSnippet}
            published={published}
            copiedKey={copiedKey}
            onCopy={copy}
          />
        )}
      </div>
    </AdminOnly>
  );
}

// ── Overview tab body ──────────────────────────────────────────────
//
// Lifted out of the page so the tab switch is just a single conditional
// in the parent JSX. State (publishing, copy feedback) still lives in
// the page component — the body takes everything it needs as props.

interface OverviewBodyProps {
  page: LandingPageDetail;
  iframeSnippet: string;
  published: boolean;
  copiedKey: string | null;
  onCopy: (key: string, text: string) => void;
}

function OverviewBody({ page, iframeSnippet, published, copiedKey, onCopy }: OverviewBodyProps) {
  const subHref = useSubaccountHref();
  return (
    <>
      {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard
            label="Status"
            value={published ? 'Published' : 'Draft'}
            Icon={published ? CheckCircleIcon : DocumentTextIcon}
            bgColor={published ? 'bg-emerald-500/15' : 'bg-zinc-500/15'}
            iconColor={published ? 'text-emerald-300' : 'text-zinc-300'}
            sub={page.publishedAt ? `since ${formatDate(page.publishedAt)}` : undefined}
          />
          <StatCard
            label="Last updated"
            value={formatDate(page.updatedAt)}
            Icon={ClockIcon}
            bgColor="bg-violet-500/15"
            iconColor="text-violet-300"
          />
          <StatCard
            label="Public URL"
            value={`/lp/${page.slug}`}
            Icon={ArrowTopRightOnSquareIcon}
            bgColor="bg-amber-500/15"
            iconColor="text-amber-300"
            mono
          />
        </div>

        {/* Body: preview + share */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
          {/* Preview card — clickable; routes into the builder. */}
          <Link
            href={subHref(`/websites/landing-pages/${page.id}/edit`)}
            className="glass-card group rounded-2xl overflow-hidden hover:border-[var(--primary)]/40 transition-colors block"
          >
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">Preview</h3>
                <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">
                  Click to edit
                </span>
              </div>
              <PencilSquareIcon className="w-4 h-4 text-[var(--muted-foreground)] group-hover:text-[var(--primary)]" />
            </div>
            <div className="loomi-lp-preview pointer-events-none">
              <LandingPagePreviewThumbnail template={page.schema} height={520} />
            </div>
          </Link>

          {/* Share / embed section */}
          <section className="glass-card rounded-2xl p-4 h-fit space-y-5">
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold">Share</h3>
                <HelpTip title="Sharing this landing page">
                  <p>
                    A published landing page lives at a stable URL — share it
                    anywhere a link works (email, SMS, socials, etc.).
                  </p>
                  <p>
                    To embed the page <em>inside</em> another site (e.g. a
                    WordPress page), copy the iframe snippet below and paste
                    it into an HTML / embed block.
                  </p>
                  <p>
                    The page must be <strong>Published</strong> for visitors
                    to load it.
                  </p>
                </HelpTip>
              </div>
              <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                Direct link.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <a
                  href={`/lp/${page.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 truncate text-xs font-mono text-[var(--primary)] hover:underline"
                >
                  {page.publicUrl}
                </a>
                <button
                  type="button"
                  onClick={() => onCopy('url', page.publicUrl)}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                  aria-label="Copy URL"
                >
                  {copiedKey === 'url' ? (
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ClipboardIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <CustomDomainLinks
              page={page}
              copiedKey={copiedKey}
              onCopy={onCopy}
            />

            <div className="border-t border-[var(--border)] pt-4">
              <h4 className="text-xs font-semibold mb-1">Embed (iframe)</h4>
              <p className="text-[11px] text-[var(--muted-foreground)] mb-2">
                Use when you want the page to render inside another site.
              </p>
              <div className="relative">
                <textarea
                  readOnly
                  value={iframeSnippet}
                  rows={3}
                  onFocus={(e) => e.currentTarget.select()}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 pr-12 font-mono text-[11px] text-[var(--muted-foreground)] resize-none"
                />
                <button
                  type="button"
                  onClick={() => onCopy('iframe', iframeSnippet)}
                  className="absolute top-2 right-2 inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                  aria-label="Copy iframe"
                >
                  {copiedKey === 'iframe' ? (
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <ClipboardIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </section>
        </div>
    </>
  );
}

// ── Helpers ─────────────────────────────────────────────────────

function formatDate(input: string | Date): string {
  if (!input) return '—';
  const d = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Three-dot menu sitting to the left of "Edit Page" on the overview
 * header. Hosts secondary actions (Duplicate, Save as template) that
 * used to live as standalone buttons. Same kebab pattern as the LP
 * list view, just hand-rolled here since this is a one-off site.
 */
function HeaderActionsMenu({
  onDuplicate,
  onSaveAsTemplate,
  duplicating,
  savingAsTemplate,
}: {
  onDuplicate: () => void;
  onSaveAsTemplate: () => void;
  duplicating: boolean;
  savingAsTemplate: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="More actions"
        className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)] hover:bg-[var(--muted)] transition-colors"
      >
        <EllipsisVerticalIcon className="w-4 h-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-30 w-52 glass-dropdown shadow-lg p-1"
        >
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onDuplicate();
            }}
            disabled={duplicating}
            className="w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-md text-[var(--foreground)] hover:bg-[var(--muted)] disabled:opacity-50"
          >
            <DocumentDuplicateIcon className="w-3.5 h-3.5" />
            {duplicating ? 'Duplicating…' : 'Duplicate'}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onSaveAsTemplate();
            }}
            disabled={savingAsTemplate}
            className="w-full flex items-center gap-2 px-2.5 py-2 text-xs rounded-md text-[var(--foreground)] hover:bg-[var(--muted)] disabled:opacity-50"
          >
            <ArchiveBoxArrowDownIcon className="w-3.5 h-3.5" />
            {savingAsTemplate ? 'Saving…' : 'Save as template'}
          </button>
        </div>
      )}
    </div>
  );
}

function PublishSwitch({
  active,
  updating,
  onToggle,
}: {
  active: boolean;
  updating: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={updating}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
        active ? 'bg-emerald-500' : 'bg-[var(--muted)] border border-[var(--border)]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          active ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function StatCard({
  label,
  value,
  Icon,
  bgColor,
  iconColor,
  sub,
  mono,
}: {
  label: string;
  value: string;
  Icon: React.ComponentType<{ className?: string }>;
  bgColor: string;
  iconColor: string;
  sub?: string;
  mono?: boolean;
}) {
  return (
    <div className="glass-card rounded-2xl p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
          {label}
        </div>
        <div
          className={`mt-0.5 text-base font-semibold ${mono ? 'font-mono text-sm' : ''} truncate`}
        >
          {value}
        </div>
        {sub ? (
          <div className="mt-0.5 text-[11px] text-[var(--muted-foreground)] truncate">
            {sub}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Custom-domain URL list ─────────────────────────────────────────
//
// Lists every verified AccountDomain for this LP's account in the
// Share section. Each verified domain yields one URL — either the
// root path (if the domain has this LP set as its `homeLandingPageId`)
// or the slug path. Falls back to nothing when the account has no
// verified domains, so the section disappears for accounts that
// haven't set custom domains up.

interface AccountDomainSummary {
  id: string;
  hostname: string;
  verifiedAt: string | null;
  homeLandingPageId: string | null;
}

function CustomDomainLinks({
  page,
  copiedKey,
  onCopy,
}: {
  page: LandingPageDetail;
  copiedKey: string | null;
  onCopy: (key: string, text: string) => void;
}) {
  const { data } = useSWR<{ domains: AccountDomainSummary[] }>(
    `/api/account-domains?accountKey=${encodeURIComponent(page.accountKey)}`,
    fetcher,
  );
  const verified = (data?.domains ?? []).filter((d) => d.verifiedAt);
  if (verified.length === 0) return null;

  return (
    <div className="border-t border-[var(--border)] pt-4">
      <h4 className="text-xs font-semibold mb-1">Custom domain</h4>
      <p className="text-[11px] text-[var(--muted-foreground)] mb-2">
        This page is also reachable at:
      </p>
      <ul className="space-y-1.5">
        {verified.map((d) => {
          const isHome = d.homeLandingPageId === page.id;
          const url = `https://${d.hostname}${isHome ? '/' : `/${page.slug}`}`;
          const copyKey = `customDomain:${d.id}`;
          return (
            <li key={d.id} className="flex items-center gap-2">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate text-xs font-mono text-[var(--primary)] hover:underline"
              >
                {url}
              </a>
              {isHome && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-500/15 text-emerald-300 uppercase tracking-wider">
                  Home
                </span>
              )}
              <button
                type="button"
                onClick={() => onCopy(copyKey, url)}
                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                aria-label="Copy URL"
              >
                {copiedKey === copyKey ? (
                  <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ClipboardIcon className="w-4 h-4" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
