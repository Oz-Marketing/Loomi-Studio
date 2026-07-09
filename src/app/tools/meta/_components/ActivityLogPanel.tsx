'use client';

import { useState, useRef, useMemo } from 'react';
import {
  ChatBubbleOvalLeftIcon,
  CheckIcon,
  DocumentIcon,
  PaperClipIcon,
  PencilSquareIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { UserAvatar } from '@/components/user-avatar';
import { fmtBytes } from '../_lib/helpers';
import { PACER_ACTIVITY_MAX_UPLOAD_BYTES } from '../_lib/constants';
import type { PacerAd, ActivityEntry, DirectoryUser } from '../_lib/types';
import { inputClass } from './primitives';

// ─── Activity Log Panel — sidebar inside the editor modal ──────────────────
export function ActivityAttachmentPreview({ entry }: { entry: ActivityEntry }) {
  if (!entry.attachmentUrl || !entry.attachmentFilename) return null;
  const isImage = !!entry.attachmentMimeType?.startsWith('image/');
  return (
    <div className="mt-2">
      {isImage && (
        <a href={entry.attachmentUrl} target="_blank" rel="noopener noreferrer">
          <img
            src={entry.attachmentUrl}
            alt={entry.attachmentFilename}
            className="max-w-full max-h-48 rounded-md border border-[var(--border)] object-contain bg-[var(--muted)]"
          />
        </a>
      )}
      <a
        href={entry.attachmentUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 inline-flex items-center gap-2 max-w-full text-[11px] text-[var(--foreground)] hover:text-[var(--primary)] transition-colors"
      >
        {isImage ? (
          <PhotoIcon className="w-3.5 h-3.5 flex-shrink-0 text-[var(--primary)]" />
        ) : (
          <DocumentIcon className="w-3.5 h-3.5 flex-shrink-0 text-[var(--primary)]" />
        )}
        <span className="truncate underline underline-offset-2">
          {entry.attachmentFilename}
        </span>
        <span className="text-[10px] text-[var(--muted-foreground)] flex-shrink-0">
          {fmtBytes(entry.attachmentSize)}
        </span>
      </a>
    </div>
  );
}

export function ActivityLogPanel({
  ad,
  users,
  currentUserId,
  onAdd,
  onEdit,
  onDelete,
}: {
  ad: PacerAd;
  users: DirectoryUser[];
  currentUserId: string | null;
  onAdd: (adId: string, text: string, file: File | null) => Promise<void>;
  onEdit: (adId: string, entryId: string, text: string) => Promise<void>;
  onDelete: (adId: string, entryId: string) => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Inline edit: tracks which entry id is in edit mode and the working text.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const userById = useMemo(() => {
    const m = new Map<string, DirectoryUser>();
    users.forEach((u) => m.set(u.id, u));
    return m;
  }, [users]);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    if (!picked) return;
    if (picked.size > PACER_ACTIVITY_MAX_UPLOAD_BYTES) {
      setErrorMsg(
        `File is ${fmtBytes(picked.size)} — exceeds the ${PACER_ACTIVITY_MAX_UPLOAD_BYTES / (1024 * 1024)} MB limit.`,
      );
      // Reset the input so the same file can be retried after picking another
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setFile(picked);
    setErrorMsg(null);
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAdd = async () => {
    const t = text.trim();
    if ((!t && !file) || saving) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      await onAdd(ad.id, t, file);
      setText('');
      clearFile();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to post entry');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (entryId: string, currentText: string) => {
    setEditingId(entryId);
    setEditText(currentText);
    setEditError(null);
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
    setEditError(null);
  };
  const saveEdit = async (entryId: string) => {
    const t = editText.trim();
    if (!t || editSaving) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await onEdit(ad.id, entryId, t);
      cancelEdit();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save edit');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <aside className="flex flex-col h-full border-l border-[var(--border)] bg-[var(--muted)]/30 min-h-0">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ChatBubbleOvalLeftIcon className="w-4 h-4 text-[var(--primary)]" />
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-[var(--foreground)]">
            Updates
          </h3>
        </div>
        <span className="text-[10px] text-[var(--muted-foreground)]">
          {ad.activityLog.length}{' '}
          {ad.activityLog.length === 1 ? 'update' : 'updates'}
        </span>
      </div>

      <div className="themed-scrollbar flex-1 overflow-y-auto p-3 space-y-2">
        {ad.activityLog.length === 0 ? (
          <p className="text-[11px] text-[var(--muted-foreground)] text-center py-6">
            No updates yet. Add a comment, update, or attachment below.
          </p>
        ) : (
          // Chronological order: oldest at top, newest at bottom — same flow
          // as a chat thread. Removed the `.reverse()` that previously put
          // new posts on top.
          ad.activityLog.map((u) => {
            const isMine = !!currentUserId && u.authorUserId === currentUserId;
            const isEditing = editingId === u.id;
            const author = u.authorUserId ? userById.get(u.authorUserId) : null;
            const stamp = new Date(u.createdAt).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            });
            return (
              <div
                key={u.id}
                className={`rounded-lg border px-3 py-2 ${
                  isMine
                    ? 'border-[var(--primary)]/40 bg-[var(--primary)]/12'
                    : 'border-[var(--border)] bg-[var(--card)]'
                }`}
              >
                <div className="flex justify-between items-start mb-1.5 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {author && (
                      <UserAvatar
                        name={author.name}
                        email={author.email}
                        avatarUrl={author.avatarUrl}
                        size={28}
                        className={`w-7 h-7 rounded-full object-cover flex-shrink-0 border ${
                          isMine
                            ? 'border-[var(--primary)]/60'
                            : 'border-[var(--border)]'
                        }`}
                      />
                    )}
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span
                        className={`text-xs font-semibold truncate ${
                          isMine ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'
                        }`}
                      >
                        {author?.name ?? 'Unknown'}
                      </span>
                      <span className="text-[10px] text-[var(--muted-foreground)] truncate">
                        {stamp}
                      </span>
                    </div>
                  </div>
                  {!isEditing && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isMine && u.text && (
                        <button
                          type="button"
                          onClick={() => startEdit(u.id, u.text)}
                          className="text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
                          aria-label="Edit update"
                          title="Edit"
                        >
                          <PencilSquareIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDelete(ad.id, u.id)}
                        className="text-[var(--muted-foreground)] hover:text-red-400 transition-colors"
                        aria-label="Delete entry"
                        title="Delete"
                      >
                        <TrashIcon className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                {isEditing ? (
                  <div className="space-y-1.5">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          saveEdit(u.id);
                        } else if (e.key === 'Escape') {
                          cancelEdit();
                        }
                      }}
                      className={`${inputClass} resize-none leading-relaxed`}
                    />
                    {editError && (
                      <p className="text-[10px] text-red-400">{editError}</p>
                    )}
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={editSaving}
                        className="px-2 py-1 text-[10px] font-medium rounded border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEdit(u.id)}
                        disabled={editSaving || !editText.trim()}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border border-[var(--primary)] bg-[var(--primary)]/90 text-white hover:bg-[var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <CheckIcon className="w-3 h-3" />
                        {editSaving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  u.text && (
                    <p className="m-0 text-xs leading-relaxed text-[var(--foreground)] whitespace-pre-wrap">
                      {u.text}
                    </p>
                  )
                )}
                {!isEditing && <ActivityAttachmentPreview entry={u} />}
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 border-t border-[var(--border)] bg-[var(--card)]">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Leave a comment or log an update…"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd();
          }}
          className={`${inputClass} resize-none leading-relaxed mb-2`}
        />

        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFilePick}
        />

        {file && (
          <div className="mb-2 flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--muted)]">
            <div className="flex items-center gap-2 min-w-0">
              <PaperClipIcon className="w-3.5 h-3.5 text-[var(--primary)] flex-shrink-0" />
              <span className="text-[11px] text-[var(--foreground)] truncate">
                {file.name}
              </span>
              <span className="text-[10px] text-[var(--muted-foreground)] flex-shrink-0">
                {fmtBytes(file.size)}
              </span>
            </div>
            <button
              type="button"
              onClick={clearFile}
              className="text-[var(--muted-foreground)] hover:text-red-400 transition-colors flex-shrink-0"
              aria-label="Remove attachment"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {errorMsg && (
          <p className="mb-2 text-[10px] text-red-400">{errorMsg}</p>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[10px] text-[var(--muted-foreground)]">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
              title={`Attach a file (max ${PACER_ACTIVITY_MAX_UPLOAD_BYTES / (1024 * 1024)} MB)`}
            >
              <PaperClipIcon className="w-3 h-3" />
              Attach
            </button>
            <span>⌘/Ctrl+Enter to post</span>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={saving || (!text.trim() && !file)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-medium hover:bg-[var(--primary)]/20 transition-colors disabled:opacity-50"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Post
          </button>
        </div>
      </div>
    </aside>
  );
}
