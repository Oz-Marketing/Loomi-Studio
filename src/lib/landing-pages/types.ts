/**
 * Loomi landing-page template format (v1) — JSON, block-based.
 *
 * Mirrors the v1 FormTemplate shape in src/lib/forms/types.ts so the
 * editor shell can be reused with a different block registry. Where
 * forms have field_* blocks (text input, email, etc.), LPs have
 * marketing-focused blocks (hero, features, testimonial, faq) and an
 * `embedded_form` block that references a Form by id.
 *
 * Storage: `LandingPage.schema` is a JSON column holding a
 * `LandingPageTemplate`.
 * Rendering: `LandingPageTemplate` -> React tree of marketing
 * components -> plain browser HTML. The public page at /lp/[slug] is a
 * Next.js Server Component; client interactivity (embedded forms,
 * accordions, etc.) hydrates as needed.
 */

export type LandingPageBlockType =
  // Containers / structural
  | 'section'
  | 'columns'
  | 'spacer'
  | 'divider'
  // Headline / copy primitives
  | 'heading'
  | 'text'
  | 'image'
  // Marketing-focused blocks
  | 'hero'
  | 'feature_row'
  | 'feature_grid'
  | 'cta'
  | 'testimonial'
  | 'faq'
  | 'video'
  | 'logo_strip'
  // Embedded form — references an existing Loomi Form by id
  | 'embedded_form'
  // Reusable snippet — references an AccountSnippet by id. The
  // renderer expands the snippet's blocks inline at render time.
  | 'snippet'
  // Raw HTML escape hatch (advanced users)
  | 'html';

export interface Block {
  id: string;
  type: LandingPageBlockType;
  /** Desktop values (the base). */
  props: Record<string, unknown>;
  /** Sparse map of mobile-specific overrides. Only the keys the user
   *  has changed on mobile preview are stored here; everything else
   *  cascades from `props`. */
  mobileProps?: Record<string, unknown>;
  /** Only used for container blocks (`section`, `columns`). */
  children?: Block[];
}

/** Per-device viewport identity. The editor's preview toggle and the
 *  public page's media-query gate both speak this. */
export type LandingPageDevice = 'desktop' | 'mobile';

/**
 * Return the effective props for a block at the given device.
 * Desktop = the block's base `props`; mobile = base merged with the
 * sparse mobile overrides on top.
 */
export function effectiveProps(
  block: Block,
  device: LandingPageDevice,
): Record<string, unknown> {
  if (device === 'desktop' || !block.mobileProps) return block.props;
  return { ...block.props, ...block.mobileProps };
}

/** True when THIS block (not its descendants) has at least one
 *  mobile override. The public renderer uses this to decide whether
 *  to dual-render the block itself — descendants make their own
 *  decision recursively, so each subtree dual-renders at the deepest
 *  level it needs to and we avoid the N²-DOM trap of dual-rendering
 *  every ancestor of an overridden leaf. */
export function hasMobileOverrides(block: Block): boolean {
  return !!block.mobileProps && Object.keys(block.mobileProps).length > 0;
}

export interface LandingPageSettings {
  /** Outer page background (around the content container). */
  bodyBg: string;
  /** Content container background (the LP "card" / wrapper). */
  contentBg: string;
  /** Max content width in pixels — default 1140 for a typical
   *  marketing LP (wider than forms' default 640). */
  contentWidth: number;
  /** Inner padding of the content container, per-side, in px. */
  contentPaddingTop: number;
  contentPaddingRight: number;
  contentPaddingBottom: number;
  contentPaddingLeft: number;
  /** Outer margin around the content container, per-side, in px. */
  contentMarginTop: number;
  contentMarginRight: number;
  contentMarginBottom: number;
  contentMarginLeft: number;
  /** Corner radius of the content container, in px. 0 = edge-to-edge. */
  contentBorderRadius: number;
  /** Default font stack applied at the page root. */
  fontFamily: string;
  /** Default body text color. */
  textColor: string;
  /** Primary brand / accent color — used by Hero CTAs, buttons, etc.
   *  Defaults to a neutral indigo; users override per-page. */
  primaryColor: string;
}

