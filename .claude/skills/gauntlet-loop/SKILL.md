---
name: gauntlet-loop
description: Turns any goal into one paste-ready "gauntlet loop" prompt that makes an agent build everything the user described, then improve it piece by piece against a real reference with a separate blind critic, in bounded rounds, until it is complete and beats the reference. Use for games (Unreal Engine, Unity, Godot, web), apps and sites, code, writing, research and design; for building a cleared Wayfinder map or spec; and whenever the user asks for a gauntlet loop, to "gauntlet" something, or to loop until the work beats a named reference.
---

# Gauntlet Loop

The user gives a goal. You give back ONE prompt they can paste into a fresh agent session.

You are not doing the work. You are writing the prompt that makes another agent build all of it, then grind on it until it beats a real reference.

A gauntlet loop delivers two things, in this order. **Complete:** everything the user described exists and works. **Excellent:** each piece beats a real reference in a blind comparison. The original loop only chased the second, so agents polished a few pieces and left others missing or broken. Here completeness is the floor and quality is the climb.

## Flow

If the user brings a plan - a Wayfinder map, a spec, or tickets - read `plan.md` in this folder first; it decides which steps below are already done. If the goal is too big for one session and there is no plan, say so in one line and suggest `/wayfinder` first. If they want to go ahead anyway, carry on.

1. **Set the bar.** If the user supplied a reference, use it. If not, offer **2 or 3 candidate bars**, one line each, and stop. Wait for their pick. Do not write the prompt yet. For a game, or anything built in a game engine, read `game-dev.md` in this folder first; it names the one question to ask alongside the bars.
2. **Write the prompt.** One block, paste-ready, with no preamble and no headings inside it. Carry the user's own description into it word for word. The only thing after it is the offer in step 3.
3. **Offer to run it.** One flat line under the prompt: "I can run this here." Not a question. In Claude Code with the `gauntlet-loop` workflow installed, make it "I can run this here as the gauntlet-loop workflow."

If they say run it, run it the way "In Claude Code" below describes. Otherwise you become the lead agent and follow the prompt you just wrote.

## The bar is the whole trick

The loop only produces quality if the thing it compares against is real. A bar has to pass three tests:

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

When you propose bars, prefer the hardest one the agent can genuinely reach. Too easy, and the loop exits on round one; out of reach with the tools and assets the agent has, and every round is spent on a gap it cannot close.

If the goal has a measurable half (load time, frame time, token cost, benchmark score, word count, pass rate), name it alongside the reference. Taste plus a number beats taste alone.

## The round budget

Rounds are bounded so the loop moves fast and ends.

- **Every critic gets the same budget.** One look at the pair, the numbers, and the gaps already named - no research of its own - and a reply of the same shape: its pick, one or two sentences of evidence, and at most three gaps, biggest first. More gaps come in later rounds, not longer replies in this one.
- **Each piece gets up to six rounds, and up to ten while rounds still pay off.** After round six, a piece goes on only if the last round made a visible or measurable gain. Ten is the ceiling.
- **The same gap twice running changes the approach.** More polish on an approach that did not close a gap rarely closes it.
- **A round that made things worse is undone.** Every piece keeps its best version.
- **The whole-thing comparison gets up to three rounds**, each sending its biggest gap back to the piece it belongs to.
- **The budget limits polish, never completeness.** Everything is built rough before anything is polished, so a piece that runs out of rounds is unpolished, not missing.

If the user names a different round budget, or a time or cost limit, use theirs.

## Prompt template

Adapt the wording every time. Fill the brackets, drop a bracketed sentence when it does not apply, keep the last line.

