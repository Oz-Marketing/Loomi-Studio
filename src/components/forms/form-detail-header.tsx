'use client';

import { useFormDetail } from '@/components/forms/form-detail-context';

export function FormDetailHeader() {
  const { form } = useFormDetail();

  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--card)]/80 px-4 py-3">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-semibold">{form.name || 'Untitled form'}</h1>
        <p className="truncate text-xs text-[var(--muted-foreground)]">/f/{form.slug}</p>
      </div>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
          form.status === 'published'
            ? 'bg-green-500/10 text-green-400'
            : 'bg-zinc-500/10 text-zinc-400'
        }`}
      >
        {form.status}
      </span>
    </div>
  );
}