export interface LandingPageTemplate {
  version: '1';
  /** Editor mode discriminator. Absent or 'blocks' = the block-based
   *  editor (this shape). 'html' lives in LandingPageHtmlTemplate. */
  mode?: 'blocks';
  title?: string;
  settings: LandingPageSettings;
  blocks: Block[];
}

/**
 * HTML-mode landing page — user owns the body HTML directly via the
 * Monaco editor. No block tree, no page-level settings (the user's
 * own CSS owns the entire visual). Form embeds use the
 * `<div data-loomi-form="<formId>"></div>` tag, which the public
 * page hydrates with the real interactive form via React portals.
 */
export interface LandingPageHtmlTemplate {
  version: '1';
  mode: 'html';
  title?: string;
  /** Body innerHTML — gets injected into the public page's <body>.
   *  The page's <html>, <head>, charset, viewport, and SEO meta are
   *  managed by Next, so users don't need to write a full document. */
  html: string;
}

/** Discriminated union of every LP content shape. New code should
 *  prefer this over `LandingPageTemplate` so HTML-mode pages aren't
 *  silently dropped. */
export type LandingPageContent = LandingPageTemplate | LandingPageHtmlTemplate;

export const DEFAULT_LP_SETTINGS: LandingPageSettings = {
  bodyBg: '#ffffff',
  contentBg: '#ffffff',
  contentWidth: 1140,
  contentPaddingTop: 0,
  contentPaddingRight: 0,
  contentPaddingBottom: 0,
  contentPaddingLeft: 0,
  contentMarginTop: 0,
  contentMarginRight: 0,
  contentMarginBottom: 0,
  contentMarginLeft: 0,
  contentBorderRadius: 0,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  textColor: '#1a1a1a',
  primaryColor: '#6366f1',
};

export function isV1LandingPageTemplate(content: unknown): content is LandingPageTemplate {
  if (!content || typeof content !== 'object') return false;
  const c = content as Record<string, unknown>;
  if (c.version !== '1') return false;
  if (c.mode === 'html') return false;
  return Array.isArray(c.blocks) && typeof c.settings === 'object';
}

export function isHtmlLandingPageTemplate(content: unknown): content is LandingPageHtmlTemplate {
  if (!content || typeof content !== 'object') return false;
  const c = content as Record<string, unknown>;
  return c.version === '1' && c.mode === 'html' && typeof c.html === 'string';
}

export function parseLandingPageTemplate(raw: unknown): LandingPageTemplate | null {
  const parsed = coerceJson(raw);
  return isV1LandingPageTemplate(parsed) ? parsed : null;
}

/** Parse the JSON column into either a blocks-mode or html-mode
 *  template. Returns null when the shape is unrecognized. */
export function parseLandingPageContent(raw: unknown): LandingPageContent | null {
  const parsed = coerceJson(raw);
  if (isHtmlLandingPageTemplate(parsed)) return parsed;
  if (isV1LandingPageTemplate(parsed)) return parsed;
  return null;
}

