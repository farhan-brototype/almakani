#!/usr/bin/env bash
# Dumps the whole fest database into ./backup so it can be restored into any
# Supabase project or plain Postgres server. See DATABASE.md.
set -euo pipefail

URL="${DATABASE_URL:-${SUPABASE_DB_URL:-}}"
if [ -z "$URL" ]; then
  echo "Set DATABASE_URL (or SUPABASE_DB_URL) first." >&2
  exit 1
fi

mkdir -p backup
STAMP=$(date +%Y%m%d-%H%M%S)

pg_dump "$URL" --schema-only --schema=public --no-owner --no-privileges \
  > "backup/schema-$STAMP.sql"
pg_dump "$URL" --data-only --schema=public --no-owner \
  > "backup/data-$STAMP.sql"
pg_dump "$URL" --schema=auth --schema=storage --no-owner \
  > "backup/auth-storage-$STAMP.sql" || echo "auth/storage dump skipped" >&2

echo "Wrote backup/*-$STAMP.sql"
