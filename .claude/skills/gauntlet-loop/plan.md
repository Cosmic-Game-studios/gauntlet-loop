# Gauntlet loops from a plan

Read this when the user brings a plan: a Wayfinder map, a spec, or a set of tickets. The template in `SKILL.md` stays the same; this file changes where its brackets come from.

## Why a plan comes first

The loop optimizes whatever it is pointed at. Point it at a vague goal and it polishes the pieces it guessed, and every open question gets answered by whichever piece happens to win a round. For anything bigger than one session, settle the route first, then let the loop build it.

The planner this repo bundles is Matt Pocock's Wayfinder (`/wayfinder`, MIT licensed, from `mattpocock/skills`). It plans and never builds: it charts the work as a map of decision tickets on the issue tracker, resolves them one per session, and hands off once nothing is left to decide. That handoff is where the gauntlet loop starts. Any plan with the same shape works too: a destination, settled decisions, the pieces, and what is out of scope.

## The pipeline

1. **`/wayfinder <idea>`** charts the map, then works it ticket by ticket until no tickets are open and **Not yet specified** is empty.
2. **`/to-spec`** collapses the cleared map into one spec: problem, solution, user stories, implementation decisions, testing decisions. Recommended - the loop gets one readable document, and its user stories become the checklist.
3. **`/gauntlet-loop <spec or map link>`** writes the loop prompt that builds it.

Planning and building stay in separate sessions. The loop does not write into the map; the map records decisions, and the loop's record is its progress page.

This repo bundles `wayfinder`, `to-spec` and the skills Wayfinder calls (`grilling`, `domain-modeling`, `research`, `prototype`, `setup-matt-pocock-skills`), unmodified - see `THIRD_PARTY.md`. Before the first map, run `/setup-matt-pocock-skills` once in the repo so they know the issue tracker.

## Keep the planning sessions short

Grilling rounds can run long, and long questions tire the person answering them. Wayfinder reads standing preferences from the map's **Notes**, so when a map is charted, suggest this line for its Notes: "Grilling: each question in two or three sentences with the recommended answer first; at most five questions a round." It changes how every later session asks, without editing the bundled skills.

## Let the planner pick the bars

Choosing a bar is a decision, so it belongs in the plan. While the map is being charted, suggest one grilling ticket per piece - "What is the bar for <piece>, and how is it captured?" - and a research ticket wherever the bar may not be fetchable. The three bar tests in `SKILL.md` (named, fetchable, comparable) are the questions those tickets answer. For a game, add the assets question from `game-dev.md` as a ticket too. When the plan names a bar for every piece, step 1 of the gauntlet flow is done.

## Check the plan before writing the prompt

Read the map's Destination, Decisions so far, Not yet specified and Out of scope, or the whole spec. Then:

- **Open tickets, or anything under Not yet specified:** the route is not clear, and the loop would build guesses. Name what is still open and send the user back to `/wayfinder`. Do not write the prompt.
- **A piece with no bar:** offer 2 or 3 bars for that piece only, as in step 1, and wait for the pick.
- **Out of scope:** stays out of the prompt. The loop does not build it.

If the plan is clean, go straight to writing the prompt.

## What changes in the prompt

Keep the template, its round budget and its last line. Change these paragraphs:

- **The description block holds the plan, not a paraphrase.** Put the spec's user stories and the map's Destination in the block word for word, and link the rest: "The plan is [LINK]. Read it before anything else."
- **The checklist comes from the plan.** One line per user story, plus every decision that names something the result must have.
- **The decisions are settled.** Add: "The decisions in the plan are settled; do not reopen them. If the work shows one is wrong, stop that piece and put the conflict on the progress page for me instead of designing around it." Agents tend to work around a bad decision rather than challenge it; this sends the conflict back to the user, who takes it back to the map.
- **Pieces, order and bars come from the plan.** "Take the pieces, their order and each piece's bar from the plan. A piece starts when the pieces it depends on have won or spent their rounds." The own-files rule stays.
- **Out of scope stays out.** "Nothing the plan puts out of scope gets built."
- **The testing decisions become the evidence.** "A checklist item passes when it passes at the seams the spec names."
- **The whole-thing comparison is against the Destination.**

`SKILL.md` keeps architecture, decomposition and stack choices out of the prompt unless the user demanded them. A plan the user worked through is that demand - but the prompt links it rather than restating it.

## Filled example

This is illustrative. Match its shape, not its wording.

User: "/gauntlet-loop the vertical slice from our wayfinder map", with a cleared map and a spec made by `/to-spec`. The plan names four pieces (third-person traversal, melee combat, one enemy archetype, one arena) and the bars for traversal (Uncharted 4) and melee (God of War, 2018). It sets 60 fps on the team's dev machine and puts multiplayer out of scope. The arena has no bar yet, so the skill offers three first and the user picks Doom Eternal's Super Gore Nest.

Only the paragraphs that differ from the template are shown; the rest - the critic budget, the round budget, done, the progress page, the last line - stays as the template has it.

```
Build the vertical slice described in the spec at [SPEC LINK], in our Unreal Engine 5 project. It is the level we show publishers: ten minutes that have to feel like a finished game from the first input.

The plan is that spec and the Wayfinder map it came from, [MAP LINK]. Read both before anything else. Here are the map's Destination and the spec's user stories, word for word. All of it is in scope and it is the minimum; add more wherever it makes the result better, never at the expense of something on this list.

"""
[THE MAP'S DESTINATION AND THE SPEC'S USER STORIES, VERBATIM]
"""

The decisions in the plan are settled; do not reopen them. If the work shows one is wrong, stop that piece and put the conflict on the progress page for me instead of designing around it. Nothing the plan puts out of scope gets built.

Before building, turn the user stories and every decision that names something the slice must have into CHECKLIST.md, each with how you will show it works; an item passes when it passes at the seams the spec names. Build a debug hook that steps the game a fixed number of frames with given inputs, and use it for every capture, test and playthrough. Then build breadth first: a rough, working version of every checklist item, end to end, before any piece gets polished.

Take the pieces, their order and each piece's bar from the plan: traversal against Uncharted 4, melee against God of War (2018), the arena against Doom Eternal's Super Gore Nest. A piece starts when the pieces it depends on have won or spent their rounds. Before the first round, capture every bar in the same views, sizes and conditions we will capture ours in, and compare against those captures, never against a description of the bar. The slice also has to hold 60 fps on this machine, measured with stat unit. Write STYLE.md from the bars first and hold every builder to it.
```
