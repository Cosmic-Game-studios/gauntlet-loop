#!/usr/bin/env bash
# Before context is compacted, snapshot studio/ so nothing written so far can be lost.
# The snapshot goes to a side ref (refs/crucible/snapshots) through a temporary index:
# it never touches the current branch, HEAD, or the user's staging area.
set -u
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
[ -d studio ] || exit 0
git rev-parse --git-dir >/dev/null 2>&1 || exit 0

tmp_index=$(mktemp) || exit 0
trap 'rm -f "$tmp_index"' EXIT
export GIT_INDEX_FILE="$tmp_index"
export GIT_AUTHOR_NAME="${GIT_AUTHOR_NAME:-$(git config user.name || echo crucible)}"
export GIT_AUTHOR_EMAIL="${GIT_AUTHOR_EMAIL:-$(git config user.email || echo crucible@localhost)}"
export GIT_COMMITTER_NAME="$GIT_AUTHOR_NAME" GIT_COMMITTER_EMAIL="$GIT_AUTHOR_EMAIL"

parent=$(git rev-parse -q --verify refs/crucible/snapshots 2>/dev/null || true)
base=${parent:-$(git rev-parse -q --verify HEAD 2>/dev/null || true)}
if [ -n "$base" ]; then git read-tree "$base" >/dev/null 2>&1 || exit 0; else git read-tree --empty; fi
git add -A -- studio >/dev/null 2>&1 || exit 0
tree=$(git write-tree) || exit 0
if [ -n "$parent" ] && [ "$(git rev-parse "$parent^{tree}")" = "$tree" ]; then exit 0; fi
commit=$(git commit-tree "$tree" ${parent:+-p "$parent"} -m "studio snapshot before context compaction") || exit 0
git update-ref refs/crucible/snapshots "$commit"
exit 0
