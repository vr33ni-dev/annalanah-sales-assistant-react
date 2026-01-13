#!/usr/bin/env bash
set -euo pipefail

# bump-version.sh
# Portable helper for GitHub Actions to compute a semantic version bump
# Supports two targets: VERSION (plain file) and package.json (npm project)
# Usage: bump-version.sh <target> <bump>
#   target: VERSION | package.json
#   bump: major|minor|patch|auto
# If bump == auto the script will try to read labels from GITHUB_EVENT_PATH

TARGET=${1:-VERSION}
BUMP_ARG=${2:-auto}
GITHUB_EVENT_PATH=${GITHUB_EVENT_PATH:-}
GITHUB_REPOSITORY=${GITHUB_REPOSITORY:-}
GITHUB_TOKEN=${GITHUB_TOKEN:-}
PR_LABELS=${PR_LABELS:-}

# By default the script is compute-only (no writes). Use --apply to actually modify files.
# --dry-run is an alias for not applying and prints what would happen.
APPLY=${APPLY:-0}
DRY_RUN=0
if [ "${3:-}" = "--apply" ]; then
  APPLY=1
fi
if [ "${3:-}" = "--dry-run" ] || [ "${DRY_RUN:-0}" = "1" ]; then
  DRY_RUN=1
  APPLY=0
fi

# Write output for GH Actions (new runner behavior uses GITHUB_OUTPUT file path)
gh_output() {
  name="$1"
  value="$2"
  if [ -n "${GITHUB_OUTPUT:-}" ]; then
    echo "${name}=${value}" >> "${GITHUB_OUTPUT}"
  else
    # fallback for older runners (best-effort)
    echo "${name}=${value}"
  fi
}

determine_bump_from_event() {
  # Prefer PR_LABELS env (JSON array) if provided by workflow to avoid extra API calls
  if [ -n "${PR_LABELS:-}" ] && [ "${PR_LABELS}" != "null" ]; then
    LABELS=$(echo "${PR_LABELS}" | jq -r '.[].name' 2>/dev/null || true)
  elif [ -n "${GITHUB_EVENT_PATH:-}" ] && [ -f "${GITHUB_EVENT_PATH}" ]; then
    LABELS=$(jq -r '.pull_request.labels[]?.name' "${GITHUB_EVENT_PATH}" 2>/dev/null || true)
  else
    LABELS=""
  fi
  LABELS_LOWER=$(echo "$LABELS" | tr '[:upper:]' '[:lower:]' || true)
  if echo "$LABELS_LOWER" | grep -q "major"; then
    echo "major"; return
  elif echo "$LABELS_LOWER" | grep -q "minor"; then
    echo "minor"; return
  elif echo "$LABELS_LOWER" | grep -q "patch"; then
    echo "patch"; return
  fi
  echo ""
}

if [ "$BUMP_ARG" != "auto" ]; then
  BUMP="$BUMP_ARG"
else
  BUMP=$(determine_bump_from_event)
  if [ -z "$BUMP" ]; then
    BUMP="patch"
  fi
fi

echo "Target: $TARGET"
echo "Bump type: $BUMP"

LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || true)
echo "Latest tag: ${LATEST_TAG:-<none>}"

if [ -z "$LATEST_TAG" ]; then
  # No previous tag at all -> choose a sensible initial version.
  if [ "$BUMP" = "major" ]; then
    NEW_VERSION="v1.0.0"
  else
    NEW_VERSION="v0.1.0"
  fi
