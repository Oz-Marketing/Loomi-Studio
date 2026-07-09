'use client';

import { useEffect, useState } from 'react';
import { XMarkIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import type {
  FlowSettings,
  FlowReEntryPolicy,
  FlowGoalType,
  FlowDndHandling,
} from './types';

// Floating flow-level settings panel. Rendered inside BuilderPopout
// when the cog button in the top-right of the canvas is clicked.
// Mutates a local draft state on every change; commits via PATCH on
// blur of the panel (Save button) or when the user closes the panel.

interface FlowSettingsPanelProps {
  flowId: string;
  initial: FlowSettings;
  onSaved: (next: FlowSettings) => void;
  onClose: () => void;
}

export function FlowSettingsPanel({
  flowId,
  initial,
  onSaved,
  onClose,
}: FlowSettingsPanelProps) {
  const [draft, setDraft] = useState<FlowSettings>(initial);
  const [saving, setSaving] = useState(false);

  // Sync draft if the upstream prop changes (rare — flow reload, etc).
  useEffect(() => {
    setDraft(initial);
  }, [initial]);

  // Constrain `patch` to object-valued keys only. `dndHandling` is a
  // bare string union and must be updated via setDraft directly.
  type ObjectKeys = {
    [K in keyof FlowSettings]: FlowSettings[K] extends object ? K : never;
  }[keyof FlowSettings];

  function patch<K extends ObjectKeys>(
    key: K,
    next: Partial<FlowSettings[K]>,
  ) {
    setDraft((d) => ({
      ...d,
      [key]: { ...(d[key] as object), ...next } as FlowSettings[K],
    }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/flows/${flowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: draft }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Settings save failed');
        return;
      }
      onSaved(draft);
      toast.success('Flow settings saved');
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="flex items-start justify-between gap-2 px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
            <Cog6ToothIcon className="w-4 h-4 text-[var(--muted-foreground)]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[var(--foreground)] truncate">
              Flow settings
            </h3>
            <p className="text-[11px] text-[var(--muted-foreground)] truncate">
              Defaults applied to every enrollment in this flow
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          title="Close"
          className="w-7 h-7 rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] flex items-center justify-center flex-shrink-0 transition-colors"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </header>

      {/* Body — scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5">
        {/* Re-entry policy */}
        <Section
          title="Re-entry"
          subtitle="Can a contact who already enrolled enroll again?"
        >
          <Select
            value={draft.reEntry.policy}
            onChange={(v) =>
              patch('reEntry', { policy: v as FlowReEntryPolicy })
            }
            options={[
              { value: 'never', label: 'Never (default)' },
              { value: 'after-days', label: 'Allow after cooldown' },
              { value: 'always', label: 'Always allow re-entry' },
            ]}
          />
          {draft.reEntry.policy === 'after-days' && (
            <NumberInput
              label="Cooldown (days)"
              value={draft.reEntry.afterDays ?? 7}
              onChange={(v) => patch('reEntry', { afterDays: v })}
              min={1}
              max={365}
            />
          )}
        </Section>

        {/* Quiet hours */}
        <Section
          title="Quiet hours"
          subtitle="Pause sends outside this window (account timezone)"
        >
          <Toggle
            checked={draft.quietHours.enabled}
            onChange={(v) => patch('quietHours', { enabled: v })}
            label={draft.quietHours.enabled ? 'On' : 'Off'}
          />
          {draft.quietHours.enabled && (
            <div className="grid grid-cols-2 gap-2">
              <TimeInput
                label="Start"
                value={draft.quietHours.start}
                onChange={(v) => patch('quietHours', { start: v })}
              />
              <TimeInput
                label="End"
                value={draft.quietHours.end}
                onChange={(v) => patch('quietHours', { end: v })}
              />
            </div>
          )}
        </Section>

        {/* Goal / exit-on-conversion */}
        <Section
          title="Goal"
          subtitle="Exit a contact early when they hit a condition"
        >
          <Toggle
            checked={draft.goal.enabled}
            onChange={(v) => patch('goal', { enabled: v })}
            label={draft.goal.enabled ? 'On' : 'Off'}
          />
          {draft.goal.enabled && (
            <>
              <Select
                value={draft.goal.type}
                onChange={(v) => patch('goal', { type: v as FlowGoalType })}
                options={[
                  { value: 'tag-added', label: 'Tag added' },
                  { value: 'field-set', label: 'Field set' },
                ]}
              />
              <Text
                label={
                  draft.goal.type === 'tag-added'
                    ? 'Tag name'
                    : 'Field name=value'
                }
                value={draft.goal.value}
                onChange={(v) => patch('goal', { value: v })}
                placeholder={
                  draft.goal.type === 'tag-added'
                    ? 'e.g. purchased'
                    : 'e.g. status=converted'
                }
              />
            </>
          )}
        </Section>

        {/* Max duration */}
        <Section
          title="Max duration"
          subtitle="Auto-exit enrollments still active after N days"
        >
          <Toggle
            checked={draft.maxDuration.enabled}
            onChange={(v) => patch('maxDuration', { enabled: v })}
            label={draft.maxDuration.enabled ? 'On' : 'Off'}
          />
          {draft.maxDuration.enabled && (
            <NumberInput
              label="Days"
              value={draft.maxDuration.days}
              onChange={(v) => patch('maxDuration', { days: v })}
              min={1}
              max={365}
            />
          )}
        </Section>

        {/* DND handling */}
        <Section
          title="DND handling"
          subtitle="What to do when a contact has do-not-disturb set"
        >
          <Select
            value={draft.dndHandling}
            onChange={(v) =>
              setDraft((d) => ({ ...d, dndHandling: v as FlowDndHandling }))
            }
            options={[
              { value: 'skip', label: 'Skip step, continue (default)' },
              { value: 'pause', label: 'Pause until DND clears' },
              { value: 'exit', label: 'Exit flow' },
            ]}
          />
        </Section>
      </div>

      {/* Footer — Save */}
      <footer className="border-t border-[var(--border)] px-4 py-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1.5 text-xs rounded-md text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-3 py-1.5 text-xs font-medium rounded-md bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </footer>
    </div>
  );
}

// ── Form primitives ──

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div>
        <h4 className="text-xs font-semibold text-[var(--foreground)]">
          {title}
        </h4>
        {subtitle && (
          <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-2 text-xs"
    >
      <span
        className={`relative w-9 h-5 rounded-full transition-colors ${
          checked ? 'bg-emerald-500' : 'bg-[var(--muted-foreground)]/30'
        }`}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-[left] duration-150 ease-out"
          style={{ left: checked ? '18px' : '2px' }}
        />
      </span>
      <span className="text-[var(--muted-foreground)]">{label}</span>
    </button>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (next: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-2 py-1.5 rounded-md border border-[var(--border)] bg-[var(--input)] text-xs text-[var(--foreground)]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function Text({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-medium">
      {label}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full px-2 py-1.5 rounded-md border border-[var(--border)] bg-[var(--input)] text-xs text-[var(--foreground)] normal-case tracking-normal"
      />
    </label>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-medium">
      {label}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        className="mt-1 w-full px-2 py-1.5 rounded-md border border-[var(--border)] bg-[var(--input)] text-xs text-[var(--foreground)] normal-case tracking-normal"
      />
    </label>
  );
}

function TimeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="block text-[10px] uppercase tracking-wider text-[var(--muted-foreground)] font-medium">
      {label}
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-2 py-1.5 rounded-md border border-[var(--border)] bg-[var(--input)] text-xs text-[var(--foreground)] normal-case tracking-normal"
      />
    </label>
  );
}
