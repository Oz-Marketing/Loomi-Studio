'use client';

import * as React from 'react';
import type { Block, LandingPageBlockType, LandingPageTemplate } from '../types';
import { getDefaultProps } from '../schemas';

interface EditorState {
  template: LandingPageTemplate;
  selectedId: string | null;
}

interface EditorActions {
  selectBlock: (id: string | null) => void;
  updateBlockProps: (id: string, props: Record<string, unknown>) => void;
  updateSettings: (settings: Partial<LandingPageTemplate['settings']>) => void;
  insertBlock: (type: LandingPageBlockType, afterId?: string | null) => void;
  moveBlock: (id: string, direction: 'up' | 'down') => void;
  deleteBlock: (id: string) => void;
  duplicateBlock: (id: string) => void;
}

type EditorContextValue = EditorState & EditorActions;

const Ctx = React.createContext<EditorContextValue | null>(null);

export function useLandingPageEditor(): EditorContextValue {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error('useLandingPageEditor must be used inside <LandingPageEditorProvider>');
  return ctx;
}

function generateId(): string {
  return `b-${Math.random().toString(36).slice(2, 10)}`;
}

function createBlock(type: LandingPageBlockType): Block {
  const id = generateId();
  const block: Block = { id, type, props: { ...getDefaultProps(type) } };
  if (type === 'section') block.children = [];
  if (type === 'columns') {
    const count = ((block.props.columnCount as number) ?? 2);
    block.children = Array.from({ length: count }, () => ({
      id: generateId(),
      type: 'section' as LandingPageBlockType,
      props: { paddingTop: 0, paddingBottom: 0, paddingLeft: 0, paddingRight: 0 },
      children: [],
    }));
  }
  return block;
}

function deepClone(block: Block): Block {
  return {
    ...block,
    id: generateId(),
    props: { ...block.props },
    children: block.children?.map(deepClone),
  };
}

function mapBlocks(blocks: Block[], fn: (b: Block) => Block): Block[] {
  return blocks.map((b) => {
    const next = fn(b);
    if (next.children) return { ...next, children: mapBlocks(next.children, fn) };
    return next;
  });
}

function removeBlock(blocks: Block[], id: string): Block[] {
  return blocks
    .filter((b) => b.id !== id)
    .map((b) => (b.children ? { ...b, children: removeBlock(b.children, id) } : b));
}

function findBlock(blocks: Block[], id: string): Block | undefined {
  for (const b of blocks) {
    if (b.id === id) return b;
    if (b.children) {
      const inner = findBlock(b.children, id);
      if (inner) return inner;
    }
  }
  return undefined;
}

interface ProviderProps {
  template: LandingPageTemplate;
  onChange: (next: LandingPageTemplate) => void;
  children: React.ReactNode;
}

export function LandingPageEditorProvider({ template, onChange, children }: ProviderProps) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const update = React.useCallback(
    (updater: (t: LandingPageTemplate) => LandingPageTemplate) => {
      onChange(updater(template));
    },
    [template, onChange],
  );

  const updateBlockProps = React.useCallback(
    (id: string, props: Record<string, unknown>) => {
      update((t) => ({
        ...t,
        blocks: mapBlocks(t.blocks, (b) =>
          b.id === id ? { ...b, props: { ...b.props, ...props } } : b,
        ),
      }));
    },
    [update],
  );

  const updateSettings = React.useCallback(
    (settings: Partial<LandingPageTemplate['settings']>) => {
      update((t) => ({ ...t, settings: { ...t.settings, ...settings } }));
    },
    [update],
  );

  const insertBlock = React.useCallback(
    (type: LandingPageBlockType, afterId?: string | null) => {
      const newBlock = createBlock(type);
      update((t) => {
        if (!afterId) return { ...t, blocks: [...t.blocks, newBlock] };
        const idx = t.blocks.findIndex((b) => b.id === afterId);
        if (idx === -1) return { ...t, blocks: [...t.blocks, newBlock] };
        return {
          ...t,
          blocks: [...t.blocks.slice(0, idx + 1), newBlock, ...t.blocks.slice(idx + 1)],
        };
      });
      setSelectedId(newBlock.id);
    },
    [update],
  );

  const moveBlock = React.useCallback(
    (id: string, direction: 'up' | 'down') => {
      update((t) => {
        const idx = t.blocks.findIndex((b) => b.id === id);
        if (idx === -1) return t;
        const swapWith = direction === 'up' ? idx - 1 : idx + 1;
        if (swapWith < 0 || swapWith >= t.blocks.length) return t;
        const next = [...t.blocks];
        [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
        return { ...t, blocks: next };
      });
    },
    [update],
  );

  const deleteBlock = React.useCallback(
    (id: string) => {
      update((t) => ({ ...t, blocks: removeBlock(t.blocks, id) }));
      setSelectedId((prev) => (prev === id ? null : prev));
    },
    [update],
  );

  const duplicateBlock = React.useCallback(
    (id: string) => {
      update((t) => {
        const idx = t.blocks.findIndex((b) => b.id === id);
        if (idx === -1) return t;
        const source = findBlock(t.blocks, id);
        if (!source) return t;
        const copy = deepClone(source);
        return {
          ...t,
          blocks: [...t.blocks.slice(0, idx + 1), copy, ...t.blocks.slice(idx + 1)],
        };
      });
    },
    [update],
  );

  const value: EditorContextValue = {
    template,
    selectedId,
    selectBlock: setSelectedId,
    updateBlockProps,
    updateSettings,
    insertBlock,
    moveBlock,
    deleteBlock,
    duplicateBlock,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
