# Cutover: `prisma db push` → `prisma migrate deploy`

## Why

Both deploy workflows and CI run **`prisma db push --accept-data-loss`** from
`schema.prisma` (`package.json` → `build` + `deploy:prepare`). That flag means a
schema regression — a column removed/renamed by a bad merge, a typo — is applied
to prod **silently, dropping the column and its data**, with no migration record
and no prompt. This runbook switches the deploy to `prisma migrate deploy`, which
applies reviewed, ordered migration files and never silently destroys data.

## Current state (verified 2026-06-19)

- `prisma/migrations/` has **50 migrations** (+ `migrations_archive/` from the
  SQLite→Postgres move) with a valid `migration_lock.toml` (postgresql).
- **No workflow or script ever runs `prisma migrate deploy/dev/resolve/status`.**
  Migrations are authored locally via `migrate dev` but applied **nowhere** —
  every environment's schema comes from `db push`.
- Therefore prod/staging schema == `schema.prisma`, and their
  `_prisma_migrations` table is **absent or stale** (db push never writes it).
- `prisma validate` passes.
- ⚠️ **6 of the 50 migrations contain SQLite SQL** (`datetime`, etc.) left over
  from before the Postgres move. Verified 2026-06-19 by replaying the dir onto a
  throwaway Postgres shadow: it **fails on migration #1**
  (`ERROR: type "datetime" does not exist`). The history is **not replayable on
  Postgres** — so you cannot baseline-then-deploy the existing dir as-is.

The fix is a **squash**: generate one fresh, clean Postgres baseline from
`schema.prisma` (validated — 54 tables, `TIMESTAMP(3)`, zero `datetime`), archive
the old mixed migrations, then mark that single baseline as already-applied on
each DB (whose schema already matches it). You never replay the old SQLite-era
history. After cutover, new changes stack cleanly on the baseline via
`migrate dev`.

## Prerequisites

- A **disposable Postgres** as the `migrate dev` shadow DB for authoring future
  migrations (local Docker, Homebrew `postgres@16`, or a throwaway DO database —
  never point it at prod). Not needed for the baseline-generation step itself.
- DO managed-Postgres **snapshot** of prod taken immediately before cutover.
- Do the whole thing on **staging first**, verify, then prod.

---

## Step 1 — Squash to one clean Postgres baseline

Archive the old (SQLite-contaminated) history and generate a single baseline from
`schema.prisma`. No DB connection needed — `--from-empty --to-schema` is pure
schema→SQL.

```bash
# 1. Archive the old mixed history (keep it in git history; out of the deploy path).
git mv prisma/migrations prisma/migrations_pre_postgres_squash

# 2. Create the single baseline migration dir.
BASELINE="prisma/migrations/00000000000000_squashed_baseline"
mkdir -p "$BASELINE"
npx prisma migrate diff \
  --from-empty \
  --to-schema ./prisma/schema.prisma \
  --script > "$BASELINE/migration.sql"

# 3. Restore the lock file (postgresql) into the fresh dir.
printf 'provider = "postgresql"\n' > prisma/migrations/migration_lock.toml

# 4. Sanity: the baseline must be clean Postgres (no SQLite types).
grep -c 'CREATE TABLE' "$BASELINE/migration.sql"   # ~54
grep -ci 'datetime'    "$BASELINE/migration.sql"   # must be 0
```

Verify the baseline reproduces the schema exactly (replay it onto a throwaway
shadow and diff against `schema.prisma` — this now works because the baseline is
clean PG):

```bash
createdb prisma_baseline_check
# set datasource.shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL in prisma.config.ts (temporarily)
SHADOW="postgresql://$(whoami)@localhost/prisma_baseline_check?host=/tmp" \
DATABASE_URL="$SHADOW" SHADOW_DATABASE_URL="$SHADOW" \
  npx prisma migrate diff --from-migrations ./prisma/migrations \
    --to-schema ./prisma/schema.prisma --exit-code   # expect exit 0
dropdb prisma_baseline_check
git commit -am "chore(db): squash SQLite-era migrations into one Postgres baseline"
```

## Step 2 — Baseline staging, then prod (mark the single migration applied)

Each DB already has the schema, so record the one baseline migration as applied
**without running its SQL** (`scripts/baseline-prisma-migrations.sh` loops
`migrate resolve --applied`; after the squash there's just the one).

```bash
# STAGING first. DATABASE_URL points at the STAGING db.
export DATABASE_URL="<staging-db-url>"
npx prisma migrate status           # expect: 1 migration "have not yet been applied"
bash scripts/baseline-prisma-migrations.sh --confirm
npx prisma migrate status           # expect: "Database schema is up to date!"
```

Then prod **after taking the snapshot**:

```bash
export DATABASE_URL="<prod-db-url>"
npx prisma migrate status
bash scripts/baseline-prisma-migrations.sh --confirm
npx prisma migrate status           # "up to date" → baselined, no SQL ran
```

`migrate resolve --applied` only inserts bookkeeping rows in `_prisma_migrations`;
it never alters your tables. Baselining is non-destructive.

## Step 3 — Switch the deploy script

Only after **both** DBs are baselined (Step 2), change `package.json`:

```diff
- "deploy:prepare": "prisma generate && prisma db push --accept-data-loss && <backfills>",
+ "deploy:prepare": "prisma generate && prisma migrate deploy && <backfills>",
```

Notes:
- Leave the idempotent backfill scripts as-is.
- The `build` script also has `db push --accept-data-loss`. The build runs on the
  GitHub runner (compile only) — it should **not** touch a real DB at all. Drop
  the db-push from `build` and let `deploy:prepare` (on the droplet) own schema
  application. Verify `build` still has whatever placeholder `DATABASE_URL` Prisma
  generate needs.
- CI (`typecheck.yml`) can keep `db push` against its throwaway service DB, or
  switch to `migrate deploy` for parity — either is safe (disposable DB).

## Step 4 — Verify on staging, then prod

1. Deploy to **staging**. Watch the deploy log: `migrate deploy` should report
   "No pending migrations to apply" (because staging is baselined + in sync).
2. Smoke-test staging.
3. Deploy to **prod**. Same expected output.

## Step 5 — Going forward (the new workflow)

- Schema change = `npx prisma migrate dev --name <change>` locally (needs a
  `SHADOW_DATABASE_URL`), review the SQL, commit the migration. **Never** edit
  `schema.prisma` + `db push` against a shared DB again.
- `deploy:prepare` applies pending migrations automatically via `migrate deploy`.

## Rollback / safety

- Blue/green protects you: if `migrate deploy` fails, the candidate never cuts
  over and the old release keeps serving. Fix forward (new migration) or restore
  the pre-cutover snapshot.
- A migration that needs data loss now **fails loudly** instead of silently
  dropping data — that's the point.

---

## Interim mitigation (optional, if you want a same-day risk cut)

If the full cutover waits, you can kill the *silent* part of the data loss in one
line: drop `--accept-data-loss` from `build` + `deploy:prepare`. Plain
`prisma db push` refuses changes that would lose data and **errors the deploy**
instead of silently dropping columns. Trade-off: an intentionally-destructive
schema change will now block a deploy until handled manually — which is the safe
direction. Pair it with a pre-deploy DO snapshot step in `deploy.yml`.