```
Build [GOAL]. [One or two sentences on who it is for and what it has to make them feel or do.]

Here is what I described, word for word. All of it is in scope and it is the minimum; add more wherever it makes the result better, never at the expense of something on this list.

"""
[THE USER'S DESCRIPTION, VERBATIM]
"""

Before building, turn my description into CHECKLIST.md: one numbered line for every single thing I asked for, each with how you will show it works - a capture, a test or a measurement. Nothing is left off, merged away or quietly reinterpreted. Then build breadth first: a rough, working version of every checklist item, end to end, before any piece gets polished. The round budget below limits polish, never completeness.

The bar is [BAR]. Before the first round, get the real thing and capture it for every piece in the same views, sizes and conditions we will capture ours in; compare against those captures, never against a description of the bar. [It also has to beat NUMBER on METRIC, measured the same way on both.] [Write STYLE.md from the bar first - palette, light, type, shape, motion - and hold every builder to it.]

Then break the work into the smallest pieces that can be improved and judged on their own, and give each builder its own files. For each piece, run a builder and a separate critic with fresh context. You capture both sides the same way, shuffle them into an unlabeled A and B, and keep the key. Every critic gets the same budget: one look at the pair, the numbers, and the gaps already named for that piece, and a reply of its pick, one or two sentences of evidence pointing at what decided it, and at most three gaps, biggest first. The builder closes the biggest gap first and the others where it can without risk. Pieces a capture cannot show - feel, timing, sound, logic - are judged on measurements and tests against the bar.

The critic should be a harsh critic. Praise is not useful, because the only thing that moves the work is the next gap. If the same gap comes back twice running, change the approach instead of polishing the old one.

Each piece gets up to six rounds, and up to ten while rounds still pay off: after round six, go on only if the last round made a visible or measurable gain. Keep every round's version and undo any round that made things worse. A round only counts if every checklist item that passed before still passes. When a piece wins blind or its rounds are spent, keep its best version and log what is still open. Then judge the whole thing against the bar the same way, for up to three rounds, sending each gap back to its piece; pieces that win alone can still lose together.

Done means every checklist item passes with evidence you have seen yourself by running it, not by reading the code; nothing in it is a placeholder, stub or TODO; and a fresh agent that has not seen the work has read my description line by line against the result and found nothing missing. If something cannot be done, say which and why instead of dropping it. Finish with DONE.md: the checklist with its evidence, what beat the bar, what is still open, and how to run it.

/loop on each piece until the critic picks ours blind or its rounds are spent.

Keep a live progress page updating as the work evolves so I can watch it: the checklist status, each round's pick, the gaps named, and what changed. It is also the record every new round and any resumed session works from.

Fan out subagents and ultracode.
```

Rules for what you fill in:

- **The description goes in word for word** - the user's own message, not your summary. A paraphrase drops requirements, and the checklist can only be as complete as the text it is made from. When the user described the goal over several messages, paste all of them in order.
- **The context sentence gets real content** - audience, purpose, the feeling it has to land. The agent fills missing context with safe, generic defaults, and generic is what the loop is trying to beat.
- **The bar is a concrete, fetchable thing.** URL, product name, repo, title, and for games which scenes or moments.
- **"By running it" matches the goal.** Running it for software and games; reading the finished piece end to end for writing; re-running the analysis for research. "Keep every round's version" means commits for code and saved drafts for everything else.
- **STYLE.md goes in whenever the result is looked at** - a site, an app, a game, a deck. See "Visual quality" below.
- **Limits only when the user named them.** A time or cost line becomes the exit it is: "Stop at [LIMIT] and leave the best version, with the open gaps listed on the progress page."
- **Tool names only when the goal needs them** (image or video generation, a browser, an engine, a deploy target).
- **Everything else stays out.** No architecture, no file layout, no decomposition, no stack choice unless the user demanded it or their plan settled it - and then link the plan instead of restating it. The agent decides the rest, and it decides better than a spec written before the work started.

## Why the template reads the way it does

Each line fixes a failure seen when agents ran the original loop. Keep them when you adapt the wording.

- **The description, verbatim, becomes a checklist.** "All of it" is only checkable when it is counted. Agents that work from a summary build the summary.
- **Breadth first.** Polishing one piece before the others exist is how a run ends beautiful and half-built. A rough version of everything first means the round budget can only cost polish.
- **You capture, the critic judges.** A critic that takes its own screenshots knows which one is ours. The lead makes the anonymous pair and holds the key.
- **The critic gets the earlier gaps.** With fresh context and no memory it contradicts itself - lighter, then darker, then mid-tone. The list of gaps already named keeps it consistent without handing over the builder's reasoning.
- **The same budget for every critic.** Equal, short replies keep rounds fast and comparable, and three gaps is as much as one round of building can close. An essay buries the gap that matters.
- **Bar captures first, for every piece.** Critics with no matching view of the bar judge from memory.
- **Own files per builder.** Parallel builders on one project collide unless each owns its files.
- **Measure what a picture cannot show.** Movement feel, timing, sound and game logic do not survive a screenshot.
- **Rounds that pay off.** Early rounds bring most of the gain. The gain test spends later rounds only where they still move the work, and ten is the ceiling so a run ends.
- **Undo worse rounds; wins must not regress.** A piece polished in isolation can break something that worked - a reload, a jump, the frame budget. The checklist catches it and the best version survives.
- **Done by evidence, checked by a fresh reader.** Agents report done on what they meant to build. Seeing it run, and a reader who has not seen the work comparing the description line by line, catches what the builders stopped seeing.
- **DONE.md.** The user can verify the run in minutes instead of rediscovering it.

