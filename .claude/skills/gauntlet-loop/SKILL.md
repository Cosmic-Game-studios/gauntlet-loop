---
name: gauntlet-loop
description: Turns any goal into one short, paste-ready "gauntlet loop" prompt - a prompt that makes an agent set a concrete quality bar, split the work into small judgeable pieces, run a builder and a separate harsh critic on each, compare blind against the bar, and loop until it wins. Works for builds, writing, code, research, design, and game development (Unreal Engine, Unity, Godot, web games). Pairs with Wayfinder: turns a cleared Wayfinder map or spec into the loop that builds it. Triggers on "/gauntlet-loop", "gauntlet loop", "gauntlet this", "make a gauntlet prompt", "loop until it beats X", "gauntlet the plan", "build this wayfinder map".
---

# Gauntlet Loop

The user gives a goal. You give back ONE short prompt they can paste into a fresh agent session.

You are not doing the work. You are writing the prompt that makes another agent grind on the work until it beats a real reference.

## Flow

If the user brings a plan - a Wayfinder map, a spec, or tickets - read `plan.md` in this folder first; it decides which steps below are already done. If the goal is too big for one session and there is no plan, say so in one line and suggest `/wayfinder` first. If they want to go ahead anyway, carry on.

1. **Set the bar.** If the user supplied a reference, use it. If not, offer **2 or 3 candidate bars**, one line each, and stop. Wait for their pick. Do not write the prompt yet. For a game, or anything built in a game engine, read `game-dev.md` in this folder first.
2. **Write the prompt.** One block, paste-ready, with no preamble and no headings inside it. The only thing after it is the offer in step 3.
3. **Offer to run it.** One flat line under the prompt: "I can run this here." Not a question.

If they say run it, you become the lead agent and follow the prompt you just wrote.

## The bar is the whole trick

Everything else in a gauntlet loop is scaffolding. The loop only produces quality if the thing it compares against is real.

A bar has to pass three tests:

- **Named.** A specific thing, not a category. "Stripe's pricing page" works. "Award-winning SaaS sites" does not.
- **Fetchable.** The critic can actually get it - screenshot the live page, read the published piece, run the binary, open the repo, pull frames from the footage. If the agent cannot obtain it, it will hallucinate the comparison.
- **Comparable.** Both can sit side by side and a judge can pick one. If you cannot imagine the A/B, it is not a bar.

Bars by goal type:

| Goal | Bar that works |
|---|---|
| Website, app, UI | The live site of a specific best-in-class product, screenshotted at the same viewport |
| Game, 3D, visual | Frames and measurements from a named shipped title, captured the same way as ours - see `game-dev.md` |
| Writing | A specific published piece by a named author or publication, same length and format |
| Code, tooling | A named repo's implementation, plus its benchmark or test suite as the measurable half |
| Research, analysis | A named analyst report or a paper's methods section, judged on rigour and coverage |
| Deck, doc, deliverable | A real artifact from a firm known for it, same page count |

When you propose bars, prefer the hardest one the agent can genuinely reach. A bar that is too easy makes the loop exit on round one; a bar that cannot be reached with the tools and assets the agent has makes it loop forever on one piece.

If the goal has a measurable half (load time, frame time, token cost, benchmark score, word count, pass rate), name it alongside the reference. Taste plus a number beats taste alone.

## Prompt template

Adapt the wording every time. Fill the brackets, drop a bracketed sentence when it does not apply, keep the last line.

