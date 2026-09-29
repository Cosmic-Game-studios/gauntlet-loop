# Endurance and cost

The plain gauntlet loop spends the same heavy effort on every piece of work. A game has hundreds of pieces, and most of them do not deserve that. The studio has to run for days or weeks, keep producing, and not burn the usage limit on a crate texture. It spends effort where the player will notice it.

## Ticket tiers

The Director assigns every ticket a tier when it writes it. The tier decides how much gauntlet it gets.

| Tier | What | Gauntlet | Share of tickets |
|---|---|---|---|
| **Hero** | Anything in the vertical slice, the core loop's feel (movement, gunplay, combat), the main character, the first 60 seconds, anything the human gave feedback on | Up to 6 rounds with plateau stop; Code critic, coach critic vs the external bar or look-dev target, champion, 2 held-out judges in both orders | ~15% |
| **Core** | Features and assets the player meets often | Up to 3 rounds with plateau stop; Code critic, coach critic vs the bar **or** the approved hero reference, 1 held-out judge | ~35% |
| **Bulk** | Props, variations, filler rooms, secondary SFX, menu screens after the first | 1 round; judged **in batches** of up to 10 by one Coherence critic ("which of these do not belong next to the hero set?"), Code critic only on code changes | ~50% |

Once a hero asset or mechanic has WON, it becomes the **internal bar** for its core and bulk siblings. Comparing a crate to an approved in-game hero prop is cheaper and more useful than comparing it to a AAA screenshot.

## Cheap first, expensive last

Every ticket passes the gates in cost order and stops at the first failure:

```
static checks / lint  ->  unit tests  ->  asset validators  ->  headless build  ->  capture  ->  Code critic  ->  Experience critic(s)
   seconds, free          seconds         seconds               minutes            minutes      one agent      one or two agents
```

- Never spend a critic on work that fails a script.
- In a single ticket's gauntlet, the Code critic runs before the Experience critics (a BLOCK usually forces a change that would invalidate the Experience verdict). In a review board on an integrated build they run in parallel to save wall-clock time, and code blockers are fixed first in the next sprint.

## Model tiering

Routing is set in `studio.md`: Opus for the Director, leads, every critic and judge, and visual/spatial/feel building; Sonnet for implementation against a clear spec and for playtesting; Haiku for mechanical work. The biggest savings come from context, not from the model: resumed builders (cached context), small context packs, stable prompt prefixes, shared captures per review, and plateau stops.

## Calibrated bars

A bar that can never be beaten burns budget forever. AAA assets made by teams of 50 over years are not a fair bar for one agent round.

- **Compare the axis, not the production value.** The question is narrow: "Which silhouette reads faster?", "Which dash has less startup?", "Which palette is more coherent?" - never "which looks more expensive?".
- **Match the scope.** Crop, match the camera, match the resolution, strip UI, so the critic cannot tell which is the famous game from context.
- **Bar ladder.** Each bar in `BARS.md` has up to three rungs: the reference game, a strong indie in the same style, and our own approved hero. A ticket that stalls on rung 1 twice with a production-value gap (not a design gap) may be judged on rung 2 - as a logged decision, never silently. Hero tickets in the vertical slice always stay on rung 1.
- **Numbers where feelings fail.** Critics watch video as frames; they cannot feel latency. Feel is measured: startup/active/recovery frames, input-to-motion latency, acceleration curves, recoil patterns, extracted from the bar clip and from our input trace. The Experience critic judges readability and style; the numbers judge responsiveness.

## Stall economics

- Every ticket carries a hard round budget by tier: hero up to 6, core up to 3, bulk 1, and stops early at a plateau (two rounds without a new champion). At the budget the held-out judge decides WON / PASSED / FAILED (`gauntlet.md`); a FAILED ticket gets one re-scope, then it is cut or replaced. Nothing grinds.
- A repeated GAP becomes a `LESSONS.md` rule (`context.md`), so the next ticket does not pay for the same mistake.
- The Director tracks rounds per WON ticket per department in `STATUS.md`. A department whose average climbs is a process problem (missing tool, bad bar, missing lesson) - the Director fixes the process, not the ticket.

## Parallelism that pays

- In-flight tickets scale with what is actually unblocked: start at 4-6 during Tech Spike and Vertical Slice (much is serial and the pipeline is still changing), rise to 8-12 in Content Alpha and Beta (mostly independent content).
- One owner per file. Two tickets on the same file are sequenced.
- Tools before content: if a department does the same manual step three times, Code or Tech Art builds a script for it first.

## Running for a week

- **Heartbeats are resumable units.** Each one reads files, does work, writes files, commits. Stopping between any two heartbeats loses nothing.
- **Usage limits.** When a rate or usage limit is hit, the Director writes `STATUS.md` with `paused: limit` and the time it expects to continue, commits, and resumes from files when capacity returns (a scheduled check-in or Routine where available, otherwise the next session). No work is lost, nothing is redone.
- **Budget awareness.** If the user named a budget in the brief, `STATUS.md` shows spend against it and the Director lowers parallelism and critic counts on core/bulk tiers as it approaches the ceiling - hero quality is the last thing to be cut.
- **Checkpoints.** Every WON merge is a commit; every milestone is a tag. A bad heartbeat can always be rolled back.
- **Progress, not activity.** The progress contract and progress reviews in `director.md` decide whether the run is moving: measured game improvements, not tickets closed or documents written. After 5 working heartbeats in a row without a measured improvement, the Director stops dispatching and diagnoses; if the next 5 still produce nothing, the circuit breaker fires.
- **Wall-clock cap.** The brief's cap (default 7 days) is a hard stop for autonomous work: at the cap, the Director hands off the best build.
