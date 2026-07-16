#!/usr/bin/env bash
# KHRATE Postgres backup — compressed custom-format dump with 14-day retention.
# Run on the DB host (works for local docker or the prod compose stack):
#   ./scripts/db-backup.sh [container=khrate-postgres] [outdir=./backups]
# Schedule daily via cron, e.g.:  15 2 * * *  /srv/khrate/scripts/db-backup.sh khrate-db-1 /srv/khrate/backups
set -euo pipefail

CONTAINER="${1:-khrate-postgres}"
OUTDIR="${2:-./backups}"
RETENTION_DAYS=14
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$OUTDIR/khrate-$STAMP.dump"

mkdir -p "$OUTDIR"
docker exec "$CONTAINER" pg_dump -U khrate -d khrate -Fc > "$OUT"
# Fail loudly on suspiciously small dumps (empty DB or auth failure writes ~0 bytes).
[ "$(wc -c < "$OUT")" -gt 1024 ] || { echo "ERROR: dump looks empty: $OUT" >&2; exit 1; }

find "$OUTDIR" -name 'khrate-*.dump' -mtime +"$RETENTION_DAYS" -delete
echo "backup ok: $OUT ($(du -h "$OUT" | cut -f1)) — retention ${RETENTION_DAYS}d in $OUTDIR"
echo "REMINDER: copy backups OFF this host (object storage / second machine)."
