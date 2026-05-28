'use client';

import * as React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { ALL_BLOCK_SCHEMAS, type BlockSchema } from '../schemas';
import { useLandingPageEditor } from './EditorContext';
import { PaletteIcon } from './PaletteIcon';

const CATEGORY_ORDER: BlockSchema['category'][] = ['marketing', 'content', 'layout', 'embed'];
const CATEGORY_LABEL: Record<BlockSchema['category'], string> = {
  marketing: 'Marketing',
  content: 'Content',
  layout: 'Layout',
  embed: 'Embed',
};

/**
 * Left-side palette of available blocks. Drag a chip onto the canvas
 * to insert at a specific position, or click to append (which uses
 * selection-based inference: into a selected container, after a
 * selected leaf, or at the end of the page).
 */
export function BlockPalette() {
  const { insertBlock } = useLandingPageEditor();

  const groups = React.useMemo(() => {
    const buckets: Record<BlockSchema['category'], BlockSchema[]> = {
      marketing: [],
      content: [],
      layout: [],
      embed: [],
    };
    for (const schema of ALL_BLOCK_SCHEMAS) {
      buckets[schema.category].push(schema);
    }
    return buckets;
  }, []);

  return (
    <div className="flex flex-col">
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <p className="text-[11px] text-[var(--muted-foreground)]">
          Drag a block onto the canvas, or click to append it.
        </p>
      </div>
      {CATEGORY_ORDER.map((cat) => (
        <React.Fragment key={cat}>
          <div className="px-4 pt-5 pb-2.5 border-t border-[var(--border)]">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--foreground)]">
              {CATEGORY_LABEL[cat]}
            </h3>
          </div>
          <div className="px-4 py-3">
            <div className="grid grid-cols-2 gap-2">
              {groups[cat].map((schema) => (
                <PaletteChip
                  key={schema.type}
                  schema={schema}
                  onClick={() => insertBlock(schema.type)}
                />
              ))}
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

function PaletteChip({
  schema,
  onClick,
}: {
  schema: BlockSchema;
  onClick: () => void;
}) {
  // Palette chips opt into dnd-kit as draggables. The id format
  // `palette:<type>` is what the shell's drag-end handler keys off to
  // distinguish "new block from palette" from "reorder existing
  // block". The PointerSensor's 8px activation distance means a quick
  // click (no movement) falls through to onClick — keeps the existing
  // click-to-insert affordance alongside drag.
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${schema.type}`,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      title={schema.description}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)] hover:bg-[var(--accent)] transition-colors group select-none ${
        isDragging ? 'opacity-40 cursor-grabbing' : 'cursor-grab'
      }`}
    >
      <PaletteIcon name={schema.icon} className="w-5 h-5 text-[var(--muted-foreground)] group-hover:text-[var(--primary)]" />
      <span className="text-[11px] font-medium text-center leading-tight">
        {schema.label}
      </span>
    </div>
  );
}
