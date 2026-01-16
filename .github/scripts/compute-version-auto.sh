#!/usr/bin/env bash
set -euo pipefail

# Expected environment variables:
# REPO, PR_NUM, BASE_REF, GITHUB_TOKEN, RELEASE_PAT

export PATH="./node_modules/.bin:$PATH"

# Install auto if not present
if ! command -v auto >/dev/null 2>&1; then
  npm install --no-save auto@latest
fi

# Prefer a PAT in RELEASE_PAT for GH operations; fallback to GITHUB_TOKEN
if [ -n "${RELEASE_PAT:-}" ]; then
  export GH_TOKEN="${RELEASE_PAT}"
else
  export GH_TOKEN="${GITHUB_TOKEN:-}"
fi

# Run auto version and capture stdout/stderr
RAW=$(npx auto version 2>&1 || true)
printf '%s
'"$RAW"

# Try to extract a semver (vX.Y.Z or X.Y.Z)
CANDIDATE=$(printf '%s
'"$RAW"' | grep -Eo 'v?[0-9]+\.[0-9]+\.[0-9]+' | head -n1 || true)

if [ -z "$CANDIDATE" ]; then
  # Look for a bump word
  BUMP=$(printf '%s
'"$RAW"' | grep -Eo 'major|minor|patch' | head -n1 || true)
  if [ -z "$BUMP" ]; then
    echo "Could not parse auto output for semver or bump; failing."
    echo "$RAW"
    exit 1
  fi

  git fetch --no-tags origin "${BASE_REF}" || true
  LATEST_TAG=$(git describe --tags --abbrev=0 origin/"${BASE_REF}" 2>/dev/null || true)
  if [ -z "$LATEST_TAG" ]; then
    BASE_VERSION=$(jq -r .version package.json 2>/dev/null || echo "0.0.0")
  else
    BASE_VERSION=${LATEST_TAG#v}
  fi

  IFS='.' read -r MAJ MIN PAT <<< "${BASE_VERSION:-0.0.0}"
  MAJ=${MAJ:-0}; MIN=${MIN:-0}; PAT=${PAT:-0}
  if [ "$BUMP" = "major" ]; then
    MAJ=$((MAJ + 1)); MIN=0; PAT=0
  elif [ "$BUMP" = "minor" ]; then
    MIN=$((MIN + 1)); PAT=0
  else
    PAT=$((PAT + 1))
  fi
  CANDIDATE="v${MAJ}.${MIN}.${PAT}"
else
  case "$CANDIDATE" in
    v*) ;;
    *) CANDIDATE="v${CANDIDATE}" ;;
  esac
fi

echo "Computed candidate: $CANDIDATE"
echo "candidate_version=${CANDIDATE}" >> "$GITHUB_OUTPUT"

COMMENTS_URL="https://api.github.com/repos/${REPO}/issues/${PR_NUM}/comments"

COMMENT_BODY=$(cat <<EOF
Computed release version if merged to \\`${BASE_REF}\\`: **${CANDIDATE}**

(Computed by \\`auto version\\`.)

<!-- version-bot-comment -->
EOF
)

EXISTING_ID=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" "${COMMENTS_URL}" \
  | jq -r --arg marker "<!-- version-bot-comment -->" '.[] | select(.body | contains($marker)) | .id' \
  | head -n1 || true)

if [ -n "$EXISTING_ID" ] && [ "$EXISTING_ID" != "null" ]; then
  curl -s -X PATCH -H "Authorization: token ${GITHUB_TOKEN}" -H "Content-Type: application/json" \
    -d "$(jq -nc --arg body "$COMMENT_BODY" '{body:$body}')" "https://api.github.com/repos/${REPO}/issues/comments/${EXISTING_ID}" >/dev/null || true
else
  curl -s -H "Authorization: token ${GITHUB_TOKEN}" -H "Content-Type: application/json" \
    -d "$(jq -nc --arg body "$COMMENT_BODY" '{body:$body}')" "${COMMENTS_URL}" >/dev/null || true
fi

exit 0
