#!/usr/bin/env bash
# release.sh — Bump version, prepend CHANGELOG entry, tag, push.
#
# Usage:
#   scripts/release.sh <major|minor|patch> [--push] [--no-verify]
#
# Default behavior is a dry-run: makes no remote changes, prints what it
# WOULD do. Pass --push to actually push the tag and trigger publish.yml.
#
# Requires: git, npm, jq.

set -euo pipefail

usage() {
  cat <<EOF
Usage: $(basename "$0") <major|minor|patch> [--push] [--no-verify] [--dry-run]

Arguments:
  bump                One of: major, minor, patch.
  --push              Actually push the tag and trigger publish.yml.
                      Without this flag, the script runs in dry-run mode
                      and prints the commands it would run.
  --no-verify         Skip the npm run verify gate before tagging.
                      Use only for hotfixes where the gate is already
                      known to pass on master.
  --dry-run           Override and force dry-run even if --push is set.

Examples:
  $(basename "$0") patch                # dry-run a patch bump from 1.2.0 -> 1.2.1
  $(basename "$0") patch --push         # bump, tag, push, trigger publish
  $(basename "$0") minor --no-verify    # dry-run minor bump, skip verify
EOF
}

if [ $# -lt 1 ]; then
  usage
  exit 1
fi

BUMP="$1"
shift || true

PUSH=0
DRY_RUN=1
VERIFY=1
for arg in "$@"; do
  case "$arg" in
    --push) PUSH=1; DRY_RUN=0 ;;
    --dry-run) DRY_RUN=1 ;;
    --no-verify) VERIFY=0 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $arg" >&2; usage; exit 1 ;;
  esac
done

case "$BUMP" in
  major|minor|patch) ;;
  *) echo "Bump must be major|minor|patch (got: $BUMP)" >&2; exit 1 ;;
esac

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required for version bumping." >&2
  exit 1
fi

# Refuse to run if the working tree is dirty.
if ! git diff --quiet --ignore-submodules HEAD 2>/dev/null; then
  echo "Working tree is dirty. Commit or stash first." >&2
  git status --short
  exit 1
fi

# Capture current version.
CURRENT_VERSION=$(jq -r .version package.json)
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
case "$BUMP" in
  major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
  minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
  patch) PATCH=$((PATCH + 1)) ;;
esac
NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"
TAG="v${NEW_VERSION}"

echo "Current version: $CURRENT_VERSION"
echo "New version:     $NEW_VERSION"
echo "Tag:             $TAG"

# Sanity: tag must not already exist locally.
if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Tag $TAG already exists locally. Delete it first or pick a different bump." >&2
  exit 1
fi

# Sanity: branch must be master/main.
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "master" ] && [ "$CURRENT_BRANCH" != "main" ]; then
  echo "Warning: branch is '$CURRENT_BRANCH', not master/main. Press Ctrl-C to abort." >&2
  sleep 3
fi

run_or_print() {
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "[dry-run] $*"
  else
    echo "[exec]    $*"
    eval "$@"
  fi
}

# 1. Verify gate (optional).
if [ "$VERIFY" -eq 1 ]; then
  echo "Running verify gate (npm run verify)..."
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "[dry-run] npm run verify"
  else
    npm run verify
  fi
fi

# 2. Update version in package.json.
run_or_print "jq -i '.version = \"${NEW_VERSION}\"' package.json"

# 3. Prepend CHANGELOG.md entry.
CHANGELOG_HEADER="## [${NEW_VERSION}] - $(date -u +%Y-%m-%d)"
PLACEHOLDER="### Added\n- TBD\n\n### Changed\n- TBD\n\n### Fixed\n- TBD\n"
TMPFILE=$(mktemp)
printf "%s\n\n%s\n" "$CHANGELOG_HEADER" "$PLACEHOLDER" > "$TMPFILE"
# Insert AFTER the "# Changelog" header line (preserve history below).
HEADER_LINE=$(grep -n '^# Changelog' CHANGELOG.md | head -1 | cut -d: -f1)
if [ -z "$HEADER_LINE" ]; then
  echo "Could not find '# Changelog' header in CHANGELOG.md" >&2
  exit 1
fi
HEADER_TAIL=$((HEADER_LINE + 1))
if [ "$DRY_RUN" -eq 1 ]; then
  echo "[dry-run] Insert CHANGELOG entry after line ${HEADER_TAIL}"
  echo "[dry-run] Entry preview:"
  cat "$TMPFILE" | sed 's/^/    /'
else
  { head -n "$HEADER_TAIL" CHANGELOG.md; cat "$TMPFILE"; tail -n +"$((HEADER_TAIL + 1))" CHANGELOG.md; } > CHANGELOG.md.new
  mv CHANGELOG.md.new CHANGELOG.md
  rm "$TMPFILE"
fi

# 4. Commit.
run_or_print "git add package.json CHANGELOG.md"
run_or_print "git commit -m 'chore(release): ${NEW_VERSION}'"

# 5. Tag.
run_or_print "git tag -a ${TAG} -m 'Release ${NEW_VERSION}'"

# 6. Push (only if --push).
if [ "$PUSH" -eq 1 ]; then
  run_or_print "git push origin HEAD"
  run_or_print "git push origin ${TAG}"
  echo "Tag ${TAG} pushed. publish.yml should fire shortly."
  echo
  echo "Verify the publish landed:"
  echo "  npm view vehicle-routing@${NEW_VERSION} dist.unpackedSize"
  echo "  npm view vehicle-routing dist.signatures"
  echo "  # Provenance attestation URL on the npm package page."
else
  echo
  echo "Dry-run complete. Re-run with --push to:"
  echo "  - push HEAD to origin"
  echo "  - push ${TAG} (triggers publish.yml on tag v*)"
fi
