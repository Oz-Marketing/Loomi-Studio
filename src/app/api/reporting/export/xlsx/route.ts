/**
 * Report Excel export — POST /api/reporting/export/xlsx
 *
 * The client posts a normalized ReportDoc (built from data it already
 * rendered) and gets back a formatted .xlsx workbook. Platform-agnostic, so
 * every reporting tab shares it. The body carries only display values the
 * caller already saw on screen — no account secrets — so there's nothing
 * further to scope beyond the reporting-access guard.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireReportingAccess } from '../../_lib/guard';
import { renderReportXlsx } from '@/lib/reporting/xlsx';
import type { ReportDoc } from '@/lib/reporting/report-doc';

export const dynamic = 'force-dynamic';

function isValidDoc(d: unknown): d is ReportDoc {
  if (!d || typeof d !== 'object') return false;
  const doc = d as Record<string, unknown>;
  if (typeof doc.title !== 'string') return false;
  if (!Array.isArray(doc.sections)) return false;
  return doc.sections.every(
    (s) =>
      s &&
      typeof s === 'object' &&
      typeof (s as ReportDoc['sections'][number]).title === 'string' &&
      Array.isArray((s as ReportDoc['sections'][number]).columns) &&
      Array.isArray((s as ReportDoc['sections'][number]).rows),
  );
}

function sanitizeFileName(value: string): string {
  const safe = value.trim().toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return safe || 'report';
}

export async function POST(req: NextRequest) {
  const { error } = await requireReportingAccess();
  if (error) return error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!isValidDoc(body)) {
    return NextResponse.json({ error: 'Malformed report document' }, { status: 400 });
  }

  try {
    const xlsx = await renderReportXlsx(body);
    const filename = `${sanitizeFileName(body.title)}.xlsx`;
    return new NextResponse(xlsx as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[reporting/export/xlsx] failed', err);
    const message = err instanceof Error ? err.message : 'Excel export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