Current Claude models follow a prompt closely and literally, plan and split work well on their own, and keep going without being pushed. So the prompt says each thing once, at normal volume, with the reason where the reason is not obvious. Firmness belongs on completeness and the exit rules and nowhere else. Stacked MUST and NEVER lines make the agent rigid, and a prescribed plan is worse than the one it would make.

Effort is a session setting, not a line in the prompt. For hard goals, tell the user to run the session at high effort or above.

## Visual quality

When the result is looked at, the prompt asks for STYLE.md: palette, light, type, shape and motion, taken from the bar before anything is built, so every builder aims at one look instead of each inventing its own.

For websites and app UI, a general "avoid a generic look" does not work: without direction, Claude falls back on a few default styles, and a vague warning only swaps one default for another. Name the defaults in STYLE.md instead - a cream background, italic accent words in headlines, numbered "01 / 02 / 03" section labels, monospace labels, pill-shaped buttons - unless the bar itself uses one. When the first round shows another default, add it to the list.

For games, `game-dev.md` covers art direction, lighting, readability and the default engine look.

## Length and voice

As long as the goal needs, and no longer: the context, the user's description, and the template's paragraphs. The description can be any length; everything around it stays plain paragraphs. If your own part needs a heading to stay readable, it is too long.

Plain sentences. No bullet lists inside the prompt except the user's own. It should read like someone telling an agent what complete and excellent look like and refusing to accept less.

## In Claude Code: run it as a workflow

This repo ships the loop as a Claude Code workflow, `.claude/workflows/gauntlet-loop.js`, with a read-only critic subagent, `.claude/agents/gauntlet-critic.md`. The workflow runs the same loop the template describes:

- it writes the checklist and builds everything rough before polishing;
- it captures the bar first and keeps the A/B key where no agent can see it;
- it gives every critic the same budget and read-only access to the pair;
- it applies the same round budget;
- it holds the regression gate and runs the whole-thing comparison;
- it finishes with the fresh completeness check and DONE.md.

If the token budget or the agent cap runs out, it stops cleanly and returns where each piece stands.

When the user asks to run the loop and the workflow is installed, call the Workflow tool with the name `gauntlet-loop` and `args` set to `{"brief": "<the prompt you wrote>"}`, adding `"plan": "<link or path>"` when there is a plan. It runs many agents and spends real tokens, so run it only when the user asked for it. A token target the user sets for the turn ("+2m") becomes the run's budget.

For a prompt the user will paste into a Claude Code session that has the workflow, replace the last line with: "Run this with the gauntlet-loop workflow, passing this whole prompt as the brief."

## Portability

`/loop` and `ultracode` are Claude Code features. `/loop` reruns the prompt on an interval or lets the model pace itself. `ultracode` opts the turn into multi-agent orchestration.

For any other agent, swap the last two lines for: "Keep looping on each piece until the critic picks ours or its rounds are spent. Run the builders and critics as parallel subagents." The structure carries over unchanged.

## Filled example

This is illustrative. Match its shape, not its wording. A full game example is in `game-dev.md`; a plan-driven one is in `plan.md`.

User: "Landing page for my running brand STRIDE. Athletic, green and dark, has to feel alive. Hero with a big video-like motion background, a section for our three shoes with prices, a newsletter signup, and it has to work on phones."

Bars offered: A) Nike's current running campaign page B) On Running's homepage C) Gymshark's product landing page. User picks A.

