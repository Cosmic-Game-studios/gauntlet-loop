# Benchmark: Arena, 30-minute window

**Date:** 2026-09-29. **Model:** Claude Opus 5.5 for every contender, run headless as separate Claude Code processes (`claude -p`).
**Task:** [`SPEC.md`](SPEC.md), a 3D first-person arena shooter for the browser built with three.js and procedural assets only. **Rules:** [`BENCH_RULES.md`](BENCH_RULES.md).
**Time:** a hard limit of 30 minutes per contender. All three ran in parallel on the same 4-core machine with software WebGL (SwiftShader).

| Contender | How it ran |
|---|---|
| **Solo** | One session. Subagents were disabled. |
| **Gauntlet Loop** | One lead session running the original gauntlet loop prompt ([`harness/gauntlet_prompt.txt`](harness/gauntlet_prompt.txt)). Bars: Dive by Mugen87 and three.js `games_fps`. |
| **Crucible** | Crucible as of this commit's parent. Every Director heartbeat was a fresh headless session ([`harness/run_studio.sh`](harness/run_studio.sh)), using the same bars. Adaptations: [`harness/BENCH_ADAPTATIONS.md`](harness/BENCH_ADAPTATIONS.md). |

## 1. Cost and effort (measured by Claude Code's JSON output)

| | Solo | Gauntlet Loop | Crucible |
|---|---|---|---|
| Time used (of 30 min) | 14 min | 21 min | 20 min (3 heartbeats) |
| Cost at list price | **$2.63** | $7.89 | $5.88 |
| Tokens processed (incl. cache reads) | **2.9 M** | 12.2 M | 6.4 M |
| Subagents | 0 | 18, plus resumes | 9 |
| Review rounds | self-review from screenshots | 16 critic rounds; 1 blind win (HUD) | 1 code review (6 blockers found and fixed); 1 visual critic round wasted (no comparable bar framing) |

## 2. Automated function tests (independent harness, [`harness/eval.mjs`](harness/eval.mjs))

All three games implement every spec feature and pass the functional checks: movement, jump, collision, shooting, ammo, reload, weapon switch, enemy damage, game over, waves, pause, and the test hook. The harness's sprint check turned out to be flawed, because it ran into walls, and was discarded; sprint works in all three games in open space.

| | Solo | Gauntlet Loop | Crucible |
|---|---|---|---|
| Frame rate at 640×360, idle / combat (SwiftShader, relative only) | **18 / 25** | 12 / 15 | 18 / 20 |
| Console errors | 0 | 1 (404) | 0 |
| Notable defect found by probing | none | none | rushers are shorter than eye height, so a level shot flies over them and you have to aim down |

## 3. Blind judges: look and UX

Two fresh judges looked at the same 12 automated captures per game. Each saw the games as X, Y and Z in a different order and did not know who built which. Scores are the average of the two judges (1-10).

| | Solo | Gauntlet Loop | Crucible |
|---|---|---|---|
| Art direction and coherence | 4 | **6** | **6** |
| Arena design | 4 | **6.5** | 5 |
| Enemy design and readability | **5.5** | **5.5** | 3 |
| Weapon viewmodel and firing feedback | 4 | **6.5** | 4 |
| HUD, menus and UI | 6 | **7.5** | 4.5 |
| **Overall (which would a player rather play)** | 4.5 | **6.5** | 4.5 |

Both judges picked the **Gauntlet Loop** as the overall winner. Crucible's warm "pit" palette got the best art-direction score from one judge. Both judges flagged the same problem: its enemies share the environment's orange palette and disappear into it.

## 4. Blind judges: code quality

Two fresh senior-programmer judges read every source file, anonymised and with ticket IDs stripped, in two different orders.

| | Solo | Gauntlet Loop | Crucible |
|---|---|---|---|
| Correctness and robustness | 6.5 | 5 | **8** |
| Architecture and maintainability | 6 | 3 | **7.5** |
| Performance discipline | 7 | 3.5 | **8** |
| Spec completeness and depth | 6 | 7.5 | **8** |
| **Overall project quality** | 6.5 | 5 | **8** |

