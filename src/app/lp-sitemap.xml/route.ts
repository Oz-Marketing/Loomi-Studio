/**
 * Public sitemap of all crawlable landing pages.
 *
 * Served at:
 *   - studio.loomilm.com/lp-sitemap.xml — every published LP whose
 *     owning account has NO verified custom domain. LPs that live on
 *     a custom domain are excluded here so search engines don't see
 *     them as duplicate content with the custom-domain copy.
 *   - <custom-host>/lp-sitemap.xml — every published LP in the
 *     account that owns the custom domain, with URLs scoped to the
 *     requesting host (or to `/` when the LP is configured as that
 *     domain's home).
 *
 * Excluded in both cases:
 *   - draft pages
 *   - pages with `noindex = true`
 *
 * Lastmod uses LandingPage.updatedAt so a page that's been edited
 * recently gets re-crawled sooner.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findVerifiedDomainByHostname } from '@/lib/services/account-domains';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const host = (req.headers.get('host') || '').toLowerCase();
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const onCustomDomain = host ? await findVerifiedDomainByHostname(host) : null;

  // ── Scope LP set + canonical URL helper based on requesting host ──
  let pages: Array<{ id: string; slug: string; updatedAt: Date }>;
  let urlFor: (slug: string) => string;

  if (onCustomDomain) {
    // Custom-host sitemap — every published, indexable LP in this
    // account. The LP that's configured as the domain home lives at
    // `/` on this host; everything else lives at `/<slug>`.
    const homeId = onCustomDomain.homeLandingPageId;
    pages = await prisma.landingPage.findMany({
      where: {
        accountKey: onCustomDomain.accountKey,
        status: 'published',
        noindex: false,
      },
      select: { id: true, slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
    const homeSlug = homeId
      ? pages.find((p) => p.id === homeId)?.slug ?? null
      : null;
    urlFor = (slug: string) =>
      homeSlug === slug ? `${proto}://${host}/` : `${proto}://${host}/${slug}`;
  } else {
    // Studio-host sitemap — exclude any LP whose account has a
    // verified custom domain. Those LPs' canonical URLs live on the
    // custom host and are advertised by *that* host's sitemap.
    const accountsWithDomain = await prisma.accountDomain.findMany({
      where: { verifiedAt: { not: null } },
      select: { accountKey: true },
    });
    const excludeAccountKeys = Array.from(
      new Set(accountsWithDomain.map((d) => d.accountKey)),
    );
    pages = await prisma.landingPage.findMany({
      where: {
        status: 'published',
        noindex: false,
        ...(excludeAccountKeys.length > 0
          ? { accountKey: { notIn: excludeAccountKeys } }
          : {}),
      },
      select: { id: true, slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
    urlFor = (slug: string) => `${proto}://${host}/lp/${slug}`;
  }

  const xml = buildSitemapXml(
    pages.map((p) => ({ loc: urlFor(p.slug), lastmod: p.updatedAt })),
  );

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      // Short cache so freshly-published pages show up within minutes
      // without us hammering the DB on every crawl request.
      'cache-control': 'public, max-age=300, s-maxage=300',
    },
  });
}

interface SitemapEntry {
  loc: string;
  lastmod: Date;
}

function buildSitemapXml(entries: SitemapEntry[]): string {
  const escaped = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const urls = entries
    .map(
      (e) =>
        `  <url>\n    <loc>${escaped(e.loc)}</loc>\n    <lastmod>${e.lastmod.toISOString()}</lastmod>\n  </url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