```
Build a landing page for STRIDE, a running brand. It is for young runners who train hard; it has to feel athletic, energetic and unmistakable.

Here is what I described, word for word. All of it is in scope and it is the minimum; add more wherever it makes the result better, never at the expense of something on this list.

"""
Landing page for my running brand STRIDE. Athletic, green and dark, has to feel alive. Hero with a big video-like motion background, a section for our three shoes with prices, a newsletter signup, and it has to work on phones.
"""

Before building, turn my description into CHECKLIST.md: one numbered line for every single thing I asked for, each with how you will show it works - a capture, a test or a measurement. Nothing is left off, merged away or quietly reinterpreted. Then build breadth first: a rough, working version of every checklist item, end to end, before any piece gets polished. The round budget below limits polish, never completeness.

The bar is Nike's current running campaign page. Before the first round, screenshot it at desktop and mobile, section by section, and capture ours the same way; compare against those captures, never against a description of the page. It also has to load faster than Nike's page, measured the same way on both. Write STYLE.md from the bar first - palette, light, type, shape, motion - and hold every builder to it. It also names the default looks to stay away from: a cream background, italic accent words in headlines, numbered "01 / 02 / 03" section labels, monospace labels, pill-shaped buttons.

Then break the work into the smallest pieces that can be improved and judged on their own - hero and its motion, type, colour, the shoe section, the signup, mobile - and give each builder its own files. For each piece, run a builder and a separate critic with fresh context. You capture both sides the same way, shuffle them into an unlabeled A and B, and keep the key. Every critic gets the same budget: one look at the pair, the load times, and the gaps already named for that piece, and a reply of its pick, one or two sentences of evidence pointing at what decided it, and at most three gaps, biggest first. The builder closes the biggest gap first and the others where it can without risk. Motion is judged on short frame strips of both, not single frames.

The critic should be a harsh critic. Praise is not useful, because the only thing that moves the work is the next gap. If the same gap comes back twice running, change the approach instead of polishing the old one.

Each piece gets up to six rounds, and up to ten while rounds still pay off: after round six, go on only if the last round made a visible or measurable gain. Commit after every round and undo any round that made things worse. A round only counts if every checklist item that passed before still passes. When a piece wins blind or its rounds are spent, keep its best version and log what is still open. Then judge the whole page against Nike's the same way, for up to three rounds, sending each gap back to its piece.

Done means every checklist item passes with evidence you have seen yourself in a browser at desktop and phone sizes, not by reading the code; nothing in it is a placeholder, stub or TODO; and a fresh agent that has not seen the work has read my description line by line against the page and found nothing missing. If something cannot be done, say which and why instead of dropping it. Finish with DONE.md: the checklist with its evidence, what beat the bar, what is still open, and how to run it.

/loop on each piece until the critic picks ours blind or its rounds are spent.

Keep a live progress page updating as the work evolves so I can watch it: the checklist status, each round's pick, the gaps named, and what changed. It is also the record every new round and any resumed session works from.

Fan out subagents and ultracode.
```

**Other goals change only a few lines.** For a 2000-word explainer with Julia Evans' posts on jvns.ca as the bar:
- **The checklist** holds every requirement of the brief (length, audience, what the reader must be able to do afterwards).
- **The capture** is the text itself, bylines stripped.
- **The pieces** are the opening, each explanation, the diagrams, the analogies and the ending.
- **The critic's question** is which one a non-engineer would understand faster.
- **"Seen yourself"** means reading the finished piece end to end.
- **"Keep every round's version"** means saved drafts.

## What breaks a gauntlet loop

- **A vague bar.** The critic invents a comparison and approves everything. Most common failure by far.
- **A summary instead of the description.** The checklist inherits whatever the summary dropped, and so does the result.
- **Polish before completeness.** Rounds run out on a few beautiful pieces while others were never built.
- **A foggy goal.** The loop optimizes what it is pointed at, so open questions get answered by whichever piece wins a round. On anything bigger than one session, clear the plan first.
- **The builder judging its own work.** The critic must be a separate agent with fresh context. It should not know how hard the builder tried.
- **Blindness nobody engineered.** If the critic captures ours itself, it knows which is ours. The lead captures and shuffles.
- **A soft or rambling critic.** Say "harsh" in the prompt, give it a binary job - which one is better, A or B - and the same short reply budget every round. Scores out of 10 drift upward every round.
- **Rounds without a budget, or a budget without a gain test.** Unbounded rounds never end; a flat count stops good pieces early and wastes rounds on stuck ones.
- **Wins that break things.** A prettier piece that broke a feature or the frame budget moved the work backwards.
- **Done by assertion.** "Implemented" is not "works". Evidence from running it, and a fresh reader against the description, or it is not done.
- **Over-specifying.** Every extra instruction is one fewer decision the agent makes with its own judgment. The template holds what the loop needs; the rest is the agent's.
