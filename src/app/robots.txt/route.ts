/**
 * Robots.txt — served on the studio host AND on every custom domain.
 *
 * Studio host:
 *   - Allow crawling of /lp/* (the public LP routes)
 *   - Disallow /api/, /websites, /forms, /flows, etc. (logged-in app)
 *   - Point at the studio-scoped sitemap
 *
 * Custom-domain host:
 *   - Allow everything (every path on a custom domain is LP content)
 *   - Point at the domain-scoped sitemap
 *
 * Both cases include a `Sitemap:` line so crawlers discover the
 * relevant LPs without us having to submit them manually.
 */
import { NextRequest, NextResponse } from 'next/server';
import { findVerifiedDomainByHostname } from '@/lib/services/account-domains';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const host = (req.headers.get('host') || '').toLowerCase();
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const onCustomDomain = host ? await findVerifiedDomainByHostname(host) : null;

  const sitemapUrl = `${proto}://${host}/lp-sitemap.xml`;

  // Custom-domain hosts only serve LP content, so everything is fair
  // game. Studio host needs to keep the authenticated app off-limits
  // for crawlers — robots.txt isn't an access control, but it stops
  // honest crawlers from wasting their budget on login walls.
  const body = onCustomDomain
    ? [
        'User-agent: *',
        'Allow: /',
        '',
        `Sitemap: ${sitemapUrl}`,
        '',
      ].join('\n')
    : [
        'User-agent: *',
        'Allow: /lp/',
        'Allow: /lp-sitemap.xml',
        'Disallow: /api/',
        'Disallow: /websites',
        'Disallow: /forms',
        'Disallow: /flows',
        'Disallow: /templates',
        'Disallow: /accounts',
        'Disallow: /admin',
        'Disallow: /settings',
        '',
        `Sitemap: ${sitemapUrl}`,
        '',
      ].join('\n');

  return new NextResponse(body, {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
