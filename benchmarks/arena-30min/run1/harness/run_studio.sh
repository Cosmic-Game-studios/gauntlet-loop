#!/usr/bin/env bash
# Crucible driver: fresh headless session per heartbeat until handoff or the 150-min cap.
cd /home/user/bench/studio
start=$(date -u +%s); echo $start > /home/user/bench/runner/studio.start
n=0
while true; do
  now=$(date -u +%s); el=$(( (now-start)/60 ))
  if grep -Eq 'state: (WAITING FOR HUMAN|BLOCKED ON HUMAN|DONE)' studio/STATUS.md 2>/dev/null; then echo "handoff after $n heartbeats, $el min" >> /home/user/bench/runner/studio.err; break; fi
  if [ $el -ge 30 ]; then echo "cap reached after $n heartbeats" >> /home/user/bench/runner/studio.err; break; fi
  n=$((n+1)); left=$(( 32 - el ))
  timeout ${left}m claude -p "$(cat /home/user/bench/runner/studio_prompt.txt)" --model claude-opus-5-5 --allowedTools "Agent,Bash,Read,Write,Edit,Glob,Grep,TodoWrite,TaskCreate,TaskUpdate,TaskList,TaskGet,TaskOutput" --output-format json > /home/user/bench/runner/studio_hb$n.json 2>> /home/user/bench/runner/studio.err
  echo "hb $n exit $? at $(( ($(date -u +%s)-start)/60 )) min" >> /home/user/bench/runner/studio.err
  sleep 3
done
date -u +%s > /home/user/bench/runner/studio.end
