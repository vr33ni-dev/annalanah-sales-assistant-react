#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <remote-git-url>" >&2
  exit 0
fi

REMOTE="$1"
echo "Scanning remote repository for suspicious refs: ${REMOTE}"

TMPDIR=$(mktemp -d)
cleanup() { rm -rf "$TMPDIR"; }
trap cleanup EXIT

echo "Cloning mirror into $TMPDIR/repo.git (this is a read-only mirror)"
if ! git clone --mirror "$REMOTE" "$TMPDIR/repo.git" 2>&1; then
  echo "Failed to mirror clone $REMOTE" >&2
  # Don't fail the caller — diagnostics should be best-effort
  exit 0
fi

cd "$TMPDIR/repo.git"

echo "Enumerating refs and creatordates..."

FLAG_COUNT=0

# Format: refname creatordate(unixts) tz objecttype objectname subject...
# Use creatordate:raw which outputs e.g. "1609459200 +0000"
git for-each-ref --format='%(refname) %(creatordate:raw) %(objecttype) %(objectname) %(subject)' | while IFS= read -r line; do
  # split first three whitespace-separated tokens: ref, ts, tz; rest is ignored
  ref=$(printf '%s' "$line" | awk '{print $1}')
  ts=$(printf '%s' "$line" | awk '{print $2}')
  tz=$(printf '%s' "$line" | awk '{print $3}')
  rest=$(printf '%s' "$line" | cut -d' ' -f4-)

  # normalize ts to the first token (should be numeric unix timestamp)
  if [ -z "$ts" ]; then
    echo "SUSPICIOUS: $ref -> creatordate missing or empty"
    FLAG_COUNT=$((FLAG_COUNT+1))
    continue
  fi

  # Non-numeric check
  if ! printf '%s' "$ts" | grep -Eq '^[0-9]+$'; then
    echo "SUSPICIOUS: $ref -> creatordate non-numeric: '$ts $tz'"
    FLAG_COUNT=$((FLAG_COUNT+1))
    continue
  fi

  # Too long (more than 10 digits) — likely malformed (e.g. filler sentinel)
  if [ ${#ts} -gt 10 ]; then
    echo "SUSPICIOUS: $ref -> creatordate too long: '$ts $tz'"
    FLAG_COUNT=$((FLAG_COUNT+1))
    continue
  fi

  # Numeric comparisons (guard with || true to avoid non-zero exit in sh)
  # Sentinel: JS MAX_SAFE_INTEGER 9007199254740991
  if [ "$ts" -ge 9007199254740991 ] 2>/dev/null; then
    echo "SUSPICIOUS: $ref -> creatordate sentinel MAX_SAFE_INT: '$ts $tz'"
    FLAG_COUNT=$((FLAG_COUNT+1))
    continue
  fi

  # Absurdly large dates — year > 3000 (timestamp >= 32503680000)
  if [ "$ts" -ge 32503680000 ] 2>/dev/null; then
    echo "SUSPICIOUS: $ref -> creatordate unreasonably large (year>3000): '$ts $tz'"
    FLAG_COUNT=$((FLAG_COUNT+1))
    continue
  fi

  # If we reach here, the ref looks fine — optionally you could print for auditing
done

if [ "$FLAG_COUNT" -eq 0 ]; then
  echo "No suspicious refs found in remote."
else
  echo "Found $FLAG_COUNT suspicious refs in remote. Review the lines above for details."
fi

exit 0
