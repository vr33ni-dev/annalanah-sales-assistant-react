# PR opened / updated (check-version-on-pr)

Action: check-version-on-pr.yml runs on PR events (opened/edited/labeled/synchronize).
It computes a candidate version from PR labels (major/minor/patch) and posts a comment that shows the computed version.
If the PR is from the same repo, it then runs your bump helper (.github/scripts/bump-version.sh [package.json](http://_vscodecontentref_/1) auto --apply) on the PR branch. That script:
Computes NEW_VERSION / NEW_TAG and (when --apply) edits package.json to set the new version (prefers jq, falls back to npm version).
Emits NEW_VERSION and NEW_TAG as GitHub Actions outputs (so other steps could read them).
After the script edits package.json, the PR job regenerates package-lock.json (with npm install --package-lock-only) and commits/pushes the bump back to the PR branch. If the push conflicts, it tries a rebase and, on failure, creates a fallback branch + comment.
Net effect of PR job: reviewer sees the computed version and the PR will usually be updated so the bumped package.json is part of the PR diff (so merging the PR already contains the version bump).

# Merge the PR into main

Event: merging a PR emits a pull_request.closed with merged=true and triggers release-on-main.yml.
release-on-main.yml precheck verifies the event is a merged PR into main (or manual dispatch). If precheck passes:
It runs autobump (calls bump-version.sh [package.json](http://_vscodecontentref_/8) auto --apply) again. This is intended to ensure package.json on main reflects the correct bumped version (in case the PR lacked it or it didn’t land).
It then commits/pushes any changed package.json/package-lock.json to main. If a direct push is blocked by branch protections, it tries the Contents API, then creates a branch+PR as a fallback.
Tag creation: a workflow step computes TARGET_COMMIT (prefers origin/main, otherwise local HEAD) and reads package.json at that commit to get TAG_FROM_PKG="v${version}". It creates an annotated git tag at that target commit and pushes it.
Release creation: a later step uses steps.autobump.outputs.NEW_TAG (the output emitted by the bump-version.sh run) to create a GitHub Release.
