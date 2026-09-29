# The ticket gauntlet

Every ticket, in every department, runs the same gauntlet. This is where quality comes from. How much of it a ticket gets depends on its tier (hero / core / bulk, see `endurance.md`); the order and the rules never change.

## Why rounds are budgeted, and why up to six

The original gauntlet loop says "loop until it wins". For a game with hundreds of tickets that fails two ways: returns diminish after a few rounds, and a builder that keeps receiving one critic's gap starts fixing what *that critic* notices instead of what the player notices (Goodhart's law; LLM judges are exposed to it).

The first Arena benchmark showed the other side too: the loop that got 16 visual review rounds produced the best-looking game, and Crucible, with effectively zero useful visual rounds, the weakest. Visible quality needs iteration. So hero pieces get **up to six** review rounds, with four guards that keep the extra rounds honest:

1. **Plateau stop.** If two consecutive rounds fail to beat the champion, the ticket stops early - more rounds would only chase the critic. (This is also the main cost saver.)
2. **Fresh critics with rotating evidence.** A new critic every round, and the coach sees a different capture set (camera, seed, moment) each round, so no single view can be optimised for.
3. **Held-out judge.** The outcome is decided on captures neither builder nor coach ever saw.
4. **Champion, not latest.** A round that made things worse is thrown away.

What does not converge within the budget becomes debt for a later polish pass with fresh eyes, and repeated gaps become `LESSONS.md` rules.

## The flow

```
            round 1..N  (N = hero up to 6, core up to 3, bulk 1; plateau stop after 2 rounds without a new champion)
  +------------------------------------------------------------------+
  |  BUILD/REVISE --> VERIFY --> CODE CRITIC --> COACH CRITIC --> gap  |--+
  +------------------------------------------------------------------+  |
       ^                                                    |          |
       +-------------------- next round --------------------+          |
                                                                       v
                                            CHAMPION (best version so far)
                                                                       |
                                                                       v
                                  JUDGE (held-out, fresh, both orders, never gives feedback)
                                                                       |
                        +----------------------+-----------------------+
                        v                      v                       v
                      WON                   PASSED                  FAILED
               beats the bar          meets the floor,          misses the floor
               -> merge               -> merge + DEBT.md        -> one re-scope, else cut
```

## Round budget (hard)

| Tier | Critic rounds | Judge | Re-scope allowed |
|---|---|---|---|
| Hero | up to 6 (plateau stop) | 2 fresh judges, both orders | once |
| Core | up to 3 (plateau stop) | 1 fresh judge | once |
| Bulk | 1 (batched Coherence critic) | the batch verdict is the judge | no - replace with a kit asset or cut |

A **round** is one BUILD/REVISE plus its critics. Verify failures inside a round do not spend a critic, but the builder gets at most 3 verify attempts per round; a fourth failure ends the round as a failed round.

No ticket ever gets more rounds than its budget. The Director cannot extend it; it can only re-scope (below).

## 1. Build / revise

- A `studio-builder` subagent (see `claude-code.md`) with the ticket's context pack (`context.md`): the ticket, the pillars, the relevant style bible and `ARCHITECTURE.md` sections, the bar, the matching `LESSONS.md` rules, and - from round 2 on - the coach critic's GAP and the Code critic's BLOCKERS. Nothing else.
- It changes the work and nothing outside its ticket's files.
- Builders work on the files their ticket owns and do not commit; the Director integrates and commits after each wave (worktrees and per-round branches only when files could overlap - `claude-code.md`). From round 2 on, the builder starts from the champion version of its files.
- It does **not** produce the critics' evidence. Evidence is captured by the studio's capture scripts (`engines.md`) after verify, so a builder cannot cherry-pick flattering angles or frames.
- It returns at most 5 lines and writes "ready for verify", never "done".

## 2. Verify (machine checks, no taste)

Fast, cheap, binary, scripted. Failing any check goes straight back to the builder without spending a critic.

- Code: compiles headless, unit and functional tests pass, new behaviour has new tests, linter and formatter clean, no new warnings, the smoke test still runs.
- 3D: opens in Blender, applied transforms, correct scale and pivot, clean normals, UVs within 0-1 without overlap (unless intended), under polycount and texel-density budget, exports, imports into the engine without errors.
- Animation: loops where it should, root motion correct, foot sliding under threshold, plays on the target skeleton.
- Audio: loudness target (LUFS), no clipping, loops clean, correct format.
- Level: navmesh builds, the playtest bot can reach every objective.
- UI: every screen reachable with keyboard and gamepad, text fits at every supported resolution.
- Everything: within the ticket's perf budget on the integration build.

Then the capture scripts produce the evidence for this round in `studio/evidence/<ticket>/round-<n>/`.

## 3. Code critic

A fresh `code-critic` subagent every round. Senior engine-programmer judgement; it never sees visuals or the builder's reasoning. It runs before the Experience critics because it is cheaper and its blockers usually change what they would see.

