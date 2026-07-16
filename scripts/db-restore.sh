#!/usr/bin/env bash
# KHRATE Postgres restore — restores a pg_dump custom-format file into the database.
#   ./scripts/db-restore.sh <dumpfile> [container=khrate-postgres]
# DESTRUCTIVE: --clean drops existing objects before recreating them. It asks first.
set -euo pipefail

DUMP="${1:?usage: db-restore.sh <dumpfile> [container]}"
CONTAINER="${2:-khrate-postgres}"

[ -f "$DUMP" ] || { echo "ERROR: no such file: $DUMP" >&2; exit 1; }
echo "About to RESTORE '$DUMP' into container '$CONTAINER' (drops current data)."
read -r -p "Type 'restore' to continue: " CONFIRM
[ "$CONFIRM" = "restore" ] || { echo "aborted"; exit 1; }

docker exec -i "$CONTAINER" pg_restore -U khrate -d khrate --clean --if-exists < "$DUMP"
echo "restore complete. Verify: health endpoint, admin login, deal board, reconciliation report."
