#!/usr/bin/env bash
set -euo pipefail

# Consolidated release steps extracted from the workflow to keep the YAML small
# This script preserves the behavior of the workflow's inline run steps.

GITHUB_REPOSITORY=${GITHUB_REPOSITORY:-}
GITHUB_TOKEN=${GITHUB_TOKEN:-}
GITHUB_EVENT_PATH=${GITHUB_EVENT_PATH:-}
GITHUB_EVENT_NAME=${GITHUB_EVENT_NAME:-}
GITHUB_SHA=${GITHUB_SHA:-}
# initialize RANGE to avoid 'unbound variable' failure when set -u is active
RANGE=""

# Control verbosity:
# - DEBUG=1 enables shell xtrace (very verbose, prints commands)
# - QUIET=1 suppresses informational logs (keeps errors + final output)
DEBUG=${DEBUG:-0}
QUIET=${QUIET:-0}

# simple logging helper
log() { if [ "${QUIET:-0}" != "1" ]; then echo "[release] $*"; fi }

# (No dry-run mode) The script performs real pushes and API writes when run

echo "STEP: Running consolidated release script"

# If this is a push, check whether the push corresponds to a merged PR and
# whether a pull_request-triggered run exists. If so, skip and exit 0 so the
# push-run acts as a fallback only when PR-run didn't occur.
if [ "${GITHUB_EVENT_NAME:-}" = 'push' ]; then
  echo "Checking whether push ${GITHUB_SHA} corresponds to a merged PR..."
  PRS=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" -H "Accept: application/vnd.github.groot-preview+json" "https://api.github.com/repos/${GITHUB_REPOSITORY}/commits/${GITHUB_SHA}/pulls" || true)
  if [ -z "${PRS}" ] || [ "${PRS}" = "null" ]; then
    echo "No PRs associated with commit ${GITHUB_SHA}."
  else
    MERGED_PR_NUM=$(echo "$PRS" | jq -r '.[] | select(.base.ref=="main" and (.merged_at // empty) != "") | .number' | head -n1 || true)
    if [ -n "${MERGED_PR_NUM}" ]; then
      echo "Found merged PR #${MERGED_PR_NUM} for commit ${GITHUB_SHA}; checking for a pull_request-triggered workflow run..."
      RUNS_API="https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/workflows/release-on-main.yml/runs?head_sha=${GITHUB_SHA}&event=pull_request&per_page=1"
      RUNS_RESP=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" "$RUNS_API" || true)
      COUNT=$(echo "$RUNS_RESP" | jq -r '.total_count // 0' 2>/dev/null || echo 0)
      if [ "${COUNT}" -gt 0 ]; then
        echo "Found a pull_request-triggered release workflow run for this commit (count=${COUNT}) — assuming pull_request run handled the release; skipping duplicate push-run."
        exit 0
      else
        echo "No pull_request-triggered release workflow run found for this commit — continuing with push-run (fallback)."
      fi
    fi
  fi
fi

echo "Checking out repository (fetch-depth=0)"
if [ ! -d .git ]; then
  echo "No repo checkout found; aborting"
  exit 1
fi

# Ensure origin remote exists
if ! git remote | grep -q '^origin$'; then
  echo "Adding origin remote for ${GITHUB_REPOSITORY}"
  git remote add origin "https://github.com/${GITHUB_REPOSITORY}.git" || true
else
  echo "origin remote already present"
fi

# Enable xtrace only when DEBUG=1. Avoid noisy '+ +' lines in CI logs by default.
if [ "${DEBUG:-0}" = "1" ]; then
  set -x
fi

# Early guard — skip if tag/release exists (look at package.json at origin/main)
git fetch origin --tags || true
if git rev-parse --verify origin/main >/dev/null 2>&1; then
  TARGET_COMMIT=$(git rev-parse --verify origin/main)
else
  TARGET_COMMIT=$(git rev-parse --verify HEAD)
