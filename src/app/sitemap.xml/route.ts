/**
 * Marketing-site sitemap (loomilm.com/sitemap.xml).
 *
 * Lists the public marketing URLs with canonical absolute locs derived from
 * the configured marketing host. As the site grows, add paths to MARKETING_PATHS
 * — that's the only edit needed to keep the sitemap current.
 *
 * Note: the per-account/LP sitemap lives separately at /lp-sitemap.xml.
 */
import { NextResponse } from 'next/server';
import { marketingBaseUrl } from '@/lib/marketing/seo';

export const dynamic = 'force-dynamic';

/** Public marketing routes, relative to the marketing apex. */
const MARKETING_PATHS = [{ path: '/', priority: '1.0', changefreq: 'weekly' }] as const;

export async function GET() {
  const base = marketingBaseUrl();
  const lastmod = new Date().toISOString().slice(0, 10);

  const urls = MARKETING_PATHS.map(
    ({ path, priority, changefreq }) =>
      `  <url>\n    <loc>${base}${path === '/' ? '' : path}/</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
  ).join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      'cache-control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