It gets the diff, the touched files, `ARCHITECTURE.md`, `BUDGETS.md`, test and profiler output, and the **code bar**: a named reference implementation it can open (Epic's Lyra sample, Unity's official samples, Godot demo projects, a named well-regarded open-source game - chosen per system in `BARS.md`).

It checks in this order: **correctness** (every case, incl. frame-rate independence, pause, respawn, save/load, level transitions, many instances), **robustness** (invalid state, leaks, unbounded growth, silent failures), **performance** (hot-path allocations, per-frame work that should be event-driven, O(n²) over entities, budget on the profiler capture), **architecture fit** (layering, coupling, data-driven tuning, no duplicated systems), **testability and readability**.

```
VERDICT:  PASS or BLOCK
FLOOR:    ok, or "correctness/robustness blocker present"
VS BAR:   one sentence: where the reference implementation does this better, or "matches or beats"
BLOCKERS: ranked, each with file:line and the fix as an instruction (empty if PASS)
```

Style nits never block. Correctness and robustness blockers are part of the **floor**: a ticket with an open correctness or robustness blocker can never be merged, whatever the Experience verdict. It also reviews code from other departments: Blender Python, shaders, audio synthesis scripts, editor tools, build scripts.

## 4. Coach critic (feedback, rounds 1..N)

A fresh `experience-critic` subagent in **coach mode**. Its job is to find the single biggest gap between ours and the bar, so the builder has one clear thing to fix.

It gets evidence A and B (ours and a reference, prepared by script: copied under neutral names in random order, the key kept by the Director, often as one contact sheet per side - see below), the one question for this ticket, the pillars, and the craft rubric for this department (`craft.md`).

**The reference is always available.** In order of preference: the external bar in comparable framing (`BARS.md`); the Art Director's look-dev target (for art and UI); the current champion (from round 2 on). If no comparable external bar exists, the coach compares against the other two - a review round never ends without a usable gap.

```
REASONING: a short walk through the evidence against the rubric (what reads, what does not, where the eye goes)
PICK:      A or B
WHY:       two sentences, concrete
GAP:       the single biggest thing that would flip the pick, as an instruction the builder can act on
```

Reasoning comes before the pick because judgements made after looking carefully are more reliable than a first impression. Harsh, no scores out of 10, only what is in the evidence. If the evidence cannot answer the question, the critic says what capture is missing and still names the biggest gap it *can* see on our side.

**One GAP per round, never a list.** A list invites the builder to tick boxes for the critic; one gap forces the most important fix.

**Review what you merge.** A critic's verdict applies only to the diff it saw. Fixes made for a critic's blockers are re-checked before merge (a quick fresh Code critic pass on just the fix diff) - never merged on the builder's word or on a smoke test alone. If fixes and reviews run in the same wave to save time, the review targets the *previous* merged state and the fixes get their own re-check in the next wave.

**Builder continuity, critic freshness.** Within one ticket, the Director may resume the same builder for its next round (e.g. `SendMessage` to the builder agent) - it keeps the ticket's context cheaply. Critics and judges are always new agents.

## 5. Champion

The Director keeps the **champion**: the best version so far, not the latest. Round 1's output is the first champion. From round 2 on, the coach's comparison is against the champion when no external bar is in play, or a second fresh critic compares new vs champion; the new version only becomes champion if it wins. A revision that made things worse is discarded, not built upon. Two rounds in a row without a new champion = plateau: stop the ticket and send the champion to the judge. (For core tickets, the last round that passed verify and the Code critic is the champion.)

**Review boards, not single reviews.** In a review ritual (`studio.md`) several critics look at the same integrated build at once - art, UX, code, playtester. The Director merges their verdicts into **one gap per department** for the next fix sprint, picking the gap that most affects the pillars. Bugs and code blockers go on a separate fix list and are always fixed first.

## 6. Judge (held-out, decides the outcome)

After the last round, or earlier as soon as the coach critic picked ours, the champion goes to the judge. The judge is what prevents optimising for the critic:

- A fresh `experience-critic` in **judge mode**, never the coach.
- **Held-out evidence**: a capture set the builder and coach never saw - other camera positions, another seed, another moment of the same clip, another lighting setup in the level. Something that only looked good from the coached angle loses here.
- **Both orders** (hero: two judges, A/B and B/A; the pick must be consistent).
- The judge returns only `PICK` and `WHY`. Its reasoning never goes back to the builder of this ticket; if a judge-found gap is structural, it becomes a `LESSONS.md` entry for future tickets.

## 7. Outcome

| Outcome | Condition | What happens |
|---|---|---|
| **WON** | Judge picks ours (consistently), floor met, numbers met | Merge. Tick it when MERGED. |
| **PASSED** | Judge picks the bar, but the **floor** is met | Merge the champion. Record the judge's WHY in `DEBT.md` with the ticket, tier and pillar. |
| **FAILED** | Floor not met after the round budget | Re-scope once (below), else cut or replace. |

**The floor** - what every merged ticket must meet: verify green; Code critic PASS or only non-floor blockers; no correctness or robustness blockers; the ticket's numbers within tolerance; and the Coherence check - it does not break the style bible or the pillars. A game made of PASSED tickets is a coherent, working game; WON tickets are what make it great.