fi
TAG_VERSION=$(git show ${TARGET_COMMIT}:package.json 2>/dev/null | jq -r .version 2>/dev/null || true)
echo "STEP: target commit = ${TARGET_COMMIT}, package.json version = ${TAG_VERSION:-<none>}"
if [ -n "${TAG_VERSION}" ] && [ "${TAG_VERSION}" != "null" ]; then
  TAG="v${TAG_VERSION}"
  if git ls-remote --exit-code --tags origin "refs/tags/${TAG}" >/dev/null 2>&1; then
    echo "Tag ${TAG} already exists on remote — skipping release job."
    exit 0
  fi
  if curl -s -H "Authorization: token ${GITHUB_TOKEN}" "https://api.github.com/repos/${GITHUB_REPOSITORY}/releases/tags/${TAG}" | jq -e .id >/dev/null 2>&1; then
    echo "Release for ${TAG} already exists — skipping release job."
    exit 0
  fi
else
  echo "No package.json version found at ${TARGET_COMMIT}; continuing."
fi

# Fetch tags and ensure full history
git fetch --tags origin

# Require release label on merged PRs: try to locate PR labels
PR_INFO=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" "https://api.github.com/repos/${GITHUB_REPOSITORY}/commits/${GITHUB_SHA}/pulls" -H "Accept: application/vnd.github.groot-preview+json" || true)
PR_LABELS_JSON=$(echo "$PR_INFO" | jq -c '.[0].labels // empty' 2>/dev/null || true)
if [ -z "${PR_LABELS_JSON}" ] || [ "${PR_LABELS_JSON}" = "null" ]; then
  if [ "${GITHUB_EVENT_NAME}" = "pull_request" ] && [ -f "${GITHUB_EVENT_PATH}" ]; then
    PR_LABELS_JSON=$(jq -c '.pull_request.labels // []' "${GITHUB_EVENT_PATH}" 2>/dev/null || echo "[]")
  else
    PR_LABELS_JSON="[]"
  fi
fi
echo "PR_LABELS=${PR_LABELS_JSON}"
LABEL_NAMES=$(echo "$PR_LABELS_JSON" | jq -r '.[].name' || true)
if [ -z "$(echo "$LABEL_NAMES" | tr -d '[:space:]')" ]; then
  echo "ERROR: Merged PR does not have a release label (major/minor/patch)."
  exit 1
fi
echo "Found labels: $LABEL_NAMES"

# Auto bump version (label-driven) when this is a pull_request event
if [ "${GITHUB_EVENT_NAME}" = "pull_request" ]; then
  echo "STEP: attempting label-driven bump (pull_request run)"
  chmod +x .github/scripts/bump-version.sh || true
  ./.github/scripts/bump-version.sh package.json auto --apply
  echo "STEP: bump script finished"
fi

