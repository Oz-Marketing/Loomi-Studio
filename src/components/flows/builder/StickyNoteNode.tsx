'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import { useBuilderContext } from './BuilderContext';
import { TrashIcon } from '@heroicons/react/24/outline';
import type { BuilderNodeData } from './types';

// Sticky-note node — annotation only. All affordances live on the card
// itself (color picker, trash, drag handle, text edit) so clicking a
// sticky never opens the right-side inspector popout. The publish
// validator exempts these via ANNOTATION_NODE_TYPES in
// loomi-flows.ts; the worker never visits them.
//
// Layout:
//   ┌──────────────────────────┐
//   │ ●●●●●●●●●●●●●●     [trash] │  ← 22px handle bar (drag + actions)
//   │                          │
//   │  Note text…              │  ← textarea, fills the rest
//   │                          │
//   └──────────────────────────┘
//
// When NOT selected, the handle bar shows a faint 3-dot grip in the
// accent tint instead of the swatches so the canvas reads as a
// gallery of clean coloured cards.

// ── Pastel palette ──

export type StickyNoteColor =
  | 'yellow'
  | 'pink'
  | 'blue'
  | 'green'
  | 'purple'
  | 'orange';

interface ColorSpec {
  fill: string;
  accent: string;
  text: string;
}

export const STICKY_COLORS: Record<StickyNoteColor, ColorSpec> = {
  yellow: { fill: '#fef9c3', accent: '#eab308', text: '#3f3f46' },
  pink:   { fill: '#fce7f3', accent: '#ec4899', text: '#3f3f46' },
  blue:   { fill: '#dbeafe', accent: '#3b82f6', text: '#3f3f46' },
  green:  { fill: '#d1fae5', accent: '#10b981', text: '#3f3f46' },
  purple: { fill: '#ede9fe', accent: '#8b5cf6', text: '#3f3f46' },
  orange: { fill: '#fed7aa', accent: '#f97316', text: '#3f3f46' },
};

export const STICKY_COLOR_ORDER: StickyNoteColor[] = [
  'yellow',
  'pink',
  'orange',
  'green',
  'blue',
  'purple',
];

interface StickyNoteConfig {
  text?: string;
  color?: StickyNoteColor;
}

export const StickyNoteNode = memo(function StickyNoteNode({
  id,
  data,
  selected,
}: NodeProps) {
  const builderData = data as BuilderNodeData;
  const config = (builderData.config ?? {}) as StickyNoteConfig;
  const initialText = typeof config.text === 'string' ? config.text : '';
  const color: StickyNoteColor =
    config.color && config.color in STICKY_COLORS ? config.color : 'yellow';
  const spec = STICKY_COLORS[color];

  const { onDeleteNode, onUpdateNodeConfig } = useBuilderContext();
  const [text, setText] = useState(initialText);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  const commitText = useCallback(() => {
    if (text === initialText) return;
    onUpdateNodeConfig?.(id, { ...config, text });
  }, [text, initialText, config, id, onUpdateNodeConfig]);

  const setColor = useCallback(
    (next: StickyNoteColor) => {
      if (next === color) return;
      onUpdateNodeConfig?.(id, { ...config, color: next });
    },
    [color, config, id, onUpdateNodeConfig],
  );

  return (
    <div
      className={`relative w-[220px] min-h-[140px] rounded-md shadow-[0_8px_20px_-8px_rgba(0,0,0,0.35)] transition-transform overflow-hidden ${
        selected ? '' : 'rotate-[-1.2deg]'
      }`}
      style={{
        background: spec.fill,
        color: spec.text,
        // Selection ring uses the chosen accent so multi-note edits
        // stay colour-coded to the note.
        boxShadow: selected
          ? `0 0 0 2px ${spec.accent}, 0 8px 20px -8px rgba(0,0,0,0.35)`
          : undefined,
      }}
    >
      {/* Handle bar — drag affordance + on-card swatches/trash.
          Selected → 6 swatches + trash. Not selected → faint grip.
          The bar deliberately does NOT carry `nodrag` so ReactFlow
          treats it as a drag handle for the parent node. */}
      <div
        className="relative h-[22px] flex items-center justify-center gap-1.5 cursor-grab active:cursor-grabbing"
        style={{
          background: `linear-gradient(180deg, ${spec.accent}26 0%, transparent 100%)`,
        }}
      >
        {selected ? (
          STICKY_COLOR_ORDER.map((c) => {
            const isCurrent = c === color;
            return (
              <button
                key={c}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setColor(c);
                }}
                title={c}
                aria-label={`Set sticky note color to ${c}`}
                // `nodrag` so clicking the swatch swaps colour
                // instead of starting a node drag.
                className={`nodrag w-3 h-3 rounded-full transition-transform ${
                  isCurrent ? 'scale-110' : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  background: STICKY_COLORS[c].accent,
                  outline: isCurrent ? '2px solid white' : 'none',
                  outlineOffset: isCurrent ? -1 : 0,
                }}
              />
            );
          })
        ) : (
          <span className="flex gap-1 opacity-30">
            <span
              className="w-1 h-1 rounded-full"
              style={{ background: spec.accent }}
            />
            <span
              className="w-1 h-1 rounded-full"
              style={{ background: spec.accent }}
            />
            <span
              className="w-1 h-1 rounded-full"
              style={{ background: spec.accent }}
            />
          </span>
        )}

        {/* Trash chip in the right corner of the handle bar. Visible
            on hover always; pinned on while selected so the user has
            an obvious delete affordance. */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDeleteNode?.(id);
          }}
          title="Delete sticky note"
          aria-label="Delete sticky note"
          className="nodrag absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 rounded-md bg-black/15 text-zinc-700 hover:bg-black/30 hover:text-zinc-900 flex items-center justify-center transition-opacity"
          style={{ opacity: selected ? 1 : 0 }}
        >
          <TrashIcon className="w-3 h-3" />
        </button>
      </div>

      {/* Body — textarea fills the rest of the card. `nodrag nopan`
          so typing doesn't start a node drag / canvas pan. */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commitText}
        placeholder="Note…"
        className="nodrag nopan w-full resize-none bg-transparent px-3 py-2 text-sm leading-snug outline-none"
        style={{ color: spec.text, minHeight: 118 }}
        rows={5}
      />
    </div>
  );
});
