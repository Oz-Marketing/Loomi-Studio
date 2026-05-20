'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  PhotoIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from '@/lib/toast';
import { useAccount } from '@/contexts/account-context';
import PrimaryButton from '@/components/primary-button';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface DraftCampaign {
  id: string;
  name: string;
  status: string;
  accountKeys: string[];
  message: string;
  metadata: string;
}

interface CampaignMetadata {
  channel: 'SMS' | 'MMS';
  mediaUrls: string[];
  sourceMetadata?: string;
}

function parseMetadata(raw: string): CampaignMetadata {
  const empty: CampaignMetadata = { channel: 'SMS', mediaUrls: [], sourceMetadata: '' };
  if (!raw) return empty;
  try {
    const parsed = JSON.parse(raw) as Partial<CampaignMetadata>;
    return {
      channel: parsed.channel === 'MMS' ? 'MMS' : 'SMS',
      mediaUrls: Array.isArray(parsed.mediaUrls)
        ? parsed.mediaUrls.filter((u): u is string => typeof u === 'string' && u.length > 0)
        : [],
      sourceMetadata: typeof parsed.sourceMetadata === 'string' ? parsed.sourceMetadata : '',
    };
  } catch {
    return empty;
  }
}

function smsSegmentInfo(text: string): { length: number; perSegment: number; segments: number } {
  const length = text.length;
  if (length === 0) return { length: 0, perSegment: 160, segments: 0 };
  // eslint-disable-next-line no-control-regex
  const hasUnicode = /[^ -]/.test(text);
  const perSegment = hasUnicode ? 70 : 160;
  const segments = Math.ceil(length / perSegment);
  return { length, perSegment, segments };
}

