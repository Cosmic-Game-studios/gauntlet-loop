# Benchmark run 2: Arena, 30-minute window

**Date:** 2026-09-29. **Model:** Claude Opus 5.5 for every contender (Crucible also routes some tickets to Sonnet 5.5). Each contender ran headless as a separate Claude Code process.
**Task:** the same [`SPEC.md`](SPEC.md) as run 1. **Rules:** [`BENCH_RULES.md`](BENCH_RULES.md). **Time:** a hard 30-minute limit. All three ran in parallel on one 4-core machine with software WebGL.

Changes since run 1:
- **Crucible v2:** a real studio with a Director, leads and departments; model routing; up to 6 review rounds; craft rules; a sprint playbook; tooling.
- **Shared tooling for the loops:** a first-person capture tool for the bar game. Solo and the Gauntlet Loop ran unchanged.
- **Stricter evaluation:**
  - a fixed function harness;
  - a WebGL performance probe;
  - two blind playtesters who actually play all three games through a step-play server, using real menu clicks, keys and mouse.

## 1. Cost and effort (measured)

| | Solo | Gauntlet Loop | Crucible v2 |
|---|---|---|---|
| Time used (of 30 min) | 15 min | 22 min | 25 min |
| Cost at list price | **$2.35** | $9.11 | $8.34 (Opus $7.34, Sonnet $1.00) |
| Tokens processed | **1.8 M** | 14.8 M | 10.0 M |
| Subagents | 0 | 15 | 20 (13 Opus, 7 Sonnet) |
| Review rounds | self-review | critic loops per piece | 3 review-fix rounds; the code critic found blockers; 12/12 acceptance checks passed |

## 2. Function tests (independent harness)

| | Solo | Gauntlet Loop | Crucible v2 |
|---|---|---|---|
| Checks at 640×360 / 1280×720 | **15/15 / 15/15** | 14/15 / 13/15 | **15/15** / 14/15 |
| Failures | none | reload (both resolutions), jump (720p) | reload (720p only: timing at low frame rate) |
| Console errors | 1 (404) | 0 | 0 |

## 3. Optimization (WebGL probe, same load for all)

| | Solo | Gauntlet Loop | Crucible v2 |
|---|---|---|---|
| Load time | 1.1 s | 4.5 s | **0.8 s** |
| Draw calls idle / combat (12 enemies) | 112 / 331 | 191 / 888 | **43 / 109** |
| Triangles in combat | 23 k | 81 k | **8 k** |
| fps idle / combat (software rendering, relative) | **17.5 / 12.5** | 11 / 5.4 | 9.2 / 10.8 |

Crucible v2 renders the same fight with a third of Solo's draw calls and an eighth of the Gauntlet Loop's. Its raw frame rate is lower than Solo's, because post-processing is expensive under software rendering.

## 4. Blind judges: look and UX (screenshots, 2 judges, averaged, 1-10)

| | Solo | Gauntlet Loop | Crucible v2 |
|---|---|---|---|
| Art direction | 4 | 6 | **6.5** |
| Arena design | 5 | 5 | **7** |
| Enemies | 4.5 | **7** | 5.5 |
| Weapon and firing feedback | **6** | 5 | 3 |
| HUD, menus, UI | 5.5 | 5.5 | **8** |
| **Overall** | 4.5 | 5.5 | **6** |

The judges split on the overall winner: one picked the Gauntlet Loop, one picked Crucible. Both flagged the same Crucible weakness: its muzzle flash plus bloom washes out the centre of the screen on every shot.

## 5. Blind judges: code (2 judges, averaged, 1-10)

| | Solo | Gauntlet Loop | Crucible v2 |
|---|---|---|---|
| Correctness | **6.5** | 6 | 5.5 |
| Architecture | 3 | 6 | **7** |
| Performance discipline | 5 | 4 | **7** |
| Spec depth | 6.5 | **8** | 7.5 |
| **Overall** | 5 | **6.5** | **6.5** |

## 6. Blind playtesters (2, each played all three games, averaged, 1-10)

| | Solo | Gauntlet Loop | Crucible v2 |
|---|---|---|---|
| Controls and responsiveness | **7** | 4.5 | 4 |
| Clarity | **6** | **6** | 5.5 |
| Feedback (hits, damage, kills) | 4 | **8** | 5.5 |
| Menus and flow | **7.5** | 3.5 | 6 |
| Look while playing | 5 | 6 | **8** |
| **Overall playability** | **6** | 5 | 5 |

The playtesters' main complaint about Crucible was input that felt sluggish at the low frame rate: fewer shots per trigger hold, and delayed movement. One also found that the pause menu's Resume button did not respond. Solo handled low frame rates best.

## 7. Context, workflow, management

These were assessed by the benchmark author from the logs. **They are not blind.**

| | Solo | Gauntlet Loop | Crucible v2 |
|---|---|---|---|
| Context handling | 5: one session | 4: one lead context, 14.8 M tokens, no state files | **9**: Director read only 5-line returns and contact sheets; never compacted; all state in files |
| Workflow | 5 | 6: effective critic loops, no gates | **8**: kickoff, parallel wave, three review-fix rounds, perf fix (386 -> 161 enemy draw calls), acceptance 12/12 |
| Management and traceability | 3 | 5 | **9** |

## Verdict

**Crucible v2 made a clear jump from run 1, but it is not yet the clear winner it has to be.**

- **Where it wins:**
  - look and UI in the blind screenshot review (6 vs 5.5 vs 4.5);
  - look while playing (8);
  - optimization (by far the fewest draw calls and triangles, fastest load);
  - architecture and performance discipline in code;
  - context, workflow and traceability.
- **Where it ties:** overall code quality with the Gauntlet Loop (6.5 each).
- **Where it loses:**
  - playability and controls at low frame rates;
  - weapon feedback (the flash washes out the screen).

It also cost less than the Gauntlet Loop ($8.34 vs $9.11) while using more agents.

Solo remains the cheapest and the most robust to play. The Gauntlet Loop has the best hit feedback and enemy design.

## What went into Crucible afterwards

v3 and v4 (see the repository history):
- **The two losing points became rules:**
  - correct input and fire rate at any frame rate (with a throttled-frame-rate acceptance check);
  - effects must never cover the target.
- **Craft rules become acceptance checks at kickoff.**
- **Departments for Character Art, Animation and VFX,** with their own craft sections.
- **A kickoff script that saves minutes.**
- **Engine adapters and security hardening.**

## Files

- `games/`: the three games as delivered. Add `vendor/` from three 0.186.1 to run them.
- `logs/`: each contender's `BENCH_LOG.md`, the function-test results and the perf probe results.
- `crucible-studio-state/`: Crucible's `studio/` memory at handoff.
- `harness/`: prompts, run scripts, the evaluator, the perf probe, the step-play server and the playtest prompt.
