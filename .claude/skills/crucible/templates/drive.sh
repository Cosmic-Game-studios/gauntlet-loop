#!/usr/bin/env bash
# Outer heartbeat driver for long unattended runs (days).
# Each heartbeat is a FRESH headless Claude Code session: the files in studio/ are the memory,
# so no context ever accumulates. Stops when the studio waits for the human or is done.
# Circuit breaker: usage limits and transient errors are retried with backoff; the same
# deterministic failure three times in a row (bad flag, missing binary, broken project)
# stops the driver and writes studio/DRIVER_STOPPED.md instead of retrying forever.
#
# Usage: bash drive.sh [model]          e.g. bash drive.sh opus
set -u
MODEL="${1:-opus}"
PAUSE_LIMIT=900         # seconds to wait after a usage limit / overload
PAUSE_ERROR=120         # seconds to wait after another failure
MAX_SAME_FAILURES=3
PAUSE_BETWEEN=5
last_sig=""; same=0
mkdir -p studio/driver

while true; do
  if grep -Eq 'state: (WAITING FOR HUMAN|BLOCKED ON HUMAN|DONE)' studio/STATUS.md 2>/dev/null; then
    grep -E 'state:' studio/STATUS.md | head -n 1
    echo "studio needs the human (or is done) - driver stops. Answer in a Claude Code session in this project, then run: bash tools/drive.sh"
    exit 0
  fi

  echo "--- heartbeat $(date -u +%FT%TZ) ---"
  log="studio/driver/last-heartbeat.log"
  claude -p "Use the crucible skill. You are the Game Director. Run exactly one heartbeat from the studio files. This is headless mode: wait for every subagent you dispatch before you integrate and report, then stop." \
       --model "$MODEL" --permission-mode auto --output-format text >"$log" 2>&1
  code=$?
  if [ "$code" -eq 0 ]; then last_sig=""; same=0; sleep "$PAUSE_BETWEEN"; continue; fi
  if grep -qiE 'usage limit|rate limit|overloaded|429|529|quota' "$log"; then
    echo "usage limit or overload - waiting ${PAUSE_LIMIT}s"; sleep "$PAUSE_LIMIT"; continue
  fi
  sig="$code:$(grep -iE 'error|not found|unknown|invalid|denied' "$log" | tail -n 3 | sed 's/[0-9]\{2,\}/N/g' | md5sum | cut -c1-12)"
  if [ "$sig" = "$last_sig" ]; then same=$((same + 1)); else same=1; last_sig="$sig"; fi
  if [ "$same" -ge "$MAX_SAME_FAILURES" ]; then
    { echo "# Driver stopped"; echo; echo "The same failure happened $same times in a row (exit $code), so it is probably deterministic."; echo "Last output:"; echo '```'; tail -n 40 "$log"; echo '```'; } > studio/DRIVER_STOPPED.md
    echo "same failure $same times - driver stops; see studio/DRIVER_STOPPED.md"; exit 2
  fi
  echo "heartbeat failed (exit $code, attempt $same) - retrying in ${PAUSE_ERROR}s"; sleep "$PAUSE_ERROR"
done
