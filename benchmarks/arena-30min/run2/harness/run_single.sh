#!/usr/bin/env bash
# run_single.sh <arm> [extra args]  - one long headless session, hard kill at 32 min
arm=$1; shift
cd /home/user/bench/$arm
date -u +%s > /home/user/bench/runner/$arm.start
timeout 32m claude -p "$(cat /home/user/bench/runner/${arm}_prompt.txt)" --model claude-opus-5-5 --allowedTools "Agent,SendMessage,Bash,Read,Write,Edit,Glob,Grep,TodoWrite,TaskCreate,TaskUpdate,TaskList,TaskGet,TaskOutput" --output-format json "$@" > /home/user/bench/runner/$arm.json 2> /home/user/bench/runner/$arm.err
echo "exit $?" >> /home/user/bench/runner/$arm.err
date -u +%s > /home/user/bench/runner/$arm.end