# Commit and push package.json if changed (for pull_request runs)
if [ "${GITHUB_EVENT_NAME}" = "pull_request" ]; then
  if git status --porcelain | grep -q '^'; then
    git add package.json package-lock.json || true
    git config user.name "github-actions[bot]"
    git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
    git commit -m "chore(release): bump package.json version to $(jq -r .version package.json) [skip ci]" || true
    if git push "https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}" HEAD:main; then
      echo "Pushed package.json to origin/main with GITHUB_TOKEN"
    else
      echo "Push to origin/main failed with GITHUB_TOKEN. Attempting to update package.json via the GitHub Contents API (may work with branch protection)."
      if command -v base64 >/dev/null 2>&1; then
        NEW_CONTENT_B64=$(base64 package.json | tr -d '\n')
      else
        NEW_CONTENT_B64=$(cat package.json | base64 | tr -d '\n')
      fi
      REMOTE_PATH="package.json"
      MSG="chore(release): bump package.json to $(jq -r .version package.json) [skip ci]"
      REMOTE_JSON=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" "https://api.github.com/repos/${GITHUB_REPOSITORY}/contents/${REMOTE_PATH}?ref=main" || true)
      REMOTE_SHA=$(echo "$REMOTE_JSON" | jq -r .sha 2>/dev/null || true)
      if [ -n "$REMOTE_SHA" ] && [ "$REMOTE_SHA" != "null" ]; then
        echo "Updating package.json on main via Contents API (sha=$REMOTE_SHA)"
        DATA=$(jq -n --arg message "$MSG" --arg content "$NEW_CONTENT_B64" --arg branch "main" --arg sha "$REMOTE_SHA" '{message:$message, content:$content, branch:$branch, sha:$sha}')
      else
        echo "Remote package.json not found or no sha; attempting to create via Contents API"
        DATA=$(jq -n --arg message "$MSG" --arg content "$NEW_CONTENT_B64" --arg branch "main" '{message:$message, content:$content, branch:$branch}')
      fi
      UPDATE_RESP=$(curl -s -X PUT -H "Authorization: token ${GITHUB_TOKEN}" -H "Content-Type: application/json" -d "$DATA" "https://api.github.com/repos/${GITHUB_REPOSITORY}/contents/${REMOTE_PATH}" || true)
      if echo "$UPDATE_RESP" | jq -e .content >/dev/null 2>&1; then
        echo "Successfully updated package.json on main via Contents API"
      else
        echo "Contents API update failed; cannot auto-apply bump due to branch protection. Response: $UPDATE_RESP" >&2
        if [ -n "${GITHUB_EVENT_PATH:-}" ] && [ -f "${GITHUB_EVENT_PATH}" ]; then
          PR_NUM=$(jq -r '.pull_request.number // empty' "${GITHUB_EVENT_PATH}" 2>/dev/null || true)
          if [ -n "$PR_NUM" ]; then
            MSG="Automated release bump could not be applied to \`main\` due to branch protection. I attempted to update package.json to $(jq -r .version package.json) but the update was rejected. Please merge the bump into main (or allow Actions to create PRs) so the release can proceed."
            echo "Posting note to PR #${PR_NUM}: $MSG"
                    curl -s -X POST -H "Authorization: token ${GITHUB_TOKEN}" -H "Content-Type: application/json" -d "$(jq -nc --arg body "$MSG" '{body:$body}')" "https://api.github.com/repos/${GITHUB_REPOSITORY}/issues/${PR_NUM}/comments" >/dev/null || true
          else
            echo "No PR number found in event payload; cannot post explanatory comment."
          fi
        else
          echo "No event payload available; cannot post PR comment explaining blocked update."
        fi
        echo "BUMP_APPLY_FAILED=1" >> "$GITHUB_ENV"
        echo "Continuing release run: will attempt to create tag/release without updating package.json on main."
      fi
    fi
  else
    echo "No changes to commit"
  fi
fi

# Create v-tag and push (if package.json version)
git fetch origin --tags
LOCAL_HEAD=$(git rev-parse --verify HEAD)
REMOTE_MAIN=$(git rev-parse --verify origin/main)
if [ "$LOCAL_HEAD" != "$REMOTE_MAIN" ]; then
  echo "Local HEAD ($LOCAL_HEAD) differs from origin/main ($REMOTE_MAIN); tagging origin/main instead."
  TARGET_COMMIT="$REMOTE_MAIN"
else
  TARGET_COMMIT="$LOCAL_HEAD"
fi
TAG_VERSION=$(git show ${TARGET_COMMIT}:package.json 2>/dev/null | jq -r .version 2>/dev/null || true)
if [ -n "${TAG_VERSION}" ] && [ "${TAG_VERSION}" != "null" ]; then
  TAG_FROM_PKG="v${TAG_VERSION}"
else
  echo "package.json not found at target commit ${TARGET_COMMIT}; skipping tag creation"
  exit 0
fi
if git ls-remote --exit-code --tags origin "refs/tags/${TAG_FROM_PKG}" >/dev/null 2>&1; then
  echo "Tag ${TAG_FROM_PKG} already exists on remote; skipping tag creation."
  exit 0
