/**
 * Account-scoped reusable snippets (header / footer / disclaimer).
 *
 * A snippet is a named bundle of LP blocks; LPs reference one via a
 * `snippet` block (props.snippetId). When the snippet is edited,
 * every LP that references it re-renders the new content on the next
 * request — no need to re-publish each LP.
 *
 * Snippets can NOT contain other snippet refs (cycle protection).
 * The validation layer rejects any patch that would introduce a
 * nested ref.
 */
import { Prisma, type AccountSnippet } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  emptySnippetContent,
  hasNestedSnippetRefs,
  isSnippetContent,
  parseSnippetContent,
  type SnippetContent,
} from '@/lib/landing-pages/types';

export class AccountSnippetServiceError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = 'AccountSnippetServiceError';
  }
}

export type SnippetKind = 'header' | 'footer' | 'disclaimer' | 'generic';

const KINDS: SnippetKind[] = ['header', 'footer', 'disclaimer', 'generic'];
const isKind = (v: unknown): v is SnippetKind =>
  typeof v === 'string' && (KINDS as string[]).includes(v);

export interface AccountSnippetSummary {
  id: string;
  accountKey: string;
  name: string;
  kind: SnippetKind;
  schema: SnippetContent;
  createdAt: string;
  updatedAt: string;
  /** Block count — surface on the list page without paying the cost
   *  of rendering the schema in the UI. */
  blockCount: number;
}

function toSummary(row: AccountSnippet): AccountSnippetSummary {
  // Default to an empty content shape if the row's JSON is somehow
  // malformed — better than crashing the picker / list view.
  const parsed = parseSnippetContent(row.schema) ?? emptySnippetContent();
  return {
    id: row.id,
    accountKey: row.accountKey,
    name: row.name,
    kind: isKind(row.kind) ? row.kind : 'generic',
    schema: parsed,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    blockCount: parsed.blocks.length,
  };
}

// ── List / read ────────────────────────────────────────────────────

export async function listAccountSnippets(
  accountKeys?: string[] | null,
): Promise<AccountSnippetSummary[]> {
  const rows = await prisma.accountSnippet.findMany({
    where:
      accountKeys && accountKeys.length > 0
        ? { accountKey: { in: accountKeys } }
        : undefined,
    orderBy: { updatedAt: 'desc' },
  });
  return rows.map(toSummary);
}

export async function getAccountSnippet(
  id: string,
  accountKeys: string[] | null,
): Promise<AccountSnippetSummary | null> {
  const row = await prisma.accountSnippet.findUnique({ where: { id } });
  if (!row) return null;
  if (accountKeys && accountKeys.length > 0 && !accountKeys.includes(row.accountKey)) {
    return null;
  }
  return toSummary(row);
}

/** Bulk fetch by ids. Used by the public LP renderer to preload
 *  every snippet referenced on a page in a single Prisma round-trip
 *  (same pattern as the form preloading on /lp/[slug]). Filters to
 *  the page's account so we never inline another account's snippet
 *  in a copy-pasted block tree. */
export async function getSnippetsByIds(
  ids: string[],
  accountKey: string,
): Promise<Map<string, AccountSnippetSummary>> {
  if (ids.length === 0) return new Map();
  const rows = await prisma.accountSnippet.findMany({
    where: { id: { in: ids }, accountKey },
  });
  const map = new Map<string, AccountSnippetSummary>();
  for (const row of rows) map.set(row.id, toSummary(row));
  return map;
}

// ── Create / update / delete ───────────────────────────────────────

export async function createAccountSnippet(input: {
  accountKey: string;
  name: string;
  kind?: SnippetKind;
  schema?: SnippetContent;
  createdByUserId?: string;
}): Promise<AccountSnippetSummary> {
  const name = input.name?.trim();
  if (!name) throw new AccountSnippetServiceError('Name is required.');
  if (name.length > 120) {
    throw new AccountSnippetServiceError('Name is too long (max 120 chars).');
  }

  const schema = input.schema ?? emptySnippetContent();
  // Belt-and-suspenders cycle guard — UI shouldn't let a user insert
  // a snippet block while editing a snippet, but server-side validation
  // protects against direct API misuse.
  if (hasNestedSnippetRefs(schema.blocks)) {
    throw new AccountSnippetServiceError(
      'Snippets can\'t contain other snippet blocks.',
    );
  }

  const row = await prisma.accountSnippet.create({
    data: {
      accountKey: input.accountKey,
      name,
      kind: input.kind ?? 'generic',
      schema: schema as unknown as Prisma.InputJsonValue,
      createdByUserId: input.createdByUserId,
    },
  });
  return toSummary(row);
}

export async function updateAccountSnippet(
  id: string,
  accountKeys: string[] | null,
  patch: {
    name?: unknown;
    kind?: unknown;
    schema?: unknown;
  },
): Promise<AccountSnippetSummary> {
  const existing = await prisma.accountSnippet.findUnique({ where: { id } });
  if (!existing) throw new AccountSnippetServiceError('Not found.', 404);
  if (accountKeys && accountKeys.length > 0 && !accountKeys.includes(existing.accountKey)) {
    throw new AccountSnippetServiceError('Not found.', 404);
  }

  const data: Prisma.AccountSnippetUpdateInput = {};

  if (patch.name !== undefined) {
    if (typeof patch.name !== 'string' || !patch.name.trim()) {
      throw new AccountSnippetServiceError('Name must be a non-empty string.');
    }
    if (patch.name.trim().length > 120) {
      throw new AccountSnippetServiceError('Name is too long (max 120 chars).');
    }
    data.name = patch.name.trim();
  }

  if (patch.kind !== undefined) {
    if (!isKind(patch.kind)) {
      throw new AccountSnippetServiceError(
        `Kind must be one of: ${KINDS.join(', ')}.`,
      );
    }
    data.kind = patch.kind;
  }

  if (patch.schema !== undefined) {
    if (!isSnippetContent(patch.schema)) {
      throw new AccountSnippetServiceError(
        'Schema must be a v1 snippet content (version + blocks).',
      );
    }
    if (hasNestedSnippetRefs(patch.schema.blocks)) {
      throw new AccountSnippetServiceError(
        'Snippets can\'t contain other snippet blocks.',
      );
    }
    data.schema = patch.schema as unknown as Prisma.InputJsonValue;
  }

  const row = await prisma.accountSnippet.update({ where: { id }, data });
  return toSummary(row);
}

export async function deleteAccountSnippet(
  id: string,
  accountKeys: string[] | null,
): Promise<void> {
  const existing = await prisma.accountSnippet.findUnique({ where: { id } });
  if (!existing) throw new AccountSnippetServiceError('Not found.', 404);
  if (accountKeys && accountKeys.length > 0 && !accountKeys.includes(existing.accountKey)) {
    throw new AccountSnippetServiceError('Not found.', 404);
  }
  await prisma.accountSnippet.delete({ where: { id } });
}
