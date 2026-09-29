#!/usr/bin/env bash
# Outer heartbeat driver for long unattended runs (days).
# Each heartbeat is a FRESH headless Claude Code session: the files in studio/ are the memory,
# so no context ever accumulates. Stops when the studio waits for the human or is done.
#
# Usage: bash drive.sh [model]          e.g. bash drive.sh opus
set -u
MODEL="${1:-opus}"
PAUSE_ON_ERROR=900      # seconds to wait after a failed heartbeat (usage limit, network)
PAUSE_BETWEEN=5

while true; do
  if grep -Eq 'state: (WAITING FOR HUMAN|BLOCKED ON HUMAN|DONE)' studio/STATUS.md 2>/dev/null; then
    grep -E 'state:' studio/STATUS.md | head -n 1
    echo "studio needs the human (or is done) - driver stops. Answer in a Claude Code session in this project, then run: bash tools/drive.sh"
    exit 0
  fi

  echo "--- heartbeat $(date -u +%FT%TZ) ---"
  if claude -p "Use the gauntlet-studio skill. You are the Game Director. Run exactly one heartbeat from the studio files. This is headless mode: wait for every subagent you dispatch before you integrate and report, then stop." \
       --model "$MODEL" --permission-mode auto --output-format text; then
    sleep "$PAUSE_BETWEEN"
  else
    echo "heartbeat failed (limit or error) - retrying in ${PAUSE_ON_ERROR}s"
    sleep "$PAUSE_ON_ERROR"
  fi
done
