'use client';

import { memo, useEffect, useRef, useState } from 'react';
import {
  ArrowUpIcon,
  BoltIcon,
  EnvelopeIcon,
  PlusIcon,
  SparklesIcon,
  UserPlusIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import type { NodeProps } from '@xyflow/react';

// Cycled example prompts shown as a typewriter-style animated
// placeholder in the AI prompt textarea. Each is typed in, paused on,
// deleted, and the next one starts — so a glance at the empty state
// communicates what Loomi can actually build, not just *that* it can.
const ANIMATED_EXAMPLES = [
  'After sending a proposal, wait 24 hours then send SMS follow-up…',
  'Build a 5-day welcome series for new contacts.',
  'When a customer hasn’t opened the last 3 emails, re-engage them.',
  'Service appointment in 7 days? Send a reminder + confirmation link.',
  'Lease ends in 60 days? Start a trade-in nudge series.',
];

const TYPE_SPEED_MS = 32;
const DELETE_SPEED_MS = 16;
const PAUSE_AT_FULL_MS = 2200;
const PAUSE_AT_EMPTY_MS = 350;

// Phantom ReactFlow node types rendered only while the empty-state hero
// is active. They sit at the trigger's location in the flow so the AI
// prompt and the "Add New Trigger" placeholder feel like part of the
// canvas — not floating UI chrome over it.
//
// These nodes are NEVER persisted. FlowBuilder injects them into the
// `displayedNodes` array passed to ReactFlow (alongside the real, but
// `hidden: true`, trigger + exit nodes). On dismiss, the phantoms drop
// out and the real nodes show through.

// ── Data shape contracts ──
// Callbacks are passed via node.data so the renderer can fire them
// without prop-drilling through ReactFlow.

export interface AiPromptNodeData {
  onAsk: (prompt: string) => void;
  [key: string]: unknown;
}

export interface TriggerPlaceholderNodeData {
  onAdd: () => void;
  [key: string]: unknown;
}

export type EndPlaceholderNodeData = Record<string, unknown>;

// ── Preset chips ──
// Same Loomi-flavored presets we used in the overlay version, kept
// alongside the renderer so they're easy to tweak in one place.

interface CategoryPreset {
  label: string;
  prompt: string;
  Icon: React.ComponentType<{ className?: string }>;
  tone: string;
}

const PRESET_CATEGORIES: CategoryPreset[] = [
  {
    label: 'Welcome series',
    prompt: 'Build a 3-email welcome series for new contacts, with a 2-day wait between sends.',
    Icon: UserPlusIcon,
    // Solid pastel tiles read cleaner on the white card than the
    // 500/15 alpha-on-dark tones the rest of the builder uses.
    tone: 'bg-sky-100 text-sky-600',
  },
  {
    label: 'Service follow-up',
    prompt: 'After a service appointment, wait 3 days and email a satisfaction check-in.',
    Icon: WrenchScrewdriverIcon,
    tone: 'bg-emerald-100 text-emerald-600',
  },
  {
    label: 'Email campaigns',
    prompt: 'Send a promotional email, wait 5 days, and re-send to contacts who did not open.',
    Icon: EnvelopeIcon,
    tone: 'bg-rose-100 text-rose-500',
  },
];

// ── AI prompt node ──
// Self-contained gradient-framed card sitting at the top of the
// empty-state flow. Submitting hands the prompt to FlowBuilder which
// opens the AI chat panel pre-seeded with it.

export const AiPromptNode = memo(function AiPromptNode({ data }: NodeProps) {
  const { onAsk } = data as AiPromptNodeData;
  const [input, setInput] = useState('');

  // ── Animated typewriter placeholder ──
  // Cycles through ANIMATED_EXAMPLES: types each in char-by-char, pauses
  // at full text, deletes back to empty, then advances to the next one.
  // The placeholder attribute is naturally hidden once the user types,
  // so the animation keeps running cheaply in the background.
  const [placeholder, setPlaceholder] = useState('');
  const phaseRef = useRef<'typing' | 'pause-full' | 'deleting' | 'pause-empty'>('typing');
  const exampleIdxRef = useRef(0);
  const charIdxRef = useRef(0);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const tick = () => {
      const example = ANIMATED_EXAMPLES[exampleIdxRef.current];
      const phase = phaseRef.current;

      if (phase === 'typing') {
        if (charIdxRef.current < example.length) {
          charIdxRef.current += 1;
          setPlaceholder(example.slice(0, charIdxRef.current));
          timeoutId = setTimeout(tick, TYPE_SPEED_MS);
        } else {
          phaseRef.current = 'pause-full';
          timeoutId = setTimeout(tick, PAUSE_AT_FULL_MS);
        }
      } else if (phase === 'pause-full') {
        phaseRef.current = 'deleting';
        timeoutId = setTimeout(tick, DELETE_SPEED_MS);
      } else if (phase === 'deleting') {
        if (charIdxRef.current > 0) {
          charIdxRef.current -= 1;
          setPlaceholder(example.slice(0, charIdxRef.current));
          timeoutId = setTimeout(tick, DELETE_SPEED_MS);
        } else {
          phaseRef.current = 'pause-empty';
          timeoutId = setTimeout(tick, PAUSE_AT_EMPTY_MS);
        }
      } else {
        // pause-empty → advance to next example
        exampleIdxRef.current =
          (exampleIdxRef.current + 1) % ANIMATED_EXAMPLES.length;
        phaseRef.current = 'typing';
        timeoutId = setTimeout(tick, TYPE_SPEED_MS);
      }
    };

    timeoutId = setTimeout(tick, TYPE_SPEED_MS);
    return () => clearTimeout(timeoutId);
  }, []);

  // `nodrag` / `nopan` Tailwind classes stop ReactFlow from intercepting
  // pointer events on the interactive sub-elements (textarea, button)
  // and treating them as a node drag or canvas pan.
  return (
    <div className="nodrag nopan relative w-[560px]">
      {/* Aurora — five independently-drifting colour blobs sitting
          behind the content. Each is its own circular div with a
          single radial gradient and its own animation, so the wash
          never reads as a single rotating shape (the previous
          single-div approach showed a visible rotating rectangle).
          See `.iris-aurora-blob*` rules in globals.css for the
          per-blob colour + position + drift configuration. */}
      <div aria-hidden className="absolute -inset-32 pointer-events-none">
        <span className="iris-aurora-blob iris-aurora-blob-1" />
        <span className="iris-aurora-blob iris-aurora-blob-2" />
        <span className="iris-aurora-blob iris-aurora-blob-3" />
        <span className="iris-aurora-blob iris-aurora-blob-4" />
        <span className="iris-aurora-blob iris-aurora-blob-5" />
      </div>

      {/* Content sits directly on the halo — no card chrome, no border,
          no backdrop blur, no shadow. Inner elements (textarea, preset
          chips) carry their own surface fills for legibility. */}
      <div className="relative p-7 space-y-5">
          {/* Title row */}
          <div className="flex flex-col items-center text-center gap-2">
            <div className="flex items-center gap-2.5">
              <div className="iris-rainbow-gradient w-9 h-9 rounded-full flex items-center justify-center shadow-md">
                <SparklesIcon className="w-5 h-5 text-zinc-900" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--foreground)] tracking-tight">
                What do you want to build?
              </h2>
              <span className="iris-rainbow-gradient text-[9px] uppercase tracking-[0.12em] font-bold px-2 py-1 rounded-md text-zinc-900 shadow-sm">
                Beta
              </span>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              Describe a flow and Loomi will set it up. Edit anytime.
            </p>
          </div>

          {/* Input — soft rainbow tint via 1px gradient border, animated
              placeholder cycling through the example prompts. The inner
              fill is `--card-strong` (the same elevated surface as the
              card body) rather than `--input` — `--input` is nearly
              transparent in dark mode, which would let the rainbow
              frame bleed through and kill placeholder legibility. */}
          {/* Rotating beam border. `iris-beam-wrap` paints its ::before
              as a thin conic-gradient ring sweeping clockwise around
              this box, and its ::after as a blurred copy behind it for
              the glow. The inner div is the actual input surface; we
              keep `--card-strong` for the fill so the rainbow ring
              doesn't bleed through and kill placeholder legibility. */}
          <div className="iris-beam-wrap rounded-2xl">
            <div className="relative bg-[var(--card-strong)] rounded-2xl">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === 'Enter' &&
                    (e.metaKey || e.ctrlKey) &&
                    input.trim()
                  ) {
                    e.preventDefault();
                    onAsk(input.trim());
                  }
                }}
                placeholder={placeholder}
                rows={3}
                className="w-full resize-none px-4 py-3.5 pr-14 text-sm bg-transparent rounded-2xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none leading-relaxed"
              />
              <button
                type="button"
                disabled={!input.trim()}
                onClick={() => onAsk(input.trim())}
                title="Send (⌘/Ctrl + Enter)"
                className="iris-rainbow-gradient absolute bottom-2.5 right-2.5 w-9 h-9 rounded-full flex items-center justify-center text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95 shadow-md"
              >
                <ArrowUpIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Preset chips — each with a soft tinted icon tile. Border
              and text adapt to the active theme so the chip stays
              legible on dark surfaces too. */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {PRESET_CATEGORIES.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => onAsk(preset.prompt)}
                className="inline-flex items-center gap-1.5 pl-1.5 pr-3.5 py-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--muted)] hover:border-[var(--border)] transition-all"
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center ${preset.tone}`}
                >
                  <preset.Icon className="w-3 h-3" />
                </span>
                <span className="text-[11px] font-semibold text-[var(--foreground)]">
                  {preset.label}
                </span>
              </button>
            ))}
          </div>
      </div>
    </div>
  );
});

// ── Trigger placeholder node ──
// Dashed-purple card mirroring GHL's "Add New Trigger" empty step. Has
// an "Or" divider stacked above it so the visual reads as "AI ... Or
// ... add a trigger manually" without needing a third phantom node for
// the divider. Clicking the card dismisses empty-state and selects the
// real trigger node.

export const TriggerPlaceholderNode = memo(function TriggerPlaceholderNode({
  data,
}: NodeProps) {
  const { onAdd } = data as TriggerPlaceholderNodeData;
  return (
    <div className="nodrag nopan flex flex-col items-center gap-4 w-[260px]">
      {/* "Or" divider — short, anchored above the placeholder so it
          visually sits between the AI prompt node above and this card. */}
      <div className="flex items-center gap-3 w-full">
        <span className="flex-1 h-px bg-[var(--border)]" />
        <span className="text-[11px] text-[var(--muted-foreground)] font-medium">Or</span>
        <span className="flex-1 h-px bg-[var(--border)]" />
      </div>
      <button
        type="button"
        onClick={onAdd}
        className="w-full inline-flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-dashed border-[var(--ai-hz-mid)] hover:bg-[var(--ai-hz-chip-hover)] transition-colors"
      >
        <span className="w-6 h-6 rounded-md bg-[var(--card)] border border-[var(--ai-hz-chip-border)] flex items-center justify-center">
          <PlusIcon className="w-3.5 h-3.5 text-[var(--ai-hz-chip-text)]" />
        </span>
        <span className="text-sm font-semibold text-[var(--ai-hz-chip-text)]">
          Add New Trigger
        </span>
        <BoltIcon className="w-3.5 h-3.5 text-[var(--ai-hz-chip-text)] opacity-60" />
      </button>
    </div>
  );
});

// ── End placeholder node ──
// Small grey "END" pill sitting at the bottom of the empty-state flow,
// matching the look of GHL's end indicator and the exit node's tone.

export const EndPlaceholderNode = memo(function EndPlaceholderNode() {
  return (
    <div className="nodrag nopan inline-block px-3 py-1 rounded-full bg-[var(--muted)] text-[10px] font-semibold text-[var(--muted-foreground)] tracking-wider">
      END
    </div>
  );
});
