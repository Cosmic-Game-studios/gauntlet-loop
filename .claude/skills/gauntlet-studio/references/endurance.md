# Endurance and cost

The plain gauntlet loop spends the same heavy effort on every piece of work. A game has hundreds of pieces, and most of them do not deserve that. The studio has to run for days or weeks, keep producing, and not burn the usage limit on a crate texture. It spends effort where the player will notice it.

## Ticket tiers

The Director assigns every ticket a tier when it writes it. The tier decides how much gauntlet it gets.

| Tier | What | Gauntlet | Share of tickets |
|---|---|---|---|
| **Hero** | Anything in the vertical slice, the core loop's feel (movement, gunplay, combat), the main character, the first 60 seconds, anything the human gave feedback on | Full: verify, Experience critic x2 blind vs the external bar, Code critic | ~15% |
| **Core** | Features and assets the player meets often | Verify, one Experience critic vs the bar **or** the approved hero reference, Code critic | ~35% |
| **Bulk** | Props, variations, filler rooms, secondary SFX, menu screens after the first | Verify, then judged **in batches** of up to 10 by one Coherence critic ("which of these do not belong next to the hero set?"), Code critic only on code changes | ~50% |

Once a hero asset or mechanic has WON, it becomes the **internal bar** for its core and bulk siblings. Comparing a crate to an approved in-game hero prop is cheaper and more useful than comparing it to a AAA screenshot.

## Cheap first, expensive last

Every ticket passes the gates in cost order and stops at the first failure:

```
static checks / lint  ->  unit tests  ->  asset validators  ->  headless build  ->  capture  ->  Code critic  ->  Experience critic(s)
   seconds, free          seconds         seconds               minutes            minutes      one agent      one or two agents
```

- Never spend a critic on work that fails a script.
- Code critic before Experience critics: a BLOCK usually forces a change that would invalidate the Experience verdict anyway.

## Model tiering

Where the environment lets the studio choose models per subagent:

- **Strongest model:** the Director's planning steps, Code critic on hero and core tickets, Experience critics on hero tickets, feedback translation.
- **Mid model:** builders, core Experience critics, Coherence batch critics.
- **Fast model:** verification scripts runs, log summarisation, file hygiene, evidence renaming, dashboard generation.

If there is no choice of model, the tiers still apply to how many critics run.

## Calibrated bars

A bar that can never be beaten burns budget forever. AAA assets made by teams of 50 over years are not a fair bar for one agent round.

- **Compare the axis, not the production value.** The question is narrow: "Which silhouette reads faster?", "Which dash has less startup?", "Which palette is more coherent?" - never "which looks more expensive?".
- **Match the scope.** Crop, match the camera, match the resolution, strip UI, so the critic cannot tell which is the famous game from context.
- **Bar ladder.** Each bar in `BARS.md` has up to three rungs: the reference game, a strong indie in the same style, and our own approved hero. A ticket that stalls on rung 1 twice with a production-value gap (not a design gap) may be judged on rung 2 - as a logged decision, never silently. Hero tickets in the vertical slice always stay on rung 1.
- **Numbers where feelings fail.** Critics watch video as frames; they cannot feel latency. Feel is measured: startup/active/recovery frames, input-to-motion latency, acceleration curves, recoil patterns, extracted from the bar clip and from our input trace. The Experience critic judges readability and style; the numbers judge responsiveness.

## Stall economics

- Every ticket carries a round budget by tier: hero 8, core 5, bulk 3. At the budget it escalates (`gauntlet.md` - swap, split, lower the ask, kill review), it does not keep grinding.
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
- **Progress, not activity.** The dashboard shows WON tickets per day and the gate status. If WON per day drops for two days while spend continues, the Director runs a process review (bars, tools, lessons, ticket size) before dispatching more work.
