# Gauntlet loops from a plan

Read this when the user brings a plan: a Wayfinder map, a spec, or a set of tickets. The template in `SKILL.md` stays the same; this file changes where its brackets come from.

## Why a plan comes first

The loop optimizes whatever it is pointed at. Point it at a vague goal and it polishes the pieces it guessed, and every open question gets answered by whichever piece happens to win a round. Winning fast on the wrong piece is still waste. For anything bigger than one session, settle the route first, then let the loop execute it.

The planner this file is written for is Matt Pocock's Wayfinder (`/wayfinder`, MIT licensed, from `mattpocock/skills`). It plans and never builds: it charts the work as a map of decision tickets on the issue tracker, resolves them one per session, and hands off once nothing is left to decide. That handoff is where the gauntlet loop starts. Any plan with the same shape works too: a destination, settled decisions, the pieces, and what is out of scope.

## The pipeline

1. **`/wayfinder <idea>`** charts the map, then works it ticket by ticket until no tickets are open and **Not yet specified** is empty.
2. **`/to-spec`** collapses the cleared map into one spec: problem, solution, user stories, implementation decisions, testing decisions. Recommended - the gauntlet loop gets a single readable document, and the user stories become its regression gate.
3. **`/gauntlet-loop <spec or map link>`** writes the loop prompt that builds it.

Planning and building stay in separate sessions. The loop does not write into the map; the map records decisions, and the loop's record is its progress page.

This repo bundles `wayfinder`, `to-spec` and the skills Wayfinder calls (`grilling`, `domain-modeling`, `research`, `prototype`, `setup-matt-pocock-skills`), unmodified and MIT licensed - see `THIRD_PARTY.md`. Before the first map, run `/setup-matt-pocock-skills` once in the repo so they know the issue tracker. Grilling rounds can run long; Wayfinder's own docs suggest a lower effort for those sessions or a plain-language line about brevity in the project's `CLAUDE.md`.

## Let the planner pick the bars

Choosing a bar is a decision, so it belongs in the plan. While the map is being charted, suggest one grilling ticket per piece - "What is the bar for <piece>, and how is it captured?" - and a research ticket wherever the bar may not be fetchable. The three bar tests in `SKILL.md` (named, fetchable, comparable) are the questions those tickets answer. When the plan already names a bar for every piece, step 1 of the gauntlet flow is done.

## Check the plan before writing the prompt

Read the map's Destination, Decisions so far, Not yet specified and Out of scope, or the whole spec. Then:

- **Open tickets, or anything under Not yet specified:** the route is not clear, and the loop would optimize guesses. Name what is still open and send the user back to `/wayfinder`. Do not write the prompt.
- **A piece with no bar:** offer 2 or 3 bars for that piece only, as in step 1, and wait for the pick.
- **Out of scope:** stays out of the prompt. The loop does not build it.

If the plan is clean, go straight to writing the prompt.

## What changes in the prompt

Keep the template and its last line. Change these, in plain sentences:

- **The goal** is the plan's Destination, or the spec's Solution, plus the context sentence.
- **Link the plan, do not paste it.** "The plan is [LINK]. Read it before anything else." A map is an index and the agent zooms into tickets as it needs them.
- **The decisions are settled.** "The decisions in the plan are settled; do not reopen them. If the work shows one is wrong, stop that piece and put the conflict on the progress page for me instead of designing around it." Agents tend to work around a bad decision rather than challenge it; this sends the conflict back to the user, who takes it back to the map.
- **Pieces, order and bars come from the plan.** "Take the pieces, their order and each piece's bar from the plan. A piece starts when the pieces it depends on have won." The own-files rule stays.
- **The regression gate is the spec.** "A win only counts if every user story that worked before still works, tested at the seams the spec names."
- **The whole-thing comparison** is against the Destination.

`SKILL.md` keeps architecture, decomposition and stack choices out of the prompt unless the user demanded them. A plan the user worked through is that demand - but the prompt links it rather than restating it.

## Filled example

This is illustrative. Match its shape, not its wording.

User: "/gauntlet-loop the vertical slice from our wayfinder map" - with a cleared map and a spec made by `/to-spec`. The plan names four pieces (third-person traversal, melee combat, one enemy archetype, one arena), the bars for traversal (Uncharted 4) and melee (God of War, 2018), 60 fps on the team's dev machine, and multiplayer as out of scope. The arena has no bar yet, so the skill offers three first and the user picks Doom Eternal's Super Gore Nest.

```
Build the vertical slice described in the spec at [SPEC LINK], in our Unreal Engine 5 project. It is the level we show publishers: ten minutes that have to feel like a finished game from the first input.

The plan is that spec and the Wayfinder map it came from, [MAP LINK]. Read the spec and the map's Destination, Decisions so far and Out of scope before anything else. The decisions in the plan are settled; do not reopen them. If the work shows one is wrong, stop that piece and put the conflict on the progress page for me instead of designing around it.

Take the pieces, their order and each piece's bar from the plan: traversal against Uncharted 4, melee against God of War (2018), the arena against Doom Eternal's Super Gore Nest. Before the first round, capture every bar in the same views, sizes and conditions we will capture ours in, and build a debug hook that steps the game a fixed number of frames with given inputs, for every capture and test. Compare against those captures, never against a description of the bar. The slice also has to hold 60 fps on this machine, measured with stat unit.

A piece starts when the pieces it depends on have won, and each builder gets its own files. For each piece, fan out a builder and a separate critic with fresh context. You capture both sides the same way, shuffle them into an unlabeled A and B, and keep the key. The critic sees only the pair, the numbers, and the gaps already named for that piece. It picks A or B, points to the frames or numbers that decided it, and names the single biggest remaining gap. Feel and timing are judged on measurements against the bar.

The critic should be a harsh critic. Praise is not useful, because the only thing that moves the work is the next gap. If ours does not win, it goes back to the builder. If the same gap comes back three rounds running, change the approach instead of polishing the old one.

A win only counts if every user story in the spec that worked before still works, tested at the seams the spec names, and the slice still holds 60 fps. When every piece has won, capture a full playthrough and judge it against the bars together; pieces that win alone can still lose together.

/loop on each piece until the critic picks ours blind.

Keep a live progress page updating as the work evolves so I can watch it: each round's pick, the gap named, the numbers, and what changed. It is also the record every new round and any resumed session works from.

Fan out subagents and ultracode.
```
