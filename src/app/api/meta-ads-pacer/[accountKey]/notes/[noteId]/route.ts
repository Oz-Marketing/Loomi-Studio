import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';
import { canAccessPacer } from '@/lib/meta-ads-pacer';

/**
 * Update the text of a single account-level pacer note. Only the original
 * author can edit (delete remains open to anyone with pacer access, matching
 * the per-ad note pattern).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ accountKey: string; noteId: string }> },
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { accountKey, noteId } = await params;
  if (!canAccessPacer(session, accountKey)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  let body: { text?: unknown };
  try {
    body = (await req.json()) as { text?: unknown };
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text) {
    return NextResponse.json({ error: 'Text is required' }, { status: 400 });
  }

  const note = await prisma.metaAdsPacerAccountNote.findUnique({
    where: { id: noteId },
    select: { accountKey: true, authorUserId: true },
  });
  if (!note || note.accountKey !== accountKey) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 });
  }
  if (note.authorUserId && note.authorUserId !== session!.user.id) {
    return NextResponse.json(
      { error: 'Only the author can edit this note' },
      { status: 403 },
    );
  }

  const updated = await prisma.metaAdsPacerAccountNote.update({
    where: { id: noteId },
    data: { text },
    select: {
      id: true,
      text: true,
      createdAt: true,
      authorUserId: true,
    },
  });

  return NextResponse.json({
    id: updated.id,
    text: updated.text,
    createdAt: updated.createdAt.toISOString(),
    authorUserId: updated.authorUserId,
  });
}

/**
 * Delete a single account-level pacer note. Anyone with pacer access on
 * the parent account can remove notes; mirrors the per-ad note delete
 * route (no author-only restriction).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ accountKey: string; noteId: string }> },
) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { accountKey, noteId } = await params;
  if (!canAccessPacer(session, accountKey)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const note = await prisma.metaAdsPacerAccountNote.findUnique({
    where: { id: noteId },
    select: { accountKey: true },
  });
  if (!note || note.accountKey !== accountKey) {
    return NextResponse.json({ error: 'Note not found' }, { status: 404 });
  }

  await prisma.metaAdsPacerAccountNote.delete({ where: { id: noteId } });
  return NextResponse.json({ ok: true });
}
