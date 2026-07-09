/**
 * Public beacon endpoint for landing-page visitor events.
 *
 * Visitors are anonymous, so this route is unauthenticated. Defenses:
 *   - Hash IP addresses with a daily-rotating salt before storage —
 *     keeps the same visitor identifiable within a day (for unique
 *     counts) but means leaked DB rows can't be reverse-mapped.
 *   - Bound payload size (cap on referrer / user-agent / meta size).
 *   - Validate event type against a small allowlist so attackers
 *     can't inject arbitrary type strings.
 *   - Validate that the LP exists AND is published. Drafts shouldn't
 *     accumulate events (the public route 404s for drafts anyway,
 *     but a bot guessing slugs could otherwise pollute the table).
 *
 * Designed to be hit via `navigator.sendBeacon` so it survives page
 * unload — no response body is required by the client, but we still
 * return JSON for debuggability.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const ALLOWED_TYPES = new Set([
  'view',
  'cta_click',
  'form_submit',
  'scroll_25',
  'scroll_50',
  'scroll_75',
  'scroll_100',
]);

const MAX_STRING = 512;
const MAX_META_BYTES = 2 * 1024; // 2KB JSON ceiling per event

interface EventBody {
  pageId?: unknown;
  slug?: unknown;
  type?: unknown;
  sessionId?: unknown;
  anonId?: unknown;
  referrer?: unknown;
  utm?: {
    source?: unknown;
    medium?: unknown;
    campaign?: unknown;
    term?: unknown;
    content?: unknown;
  };
  meta?: unknown;
}

export async function POST(req: NextRequest) {
  let body: EventBody;
  try {
    body = (await req.json()) as EventBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const pageId = pickString(body.pageId, 100);
  const slug = pickString(body.slug, 200);
  const type = pickString(body.type, 32);

  if (!pageId || !slug || !type) {
    return NextResponse.json({ error: 'pageId, slug, and type are required' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(type)) {
    return NextResponse.json({ error: `Unknown event type "${type}"` }, { status: 400 });
  }

  // Confirm the LP exists AND is published. Drops bot/probe traffic
  // for unknown slugs without revealing whether the id exists.
  const page = await prisma.landingPage.findUnique({
    where: { id: pageId },
    select: { id: true, slug: true, status: true },
  });
  if (!page || page.status !== 'published' || page.slug !== slug) {
    // Generic 202-ish silent accept so probes can't enumerate.
    return NextResponse.json({ ok: true });
  }

  const userAgent = pickString(req.headers.get('user-agent'), MAX_STRING);
  const ip = extractIp(req);
  const ipHash = ip ? hashIpDaily(ip) : null;

  const meta = sanitizeMeta(body.meta);
  if (meta === undefined) {
    return NextResponse.json({ error: 'meta exceeds size limit' }, { status: 413 });
  }

  await prisma.landingPageEvent.create({
    data: {
      pageId: page.id,
      slug: page.slug,
      type,
      sessionId: pickString(body.sessionId, 100),
      anonId: pickString(body.anonId, 100),
      referrer: pickString(body.referrer, MAX_STRING),
      userAgent,
      ipHash,
      utmSource: pickString(body.utm?.source, 200),
      utmMedium: pickString(body.utm?.medium, 200),
      utmCampaign: pickString(body.utm?.campaign, 200),
      utmTerm: pickString(body.utm?.term, 200),
      utmContent: pickString(body.utm?.content, 200),
      meta: (meta as Prisma.InputJsonValue) ?? undefined,
    },
  });

  return NextResponse.json({ ok: true });
}

// ── Helpers ────────────────────────────────────────────────────────

function pickString(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function extractIp(req: NextRequest): string | null {
  // Prefer x-forwarded-for (set by the reverse proxy / load balancer);
  // fall back to x-real-ip. Take the first hop only — later entries
  // can be spoofed by the client.
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || null;
  const realIp = req.headers.get('x-real-ip');
  return realIp?.trim() || null;
}

/**
 * SHA-256 of `IP + daily-rotating salt`. Same visitor on the same
 * day yields the same hash (so we can de-dupe in unique-visitor
 * counts); a leaked DB row can't be reversed to the IP since the
 * salt isn't stored alongside.
 *
 * The salt rotates daily on a stable basis (today's UTC date +
 * process env secret). If LP_EVENT_IP_SALT is unset we still hash —
 * just less defensively — to keep dev environments working.
 */
function hashIpDaily(ip: string): string {
  const dayKey = new Date().toISOString().slice(0, 10);
  const salt = process.env.LP_EVENT_IP_SALT ?? 'loomi-lp-events';
  return createHash('sha256').update(`${ip}|${dayKey}|${salt}`).digest('hex');
}

function sanitizeMeta(meta: unknown): Record<string, unknown> | null | undefined {
  if (meta == null) return null;
  if (typeof meta !== 'object' || Array.isArray(meta)) return null;
  try {
    const json = JSON.stringify(meta);
    if (json.length > MAX_META_BYTES) return undefined;
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}