else
  # There is an existing tag. Parse it and decide whether to treat it as a legacy
  # pre-release tag (e.g., v0.0.x) that should be ignored for starting at v0.1.0.
  BASE=${LATEST_TAG#v}
  IFS='.' read -r MAJOR MINOR PATCH <<< "${BASE}"
  MAJOR=${MAJOR:-0}; MINOR=${MINOR:-0}; PATCH=${PATCH:-0}

  # If the latest tag is in the 0.0.x range, treat it as legacy and start from v0.1.0
  if [ "$MAJOR" -eq 0 ] && [ "$MINOR" -eq 0 ]; then
    if [ "$BUMP" = "major" ]; then
      NEW_VERSION="v1.0.0"
    else
      NEW_VERSION="v0.1.0"
    fi
  else
    case "$BUMP" in
      major)
        MAJOR=$((MAJOR+1)); MINOR=0; PATCH=0
        ;;
      minor)
        MINOR=$((MINOR+1)); PATCH=0
        ;;
      patch)
        PATCH=$((PATCH+1))
        ;;
      *)
        echo "Unknown bump: $BUMP"; exit 2
        ;;
    esac

    NEW_VERSION="v${MAJOR}.${MINOR}.${PATCH}"
  fi
fi
NEW_TAG="$NEW_VERSION"

echo "Computed: ${NEW_VERSION}"

if [ "$TARGET" = "VERSION" ]; then
  # write the v-prefixed value to VERSION to match current repo behaviour
  if [ "$APPLY" -eq 1 ]; then
    echo "${NEW_VERSION}" > VERSION
    echo "Wrote VERSION -> $(cat VERSION)"
  else
    if [ "$DRY_RUN" -eq 1 ]; then
      echo "DRY RUN: would write VERSION -> ${NEW_VERSION}"
    else
      echo "Would write VERSION -> ${NEW_VERSION} (pass --apply to perform)"
    fi
  fi
elif [ "$TARGET" = "package.json" ]; then
  # requires node/npm in runner
  if ! command -v npm >/dev/null 2>&1; then
    echo "npm not found in PATH; cannot bump package.json" >&2
    exit 3
  fi
  CUR_VER=$(node -p "require('./package.json').version")
  echo "Current package.json version: ${CUR_VER}"
  # If there is no previous tag (first release) we computed NEW_VERSION above
  # Use the computed NEW_VERSION to set package.json so first tag becomes v0.1.0 (or v1.0.0 for major)
  if [ -z "${LATEST_TAG}" ]; then
    TARGET_VER="${NEW_VERSION#v}"
    if [ "$APPLY" -eq 1 ]; then
      echo "No existing tag detected; setting package.json to ${TARGET_VER}"
      npm --no-git-tag-version version "${TARGET_VER}"
    else
      if [ "$DRY_RUN" -eq 1 ]; then
        echo "DRY RUN: would run: npm --no-git-tag-version version ${TARGET_VER}"
      else
        echo "Would run: npm --no-git-tag-version version ${TARGET_VER} (pass --apply to perform)"
      fi
    fi
  else
    # Otherwise use the semantic bump via npm
    if [ "$APPLY" -eq 1 ]; then
      npm --no-git-tag-version version "${BUMP}"
    else
      if [ "$DRY_RUN" -eq 1 ]; then
        echo "DRY RUN: would run: npm --no-git-tag-version version ${BUMP}"
      else
        echo "Would run: npm --no-git-tag-version version ${BUMP} (pass --apply to perform)"
      fi
    fi
  fi
  if [ "$APPLY" -eq 1 ]; then
    NEW_VER=$(node -p "require('./package.json').version")
  else
    # In compute-only/dry-run mode, don't read package.json (we didn't change it); use the computed NEW_VERSION
    NEW_VER="${NEW_VERSION#v}"
  fi
  NEW_TAG="v${NEW_VER}"
  echo "Updated package.json -> ${NEW_VER}"
else
  echo "Unknown target: $TARGET"; exit 2
fi

# emit outputs for GH Actions
gh_output "NEW_VERSION" "${NEW_VERSION}"
gh_output "NEW_TAG" "${NEW_TAG}"

echo "NEW_VERSION=${NEW_VERSION}"
echo "NEW_TAG=${NEW_TAG}"

exit 0
