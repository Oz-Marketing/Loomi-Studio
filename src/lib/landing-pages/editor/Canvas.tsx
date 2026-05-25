'use client';

import * as React from 'react';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useLandingPageEditor } from './EditorContext';
import { BLOCK_COMPONENTS } from '../components';
import type { Block } from '../types';

/**
 * Editor canvas. Renders the template using the real block
 * components, but wraps each top-level block in an EditableBlock that
 * adds:
 *  - selection ring on click
 *  - hover halo
 *  - floating control rail (up/down/duplicate/delete)
 *
 * The outer wrapper applies the page-level settings (bg, font, max
 * width, etc.) the same way LandingPageRenderer does so the editor
 * preview matches the published page pixel-for-pixel.
 */
export function Canvas() {
  const { template, selectBlock } = useLandingPageEditor();
  const s = template.settings;

  return (
    <div
      className="flex-1 overflow-auto bg-[var(--muted)]/30"
      onClick={() => selectBlock(null)}
    >
      <style>{`
        /* Disable link navigation inside the canvas — clicks should
           bubble up to EditableBlock for selection. */
        .loomi-lp-canvas a { pointer-events: none !important; }
        .loomi-lp-canvas button { pointer-events: none !important; }
        .loomi-lp-canvas input,
        .loomi-lp-canvas select,
        .loomi-lp-canvas textarea {
          pointer-events: none !important;
        }
      `}</style>
      <div className="py-6">
        <div
          className="loomi-lp-canvas shadow-sm mx-auto bg-white"
          style={{
            maxWidth: `${s.contentWidth}px`,
            backgroundColor: s.contentBg,
            color: s.textColor,
            fontFamily: s.fontFamily,
            borderRadius: s.contentBorderRadius ?? 0,
            ['--loomi-lp-primary' as never]: s.primaryColor,
            padding: `${s.contentPaddingTop ?? 0}px ${s.contentPaddingRight ?? 0}px ${s.contentPaddingBottom ?? 0}px ${s.contentPaddingLeft ?? 0}px`,
            margin: `${s.contentMarginTop ?? 0}px ${s.contentMarginRight ?? 0}px ${s.contentMarginBottom ?? 0}px ${s.contentMarginLeft ?? 0}px`,
            transition: 'max-width 150ms ease',
            overflow: 'hidden',
          }}
        >
          {template.blocks.length === 0 ? (
            <EmptyState />
          ) : (
            template.blocks.map((block, idx) => (
              <EditableBlock
                key={block.id}
                block={block}
                index={idx}
                total={template.blocks.length}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function EditableBlock({
  block,
  index,
  total,
}: {
  block: Block;
  index: number;
  total: number;
}) {
  const { selectedId, selectBlock, moveBlock, deleteBlock, duplicateBlock } =
    useLandingPageEditor();
  const Component = BLOCK_COMPONENTS[block.type] as React.ComponentType<Record<string, unknown> & { children?: React.ReactNode }>;
  const selected = selectedId === block.id;

  return (
    <div
      className="relative group/block"
      style={{
        outline: selected ? '2px solid var(--primary)' : '2px solid transparent',
        outlineOffset: -2,
        position: 'relative',
      }}
      onClick={(e) => {
        e.stopPropagation();
        selectBlock(block.id);
      }}
    >
      {/* Hover halo — appears on hover only when this block isn't already selected. */}
      {!selected && (
        <div className="pointer-events-none absolute inset-0 opacity-0 group-hover/block:opacity-100 transition-opacity ring-1 ring-inset ring-[var(--primary)]/40" />
      )}

      {/* Floating control rail — shown when selected. */}
      {selected && (
        <div
          className="absolute -top-9 right-2 z-10 flex items-center gap-0.5 px-1 py-1 rounded-md bg-[var(--card)] border border-[var(--border)] shadow-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <Rail
            label="Move up"
            disabled={index === 0}
            icon={<ChevronUpIcon className="w-3.5 h-3.5" />}
            onClick={() => moveBlock(block.id, 'up')}
          />
          <Rail
            label="Move down"
            disabled={index === total - 1}
            icon={<ChevronDownIcon className="w-3.5 h-3.5" />}
            onClick={() => moveBlock(block.id, 'down')}
          />
          <Rail
            label="Duplicate"
            icon={<DocumentDuplicateIcon className="w-3.5 h-3.5" />}
            onClick={() => duplicateBlock(block.id)}
          />
          <Rail
            label="Delete"
            icon={<TrashIcon className="w-3.5 h-3.5 text-rose-400" />}
            onClick={() => deleteBlock(block.id)}
          />
        </div>
      )}

      {Component ? <Component {...block.props} /> : null}
    </div>
  );
}

function Rail({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="inline-flex items-center justify-center w-7 h-7 rounded-md hover:bg-[var(--muted)] text-[var(--foreground)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {icon}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="m-12 p-16 text-center rounded-lg border-2 border-dashed border-[var(--border)] text-[var(--muted-foreground)]">
      <p className="m-0 text-sm font-medium">No blocks yet.</p>
      <p className="mt-2 text-xs">
        Pick something from the panel on the left to get started.
      </p>
    </div>
  );
}
