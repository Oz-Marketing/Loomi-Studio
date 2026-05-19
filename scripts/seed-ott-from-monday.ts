/**
 * One-time import: seed OttAdsAd rows from the Monday board snapshot.
 *
 * Reads scripts/ott-monday-snapshot.json (curated from Monday board 906804162),
 * fuzzy-matches each campaign's dealer prefix against Account.dealer values,
 * and inserts an OttAdsAd row per matched campaign.
 *
 * Idempotent against (planId, name, period) — re-running won't duplicate.
 * Unmatched items are logged so you can manually map and re-run.
 *
 * Usage:
 *   npx tsx scripts/seed-ott-from-monday.ts [--dry-run] [--account-map=path.json]
 */
import { readFileSync } from 'fs';
import path from 'path';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from '@prisma/client';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({ adapter } as any);

interface SnapshotItem {
  id: string;
  name: string;
  status: string | null;
  platform: string | null;
  timerange: string | null; // "YYYY-MM-DD - YYYY-MM-DD"
  grossBudget: string | null;
  recurring: string | null;
  dueDate: string | null;
  completeDate: string | null;
  videoUrl: string | null;
  projectLink: string | null;
  assignedTo: string | null;
}

const STATUS_MAP: Record<string, string> = {
  'New Request': 'new_request',
  'Waiting On Video': 'waiting_on_video',
  'Working On It': 'working_on_it',
  Working: 'working_on_it',
  Updating: 'working_on_it',
  Acknowledged: 'working_on_it',
  Reccuring: 'working_on_it',
  Live: 'live',
  Stuck: 'on_hold',
  'On Hold': 'on_hold',
  'Past Due': 'past_due',
  Cancelled: 'cancelled',
  'Campaign Complete': 'complete',
};

const PLATFORM_MAP: Record<string, string> = {
  'Stack Adapt': 'stackadapt',
  StackAdapt: 'stackadapt',
  Hulu: 'hulu',
  TikTok: 'tiktok',
  Spotify: 'spotify',
  Choozle: 'choozle',
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function dealerPrefix(name: string): string {
  // Most names follow "Dealer Name - Campaign Description". Take everything
  // before the first " - ". Some names like "Young Honda Powerhouse" have
  // no separator → use the whole string.
  const idx = name.indexOf(' - ');
  return (idx > 0 ? name.slice(0, idx) : name).replace(/\s*\(copy\)\s*$/i, '').trim();
}

interface AccountRow {
  key: string;
  dealer: string;
  normalizedDealer: string;
}

function matchAccount(prefix: string, accounts: AccountRow[], override?: string): AccountRow | null {
  if (override) {
    const exact = accounts.find((a) => a.key === override);
    if (exact) return exact;
  }
  const norm = normalize(prefix);
  // Tier 1: exact normalized match
  for (const a of accounts) {
    if (a.normalizedDealer === norm) return a;
  }
  // Tier 2: prefix contains dealer or dealer contains prefix
  let best: AccountRow | null = null;
  let bestScore = 0;
  for (const a of accounts) {
    if (norm.startsWith(a.normalizedDealer) || a.normalizedDealer.startsWith(norm)) {
      const score = Math.min(a.normalizedDealer.length, norm.length);
      if (score > bestScore) {
        best = a;
        bestScore = score;
      }
    }
  }
  return best;
}

function parseTimerange(tr: string | null): { start: string | null; end: string | null } {
  if (!tr) return { start: null, end: null };
  const m = tr.match(/^(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})$/);
  if (!m) return { start: null, end: null };
  return { start: m[1], end: m[2] };
}

