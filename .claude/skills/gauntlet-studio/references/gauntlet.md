# The ticket gauntlet

Every ticket, in every department, runs the same gauntlet. This is where quality comes from. The Director only merges tickets that come out as WON. How much of it a ticket gets depends on its tier (hero / core / bulk, see `endurance.md`); the order and the rules never change.

```
                 +---------------------------------------------------------------+
                 v                                                               |
  BUILD --> VERIFY --> +-- EXPERIENCE CRITIC (blind A/B vs shipped game) --+     |
              |        |                                                   +--> both pass? --no--> gaps back to BUILD
            fail       +-- CODE CRITIC (review vs architecture + ref repo) +          |
              |                                                                      yes --> Director merges
              +--> back to BUILD
```

Two critics, on two separate tracks, because they judge different things with different evidence:

- The **Experience critic** judges what the player sees, hears and feels. It never reads code - if it did, it would forgive a bad result because the code looks clever.
- The **Code critic** judges what is under the hood. It never judges looks - if it did, it would forgive a hack because the result looks good.

Mixing them into one critic lets each concern excuse the other. Separate critics, separate verdicts, and a ticket needs **both** to pass where both apply.

## 1. Build

- A builder subagent with the ticket, the pillars, the style bible, `ARCHITECTURE.md` and the bar. Nothing else.
- It produces the artifact **and the evidence**: the change, plus the captures the Experience critic will judge (see `engines.md`), plus the diff and test results the Code critic will judge.
- It never self-approves and never writes "done" - it writes "ready for verify".
- Its context pack is listed in the ticket (`context.md`). It reads those files and nothing else, and returns at most 5 lines; everything else goes to `evidence/<ticket>/round-<n>/`.

## 2. Verify (machine checks, no taste)

Fast, cheap, binary. Failing any check goes straight back to the builder without spending a critic.

- Code: compiles headless, unit and functional tests pass, new behaviour has new tests, linter and formatter clean, no new warnings, static analysis clean, the smoke test still runs.
- 3D: opens in Blender, applied transforms, correct scale and pivot, clean normals, UVs within 0-1 without overlap (unless intended), under polycount and texel-density budget, exports, imports into the engine without errors.
- Animation: loops where it should, root motion correct, no foot sliding above threshold, plays on the target skeleton.
- Audio: loudness target (LUFS), no clipping, loops clean.
- Level: navmesh builds, the playtest bot can reach every objective.
- UI: every screen reachable with keyboard and gamepad, text fits at every supported resolution.
- Everything: within the ticket's perf budget on the integration build.

## 3a. Experience critic (blind, harsh, one question)

A **fresh** subagent every round. It has never seen the builder's reasoning, the previous rounds, the code, or which attempt this is.

It gets:

- Evidence A and B, labels stripped and order randomised: ours and the bar's (the real, fetched reference - not a description).
- The one question for this ticket, written by the Director: "Which dash feels more responsive and readable?", "Which character reads better as a silhouette at game camera distance?", "Which hit sound is more satisfying?"
- The pillars.

It returns exactly:

```
PICK:   A or B
WHY:    two sentences, concrete
GAP:    the single biggest thing that would flip the pick, as an instruction the builder can act on
```

- Harsh. Praise is not useful. No scores out of 10 - they drift up every round.
- Judges only the evidence. Missing or unclear evidence = `PICK: bar, GAP: evidence insufficient - capture X`.
- Feel tickets (movement, gunplay, combat, camera, UI responsiveness) are judged on **video plus input trace plus frame timing**, never a single screenshot.

## 3b. Code critic (fresh, harsh, reads everything)

A **fresh** subagent every round with senior engine-programmer judgement. It has never seen the builder's reasoning or the visuals.

It gets:

- The full diff, the files it touches, `ARCHITECTURE.md`, `BUDGETS.md`, test results, profiler capture.
- The **code bar**: a named reference implementation of the same kind of system that it can actually open - for example Epic's Lyra sample for Unreal gameplay abilities and input, Unity's official samples (Boss Room, Megacity), Godot's official demo projects, or a named well-regarded open-source game. The Director picks it per system in `BARS.md`.

It checks, in this order, and stops at the first category that fails:

1. **Correctness** - does it do what the ticket says in every case, including edge cases (frame-rate independence, pause, respawn, save/load, level transitions, many instances)?
2. **Robustness** - null/invalid state, race conditions, leaks, unbounded growth, error handling, no silent failures.
3. **Performance** - allocations in hot paths, per-frame work that should be event-driven, O(n²) over entities, draw calls, within the ticket's budget on the profiler capture.
4. **Architecture fit** - follows `ARCHITECTURE.md`, right layer, no hidden coupling, tuning values in data not code, no duplication of an existing system.
5. **Testability and readability** - tests cover the behaviour, names say what things do, another agent could change it in six months.

It returns exactly:

```
VERDICT:  PASS or BLOCK
VS BAR:   one sentence: where the reference implementation does this better, or "matches or beats"
BLOCKERS: ranked, each with file:line and the fix as an instruction (empty if PASS)
```

- Harsh. A `PASS` means it would ship this in the reference repo. "Works on my run" is not a pass.
- Style nits alone never block. Correctness, robustness, performance and architecture findings always block.
- It also reviews code that other departments produce: Blender Python, shaders, editor tools, build scripts.

## Which critic judges which ticket

| Ticket | Experience critic | Code critic |
|---|---|---|
| Gameplay code, systems, AI, gunplay, movement | yes (feel) | yes |
| Tools, pipeline, build, save/load, netcode | only if player-visible | yes |
| 3D, 2D art, animation, audio | yes | only on the generating scripts / shaders |
| Shaders, VFX, lighting | yes | yes (perf + correctness) |
| Level design | yes (Playtest critic) | only on scripted logic |
| UI/UX | yes | yes |
| Design specs, tuning | yes, after implementation | no |

## 4. Decide

- A ticket is **WON** when every applicable track passes:
  - Experience: hero - two independent fresh critics pick ours, each with a re-randomised order; core - one; bulk - passes its Coherence batch.
  - Numbers: every number in the ticket is met on the measurement, not on the critic's impression.
  - Code: one fresh Code critic returns `PASS` on the final diff (after any Experience-driven changes - never on an older diff).
- Otherwise every open GAP and BLOCKER goes back to the builder together, Code blockers first. The builder fixes, verify runs again, and **both** critics re-judge from scratch - a visual fix can break code, a code fix can change feel.

## Stalls and escalation

A ticket is **stalled** after 3 rounds with the same GAP or BLOCKER, or at its tier's round budget (hero 8, core 5, bulk 3). A GAP that repeats across tickets becomes a `LESSONS.md` rule.

1. **Swap the builder** - new subagent, fresh context, told only the bar and the last GAP/BLOCKERS.
2. **Split the ticket** - the GAP usually names a sub-problem that deserves its own ticket.
3. **Lower the ask, not the bar** - narrow what is compared (one animation instead of the whole moveset) so the ticket can win.
4. **Kill review** - the Director simplifies, replaces or cuts the feature and logs it in `DECISIONS.md`.

Never soften a critic, never swap a bar for an easier one without a logged decision, never exit on a round count.

## Critic roster

Beyond the two per-ticket critics, the Director calls these on integrated builds:

| Critic | Track | Judges | Evidence |
|---|---|---|---|
| **Experience critic** | Experience | One ticket vs its bar | Paired screenshots, turntables, clips, audio |
| **Feel critic** | Experience | Movement, gunplay, combat, camera, juice | Video + input trace + frame timing, vs bar clip |
| **Silhouette critic** | Experience | Characters, props, enemies | Black-fill silhouettes at game camera distance |
| **Coherence critic** | Experience | Does it belong in this game | Asset in-engine next to 5 merged assets and the style bible |
| **Playtest critic** | Experience | Is it fun, is it clear | Playtest bot trace, deaths, stalls, time-to-objective |
| **First-time player** | Experience | Onboarding, UI clarity | A fresh agent with no brief plays and narrates confusion |
| **Code critic** | Code | One ticket's diff | Diff, tests, profiler, architecture doc, reference repo |
| **Architecture critic** | Code | The whole codebase, every milestone | Module graph, dependency cycles, duplicated systems, dead code, test coverage |
| **Tech auditor** | Code | Perf, memory, stability across the game | Profiler captures on every level, memory over a 30 min soak, crash logs |
