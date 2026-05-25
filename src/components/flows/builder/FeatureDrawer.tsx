'use client';

import {
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type { RailFeature } from './IconRail';

// Shared left-side drawer that hosts the active rail feature's content.
// Iris is mounted by FlowBuilder (it needs flow-state callbacks);
// the other drawers are stub content for now — backend wiring lands in
// follow-ups.

interface FeatureDrawerProps {
  feature: Exclude<RailFeature, 'sticky_notes' | 'stats' | 'iris'>;
  onClose: () => void;
}

const COPY: Record<FeatureDrawerProps['feature'], { title: string; subtitle: string; Icon: React.ComponentType<{ className?: string }>; body: string }> = {
  notes: {
    title: 'Notes',
    subtitle: 'Annotate this flow for yourself or your team',
    Icon: DocumentTextIcon,
    body: 'Free-form notes attached to the flow. Coming soon — for now, write context in step labels or use the description field on the flow.',
  },
  error_log: {
    title: 'Error Log',
    subtitle: 'Recent failures across enrollments',
    Icon: ExclamationTriangleIcon,
    body: 'A unified view of step-level failures pulled from LoomiFlowEnrollmentStep. Coming soon — for now, errored steps show a red ring on the canvas after a publish.',
  },
  version_history: {
    title: 'Version History',
    subtitle: 'See and restore prior drafts',
    Icon: ClockIcon,
    body: 'Snapshots of the graph captured on each publish + manual save. Coming soon — for now, autosave persists every meaningful edit.',
  },
};

export function FeatureDrawer({ feature, onClose }: FeatureDrawerProps) {
  const { title, subtitle, Icon, body } = COPY[feature];
  return (
    <aside
      className="w-80 flex-shrink-0 flex flex-col border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--card-strong)] backdrop-blur-2xl backdrop-saturate-150"
      aria-label={title}
    >
      <header className="px-4 py-3 border-b border-[var(--border)] flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-[var(--muted)] flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-[var(--muted-foreground)]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-[var(--foreground)] truncate">
              {title}
            </h3>
            <p className="text-[11px] text-[var(--muted-foreground)] truncate">
              {subtitle}
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
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--muted)]/30 p-4">
          <p className="text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] font-semibold mb-1.5">
            Coming soon
          </p>
          <p className="text-xs text-[var(--foreground)] leading-relaxed">{body}</p>
        </div>
      </div>
    </aside>
  );
}
