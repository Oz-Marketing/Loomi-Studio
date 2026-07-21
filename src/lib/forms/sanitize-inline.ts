import DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitize author-supplied inline HTML for form text — the Consent
 * field body and the Text block's "Allow HTML" mode. Lets form builders
 * embed links (e.g. Privacy Policy / Terms) and light inline formatting
 * while blocking every injection vector before it reaches the public
 * /f/[slug] page.
 *
 * Uses isomorphic-dompurify so the same call works in the browser
 * (editor preview) and in the Node render path (public page, jsdom).
 *
 * Scope is deliberately inline-only: anchors + basic emphasis, no block
 * or embed tags. ALLOWED_URI_REGEXP restricts hrefs to safe schemes so
 * `javascript:` / `data:` links can't slip through. Modern browsers add
 * `rel=noopener` to target=_blank links automatically; authors may also
 * set `rel` explicitly since it's an allowed attribute.
 */
const SAFE_URI_REGEX = /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i;

const INLINE_TAGS = ['a', 'b', 'strong', 'i', 'em', 'u', 'br', 'span'];
const INLINE_ATTR = ['href', 'target', 'rel'];

export function sanitizeInlineHtml(input: string): string {
  if (!input) return '';
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: INLINE_TAGS,
    ALLOWED_ATTR: INLINE_ATTR,
    ALLOWED_URI_REGEXP: SAFE_URI_REGEX,
  });
}
