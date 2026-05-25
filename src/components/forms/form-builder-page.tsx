'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { FormEditorShell } from '@/lib/forms/editor/FormEditorShell';
import type { FormTemplate } from '@/lib/forms/types';
import { useFormDetail } from '@/components/forms/form-detail-context';

const AUTOSAVE_MS = 600;
const HISTORY_LIMIT = 50;

function savedLabel(status: 'idle' | 'saving' | 'saved' | 'error', savedAt: Date | null) {
  if (status === 'saving') return 'Saving...';
  if (status === 'error') return 'Save failed';
  if (status === 'saved' && savedAt) return 'Saved just now';
  return 'Saved';
}

export function FormBuilderPage() {
  const { form, setForm } = useFormDetail();
  const [template, setTemplate] = React.useState<FormTemplate>(form.schema);
  const [past, setPast] = React.useState<FormTemplate[]>([]);
  const [future, setFuture] = React.useState<FormTemplate[]>([]);
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);
  const initialRender = React.useRef(true);

  const patchSchema = React.useCallback(
    async (schema: FormTemplate) => {
      setSaveStatus('saving');
      const res = await fetch(`/api/forms/${form.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveStatus('error');
        toast.error(payload.error || 'Form autosave failed');
        return;
      }
      setForm(payload.form);
      setSaveStatus('saved');
      setSavedAt(new Date());
    },
    [form.id, setForm],
  );

  React.useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
      return;
    }
    const handle = window.setTimeout(() => {
      void patchSchema(template);
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(handle);
  }, [template, patchSchema]);

  const handleChange = React.useCallback((next: FormTemplate) => {
    setPast((items) => [...items.slice(-(HISTORY_LIMIT - 1)), template]);
    setFuture([]);
    setTemplate(next);
  }, [template]);

  const undo = React.useCallback(() => {
    setPast((items) => {
      const previous = items[items.length - 1];
      if (!previous) return items;
      setFuture((futureItems) => [template, ...futureItems].slice(0, HISTORY_LIMIT));
      setTemplate(previous);
      return items.slice(0, -1);
    });
  }, [template]);

  const redo = React.useCallback(() => {
    setFuture((items) => {
      const next = items[0];
      if (!next) return items;
      setPast((pastItems) => [...pastItems.slice(-(HISTORY_LIMIT - 1)), template]);
      setTemplate(next);
      return items.slice(1);
    });
  }, [template]);

  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [redo, undo]);

  return (
    <div className="h-[calc(100vh-7.5rem)] p-3">
      <FormEditorShell
        template={template}
        onChange={handleChange}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        onUndo={undo}
        onRedo={redo}
        publicUrl={`/f/${form.slug}`}
        embedSnippet={form.embedSnippet}
        saveLabel={savedLabel(saveStatus, savedAt)}
      />
    </div>
  );
}
