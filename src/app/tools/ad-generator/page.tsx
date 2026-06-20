'use client';

/**
 * Ad Generator — pick a template, fill a guided form, see a live preview, and
 * download rendered PNGs per size. The preview uses the same pure template
 * function the server renders with, so what you see is what you get.
 *
 * Reimagined replacement for the legacy Oz offer builder. Phase 1: code-defined
 * templates + on-demand render/download. Next: save creatives (a Campaign
 * channel), AI copy, and EVOX vehicle imagery.
 */

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ArrowDownTrayIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { AD_TEMPLATES } from '@/lib/ad-generator/templates';
import type { AdData, FieldSpec } from '@/lib/ad-generator/types';

const PREVIEW_W = 460;
const PREVIEW_H = 560;

export default function AdGeneratorPage() {
  const [templateId, setTemplateId] = useState(AD_TEMPLATES[0].id);
  const template = useMemo(() => AD_TEMPLATES.find((t) => t.id === templateId)!, [templateId]);

  const [data, setData] = useState<AdData>(() => ({ ...AD_TEMPLATES[0].defaults }));
  const [sizeId, setSizeId] = useState(AD_TEMPLATES[0].sizes[0].id);
  const [busy, setBusy] = useState<string | null>(null);

  const size = useMemo(() => template.sizes.find((s) => s.id === sizeId) ?? template.sizes[0], [template, sizeId]);
  const previewHtml = useMemo(() => template.render({ ...template.defaults, ...data }, size), [template, data, size]);

  const groups = useMemo(() => {
    const m = new Map<string, FieldSpec[]>();
    for (const f of template.fields) {
      const g = f.group || 'General';
      if (!m.has(g)) m.set(g, []);
      m.get(g)!.push(f);
    }
    return [...m.entries()];
  }, [template]);

  function switchTemplate(id: string) {
    const t = AD_TEMPLATES.find((x) => x.id === id)!;
    setTemplateId(id);
    setData({ ...t.defaults });
    setSizeId(t.sizes[0].id);
  }

  const set = (key: string, value: string) => setData((d) => ({ ...d, [key]: value }));

  async function download(targetSizeId: string) {
    setBusy(targetSizeId);
    try {
      const res = await fetch('/api/ad-generator/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: template.id, sizeId: targetSizeId, data }),
      });
      if (!res.ok) {
        const msg = (await res.json().catch(() => null))?.error || `HTTP ${res.status}`;
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${template.id}-${targetSizeId}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(`Couldn't render: ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setBusy(null);
    }
  }

  async function downloadAll() {
    for (const s of template.sizes) {
      // eslint-disable-next-line no-await-in-loop
      await download(s.id);
    }
  }

  const scale = Math.min(PREVIEW_W / size.width, PREVIEW_H / size.height);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
          <SparklesIcon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--foreground)]">Ad Generator</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Generate on-brand ad creative from a template — preview live, export every size.
          </p>
        </div>
      </div>

      {AD_TEMPLATES.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {AD_TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => switchTemplate(t.id)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                t.id === templateId
                  ? 'border-[var(--primary)] bg-[var(--primary)]/5 text-[var(--primary)]'
                  : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Form */}
        <div className="space-y-6">
          {groups.map(([group, fields]) => (
            <section key={group} className="glass-card rounded-2xl border border-[var(--border)] p-5">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{group}</h2>
              <div className="space-y-4">
                {fields.map((f) => (
                  <Field key={f.key} field={f} value={data[f.key] ?? ''} onChange={(v) => set(f.key, v)} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Preview + export */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="glass-card rounded-2xl border border-[var(--border)] p-5">
            <div className="mb-4 flex flex-wrap gap-1.5">
              {template.sizes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSizeId(s.id)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    s.id === sizeId
                      ? 'bg-[var(--primary)] text-white'
                      : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
                  }`}
                >
                  {s.label.split(' ')[0]}
                </button>
              ))}
            </div>

            <div className="flex justify-center rounded-xl bg-[var(--muted)]/40 p-4">
              <div
                className="overflow-hidden rounded-md shadow-lg ring-1 ring-black/5"
                style={{ width: size.width * scale, height: size.height * scale }}
              >
                <iframe
                  title="Ad preview"
                  srcDoc={previewHtml}
                  style={{
                    width: size.width,
                    height: size.height,
                    border: 0,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                  }}
                />
              </div>
            </div>

            <p className="mt-2 text-center text-[11px] text-[var(--muted-foreground)]">
              {size.width}×{size.height}px
            </p>

            <div className="mt-4 space-y-2">
              <button
                onClick={() => download(size.id)}
                disabled={busy !== null}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                {busy === size.id ? 'Rendering…' : `Download ${size.label.split(' ')[0]}`}
              </button>
              <button
                onClick={downloadAll}
                disabled={busy !== null}
                className="w-full rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-medium text-[var(--muted-foreground)] transition-colors hover:border-[var(--primary)] hover:text-[var(--foreground)] disabled:opacity-50"
              >
                {busy ? 'Rendering…' : `Download all ${template.sizes.length} sizes`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ field, value, onChange }: { field: FieldSpec; value: string; onChange: (v: string) => void }) {
  const label = (
    <label className="mb-1 block text-xs font-medium text-[var(--foreground)]">
      {field.label}
      {field.help && <span className="ml-1 font-normal text-[var(--muted-foreground)]">— {field.help}</span>}
    </label>
  );
  const inputClass =
    'w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)]';

  if (field.type === 'textarea') {
    return (
      <div>
        {label}
        <textarea rows={3} value={value} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} className={inputClass} />
      </div>
    );
  }
  if (field.type === 'select') {
    return (
      <div>
        {label}
        <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
  if (field.type === 'color') {
    return (
      <div>
        {label}
        <div className="flex items-center gap-2">
          <input type="color" value={value || '#4f46e5'} onChange={(e) => onChange(e.target.value)} className="h-9 w-12 cursor-pointer rounded border border-[var(--border)] bg-transparent" />
          <input type="text" value={value} placeholder="#4f46e5" onChange={(e) => onChange(e.target.value)} className={inputClass} />
        </div>
      </div>
    );
  }
  return (
    <div>
      {label}
      <input
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}
