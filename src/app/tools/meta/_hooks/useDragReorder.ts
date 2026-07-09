import { useState, type DragEvent } from 'react';
import type { PacerAd } from '../_lib/types';

export type DropEdge = 'top' | 'bottom';

export interface DragReorderApi {
  draggedId: string | null;
  dropTargetId: string | null;
  dropEdge: DropEdge | null;
  rowProps: (id: string) => {
    draggable: true;
    onDragStart: (e: DragEvent<HTMLElement>) => void;
    onDragOver: (e: DragEvent<HTMLElement>) => void;
    onDragEnter: (e: DragEvent<HTMLElement>) => void;
    onDragLeave: (e: DragEvent<HTMLElement>) => void;
    onDrop: (e: DragEvent<HTMLElement>) => void;
    onDragEnd: () => void;
  };
}

/**
 * HTML5 drag-and-drop reordering for a list of ads. Tracks the dragged row, the
 * hovered drop target + edge (top/bottom of the row), renders a solid off-screen
 * clone as the drag image (Monday-style "lifted card"), and on drop computes the
 * reordered array and hands it back via `onReorder`. UI-only — the caller owns
 * persistence.
 */
export function useDragReorder(
  ads: PacerAd[],
  onReorder: (next: PacerAd[]) => void,
): DragReorderApi {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropEdge, setDropEdge] = useState<DropEdge | null>(null);

  const reset = () => {
    setDraggedId(null);
    setDropTargetId(null);
    setDropEdge(null);
  };

  const rowProps = (id: string) => ({
    draggable: true as const,
    onDragStart: (e: DragEvent<HTMLElement>) => {
      setDraggedId(id);
      e.dataTransfer.effectAllowed = 'move';
      try {
        e.dataTransfer.setData('text/plain', id);
      } catch {
        // setData throws in some sandboxed contexts; safe to ignore.
      }

      // Replace the browser's translucent ghost with a solid clone of the
      // row positioned off-screen. This keeps the drag preview opaque,
      // matching the Monday-style "lifted card" feel.
      const target = e.currentTarget;
      try {
        const rect = target.getBoundingClientRect();
        const isTr = target.tagName === 'TR';
        const ghost = target.cloneNode(true) as HTMLElement;
        let mountTarget: HTMLElement = document.body;
        if (isTr) {
          // <tr> doesn't render outside a <table>; wrap it so the clone keeps
          // its row layout.
          const wrapper = document.createElement('table');
          wrapper.style.cssText = `
            position: absolute; top: -10000px; left: -10000px;
            width: ${rect.width}px;
            border-collapse: collapse;
            background: var(--card, #1a1a1a);
            box-shadow: 0 8px 24px rgba(0,0,0,0.35);
            border-radius: 8px;
          `;
          const tbody = document.createElement('tbody');
          tbody.appendChild(ghost);
          wrapper.appendChild(tbody);
          document.body.appendChild(wrapper);
          mountTarget = wrapper;
        } else {
          ghost.style.cssText += `
            position: absolute; top: -10000px; left: -10000px;
            width: ${rect.width}px;
            background: var(--card, #1a1a1a);
            box-shadow: 0 8px 24px rgba(0,0,0,0.35);
            opacity: 1;
          `;
          document.body.appendChild(ghost);
          mountTarget = ghost;
        }
        e.dataTransfer.setDragImage(
          mountTarget,
          e.clientX - rect.left,
          e.clientY - rect.top,
        );
        // Clean up after the browser has snapshotted the element.
        window.setTimeout(() => mountTarget.remove(), 0);
      } catch {
        // setDragImage isn't supported in every browser; falling back to the
        // default ghost is still functional, just less polished.
      }
    },
    onDragOver: (e: DragEvent<HTMLElement>) => {
      if (!draggedId || draggedId === id) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const rect = e.currentTarget.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      const edge: DropEdge = e.clientY < midpoint ? 'top' : 'bottom';
      if (dropTargetId !== id) setDropTargetId(id);
      if (dropEdge !== edge) setDropEdge(edge);
    },
    onDragEnter: (e: DragEvent<HTMLElement>) => {
      if (!draggedId || draggedId === id) return;
      e.preventDefault();
      setDropTargetId(id);
    },
    onDragLeave: () => {
      // Intentionally left blank — onDragEnter on siblings overwrites the
      // target, and clearing here causes flicker between rows.
    },
    onDrop: (e: DragEvent<HTMLElement>) => {
      e.preventDefault();
      const sourceId = draggedId;
      const edge = dropEdge;
      reset();
      if (!sourceId || sourceId === id) return;
      const fromIdx = ads.findIndex((a) => a.id === sourceId);
      const toIdx = ads.findIndex((a) => a.id === id);
      if (fromIdx === -1 || toIdx === -1) return;
      const next = [...ads];
      const [moved] = next.splice(fromIdx, 1);
      // After splice, indices >= fromIdx shift left by one.
      const baseTarget = fromIdx < toIdx ? toIdx - 1 : toIdx;
      const insertAt = edge === 'bottom' ? baseTarget + 1 : baseTarget;
      next.splice(insertAt, 0, moved);
      onReorder(next);
    },
    onDragEnd: () => {
      reset();
    },
  });

  return { draggedId, dropTargetId, dropEdge, rowProps };
}