```
Build [GOAL]. [One or two sentences on who it is for and what it has to make them feel or do.]

The bar is [BAR]. Before the first round, get the real thing and capture it for every piece in the same views, sizes and conditions we will capture ours in. Compare against those captures, never against a description of the bar. [It also has to beat NUMBER on METRIC, measured the same way on both.]

Break the work into the smallest pieces that can be improved and judged on their own, and give each builder its own files so parallel builders never edit the same thing. For each piece, fan out a builder and a separate critic with fresh context. You capture both sides the same way, shuffle them into an unlabeled A and B, and keep the key. The critic sees only the pair, any numbers, and the gaps already named for that piece. It picks A or B, points to what in the captures decided it, and names the single biggest remaining gap. Pieces a capture cannot show - feel, timing, sound, logic - are judged on measurements and tests against the bar instead.

The critic should be a harsh critic. Praise is not useful, because the only thing that moves the work is the next gap. If ours does not win, it goes back to the builder. If the same gap comes back three rounds running, change the approach instead of polishing the old one.

A win only counts if everything that worked before still works. When every piece has won, judge the whole thing against the bar the same way; pieces that win alone can still lose together.

/loop on each piece until the critic picks ours blind.

Keep a live progress page updating as the work evolves so I can watch it: each round's pick, the gap named, and what changed. It is also the record every new round and any resumed session works from.

Fan out subagents and ultracode.
```

Rules for what you fill in:

- Bake the bar in as a concrete, fetchable thing. URL, product name, repo, title, and for games which scenes or moments.
- Give the context sentence real content - audience, purpose, the feeling it has to land. The agent fills missing context with safe, generic defaults, and generic is what the loop is trying to beat.
- Add a time, budget or cost line **only if the user named one**, and phrase it as the exit it is: "Stop at [LIMIT] and leave the best version, with the open gaps listed on the progress page." No default cap.
- Add tool names only if the goal needs them (image or video generation, a browser, an engine, a deploy target).
- Everything else stays out. No architecture, no file layout, no decomposition, no round count, no stack choice unless the user demanded it or their plan settled it - and then link the plan instead of restating it. The agent decides the rest, and it decides better than a spec written before the work started.

## Why the template reads the way it does

These lines each fix a failure seen when real agents ran the loop. Keep them when you adapt the wording.

- **You capture, the critic judges.** A critic that takes its own screenshots knows which one is ours, so "blind" is only honour-system. The lead makes the anonymous pair and holds the key.
- **The critic gets the earlier gaps.** Fresh context stops the critic from grading the builder's intent, but with no memory it contradicts itself - lighter, then darker, then mid-tone. One short list of gaps already named fixes that without handing over the builder's reasoning.
- **Bar captures first, for every piece.** Critics with no matching view of the bar judge from memory. Capturing both sides the same way up front is cheaper than wasted critic rounds.
- **Own files per builder.** Parallel builders on one project collide unless each owns its files.
- **Measure what a picture cannot show.** Movement feel, timing, sound and game logic do not survive a screenshot. They get numbers and tests.
- **Wins must not regress.** A piece polished in isolation can break something that worked (a reload, a jump) or blow the performance budget. A win that does that is not a win.
- **Change approach on a stuck gap.** When one gap repeats, more polish on the same approach rarely closes it. This changes the approach; it never ends the loop.

Current Claude models follow a prompt closely and literally, plan and split work well on their own, and keep going without being pushed. So the prompt says each thing once, at normal volume, with the reason where the reason is not obvious. Firmness belongs on the exit condition and nowhere else. Stacked MUST and NEVER lines make the agent rigid, and a prescribed plan is worse than the one it would make.

Effort is a session setting, not a line in the prompt. For hard goals, tell the user to run the session at high effort or above.

## Length and voice

Short - a few plain paragraphs, the length of the examples below. If the prompt needs a heading to stay readable, it is too long.

Plain sentences. No bullet lists inside the prompt. It should read like someone telling an agent what perfect looks like and refusing to accept less.

## Portability

`/loop` and `ultracode` are Claude Code features. `/loop` reruns the prompt on an interval or lets the model pace itself. `ultracode` opts the turn into multi-agent orchestration.

For any other agent, swap the last two lines for: "Keep looping until the critic picks ours. Run the builders and critics as parallel subagents." The structure carries over unchanged.

## Filled examples

These are illustrative. Match their shape and length, not their wording. A game example is in `game-dev.md`.

**Visual goal.** User: "landing page for my running brand, athletic, green and dark, has to feel alive."