**Hero tickets in the vertical slice** are the exception: they must be WON, because the vertical slice proves the game. A hero PASSED in the slice is re-scoped once and, if still PASSED, the Director changes the design or the bar ladder rung (`endurance.md`) as a logged decision.

## 8. Re-scope (once per ticket)

When a ticket FAILED, the Director gets exactly one re-scope, and must change something real - never "try again":

- **Different approach** - a new builder with a different method (kit asset instead of custom, procedural instead of hand-built, simpler mechanic that serves the same pillar).
- **Split** - the last GAP names a sub-problem; each part becomes a ticket with its own budget.
- **Narrow** - compare a smaller thing (one animation instead of the moveset).

The re-scoped ticket(s) get a fresh round budget. If that fails too: **cut or replace** with the cheapest version that serves the pillar, logged in `DECISIONS.md`. No third attempt.

## 9. Debt and polish passes

`DEBT.md` is where PASSED tickets wait for a better moment, instead of looping now:

- Every entry: ticket, tier, pillar, the judge's WHY, and the evidence path.
- **Polish passes** at Content Alpha and Beta: the Director ranks debt by player impact (hero > core, first 10 minutes > later, pillar-critical > nice-to-have) and dispatches the top items as new tickets. They start with everything the studio has learned since - better lessons, better tools, the rest of the game around them - which is exactly what a stuck round lacked.
- Anything still in debt at the Release Candidate is listed for the human in `PLAY.md` ("areas we know are below the bar"), so their feedback can prioritise it.

## What critics can perceive

Claude models see images and read text. They **cannot** hear audio, and they **cannot** watch video - only sampled frames. Every piece of evidence is converted by script (`engines.md`) into something a critic can actually judge:

| Kind | Evidence the critic gets |
|---|---|
| Still visuals | Paired images at matched camera, crop and resolution, UI stripped |
| Motion, animation, feel | Frame strips / contact sheets at a known fps, same moment for both sides, plus the ticket's numbers (frame data, latency, curves from our input trace) |
| Audio | Spectrogram + waveform images, LUFS / peak / onset-timing data, which event it plays on - judged for fit, loudness, timing and layering against the audio direction. Actual sound taste is left to the human playtest. |
| Code | Text: diff, logs, profiler output |

Feel is never judged on impression. **Bar numbers need a method**: a number is only a bar if `BARS.md` says how it was measured. Frame counts can be counted by frame-stepping a bar clip at a known fps; input latency cannot be measured from someone else's video - use published values or genre norms and say which.

## Calibration: keeping blind comparisons honest

Critics recognise famous games, and press renders are not gameplay.

- **Narrow questions.** One axis per question ("which silhouette reads faster at game distance?"), never "which looks better?".
- **Matched scope.** Same camera, crop, resolution and lighting context; gameplay against gameplay.
- **Both orders** for hero judges; a split verdict is a loss.
- **Control pairs.** About every 20th comparison, the Director slips in the bar against a deliberately degraded copy of itself (blurred, desaturated, frames dropped). A critic that picks the degraded side is discarded with its verdict and logged.

## Which critic judges which ticket

| Ticket | Experience critic | Code critic |
|---|---|---|
| Gameplay code, systems, AI, gunplay, movement | yes (frame strips + numbers) | yes |
| Tools, pipeline, build, save/load, netcode | only if player-visible | yes |
| 3D, 2D art, animation | yes | on the generating scripts / shaders |
| Audio | yes (spectrogram + data, fit and timing only) | on synthesis scripts |
| Shaders, VFX, lighting | yes | yes (perf + correctness) |
| Level design | yes (`playtester`) | on scripted logic |
| UI/UX | yes | yes |
| Design specs, tuning | after implementation | no |

## Critic roster

| Critic | Subagent + mode | Judges | Evidence |
|---|---|---|---|
| **Coach** | `experience-critic` coach | One ticket vs its bar, finds the gap | Round captures |
| **Judge** | `experience-critic` judge | Final outcome, held-out | Held-out captures, both orders |
| **Silhouette** | `experience-critic` coach/judge | Characters, props, enemies | Black-fill silhouettes at game distance |
| **Coherence** | `experience-critic` coherence | Does it belong in this game; bulk batches | Asset in-engine next to 5 merged assets and the style bible |
| **Playtest** | `playtester` | Is it clear, is it paced, where do players get stuck | Step-play session, deaths, stalls, time-to-objective |
| **First-time player** | `playtester` with no brief | Onboarding, UI clarity | Step-play session, narrated confusion |
| **Code** | `code-critic` ticket | One ticket's diff | Diff, tests, profiler, architecture, code bar |
| **Architecture** | `code-critic` architecture | Whole codebase, each milestone | Module graph, cycles, duplicated systems, dead code, coverage |
| **Tech audit** | `code-critic` audit | Perf, memory, stability across the game | Profiler captures per level, 30 min soak, crash logs |
