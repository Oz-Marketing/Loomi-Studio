'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ClipboardIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useFormDetail } from '@/components/forms/form-detail-context';

interface ContactListOption {
  id: string;
  name: string;
  accountKey: string;
  memberCount?: number;
}

function publicHost(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'https://studio.loomilm.com').replace(/\/+$/, '');
}

export function FormSettingsForm() {
  const router = useRouter();
  const { form, setForm } = useFormDetail();
  const [draft, setDraft] = React.useState({
    name: form.name,
    slug: form.slug,
    status: form.status,
    redirectUrl: form.redirectUrl,
    successMessage: form.successMessage,
    listId: form.listId,
  });
  const [lists, setLists] = React.useState<ContactListOption[]>([]);
  const [saving, setSaving] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    setDraft({
      name: form.name,
      slug: form.slug,
      status: form.status,
      redirectUrl: form.redirectUrl,
      successMessage: form.successMessage,
      listId: form.listId,
    });
  }, [form]);

  React.useEffect(() => {
    fetch('/api/contacts/lists')
      .then((res) => (res.ok ? res.json() : { lists: [] }))
      .then((payload) => {
        const rows = Array.isArray(payload?.lists) ? payload.lists : [];
        setLists(rows.filter((row: ContactListOption) => row.accountKey === form.accountKey));
      })
      .catch(() => setLists([]));
  }, [form.accountKey]);

  async function patch(key: string, value: unknown) {
    setSaving(key);
    const res = await fetch(`/api/forms/${form.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    });
    const payload = await res.json().catch(() => ({}));
    setSaving(null);
    if (!res.ok) {
      toast.error(payload.error || 'Update failed');
      setDraft({
        name: form.name,
        slug: form.slug,
        status: form.status,
        redirectUrl: form.redirectUrl,
        successMessage: form.successMessage,
        listId: form.listId,
      });
      return;
    }
    setForm(payload.form);
    if (key === 'slug' && payload.form.slug !== value) {
      toast.success(`Slug adjusted to ${payload.form.slug} to keep it unique.`);
    } else {
      toast.success('Form settings saved.');
    }
  }

  async function copySnippet() {
    await navigator.clipboard.writeText(form.embedSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  async function deleteCurrentForm() {
    const ok = window.confirm(
      `Delete "${form.name || 'Untitled form'}"? This permanently removes the form and its submissions.`,
    );
    if (!ok) return;
    const res = await fetch(`/api/forms/${form.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      toast.error(payload.error || 'Delete failed');
      return;
    }
    toast.success('Form deleted.');
    router.push('/websites/forms');
  }

  const previewUrl = `${publicHost()}/f/${draft.slug || form.slug}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <section className="glass-card rounded-2xl p-5">
            <h2 className="text-lg font-semibold">Basics</h2>
            <div className="mt-4 grid gap-4">
              <label className="block">
                <span className="text-sm font-medium">Name</span>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  onBlur={() => {
                    if (draft.name.trim() && draft.name !== form.name) void patch('name', draft.name);
                  }}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium">Slug</span>
                <input
                  value={draft.slug}
                  onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                  onBlur={() => {
                    if (draft.slug.trim() && draft.slug !== form.slug) void patch('slug', draft.slug);
                  }}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
                />
                <span className="mt-1 block text-xs text-[var(--muted-foreground)]">
                  Live preview: {previewUrl}
                </span>
              </label>

              <label className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-3">
                <span>
                  <span className="block text-sm font-medium">Status</span>
                  <span className="block text-xs text-[var(--muted-foreground)]">
                    Draft forms will return 404 on the public URL.
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={draft.status === 'published'}
                  onClick={() => {
                    const status = draft.status === 'published' ? 'draft' : 'published';
                    setDraft((d) => ({ ...d, status }));
                    void patch('status', status);
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    draft.status === 'published'
                      ? 'bg-green-500'
                      : 'bg-[var(--muted)] border border-[var(--border)]'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      draft.status === 'published' ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
            </div>
          </section>

          <section className="glass-card rounded-2xl p-5">
            <h2 className="text-lg font-semibold">Submission Behavior</h2>
            <div className="mt-4 grid gap-4">
              <label className="block">
                <span className="text-sm font-medium">Redirect URL</span>
                <input
                  value={draft.redirectUrl}
                  onChange={(e) => setDraft((d) => ({ ...d, redirectUrl: e.target.value }))}
                  onBlur={() => {
                    if (draft.redirectUrl !== form.redirectUrl) void patch('redirectUrl', draft.redirectUrl);
                  }}
                  placeholder="https://example.com/thank-you"
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium">Success message</span>
                <textarea
                  value={draft.successMessage}
                  onChange={(e) => setDraft((d) => ({ ...d, successMessage: e.target.value }))}
                  onBlur={() => {
                    if (draft.successMessage !== form.successMessage) {
                      void patch('successMessage', draft.successMessage);
                    }
                  }}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium">Attach to list</span>
                <select
                  value={draft.listId}
                  onChange={(e) => {
                    const listId = e.target.value;
                    setDraft((d) => ({ ...d, listId }));
                    void patch('listId', listId || null);
                  }}
                  className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
                >
                  <option value="">None</option>
                  {lists.map((list) => (
                    <option key={list.id} value={list.id}>
                      {list.name}
                      {typeof list.memberCount === 'number' ? ` (${list.memberCount})` : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Embed</h2>
              <button
                type="button"
                onClick={copySnippet}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs hover:border-[var(--primary)]"
              >
                <ClipboardIcon className="w-3.5 h-3.5" />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <textarea
              readOnly
              value={form.embedSnippet}
              rows={7}
              className="mt-3 w-full rounded-lg border border-[var(--border)] bg-[var(--input)] px-3 py-2 font-mono text-xs text-[var(--muted-foreground)]"
            />
          </section>

          <section className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5">
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="mt-0.5 w-5 h-5 text-rose-400" />
              <div>
                <h2 className="font-semibold text-rose-300">Danger zone</h2>
                <p className="mt-1 text-xs text-rose-200/80">
                  Deleting a form also deletes its stored submissions.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={deleteCurrentForm}
              className="mt-4 w-full rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 hover:bg-rose-500/20"
            >
              Delete form
            </button>
          </section>

          {saving && (
            <p className="text-center text-xs text-[var(--muted-foreground)]">
              Saving {saving}...
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