fi
git config user.email "github-actions[bot]@users.noreply.github.com"
git config user.name "github-actions[bot]"
git tag -a "${TAG_FROM_PKG}" "$TARGET_COMMIT" -m "Release ${TAG_FROM_PKG}"
echo "STEP: created annotated tag ${TAG_FROM_PKG} -> ${TARGET_COMMIT} (local)"
if git push origin "refs/tags/${TAG_FROM_PKG}"; then
  echo "Pushed tag ${TAG_FROM_PKG} -> ${TARGET_COMMIT}"
else
  echo "git push of tag ${TAG_FROM_PKG} failed; attempting to create tag ref via GitHub API"
  API_URL="https://api.github.com/repos/${GITHUB_REPOSITORY}/git/refs"
  REF_PAYLOAD=$(jq -nc --arg ref "refs/tags/${TAG_FROM_PKG}" --arg sha "$TARGET_COMMIT" '{ref:$ref, sha:$sha}')
  CREATE_RESP=$(curl -s -X POST -H "Authorization: token ${GITHUB_TOKEN}" -H "Content-Type: application/json" -d "$REF_PAYLOAD" "$API_URL" || true)
  if echo "$CREATE_RESP" | jq -e .ref >/dev/null 2>&1; then
    echo "Created tag ref ${TAG_FROM_PKG} -> ${TARGET_COMMIT} via API"
  else
    echo "Failed to create tag ref via API; response: $CREATE_RESP" >&2
    echo "Tag creation failed; skipping tag push step."
  fi
fi

# Generate changelog
CHANGELOG_FILE=/tmp/changelog.md
echo "" > ${CHANGELOG_FILE}
git fetch origin --tags main || true
LOCAL_HEAD=$(git rev-parse --verify HEAD)
REMOTE_MAIN=$(git rev-parse --verify origin/main)
if [ "$LOCAL_HEAD" != "$REMOTE_MAIN" ]; then
  TARGET_COMMIT="$REMOTE_MAIN"
else
  TARGET_COMMIT="$LOCAL_HEAD"
fi
TAG_VERSION=$(git show ${TARGET_COMMIT}:package.json 2>/dev/null | jq -r .version 2>/dev/null || true)
if [ -n "${TAG_VERSION}" ] && [ "${TAG_VERSION}" != "null" ]; then
  echo "v${TAG_VERSION}" >> ${CHANGELOG_FILE}
  echo "" >> ${CHANGELOG_FILE}
fi
if [ "${GITHUB_EVENT_NAME}" = "pull_request" ] && [ -f "${GITHUB_EVENT_PATH}" ]; then
  PR_NUM=$(jq -r '.pull_request.number' "${GITHUB_EVENT_PATH}" 2>/dev/null || true)
  PR_TITLE=$(jq -r '.pull_request.title' "${GITHUB_EVENT_PATH}" 2>/dev/null || true)
    if [ -n "${PR_NUM}" ] && [ "${PR_NUM}" != "null" ]; then
      echo "Merge PR #${PR_NUM}: ${PR_TITLE}" >> ${CHANGELOG_FILE}
      echo "" >> ${CHANGELOG_FILE}
    fi
fi
LAST_TAG=$(git describe --tags --abbrev=0 "${TARGET_COMMIT}" 2>/dev/null || true)
if [ -z "${LAST_TAG}" ]; then
  echo "Changes:" >> ${CHANGELOG_FILE}
  RANGE="${TARGET_COMMIT}"
