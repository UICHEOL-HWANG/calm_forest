#!/bin/bash
# Usage: scripts/fetch-outputs.sh <session_id> [name]
# Downloads every file the session wrote to /mnt/session/outputs/ into
# runs/<YYYY-MM-DD>-<name>/ (gitignored: reports contain production numbers).
set -euo pipefail
cd "$(dirname "$0")/.."
SID="${1:?usage: fetch-outputs.sh <session_id> [name]}"
NAME="${2:-$SID}"
DEST="runs/$(date +%F)-$NAME"
mkdir -p "$DEST"
ant beta:files list --scope-id "$SID" --beta managed-agents-2026-04-01 --format jsonl --transform '{id,filename}' |
while read -r row; do
  id=$(jq -r .id <<<"$row"); fn=$(jq -r .filename <<<"$row")
  case "$fn" in */*|.*|"") echo "skip unsafe name: $fn" >&2; continue ;; esac
  ant beta:files download --file-id "$id" --beta managed-agents-2026-04-01 -o "$DEST/$fn" </dev/null >/dev/null
  echo "$DEST/$fn"
done
