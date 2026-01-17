#!/usr/bin/env bash
set -euo pipefail
# Sanitize local git refs by removing refs with malformed or suspicious creatordate values.
# This runs in CI to avoid tools like `auto` failing when they parse git ref dates.

echo "Sanitizing local git refs..."

# Iterate all refs with their unix creatordate. Use a safe field separator.
git for-each-ref --format='%(refname) %(creatordate:unix)' | while IFS= read -r line || [ -n "$line" ]; do
  # Split on first space into ref and date (dates should be unix integer)
  ref=${line%% *}
  date=${line#* }

  # If the output didn't contain a space, skip
  if [ "$ref" = "$line" ]; then
    continue
  fi

  # Trim whitespace from date
  date=$(printf "%s" "$date" | tr -d '[:space:]')

  # Conditions that indicate a malformed date:
  # - empty
  # - contains non-digits
  # - unexpectedly long (more than 10 digits)
  # - absurdly large (>= year 3000 in unix seconds ~32503680000) or equals JS MAX_SAFE_INT
  if [ -z "$date" ] || [[ ! "$date" =~ ^[0-9]+$ ]] || [ ${#date} -gt 10 ] || [ "$date" -ge 32503680000 ] || [ "$date" -ge 9007199254740991 ]; then
    echo "Deleting malformed local ref: $ref (creatordate='$date')"
    # Best-effort delete; ignore failures so CI can continue
    git update-ref -d "$ref" >/dev/null 2>&1 || true
  fi
done

echo "Sanitization complete. Remaining refs:"
git for-each-ref --format='%(refname) %(creatordate:unix)' | sed -n '1,200p'

exit 0