else
  LAST_TAG_COMMIT=$(git rev-parse "${LAST_TAG}^{commit}" 2>/dev/null || true)
  TARGET_COMMIT_SHA=$(git rev-parse "${TARGET_COMMIT}" 2>/dev/null || true)
  if [ -n "${LAST_TAG_COMMIT}" ] && [ "${LAST_TAG_COMMIT}" = "${TARGET_COMMIT_SHA}" ]; then
    PREV_TAG=$(git tag --sort=-creatordate --merged "${TARGET_COMMIT}" | sed -n '2p' || true)
    if [ -n "${PREV_TAG}" ]; then
      echo "Changes since ${PREV_TAG}:" >> ${CHANGELOG_FILE}
      RANGE="${PREV_TAG}..${TARGET_COMMIT}"
    else
      echo "Changes:" >> ${CHANGELOG_FILE}
      RANGE="${TARGET_COMMIT}"
    fi
  else
    echo "Changes since ${LAST_TAG}:" >> ${CHANGELOG_FILE}
    RANGE="${LAST_TAG}..${TARGET_COMMIT}"
  fi
fi
PRS_RAW=/tmp/prs_raw.txt
PRS_UNIQ=/tmp/prs_uniq.txt
> ${PRS_RAW}
if echo "${RANGE}" | grep -q '\.\.'; then
  START_REF=$(echo "${RANGE}" | cut -d'.' -f1)
else
  START_REF=""
fi
if [ -n "${START_REF}" ]; then
  START_DATE=$(git show -s --format=%cI ${START_REF} 2>/dev/null || true)
else
  START_DATE="1970-01-01T00:00:00Z"
fi
END_DATE=$(git show -s --format=%cI ${TARGET_COMMIT} 2>/dev/null || true)
if [ -n "${GITHUB_TOKEN:-}" ] && [ -n "${END_DATE}" ]; then
  Q="repo:${GITHUB_REPOSITORY} type:pr is:merged base:main merged:${START_DATE}..${END_DATE}"
  ENCODED_Q=$(jq -nr --arg q "$Q" '$q|@uri')
  per_page=100
  page=1
  while :; do
    RESP=$(curl -s -H "Authorization: token ${GITHUB_TOKEN}" "https://api.github.com/search/issues?q=${ENCODED_Q}&per_page=${per_page}&page=${page}" || true)
    echo "$RESP" | jq -r '.items[]? | "\(.number)\t\(.title)"' 2>/dev/null >> ${PRS_RAW} || true
    COUNT=$(echo "$RESP" | jq -r '.items | length' 2>/dev/null || echo 0)
    if [ "$COUNT" -lt "$per_page" ] || [ "$COUNT" -eq 0 ]; then
      break
    fi
    page=$((page+1))
  done
fi
if [ -s ${PRS_RAW} ]; then
  awk -F"\t" '!seen[$1]++ { print $0 }' ${PRS_RAW} > ${PRS_UNIQ} || true
fi
if [ -s ${PRS_UNIQ} ]; then
  echo "Pull requests included:" >> ${CHANGELOG_FILE}
  while IFS=$'\t' read -r num title; do
    echo "- PR #${num}: ${title}" >> ${CHANGELOG_FILE}
  done < ${PRS_UNIQ}
  echo "" >> ${CHANGELOG_FILE}
fi
git --no-pager log ${RANGE} --pretty=format:"- %s (%an, %h)" >> ${CHANGELOG_FILE} || true
if [ ! -s ${CHANGELOG_FILE} ] || [ "$(wc -c < ${CHANGELOG_FILE})" -le 0 ]; then
  echo "    (no commits found)" >> ${CHANGELOG_FILE}
fi
echo "Changelog generated at ${CHANGELOG_FILE}"
cat ${CHANGELOG_FILE}
echo "STEP: changelog contents printed above"

# Create GitHub release
API_URL="https://api.github.com/repos/${GITHUB_REPOSITORY}/releases"
git fetch origin --tags || true
LOCAL_HEAD=$(git rev-parse --verify HEAD)
REMOTE_MAIN=$(git rev-parse --verify origin/main)
if [ "$LOCAL_HEAD" != "$REMOTE_MAIN" ]; then
  TARGET_COMMIT="$REMOTE_MAIN"
else
  TARGET_COMMIT="$LOCAL_HEAD"
