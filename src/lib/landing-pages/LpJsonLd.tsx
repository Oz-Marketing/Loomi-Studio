/**
 * Schema.org JSON-LD injector for the public landing page.
 *
 * Search engines (Google in particular) read structured data to build
 * richer search results — sitelinks, image carousels, breadcrumbs.
 * We emit a single `WebPage` node per LP with the user-configured
 * title, description, canonical URL, publish + last-modified dates,
 * and the OG image when set.
 *
 * This is a server component — the script tag is rendered into the
 * HTML stream so crawlers see it without executing JavaScript.
 *
 * If you ever expand this, candidates to add:
 *   - BreadcrumbList for nested LP routes (we don't have any today)
 *   - Organization with the account's brand info (logo, sameAs, etc.)
 *   - FAQPage on LPs that contain an `faq` block (auto-derived from
 *     the schema's faq items — would need a v1 block walker here)
 */

interface LpJsonLdProps {
  /** Canonical public URL of the page. */
  url: string;
  /** Display title — falls back to LP name in the caller. */
  name: string;
  /** Optional meta description. */
  description?: string | null;
  /** Optional Open Graph image URL. Used as the `image` property. */
  imageUrl?: string | null;
  /** First publish time. Null when the page has never been published. */
  publishedAt?: string | null;
  /** Most recent edit time. Always set. */
  updatedAt: string;
}

export function LpJsonLd({
  url,
  name,
  description,
  imageUrl,
  publishedAt,
  updatedAt,
}: LpJsonLdProps) {
  // Build a clean WebPage node — omit undefined/null properties so the
  // emitted JSON is minimal and validators don't choke on null values.
  const node: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    url,
    name,
    dateModified: updatedAt,
  };
  if (description && description.trim().length > 0) {
    node.description = description.trim();
  }
  if (imageUrl && imageUrl.trim().length > 0) {
    node.image = imageUrl.trim();
  }
  if (publishedAt && publishedAt.trim().length > 0) {
    node.datePublished = publishedAt;
  }

  // Use the inline JSON-LD recommended pattern. `dangerouslySetInnerHTML`
  // is required because <script> children would be HTML-escaped by
  // React and break the parser. JSON.stringify produces safe-by-default
  // output — the values are all controlled strings, no user-input
  // HTML — but we still escape `</` defensively in case a description
  // ever contains it (defense-in-depth against script tag breakout).
  const json = JSON.stringify(node).replace(/</g, '\\u003c');

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- structured data
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