function periodFromDate(date: string | null): string {
  if (!date) return '';
  const m = date.match(/^(\d{4}-\d{2})/);
  return m ? m[1] : '';
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const dryRun = args.has('--dry-run');
  const accountMapArg = [...args].find((a) => a.startsWith('--account-map='));
  let manualMap: Record<string, string> = {};
  if (accountMapArg) {
    const mapPath = accountMapArg.slice('--account-map='.length);
    manualMap = JSON.parse(readFileSync(path.resolve(mapPath), 'utf8'));
  }

  const snapshotPath = path.resolve(__dirname, 'ott-monday-snapshot.json');
  const items: SnapshotItem[] = JSON.parse(readFileSync(snapshotPath, 'utf8'));

  const accountsRaw = await prisma.account.findMany({
    select: { key: true, dealer: true },
  });
  const accounts: AccountRow[] = accountsRaw
    .filter((a) => !a.key.startsWith('_'))
    .map((a) => ({ key: a.key, dealer: a.dealer, normalizedDealer: normalize(a.dealer) }));

  const matched: Array<{ item: SnapshotItem; account: AccountRow }> = [];
  const unmatched: SnapshotItem[] = [];

  for (const item of items) {
    const prefix = dealerPrefix(item.name);
    const override = manualMap[item.id] || manualMap[item.name];
    const account = matchAccount(prefix, accounts, override);
    if (account) matched.push({ item, account });
    else unmatched.push(item);
  }

  console.log(
    `[seed-ott-from-monday] ${items.length} items: ${matched.length} matched, ${unmatched.length} unmatched`,
  );

  if (unmatched.length > 0) {
    console.log('\n[unmatched]');
    for (const u of unmatched) {
      console.log(`  ${u.id} · "${u.name}" (prefix: "${dealerPrefix(u.name)}")`);
    }
    console.log(
      '\nProvide an account-map JSON to resolve. Format: { "<monday-id-or-name>": "<accountKey>" }',
    );
  }

  if (dryRun) {
    console.log('\n[dry-run] no writes performed.');
    return;
  }

  let created = 0;
  let skipped = 0;
  for (const { item, account } of matched) {
    const { start, end } = parseTimerange(item.timerange);
    const period = periodFromDate(start) || periodFromDate(item.dueDate);
    const status = STATUS_MAP[item.status ?? ''] ?? 'new_request';
    const platform =
      PLATFORM_MAP[item.platform ?? ''] ??
      (item.platform ? item.platform.toLowerCase().replace(/\s+/g, '') : 'stackadapt');
    const recurring =
      item.recurring && ['Yes', 'No', 'Unknown'].includes(item.recurring) ? item.recurring : 'No';
    const cleanName = item.name.replace(/\s*\(copy\)\s*$/i, '').trim();

    // Idempotency: skip if a row with this name + period already exists for this account.
    const plan = await prisma.ottAdsPlan.upsert({
      where: { accountKey: account.key },
      create: { accountKey: account.key },
      update: {},
    });
    const existing = await prisma.ottAdsAd.findFirst({
      where: { planId: plan.id, name: cleanName, period },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const maxPos = await prisma.ottAdsAd.aggregate({
      where: { planId: plan.id },
      _max: { position: true },
    });

    await prisma.ottAdsAd.create({
      data: {
        planId: plan.id,
        position: (maxPos._max.position ?? -1) + 1,
        name: cleanName,
        platform,
        period,
        status,
        recurring,
        flightStart: start,
        flightEnd: end,
        dueDate: item.dueDate,
        completeDate: item.completeDate,
        grossBudget: item.grossBudget,
        videoUrl: item.videoUrl,
        projectLink: item.projectLink,
        notes:
          item.assignedTo && !item.assignedTo.toLowerCase().includes('caitlin')
            ? `Monday assignee: ${item.assignedTo}`
            : null,
      },
    });
    created++;
    console.log(`  ✓ ${account.dealer} — "${cleanName}" (${period || 'no period'}, ${status})`);
  }

  console.log(`\n[done] created=${created} skipped=${skipped} unmatched=${unmatched.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[seed-ott-from-monday] failed', err);
    process.exit(1);
  });