function coerceJson(raw: unknown): unknown {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

export function emptyLandingPageTemplate(): LandingPageTemplate {
  return {
    version: '1',
    settings: { ...DEFAULT_LP_SETTINGS },
    blocks: [],
  };
}

export function emptyHtmlLandingPageTemplate(): LandingPageHtmlTemplate {
  return {
    version: '1',
    mode: 'html',
    html: HTML_MODE_STARTER,
  };
}

/** Starter HTML for a fresh html-mode page. Shows the form-embed tag
 *  so users discover the pattern without having to dig through docs. */
const HTML_MODE_STARTER = `<main style="max-width: 720px; margin: 0 auto; padding: 64px 24px; font-family: system-ui, sans-serif;">
  <h1>Hello, world.</h1>
  <p>Edit this HTML to build your page. To embed a Loomi form, drop in a tag like this:</p>
  <pre style="background: #f4f4f5; padding: 12px; border-radius: 6px; overflow: auto;">&lt;div data-loomi-form="FORM_ID"&gt;&lt;/div&gt;</pre>
  <p>Use the <strong>Insert form</strong> button above to pick a form and inject the tag at your cursor.</p>
</main>
`;

/**
 * Walk a landing page template and return every embedded-form block
 * (type === 'embedded_form'). Used by the public renderer to fetch
 * the referenced Form schemas in a single Prisma round-trip.
 */
export function collectEmbeddedFormIds(template: LandingPageTemplate): string[] {
  const ids = new Set<string>();
  const walk = (blocks: Block[]) => {
    for (const block of blocks) {
      if (block.type === 'embedded_form') {
        const formId = block.props?.formId;
        if (typeof formId === 'string' && formId.length > 0) ids.add(formId);
      }
      if (block.children?.length) walk(block.children);
    }
  };
  walk(template.blocks);
  return Array.from(ids);
}

/** Scan HTML-mode content for `data-loomi-form="..."` placeholders.
 *  Used by the public route to pre-fetch the referenced forms server-
 *  side, same way collectEmbeddedFormIds drives the blocks path. The
 *  regex tolerates double-quoted, single-quoted, or unquoted ids. */
export function collectFormIdsFromHtml(html: string): string[] {
  const ids = new Set<string>();
  const re = /data-loomi-form\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/gi;
  for (const match of html.matchAll(re)) {
    const id = match[1] ?? match[2] ?? match[3];
    if (id && id.length > 0) ids.add(id);
  }
  return Array.from(ids);
}

/** Mode-agnostic form-id collector. Returns every form id referenced
 *  by an LP, regardless of whether it lives in a block tree or an
 *  HTML embed tag. */
export function collectFormIdsFromContent(content: LandingPageContent): string[] {
  if (isHtmlLandingPageTemplate(content)) return collectFormIdsFromHtml(content.html);
  return collectEmbeddedFormIds(content);
}

// ── Reusable snippets ──────────────────────────────────────────────
//
// An AccountSnippet is a named bundle of LP blocks. LPs reference a
// snippet via a `snippet` block (props.snippetId); the renderer
// expands the snippet's blocks inline at render time. Snippets are
// account-scoped; the picker only lists snippets from the same
// account as the LP being edited.

export interface SnippetContent {
  version: '1';
  blocks: Block[];
}

export function isSnippetContent(content: unknown): content is SnippetContent {
  if (!content || typeof content !== 'object') return false;
  const c = content as Record<string, unknown>;
  return c.version === '1' && Array.isArray(c.blocks);
}

export function parseSnippetContent(raw: unknown): SnippetContent | null {
  const parsed = coerceJson(raw);
  return isSnippetContent(parsed) ? parsed : null;
}

export function emptySnippetContent(): SnippetContent {
  return { version: '1', blocks: [] };
}

/** Walk an LP (or another snippet) and return every snippet id
 *  referenced by a `snippet` block. Used by the public renderer to
 *  preload referenced snippets in parallel. */
export function collectSnippetIds(template: LandingPageTemplate | SnippetContent): string[] {
  const ids = new Set<string>();
  const walk = (blocks: Block[]) => {
    for (const block of blocks) {
      if (block.type === 'snippet') {
        const snippetId = block.props?.snippetId;
        if (typeof snippetId === 'string' && snippetId.length > 0) ids.add(snippetId);
      }
      if (block.children?.length) walk(block.children);
    }
  };
  walk(template.blocks);
  return Array.from(ids);
}

/** True if the block tree contains a `snippet` block anywhere.
 *  Snippet schemas can't contain other snippets — cycle detection at
 *  the validation layer rejects nested refs before they hit the DB. */
export function hasNestedSnippetRefs(blocks: Block[]): boolean {
  for (const block of blocks) {
    if (block.type === 'snippet') return true;
    if (block.children?.length && hasNestedSnippetRefs(block.children)) return true;
  }
  return false;
}
