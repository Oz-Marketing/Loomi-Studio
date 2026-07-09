'use client';

import { useDroppable, useDndContext } from '@dnd-kit/core';

/**
 * Drop strip rendered between top-level blocks (and at the very top of
 * the canvas). The strip is height 0 at rest so the editor canvas
 * matches the live page pixel-for-pixel; during an active drag it
 * expands to a fat hit area so drops between blocks land on a single
 * explicit target instead of relying on closestCenter to pick the
 * right neighbour.
 *
 * Droppable ID format:
 *   - `gap:start`           → insert at the very top of the canvas
 *   - `gap:after:<blockId>` → insert immediately after that top-level block
 */
export function BlockDropGap({
  position,
  afterId = null,
}: {
  position: 'start' | 'after';
  afterId?: string | null;
}) {
  const id =
    position === 'start' ? 'gap:start' : `gap:after:${afterId ?? ''}`;
  const { setNodeRef, isOver } = useDroppable({ id });
  const { active } = useDndContext();
  const isDragging = active != null;

  return (
    <div
      ref={setNodeRef}
      data-block-drop-gap=""
      className={`relative transition-[height] duration-150 ease-out ${
        isDragging ? 'h-6' : 'h-0'
      }`}
      style={{ minHeight: isDragging ? 24 : 0 }}
    >
      <div
        aria-hidden="true"
        className={`absolute inset-x-3 top-1/2 -translate-y-1/2 rounded-full transition-[height,opacity] duration-150 pointer-events-none ${
          isOver
            ? 'h-1 bg-[var(--primary)] opacity-100 shadow-[0_0_10px_var(--primary)]'
            : isDragging
              ? 'h-0.5 bg-[var(--primary)]/30 opacity-100'
              : 'h-0 opacity-0'
        }`}
      />
    </div>
  );
}
