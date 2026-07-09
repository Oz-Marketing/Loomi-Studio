#!/usr/bin/env bash
#
# Baseline an existing Postgres DB for the db-push → migrate-deploy cutover.
#
# Marks every migration in prisma/migrations as ALREADY APPLIED in the target
# DB's _prisma_migrations table WITHOUT running any of their SQL. Use this on a
# database whose schema already matches schema.prisma (i.e. one that has been
# managed by `prisma db push`). See docs/migrate-deploy-cutover.md.
#
# This only inserts bookkeeping rows; it never alters your tables. It is safe to
# re-run (already-applied migrations are skipped).
#
# Usage:
#   DATABASE_URL="postgresql://...<TARGET>..." bash scripts/baseline-prisma-migrations.sh --confirm
#
set -euo pipefail

MIGRATIONS_DIR="prisma/migrations"

if [[ "${DATABASE_URL:-}" == "" ]]; then
  echo "ERROR: DATABASE_URL is not set. Point it at the TARGET db (staging or prod)." >&2
  exit 1
fi
if [[ "${1:-}" != "--confirm" ]]; then
  echo "Refusing to run without --confirm." >&2
  echo "Re-run: DATABASE_URL=... bash scripts/baseline-prisma-migrations.sh --confirm" >&2
  exit 1
fi
if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "ERROR: $MIGRATIONS_DIR not found. Run from the repo root." >&2
  exit 1
fi

# Show the target host (password redacted) so the operator can sanity-check.
host="$(printf '%s' "$DATABASE_URL" | sed -E 's#^[a-z]+://[^@]*@##; s#[?].*$##')"
echo "Target database: $host"
echo "Baselining migrations in $MIGRATIONS_DIR as already-applied..."
echo

applied=0
skipped=0
for dir in "$MIGRATIONS_DIR"/*/; do
  name="$(basename "$dir")"
  [[ -f "$dir/migration.sql" ]] || continue
  if out="$(npx prisma migrate resolve --applied "$name" 2>&1)"; then
    echo "  applied  $name"
    applied=$((applied + 1))
  elif printf '%s' "$out" | grep -qiE 'already recorded as applied|is already applied'; then
    echo "  skip     $name (already recorded)"
    skipped=$((skipped + 1))
  else
    echo "  FAILED   $name" >&2
    printf '%s\n' "$out" >&2
    exit 1
  fi
done

echo
echo "Done: $applied newly recorded, $skipped already present."
echo "Verify with:  npx prisma migrate status   (expect: 'Database schema is up to date!')"
