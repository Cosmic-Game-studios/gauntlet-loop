# Benchmark rules (identical for every arm)

- Work only inside your arm directory. Do not read or modify the other arm directories (/home/user/bench/solo, /gauntlet, /studio other than your own). /home/user/bench/shared is read-only for you.
- Deliverable: `game/` as described in SPEC.md, playable, committed to git in your arm directory.
- `node_modules` (three 0.186.1, playwright 1.56) is already installed. Headless Chromium: executablePath `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, args `--use-angle=swiftshader --enable-unsafe-swiftshader`. SwiftShader is a CPU renderer - frame rates here are much lower than on real hardware; compare relative performance, do not chase absolute fps.
- Network: only GitHub and npm are reachable. You cannot download images, models or sounds (and SPEC forbids external assets anyway).
- Time: hard limit of 30 minutes for every arm. Run `date -u` at the start and write it to BENCH_LOG.md. The run is killed at 32 minutes, so commit a playable game early and often, and write BENCH_LOG.md before minute 30.
- Subagents: use the Agent tool (general-purpose) if your method uses subagents. Do not use the Workflow tool. You run headless (`claude -p`): background subagents die when your session ends, so wait for every subagent you start before you finish.
- At the end, write `BENCH_LOG.md` in your arm directory:
  - start and end time (UTC), total minutes
  - every subagent you spawned: role and what it did (the benchmark measures tokens and cost itself)
  - rounds of review/critique per piece, if any
  - context: did your own context get compacted or become hard to manage? what did you do about it?
  - what went wrong, what you would do differently
  - your own honest assessment of the game's quality against SPEC.md, feature by feature