export default function SmsMessageStepPage({ params }: PageProps) {
  const router = useRouter();
  const { id } = use(params);
  const { accounts } = useAccount();

  const [draft, setDraft] = useState<DraftCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/campaigns/sms/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Failed to load campaign'))))
      .then((data: { campaign?: DraftCampaign }) => {
        if (cancelled) return;
        if (!data.campaign) {
          toast.error('Campaign not found');
          router.push('/campaigns');
          return;
        }
        setDraft(data.campaign);
        setMessage(data.campaign.message || '');
        const meta = parseMetadata(data.campaign.metadata || '');
        setMediaUrls(meta.mediaUrls);
      })
      .catch((err: Error) => {
        if (!cancelled) toast.error(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function patchDraft(patch: Record<string, unknown>): Promise<DraftCampaign | null> {
    const res = await fetch(`/api/campaigns/sms/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Failed to save');
    return data?.campaign || null;
  }

  function buildMetadata(urls: string[]): string {
    const channel: 'SMS' | 'MMS' = urls.length > 0 ? 'MMS' : 'SMS';
    return JSON.stringify({ channel, mediaUrls: urls, sourceMetadata: '' });
  }

  async function handleMessageBlur() {
    if (!draft || message === draft.message) return;
    try {
      const updated = await patchDraft({ message });
      if (updated) setDraft(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save message');
    }
  }

  async function persistMediaUrls(next: string[]) {
    if (!draft) return;
    try {
      const updated = await patchDraft({ metadata: buildMetadata(next) });
      if (updated) setDraft(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save media');
    }
  }

  const accountKey = draft?.accountKeys[0] || '';
  const account = accountKey ? accounts[accountKey] : null;

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    const toUpload = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (toUpload.length === 0) {
      toast.error('Only image files are supported for MMS.');
      return;
    }
    if (mediaUrls.length + toUpload.length > 10) {
      toast.error('Maximum 10 images per campaign.');
      return;
    }
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of toUpload) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('category', 'ad-creative');
        if (accountKey) fd.append('accountKey', accountKey);
        const res = await fetch('/api/media', { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Upload failed');
        const url = data?.url || data?.asset?.url;
        if (url) uploaded.push(String(url));
      }
      const next = [...mediaUrls, ...uploaded];
      setMediaUrls(next);
      await persistMediaUrls(next);
      toast.success(
        `Added ${uploaded.length} image${uploaded.length === 1 ? '' : 's'}.`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function removeImage(url: string) {
    const next = mediaUrls.filter((u) => u !== url);
    setMediaUrls(next);
    await persistMediaUrls(next);
  }

  async function handleContinue() {
    if (!draft) return;
    if (!message.trim() && mediaUrls.length === 0) {
      toast.error('Add a message or at least one image before continuing.');
      return;
    }
    setSaving(true);
    try {
      if (message !== draft.message) {
        await patchDraft({ message });
      }
      router.push(`/campaigns/sms/${encodeURIComponent(id)}/schedule`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const segInfo = smsSegmentInfo(message);
  const isMms = mediaUrls.length > 0;
  const channelLabel = isMms ? 'MMS' : 'SMS';

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-12 px-6">
        <p className="text-sm text-[var(--muted-foreground)] inline-flex items-center gap-2">
          <ArrowPathIcon className="w-4 h-4 animate-spin" />
          Loading campaign…
        </p>
      </div>
    );
  }

  return (
    <div className="pb-32">
      <div className="max-w-6xl mx-auto py-8 px-6">
        <div className="mb-6">
          <p className="text-xs text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
            Message
          </p>
          <h1 className="text-2xl font-bold">{draft?.name || 'Campaign'}</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1.5">
            Write the text your recipients will see. Add images to send as MMS.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
          {/* Left: composer */}
          <div className="space-y-5">
            <div className="glass-section-card rounded-2xl p-5 border border-[var(--border)]">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                  Message <span className="text-red-400">*</span>
                </label>
                <span className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-0.5 rounded">
                  {channelLabel}
                </span>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onBlur={handleMessageBlur}
                placeholder="Spring service special: 20% off oil changes through May. Reply STOP to opt out."
                rows={6}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-3 text-sm leading-relaxed focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20 resize-y"
              />
              <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--muted-foreground)]">
                <span>
                  {segInfo.length} char{segInfo.length === 1 ? '' : 's'}
                  {' · '}
                  {segInfo.segments} segment{segInfo.segments === 1 ? '' : 's'}
                  {' · '}
                  {segInfo.perSegment === 70 ? 'Unicode (70/seg)' : 'GSM-7 (160/seg)'}
                </span>
                <span className="text-[var(--muted-foreground)]">
                  {Math.max(0, segInfo.perSegment * segInfo.segments - segInfo.length)} left in segment
                </span>
              </div>
            </div>

            {/* Media (MMS) */}
            <div className="glass-section-card rounded-2xl p-5 border border-[var(--border)]">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">
                  Media
                </label>
                <span className="text-[10px] text-[var(--muted-foreground)]">
                  {mediaUrls.length} / 10
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {mediaUrls.map((url) => (
                  <div
                    key={url}
                    className="relative aspect-square rounded-lg overflow-hidden border border-[var(--border)] bg-[var(--muted)] group"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(url)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 hover:bg-black/90 text-white inline-flex items-center justify-center"
                      aria-label="Remove image"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {mediaUrls.length < 10 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="aspect-square rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/60 hover:bg-[var(--primary)]/[0.03] transition-colors flex flex-col items-center justify-center gap-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-50"
                  >
                    {uploading ? (
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    ) : (
                      <PhotoIcon className="w-6 h-6" />
                    )}
                    <span className="text-[10px] font-medium">
                      {uploading ? 'Uploading…' : 'Add image'}
                    </span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)] mt-3">
                JPG, PNG, GIF, or WebP. Up to 25 MB each. MMS carries higher per-message
                cost — typically $0.02–$0.05 vs $0.005 for SMS.
              </p>
            </div>

            <div className="glass-section-card rounded-2xl p-4 border border-[var(--border)]">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                <strong className="text-[var(--foreground)]">Tip:</strong> Marketing SMS in
                the US needs an opt-out mechanism. Including &ldquo;Reply STOP to opt out&rdquo;
                satisfies most carrier rules.
              </p>
            </div>
          </div>

          {/* Right: iPhone-style preview */}
          <div className="lg:sticky lg:top-20">
            <IphonePreview
              dealerName={account?.dealer || 'Your dealership'}
              message={message}
              mediaUrls={mediaUrls}
              isMms={isMms}
            />
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-[var(--card)]/80 backdrop-blur-md border-t border-[var(--border)] z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => router.push(`/campaigns/sms/${encodeURIComponent(id)}/recipients`)}
            className="inline-flex items-center gap-1.5 px-4 h-10 text-sm rounded-lg border border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted-foreground)]"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back
          </button>
          <PrimaryButton
            onClick={handleContinue}
            disabled={saving || (!message.trim() && mediaUrls.length === 0)}
          >
            {saving ? 'Saving…' : 'Continue to Schedule'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────
// iPhone-style preview
// ─────────────────────────────────────────────────────

function IphonePreview({
  dealerName,
  message,
  mediaUrls,
  isMms,
}: {
  dealerName: string;
  message: string;
  mediaUrls: string[];
  isMms: boolean;
}) {
  const initials = dealerName
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  return (
    <div className="mx-auto" style={{ width: 320 }}>
      {/* Phone frame */}
      <div className="relative rounded-[44px] bg-black p-[10px] shadow-2xl">
        <div className="relative rounded-[34px] bg-white overflow-hidden" style={{ height: 600 }}>
          {/* Dynamic island */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[100px] h-[28px] rounded-full bg-black z-20" />

          {/* iOS chrome */}
          <div className="absolute inset-x-0 top-0 z-10 pt-3 pb-2 flex items-center justify-between px-6 text-[11px] font-semibold text-black">
            <span className="tabular-nums">9:41</span>
            <span className="opacity-0">{initials}</span>
            <span className="inline-flex items-center gap-1.5 text-black">
              {/* signal */}
              <span className="inline-flex items-end gap-[1.5px] h-2.5">
                <span className="w-[2px] h-1 bg-black rounded-[0.5px]" />
                <span className="w-[2px] h-1.5 bg-black rounded-[0.5px]" />
                <span className="w-[2px] h-2 bg-black rounded-[0.5px]" />
                <span className="w-[2px] h-2.5 bg-black rounded-[0.5px]" />
              </span>
              {/* wifi */}
              <svg viewBox="0 0 16 12" className="w-3.5 h-3" fill="currentColor" aria-hidden>
                <path d="M8 11.5l1.8-1.8a2.5 2.5 0 00-3.6 0L8 11.5zM3.4 6.9l1.5 1.5a4.4 4.4 0 016.2 0l1.5-1.5a6.5 6.5 0 00-9.2 0zM.5 4l1.5 1.5a8.5 8.5 0 0112 0L15.5 4a10.5 10.5 0 00-15 0z" />
              </svg>
              {/* battery */}
              <span className="inline-flex items-center">
                <span className="w-5 h-2.5 border border-black rounded-[2px] p-[1px]">
                  <span className="block w-full h-full bg-black rounded-[1px]" />
                </span>
                <span className="w-[1.5px] h-1.5 bg-black rounded-r-[0.5px] -ml-[0.5px]" />
              </span>
            </span>
          </div>

          {/* Conversation header */}
          <div className="pt-12 pb-3 px-4 border-b border-gray-200 bg-white">
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white text-base font-semibold flex items-center justify-center">
                {initials || '?'}
              </div>
              <p className="text-[11px] font-medium text-black text-center max-w-[200px] truncate">
                {dealerName}
              </p>
              <p className="text-[9px] text-gray-500 -mt-0.5">
                {isMms ? 'MMS' : 'Text Message'}
              </p>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex flex-col gap-2 px-3 py-4 overflow-auto" style={{ height: 'calc(100% - 168px)' }}>
            {(message.trim() || mediaUrls.length > 0) ? (
              <div className="flex flex-col gap-1 max-w-[80%] self-start">
                {mediaUrls.length > 0 && (
                  <div className={`grid gap-1 ${mediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {mediaUrls.map((url) => (
                      <div
                        key={url}
                        className="rounded-2xl overflow-hidden border border-gray-200 bg-gray-100"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="w-full h-auto object-cover" />
                      </div>
                    ))}
                  </div>
                )}
                {message.trim() && (
                  <div className="bg-[#e5e5ea] text-black text-[13px] leading-snug rounded-2xl px-3 py-2 whitespace-pre-wrap break-words">
                    {message}
                  </div>
                )}
                <span className="text-[9px] text-gray-400 mt-0.5 ml-2">
                  Delivered
                </span>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4 text-gray-400">
                <ChatBubbleLeftRightIcon className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-[11px]">Your message will appear here</p>
              </div>
            )}
          </div>

          {/* Footer: iMessage input */}
          <div className="absolute inset-x-0 bottom-0 bg-white border-t border-gray-200 px-3 py-2.5 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-xs">
              +
            </div>
            <div className="flex-1 h-7 rounded-full border border-gray-300 px-3 flex items-center text-[11px] text-gray-400">
              iMessage
            </div>
            <svg viewBox="0 0 16 16" className="w-5 h-5 text-gray-400" fill="currentColor" aria-hidden>
              <path d="M8 1a2 2 0 00-2 2v4a2 2 0 104 0V3a2 2 0 00-2-2zm-3 6a3 3 0 006 0h1a4 4 0 01-3.5 3.97V13H10v1H6v-1h1.5v-2.03A4 4 0 014 7h1z" />
            </svg>
          </div>

          {/* Home indicator */}
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[100px] h-[4px] rounded-full bg-black/80" />
        </div>
      </div>
    </div>
  );
}
