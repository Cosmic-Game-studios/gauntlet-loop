# Playbooks: how to spend the time you have

The rituals are the same at every scale; what changes is how many cycles fit. Pick the playbook from the brief's wall-clock cap (or budget) in the first minute and write it into `MILESTONE.md`. Two rules hold in all of them:

- **A playable build is committed at all times** after the first production sprint. Every later sprint must leave it playable.
- **Use all of the time.** Hand off at the cap (minus the time the handoff itself needs), not when a gate is first met. Remaining time goes to the next review-fix cycle on the most visible gap.

## Under 1 hour (sprint mode)

The Director runs as **one session** for the whole cap - reloading state every few minutes would cost more than it saves - and still writes through to `STATUS.md` and `TRACKER.md`, so a crash can resume. Leads are folded into builders (the look+arena builder *is* the Art Director for this run; the Director writes the contract itself). Every dispatch carries a **deadline** (`studio.md`), because a wave that waits for its slowest builder loses a whole review round.

Timeline for a 30-minute cap (scale proportionally):

| Minutes | Who | What |
|---|---|---|
| 0-3 | Director | Probe (one command), brief, pillars, `ARCHITECTURE.md` with one owner per file and the shared interfaces, a shared constants/palette file, `acceptance.json`, role prompt files (`claude-code.md`), `tools/shot.mjs` and `tools/accept.mjs` from the templates. Commit. |
| 3-11 | 5 builders, parallel, deadline minute 10:30 | **Wave 1 ships the whole game at first-pass quality** - no stubs in another owner's file. Opus: gameplay core + weapons and feel; look + arena (Art Director role: style bible, renderer and post setup, level); enemies (models, animation, AI); HUD + all screens (UI is a hero ticket). Sonnet: audio + bar captures in comparable framing (at most 3 minutes on bars). |
| 11-12.5 | Director | Integrate, acceptance run, one shared capture set and contact sheets, commit - the first playable build. |
| 12.5-15 | Review board, parallel | Opus coaches for the look, the enemies, the HUD/screens (ux mode), plus the Code critic. |
| 15-19.5 | Resumed builders, deadline 19:00 | One gap each (code blockers first). |
| 19.5-26.5 | Review + fix, round 2 | Same shape, shorter: coaches on the three most visible pieces, resumed builders with deadline 26:00. If time allows, round 3 on the single weakest piece. |
| 26.5-28.5 | Sonnet re-check | Fix diffs of the last round re-checked against their blockers and the acceptance list; revert a fix that breaks a check. |
| 28.5-30 | Director | Final acceptance run, commit, `KNOWN_GAPS.md`, `PLAY.md`, `STATUS.md` = `WAITING FOR HUMAN`. |

About 16 dispatches, at most 10 of them Opus. No judges, champions or playtesters in sprint mode - the coaches' verdicts and the acceptance list decide, and open gaps go to `KNOWN_GAPS.md`. If background-agent notifications work in the environment, a **pipeline per piece** (each piece goes to its next review as soon as its builder returns, instead of waiting for the wave) fits one or two more rounds; check that once at kickoff.

## 1-8 hours (vertical slice mode)

Kickoff and foundation as above, then repeated **production sprint -> review -> fix sprint** cycles: Tech Spike -> Vertical Slice -> Release Candidate. Held-out judges on every hero piece before it is WON. One polish pass on `DEBT.md` before the RC. Director may keep one session up to about two hours; after that, one fresh session per heartbeat (`context.md`).

## A day or more (full studio)

The full milestone ladder (`director.md`): Tech Spike -> Vertical Slice -> Content Alpha -> Beta -> Release Candidate -> human playtest, with a completeness pass at Tech Spike and Alpha, polish passes at Alpha and Beta, a fresh Director session per heartbeat and the heartbeat driver (`claude-code.md`).

## Keeping the machine healthy

Headless rendering is CPU-heavy, and a starved machine makes every builder slower. All renders go through the shared tool (`tools/shot.mjs` on the web): stepped simulation, a modest resolution (e.g. 960x540), and a lock so at most two renders run at once (`flock`). Builders take at most three renders per round; review captures are taken once by the Director or QA and shared as contact sheets. The number of parallel builders follows the machine: about one per CPU core plus one, which is five on a 4-core machine.

## Completion goal

Where Claude Code's `/goal` command is available in an interactive session, the Director can set the release condition as the goal ("acceptance.json all pass, handoff written, STATUS is WAITING FOR HUMAN"), so the session keeps working until it is met. In headless runs the driver plays that role.