fi
TAG_VERSION=$(git show ${TARGET_COMMIT}:package.json 2>/dev/null | jq -r .version 2>/dev/null || true)
if [ -n "${TAG_VERSION}" ] && [ "${TAG_VERSION}" != "null" ]; then
  TAG_FROM_PKG="v${TAG_VERSION}"
else
  echo "package.json not found at target commit ${TARGET_COMMIT}; skipping release creation"
  if [ -n "${GITHUB_EVENT_PATH:-}" ] && [ -f "${GITHUB_EVENT_PATH}" ]; then
    PR_NUM=$(jq -r '.pull_request.number // empty' "${GITHUB_EVENT_PATH}" 2>/dev/null || true)
    if [ -n "${PR_NUM}" ]; then
      MSG="Release skipped: package.json not found at target commit ${TARGET_COMMIT}. Please ensure the bumped package.json was merged to main."
      curl -s -X POST -H "Authorization: token ${GITHUB_TOKEN}" -H "Content-Type: application/json" -d "$(jq -nc --arg body "$MSG" '{body:$body}')" "https://api.github.com/repos/${GITHUB_REPOSITORY}/issues/${PR_NUM}/comments" >/dev/null || true
    fi
  fi
  exit 0
fi

if ! git ls-remote --exit-code --tags origin "refs/tags/${TAG_FROM_PKG}" >/dev/null 2>&1; then
  echo "Tag ${TAG_FROM_PKG} not found on remote; attempting to create tag ref via API"
  API_URL="https://api.github.com/repos/${GITHUB_REPOSITORY}/git/refs"
  REF_PAYLOAD=$(jq -nc --arg ref "refs/tags/${TAG_FROM_PKG}" --arg sha "${TARGET_COMMIT}" '{ref:$ref, sha:$sha}')
  CREATE_RESP=$(curl -s -X POST -H "Authorization: token ${GITHUB_TOKEN}" -H "Content-Type: application/json" -d "$REF_PAYLOAD" "$API_URL" || true)
  if echo "$CREATE_RESP" | jq -e .ref >/dev/null 2>&1; then
    echo "Created tag ref ${TAG_FROM_PKG} -> ${TARGET_COMMIT} via API"
  else
    echo "Failed to create tag ref via API; response: $CREATE_RESP" >&2
    if [ -n "${GITHUB_EVENT_PATH:-}" ] && [ -f "${GITHUB_EVENT_PATH}" ]; then
      PR_NUM=$(jq -r '.pull_request.number // empty' "${GITHUB_EVENT_PATH}" 2>/dev/null || true)
      if [ -n "${PR_NUM}" ]; then
        MSG="Release skipped: tag ${TAG_FROM_PKG} not found on remote and API creation failed. The tag-step may have been skipped or branch protections prevented pushing the bump. Please merge the bump commit or create the tag manually."
        curl -s -X POST -H "Authorization: token ${GITHUB_TOKEN}" -H "Content-Type: application/json" -d "$(jq -nc --arg body "$MSG" '{body:$body}')" "https://api.github.com/repos/${GITHUB_REPOSITORY}/issues/${PR_NUM}/comments" >/dev/null || true
      fi
    fi
    exit 0
  fi
fi

# Use the changelog file (which already contains the tag / PR title) as the release body
RELEASE_NAME="${TAG_FROM_PKG}"
RAW_CHANGELOG=$(cat ${CHANGELOG_FILE} 2>/dev/null || true)
CHANGELOG_BODY="${RAW_CHANGELOG}"
BODY_CONTENT="${CHANGELOG_BODY}"
BODY=$(jq -nc --arg tag "$TAG_FROM_PKG" --arg name "$RELEASE_NAME" --arg body "$BODY_CONTENT" '{tag_name:$tag, name:$name, body:$body, draft:false, prerelease:false}')
echo "Creating release for ${TAG_FROM_PKG}"
curl -s -H "Authorization: token ${GITHUB_TOKEN}" -H "Content-Type: application/json" -d "$BODY" "$API_URL" >/dev/null

echo "Consolidated release script finished"