Bars offered: A) Nike's current running campaign page B) On Running's homepage C) Gymshark's product landing page. User picks A.

```
Build a landing page for a running brand. It is for young runners who train hard; it has to feel athletic, energetic and unmistakable, in green and dark, and it has to be interactive.

The bar is Nike's current running campaign page. Before the first round, screenshot it at desktop and mobile, section by section, and capture ours at the same sizes. Compare against those captures, never against a description of the page. It also has to load faster than Nike's page, measured the same way on both.

Break the work into the smallest pieces that can be improved and judged on their own - hero, motion, type, colour, imagery, interaction, mobile - and give each builder its own files. For each piece, fan out a builder and a separate critic with fresh context. You capture both sides the same way, shuffle them into an unlabeled A and B, and keep the key. The critic sees only the pair, the load times, and the gaps already named for that piece. It picks A or B, points to what decided it, and names the single biggest remaining gap. Motion and interaction are judged on short frame strips of both, not single frames.

The critic should be a harsh critic. Praise is not useful, because the only thing that moves the work is the next gap. If ours does not win, it goes back to the builder. If the same gap comes back three rounds running, change the approach instead of polishing the old one.

A win only counts if everything that worked before still works. When every piece has won, judge the whole page against Nike's the same way.

/loop on each piece until the critic picks ours blind.

Keep a live progress page updating as the work evolves so I can watch it: each round's pick, the gap named, and what changed. It is also the record every new round and any resumed session works from.

Fan out subagents and ultracode.
```

**Non-visual goal.** User: "a 2000-word explainer on vector databases for non-engineers."

Bars offered: A) the Stripe engineering blog's explainer posts B) Julia Evans' explainer posts on jvns.ca C) the Wikipedia article plus a comprehension test. User picks B.

```
Write a 2000-word explainer on vector databases for readers who are smart but not engineers. They should finish it able to explain to a colleague what one is for.

The bar is Julia Evans' explainer posts on jvns.ca. Before the first round, pick three specific posts that explain a systems topic to newcomers, fetch them, and link them at the top of the progress page. Compare against those posts, never against a description of her style.

Break the work into the smallest pieces that can be judged on their own - the opening, each explanation, the diagrams, the analogies, the ending. For each piece, fan out a writer and a separate critic with fresh context. You strip bylines and give the critic ours and hers as an unlabeled A and B, plus the gaps already named for that piece. It says which one a non-engineer would understand faster, points to the sentences that decided it, and names the single biggest remaining gap.

The critic should be a harsh critic. Praise is not useful, because the only thing that moves the work is the next gap. If ours does not win, it goes back to the writer. If the same gap comes back three rounds running, change the approach instead of polishing the old one.

When every piece has won, judge the whole explainer against a full post of hers the same way; pieces that win alone can still lose together.

/loop on each piece until the critic picks ours blind.

Keep a live progress page updating as the work evolves so I can watch it: each round's pick, the gap named, and what changed. It is also the record every new round and any resumed session works from.

Fan out subagents and ultracode.
```

## What breaks a gauntlet loop

- **A vague bar.** The critic invents a comparison and approves everything. Most common failure by far.
- **A foggy goal.** The loop optimizes what it is pointed at, so open questions get answered by whichever piece wins a round. On anything bigger than one session, clear the plan first.
- **The builder judging its own work.** The critic must be a separate agent with fresh context. It should not know how hard the builder tried.
- **Blindness nobody engineered.** If the critic captures ours itself, it knows which is ours. The lead captures and shuffles.
- **A soft critic.** Say "harsh" in the prompt and give it a binary job: which one is better, A or B. Scores out of 10 drift upward every round.
- **Named exit after N rounds.** The exit is winning the comparison, or the user stopping the run, or a limit the user set. Never a round count.
- **Wins that break things.** A prettier piece that broke a feature or the frame budget moved the work backwards.
- **Over-specifying.** Every extra instruction is one fewer decision the agent makes with its own judgment. Minimal wins.
