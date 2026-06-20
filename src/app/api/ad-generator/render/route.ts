/**
 * Ad Generator render — POST /api/ad-generator/render
 *
 * Body: { templateId, sizeId, data }. Looks up the (code-defined) template,
 * renders its HTML for the chosen size, rasterizes to PNG via headless Chromium,
 * and returns the image as a download. Same template function as the client
 * preview → pixel-identical output.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/api-auth';
import { getTemplate } from '@/lib/ad-generator/templates';
import { renderAd } from '@/lib/ad-generator/render';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const session = await getAuthSession();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { templateId?: string; sizeId?: string; data?: Record<string, string> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const template = getTemplate(body.templateId ?? '');
  if (!template) return NextResponse.json({ error: 'Unknown template' }, { status: 400 });
  const size = template.sizes.find((s) => s.id === body.sizeId);
  if (!size) return NextResponse.json({ error: 'Unknown size' }, { status: 400 });

  const html = template.render({ ...template.defaults, ...(body.data ?? {}) }, size);

  try {
    const png = await renderAd({ html, width: size.width, height: size.height });
    return new NextResponse(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${template.id}-${size.id}.png"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[ad-generator/render] failed', err);
    return NextResponse.json({ error: 'Render failed' }, { status: 500 });
  }
}
