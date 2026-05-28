/**
 * Edge middleware — host-aware routing.
 *
 * Three host classes:
 *   1. Studio base host (`studio.loomilm.com`, localhost, APP_HOST_EXTRAS) —
 *      passthrough; serve the full app as-is.
 *   2. Reporting host (`reporting.loomilm.com`) — rewrite to `/reporting/*`
 *      so a single Next.js app serves the client-facing reporting surface
 *      from its own hostname while sharing components, DB, and auth.
 *   3. Custom landing-page domains (everything else) — rewrite to
 *      `/lp/<slug>`; the route resolves AccountDomain from the Host header.
 *
 * The original Host header is preserved through `NextResponse.rewrite`.
 */
import { NextRequest, NextResponse } from 'next/server';

/**
 * Sentinel slug used when the request is for the root path of a
 * custom domain. The `/lp/[slug]` route handler intercepts this and
 * resolves to the domain's configured `homeLandingPageId`.
 */
export const CUSTOM_DOMAIN_HOME_SLUG = '__home__';

// Hosts we serve our own studio UI from — never rewrite these.
function isBaseHost(host: string): boolean {
  const lower = host.toLowerCase();
  const base = resolveBaseHost();
  if (lower === base) return true;
  if (lower.startsWith('localhost:') || lower === 'localhost') return true;
  if (lower.endsWith('.localhost')) return true;
  // Vercel preview deployments, additional production aliases, etc.
  // Comma-separated for ops flexibility.
  const extras = (process.env.APP_HOST_EXTRAS ?? process.env.NEXT_PUBLIC_APP_HOST_EXTRAS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return extras.includes(lower);
}

/**
 * Where the studio UI lives. Resolved in order:
 *   1. Explicit override: NEXT_PUBLIC_APP_HOST or APP_HOST.
 *   2. Hostname parsed from NEXTAUTH_URL (every deploy already has
 *      this set; saves a duplicate env var).
 *   3. Hardcoded production fallback.
 */
function resolveBaseHost(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_HOST ?? process.env.APP_HOST;
  if (explicit) return explicit.toLowerCase();
  const fromNextAuth = process.env.NEXTAUTH_URL;
  if (fromNextAuth) {
    try {
      return new URL(fromNextAuth).host.toLowerCase();
    } catch {
      /* malformed — fall through */
    }
  }
  return 'studio.loomilm.com';
}

function resolveReportingHost(): string {
  const explicit = process.env.NEXT_PUBLIC_REPORTING_HOST ?? process.env.REPORTING_HOST;
  if (explicit) return explicit.toLowerCase();
  return 'reporting.loomilm.com';
}

function isReportingHost(host: string): boolean {
  const lower = host.toLowerCase();
  if (lower === resolveReportingHost()) return true;
  if (lower === 'reporting.localhost' || lower.startsWith('reporting.localhost:')) return true;
  return false;
}

export function middleware(req: NextRequest) {
  const host = req.headers.get('host');
  if (!host) return NextResponse.next();

  // Reporting subdomain — rewrite to /reporting/* so the studio host
  // and reporting host serve from one Next.js app. Check before
  // isBaseHost() since `*.localhost` would otherwise match as base.
  if (isReportingHost(host)) {
    if (req.nextUrl.pathname.startsWith('/reporting')) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = url.pathname === '/' ? '/reporting' : `/reporting${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  if (isBaseHost(host)) return NextResponse.next();

  // Custom hostname — rewrite to the LP route. First path segment is
  // the slug; empty path uses the sentinel home value.
  const url = req.nextUrl.clone();
  const segments = url.pathname.split('/').filter(Boolean);
  const slug = segments.length === 0 ? CUSTOM_DOMAIN_HOME_SLUG : segments[0]!;

  // Preserve sub-paths if any (LP at /a/b/c on a custom host doesn't
  // exist today, but rewriting only the first segment leaves room for
  // future nested routes without re-touching middleware).
  const remainder = segments.length > 1 ? '/' + segments.slice(1).join('/') : '';
  url.pathname = `/lp/${slug}${remainder}`;

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    // Run on everything EXCEPT:
    //   - /api/ + /api routes
    //   - /_next/ internals
    //   - /_static/, /favicon, /robots, /sitemap, /lp-sitemap
    //   - /lp/ canonical LP paths (already in the right shape)
    //   - /__nextjs/ debug routes
    '/((?!api/|_next/|_static/|__nextjs/|lp/|favicon\\.ico|robots\\.txt|sitemap\\.xml|lp-sitemap\\.xml).*)',
  ],
};
