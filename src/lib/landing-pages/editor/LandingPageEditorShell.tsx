'use client';

import { LandingPageEditorProvider } from './EditorContext';
import { BlockPalette } from './BlockPalette';
import { Canvas } from './Canvas';
import { PropertyPanel } from './PropertyPanel';
import type { LandingPageTemplate } from '../types';

/**
 * 3-pane editor shell: block palette on the left, canvas in the
 * middle, property panel on the right. The parent page owns the
 * autosave/debounce/flush plumbing and just feeds `template` + a
 * change handler in here.
 */
export interface LandingPageEditorShellProps {
  template: LandingPageTemplate;
  onChange: (next: LandingPageTemplate) => void;
}

export function LandingPageEditorShell({
  template,
  onChange,
}: LandingPageEditorShellProps) {
  return (
    <LandingPageEditorProvider template={template} onChange={onChange}>
      <div className="flex-1 min-h-0 flex">
        <div className="w-[260px] flex-shrink-0">
          <BlockPalette />
        </div>
        <div className="flex-1 min-w-0 flex flex-col">
          <Canvas />
        </div>
        <div className="w-[320px] flex-shrink-0">
          <PropertyPanel />
        </div>
      </div>
    </LandingPageEditorProvider>
  );
}