Both judges picked **Crucible** as the overall winner. Their reasons:
- a fixed 120 Hz simulation step
- modules with clear ownership (enemies and audio as separate systems)
- data-driven tuning tables
- the whole arena merged into one draw call
- allocation-free A* navigation
- telegraphed enemy attacks

The Gauntlet Loop's code came last in both reviews: dense one-line code, allocations in hot paths, and a per-frame line-of-sight test against every solid. Parallel builders had been editing one shared file.

## 5. Context, workflow and management

These scores were assessed by the benchmark author from the logs and artifacts. **They are not blind.**

| | Solo | Gauntlet Loop | Crucible |
|---|---|---|---|
| **Context handling** | 5: one session, fine for 14 minutes; one 1,100-line file | 4: one lead context (12.2 M tokens processed), no persistent state beyond `PROGRESS.md`; a restart loses the run | **9**: a fresh session every heartbeat (at most about 60 k context each); `STATUS.md` "Next" was directly executable after each restart |
| **Workflow** | 5: fast, self-tested, no outside review | 6: critic feedback clearly improved the look over 16 rounds, but the exit condition ("until the critic picks ours") was unreachable, blindness was not real, and edits collided in one file | 6: the code critic found 6 real blockers; module ownership kept the code clean; but the visual critic round was wasted, fixes merged without re-review, and it handed off 10 minutes early |
| **Management and traceability** | 3: a log only | 5: a progress page | **9**: tracker, decisions, errors, `KNOWN_GAPS.md` and a handoff folder ([`crucible-studio-state/`](crucible-studio-state/)) |

## 6. Optimization (measured afterwards with [`../run2/harness/perf.mjs`](../run2/harness/perf.mjs))

WebGL-instrumented, same load for all three games (menu, idle, 12 enemies in combat), software rendering, 960x540.

| | Solo | Gauntlet Loop | Crucible |
|---|---|---|---|
| Load time | 1.2 s | 4.3 s | **0.7 s** |
| fps idle / combat | **11.7 / 11.1** | 5.2 / 5.0 | 7.8 / 6.3 |
| Draw calls idle / combat | 109 / 345 | 270 / 630 | **17 / 296** |

## Verdict

**In a 30-minute window there is no clear winner, and Crucible did not produce a clearly better game.**

- **Best-looking game:** the Gauntlet Loop. Its visual critics had 16 rounds to push art, level and HUD.
- **Best-engineered game, and the only run that could survive a restart:** Crucible. It won both blind code reviews and scored highest on context handling and management. It cost less than the Gauntlet Loop.
- **Best value:** Solo. It delivered a working, clean game for a third of the Gauntlet Loop's cost.
- **Combined project quality** (mean of blind overall look and blind overall code): Crucible 6.25, Gauntlet Loop 5.75, Solo 5.5. That margin is too small to claim a win.

## What Crucible changed because of this benchmark

The Crucible run logged 14 points of friction. The fixes are in the skill now (commit "Crucible: fixes from the 30-minute benchmark"):

1. **Compressed schedules** for caps under a day. It now uses all the remaining time instead of handing off early.
2. **BARS gate.** Comparable bar evidence must exist before any blind critic runs. Without it, pieces are judged against numbers and internal bars.
3. **Re-check fix diffs before merge.** Builders keep their context across rounds, and critics are always fresh.
4. **Parallel foreground dispatch** in headless heartbeats. Worktrees are used only when files overlap.
5. **Deterministic stepping** is the first tool of every project. Every contender struggled with timing at software-rendering frame rates.
6. **Threat readability** is a style-bible floor. A palette that camouflages the enemies fails.

A rerun is needed to show whether these close the visual gap. Crucible is also designed for runs of hours to days, and this benchmark tested the opposite end.

## Files

- `games/`: the three games as delivered. Add `vendor/three.module.js` and `three.core.js` from three 0.186.1 to run them.
- `logs/`: each contender's own `BENCH_LOG.md`, the Gauntlet Loop's `PROGRESS.md`, and the raw harness results.
- `crucible-studio-state/`: Crucible's `studio/` memory at handoff.
- `harness/`: prompts, run scripts, the evaluator and the montage tool.
