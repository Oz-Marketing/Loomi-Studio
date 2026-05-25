import * as React from 'react';

export interface HtmlProps {
  html?: string;
}

/**
 * Strip a minimal set of dangerous tags + event-handler attributes from
 * user-supplied HTML. This is NOT a full sanitizer — full-fidelity
 * sanitization (DOMPurify) belongs server-side in the public renderer
 * (PR4). Here we just keep obvious foot-guns out of the editor preview.
 */
function sanitizeBasic(input: string): string {
  return input
    .replace(/<\s*(script|iframe|object|embed|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<\s*(script|iframe|object|embed|style)[^>]*\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
}

export const HtmlBlock: React.FC<HtmlProps> = ({ html = '' }) => {
  const safe = React.useMemo(() => sanitizeBasic(html), [html]);
  if (!safe.trim()) {
    return (
      <div
        style={{
          border: '1px dashed rgba(0,0,0,0.2)',
          padding: '24px 16px',
          textAlign: 'center',
          color: 'rgba(0,0,0,0.5)',
          fontSize: 13,
          fontFamily: 'monospace',
          borderRadius: 8,
        }}
      >
        Custom HTML — paste markup in the right panel.
      </div>
    );
  }
  return <div dangerouslySetInnerHTML={{ __html: safe }} />;
};

export default HtmlBlock;
