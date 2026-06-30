/**
 * Central SEO config for the public marketing site (loomilm.com).
 *
 * Everything the marketing pages need for metadata, Open Graph, Twitter
 * cards, JSON-LD structured data, and the sitemap lives here so that as the
 * site grows we extend ONE file rather than chasing tags across pages.
 *
 * `marketingBaseUrl()` resolves the canonical origin from the configured
 * marketing host (NEXT_PUBLIC_MARKETING_HOST / MARKETING_HOST), defaulting to
 * the prod apex. Canonical/OG/sitemap URLs all derive from it.
 */

export const SITE = {
  name: 'Loomi',
  /** Longer brand name for titles / JSON-LD. */
  legalName: 'Loomi',
  /** One-line value prop — reused in the hero, meta description, OG. */
  tagline: 'The AI marketing platform.',
  description:
    'Loomi is an AI-native marketing platform — campaigns, flows, landing pages, and analytics, built together in one place. Something extraordinary is taking shape.',
  /** Keywords are low-signal for ranking now, but harmless and easy to extend. */
  keywords: [
    'Loomi',
    'AI marketing platform',
    'marketing automation',
    'email marketing',
    'SMS marketing',
    'campaign builder',
    'landing pages',
    'marketing analytics',
  ],
  twitter: '@loomi',
} as const;

/** The canonical marketing host, lowercased (no protocol). */
export function marketingHost(): string {
  return (
    process.env.NEXT_PUBLIC_MARKETING_HOST ??
    process.env.MARKETING_HOST ??
    'loomilm.com'
  ).toLowerCase();
}

/**
 * Absolute canonical origin for the marketing site, e.g. `https://loomilm.com`.
 * Always https for the prod apex; http for local `*.localhost` dev hosts.
 */
export function marketingBaseUrl(): string {
  const host = marketingHost();
  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}
