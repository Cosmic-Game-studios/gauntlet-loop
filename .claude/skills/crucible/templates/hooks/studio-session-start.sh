#!/usr/bin/env bash
# Re-injects the studio state into context on every start, resume and compaction,
# so the Director never works from a summary of itself.
set -u
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
[ -f studio/STATUS.md ] || exit 0

echo "=== crucible state (from files - trust these over any summary) ==="
cat studio/STATUS.md
echo
if [ -f studio/TRACKER.md ]; then
  echo "=== TRACKER: open items ==="
  grep -E '^\s*- \[ \]|^## ' studio/TRACKER.md | head -n 80
fi
if grep -q 'state: RUNNING' studio/STATUS.md; then
  echo
  echo "The studio is RUNNING. If no heartbeat driver is active in this session, continue with the next Director heartbeat (see the crucible skill, references/director.md)."
fi
exit 0
