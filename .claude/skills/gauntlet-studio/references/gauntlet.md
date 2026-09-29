# The ticket gauntlet

Every ticket, in every department, runs the same four-stage gauntlet. This is where quality comes from. The Director only merges tickets that come out as WON.

```
            +---------------------------------------------+
            v                                             |
  BUILD --> VERIFY --> CRITIC (blind A/B vs bar) --> WON? --no--> gap back to BUILD
              |                                       |
            fail --> back to BUILD                   yes --> Director merges
```

## 1. Build

- A builder subagent with the ticket, the brief's pillars, the style bible and the bar. Nothing else.
- It produces the artifact **and the evidence**: the file(s), plus the capture the critic will judge (see `engines.md`).
- It never self-approves and never writes "done" - it writes "ready for verify".

## 2. Verify (machine checks, no taste)

Fast, cheap, binary. Failing any check goes straight back to the builder without spending a critic.

- Code: compiles, unit tests pass, no new warnings, the smoke test still runs.
- 3D: opens in Blender, applied transforms, correct scale and pivot, clean normals, no n-gons where forbidden, UVs within 0-1 without overlap (unless intended), under polycount and texel-density budget, exports, imports into the engine without errors.
- Animation: loops seamlessly where it should, root motion correct, no foot sliding above threshold, plays on the target skeleton.
- Audio: correct sample rate and loudness (LUFS target), no clipping, loops clean.
- Level: navmesh builds, the playtest bot can reach every objective.
- UI: every screen reachable with keyboard and gamepad, text fits at every supported resolution.
- Everything: within the ticket's perf budget on the integration build.

## 3. Critic (blind, harsh, one job)

A **fresh** subagent every round. It has never seen the builder's reasoning, the previous rounds, or which attempt number this is.

It gets:

- Evidence A and evidence B, labels stripped and order randomised: ours and the bar's (the real, fetched reference - not a description).
- The one question for this ticket, written by the Director. Examples: "Which dash feels more responsive and readable?", "Which character reads better as a silhouette at game camera distance?", "Which hit sound is more satisfying?".
- The pillars.

It returns exactly:

```
PICK:   A or B
WHY:    two sentences, concrete
GAP:    the single biggest thing that would flip the pick, as an instruction the builder can act on
```

Rules for critics:

- Harsh. Praise is not useful. No scores out of 10 - they drift up every round.
- Judges only what is in the evidence. If the evidence is missing or unclear, the verdict is `PICK: bar, GAP: evidence insufficient - capture X`.
- For feel-based tickets (movement, combat, UI responsiveness), evidence is **video plus input trace**, never a single screenshot.

## 4. Decide

- Critic picked ours -> run **one more fresh critic** with a re-randomised order. Two independent wins = **WON**.
- Critic picked the bar -> the GAP goes back to the builder as the only instruction for the next round.

## Stalls and escalation

A ticket is **stalled** after 5 rounds with the same GAP, or 8 rounds total.

1. **Swap the builder** - new subagent, fresh context, told only the bar and the last GAP.
2. **Split the ticket** - the GAP usually names a sub-problem that deserves its own ticket.
3. **Lower the ask, not the bar** - narrow what is compared (one animation instead of the whole moveset) so the ticket can win.
4. **Kill review** - the Director simplifies, replaces or cuts the feature and logs it in `DECISIONS.md`.

Never soften the critic, never swap the bar for an easier one without a logged decision, never exit on a round count.

## Critic roster

The Director picks the critic that fits the ticket:

| Critic | Judges | Evidence |
|---|---|---|
| **Blind A/B critic** | One ticket vs its bar | Paired screenshots, turntables, clips, audio |
| **Feel critic** | Movement, combat, camera, juice | Video + input trace + frame timing, vs bar clip |
| **Silhouette critic** | Characters, props, enemies | Black-fill silhouettes at game camera distance |
| **Coherence critic** | Does it belong in this game | Asset in-engine next to 5 merged assets and the style bible |
| **Playtest critic** | Is it fun, is it clear | Playtest bot trace, deaths, stalls, time-to-objective |
| **Tech auditor** | Perf, memory, correctness | Profiler capture, frame time, draw calls, logs |
| **First-time player** | Onboarding, UI clarity | A fresh agent with no brief plays and narrates confusion |
