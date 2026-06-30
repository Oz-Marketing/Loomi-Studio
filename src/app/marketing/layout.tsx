import type { Metadata } from 'next';
import { SITE, marketingBaseUrl } from '@/lib/marketing/seo';

/**
 * Marketing-site metadata. `metadataBase` makes every relative canonical /
 * Open Graph URL resolve against the marketing apex, so child pages can set
 * `alternates.canonical: '/pricing'` (etc.) and get a correct absolute URL.
 *
 * This layout adds no chrome — the root layout already renders the marketing
 * surface full-bleed (no admin sidebar). It exists purely to scope SEO
 * metadata to the /marketing tree.
 */
export const metadata: Metadata = {
  metadataBase: new URL(marketingBaseUrl()),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [...SITE.keywords],
  applicationName: SITE.name,
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    type: 'website',
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: marketingBaseUrl(),
  },
  twitter: {
    card: 'summary_large_image',
    site: SITE.twitter,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
