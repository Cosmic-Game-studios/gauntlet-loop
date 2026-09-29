#!/usr/bin/env bash
# Before context is compacted, snapshot the studio files so nothing written so far can be lost.
set -u
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
[ -d studio ] || exit 0
git add studio >/dev/null 2>&1 || exit 0
git commit -q -m "studio: snapshot before context compaction" >/dev/null 2>&1 || true
exit 0
