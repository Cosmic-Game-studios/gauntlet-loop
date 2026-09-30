---
name: gauntlet-loop
description: Turns any goal into one paste-ready "gauntlet loop" prompt that makes an agent direct a long build - everything the user described built first, then each piece improved against a real reference by builders and a separate blind critic in bounded rounds, with its memory kept in files so nothing is lost when context is compacted - until the work is complete and beats the reference. Use for games (Unreal Engine, Unity, Godot, web), apps and sites, code, writing, research and design; for building a cleared Wayfinder map or spec; and whenever the user asks for a gauntlet loop, to "gauntlet" something, or to loop until the work beats a named reference.
---

# Gauntlet Loop

The user gives a goal. You give back ONE prompt they can paste into a fresh agent session.

You are not doing the work. You are writing the prompt that makes another agent direct all of it: build everything, then grind on it until it beats a real reference.

A gauntlet loop delivers two things, in this order. **Complete:** everything the user described exists and works. **Excellent:** each piece beats a real reference in a blind comparison. The original loop only chased the second, so agents polished a few pieces and left others missing or broken. Here completeness is the floor and quality is the climb, and the run is built to last: its memory lives in files, not in a context that gets compacted.

## Flow

If the user brings a plan - a Wayfinder map, a spec, or tickets - read `plan.md` in this folder first; it decides which steps below are already done. If the goal is too big for one session and there is no plan, say so in one line and suggest `/wayfinder` first. If they want to go ahead anyway, carry on.

1. **Set the bar.** If the user supplied a reference that passes the three tests below, use it. If it is a category ("the latest Call of Duty games") or cannot be fetched, offer 2 or 3 named, fetchable bars within it. If there is no reference, offer **2 or 3 candidate bars**, one line each. Then stop and wait for the pick; do not write the prompt yet. For a game, or anything built in a game engine, read `game-dev.md` in this folder first and ask its one question in this same message - even when the user named the bar - and wait for that answer too. For a hard goal, add one line suggesting the run use high effort or above.
2. **Write the prompt.** One block, paste-ready, with no preamble and no headings inside it. Carry the user's own description into it word for word. The only thing after it is the offer in step 3.
3. **Offer to run it.** One flat line under the prompt: "I can run this here." Not a question.

If they say run it, become the director and follow the prompt you just wrote. If they say anything else, the prompt is theirs to paste.

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

- **Every critic gets the same budget.** One look at every file of the pair, the numbers, and the topics already compared - no research of its own - and a reply of the same shape: its pick, one or two sentences of evidence, and at most three gaps, biggest first. More gaps come in later rounds, not longer replies in this one.
- **One critic judges everything.** It picks blind on the captures and numbers first; then it is told which side is ours and reviews the piece's code and test output. Its three gaps cover look, numbers and code together, so a round improves the code as well as the picture.
- **Only comparable pairs are judged.** Two sides that differ in size, view or state are recaptured first.
- **Budgets are used, not saved.** The director checks the clock every round and keeps going while pieces are open and time or rounds remain.
- **Each piece gets up to six rounds, and up to ten while rounds still gain.** A round gains when a number moved toward the bar or last round's biggest gap is no longer named, with nothing on the checklist broken. After round six, a piece goes on only if its last round gained. Ten is the ceiling.
- **The same biggest gap two rounds in a row changes the approach.** More polish on an approach that did not close a gap rarely closes it.
- **A round that made things worse is undone and still uses its round.** When it is unclear whether a round helped, a fresh critic picks blind between this round's version and the last. Every piece keeps its best version.
- **A win is confirmed with the sides swapped.** A piece wins when the critic picks ours and a second critic, shown the same pair with A and B swapped, picks ours too. Blind judges have a position bias, and one lucky pick should not end a piece.
- **The whole-thing comparison gets up to three rounds**, each sending every gap it names back to the piece it belongs to for one more round.
- **The budget limits polish, never completeness.** Everything is built rough before anything is polished, so a piece that runs out of rounds is unpolished, not missing.

If the user names a different round budget, or a time or cost limit, use theirs.

## Long runs: the director and its memory

A build worth looping on outlasts one context. When the context is compacted, details in it are lost - often the exact ones that mattered: what the user asked for, which gaps were already closed, which agent is doing what. The prompt handles this with one role and two files.

- **The lead is a director.** It plans, briefs builders and critics as subagents, and keeps the record; it does not build or judge. A lead that writes code fills its own context with code and compacts early.
- **GOAL.md is fixed.** The user's description word for word, the bar, and the loop's rules. Written once, never rewritten; only the user's own decisions are appended. Whatever compaction drops, the goal survives.
- **STATUS.md is the live page.** A score row per round (checklist items passing, pieces won, the key numbers), then each piece with its status, round, best version, current gaps and the agent working on it. It is rewritten every round, not appended. The last three rounds stay in detail, anything older folds into one line per piece, and the page stays under 80 lines, so reading it is cheap enough to do every round. Older detail still exists in the commits and the files the builders changed.
- **Re-read, every round.** The director re-reads GOAL.md and STATUS.md at the start of every round and on every resume. It does not have to notice a compaction for this to work.
- **Brief from files, not from memory.** Builders get GOAL.md, CHECKLIST.md, STYLE.md, their piece and its gaps; critics get only the pair, the numbers and neutral topics. Builders reply in five lines or fewer and critics in their fixed budget, so the director's context holds decisions, not transcripts.

This is measured, not assumed. In two 30-minute benchmark runs on the same game, a lead that kept its state in files and read only short returns was compared with the original loop's single lead context:
- it processed 48% and 32% fewer tokens;
- it cost less;
- it passed more functional checks;
- it was the only run that survived a restart.

Playability was level. Heavier management on top of this - departments, leads per discipline - added cost without a measured gain, so it stays out.

## Prompt template

Adapt the wording every time. Fill the brackets, drop a bracketed sentence when it does not apply, keep the last line.

```
Build [GOAL]. [One or two sentences on who it is for and what it has to make them feel or do.]

Here is what I described, word for word. All of it is in scope and it is the minimum; add more wherever it makes the result better, never at the expense of something on this list. Where it leaves something open, decide it the way the rest of it points and be creative within that; ask me only when a guess would be expensive to undo.

"""
[THE USER'S DESCRIPTION, VERBATIM]
"""

You direct this build: you plan, brief builders and critics as subagents, and keep the record, and you do not build or judge anything yourself. The run is long enough that your context will be compacted and lose details, so your memory lives in files. Write GOAL.md first: my description word for word, the bar, and the rules of this loop as this prompt states them; never rewrite it, only append decisions I make. Keep STATUS.md as the one page we both read: a score row for every round (checklist items passing, pieces won, the key numbers), then each piece with its status, round, best version, current gaps and the agent working on it. Rewrite STATUS.md at the end of every round instead of appending: the last three rounds stay in detail, anything older folds into one line per piece, and the page stays under 80 lines. Re-read GOAL.md and STATUS.md at the start of every round and whenever you resume. Brief every subagent from the files, not from memory - builders get GOAL.md, CHECKLIST.md, STYLE.md, their piece and its gaps; critics get only the pair, the numbers and neutral topics - and have builders reply in five lines or fewer, so your context holds decisions, not transcripts.

Before building, turn my description into CHECKLIST.md: one numbered line for every single thing I asked for, each with how you will show it works - a capture, a test or a measurement - and every interpretation you made marked as yours, so I can change it. Nothing is left off, merged away or quietly reinterpreted. Break the work into the smallest pieces that can be improved and judged on their own, together covering every checklist item, and give each piece its own files so parallel builders never edit the same thing.

The bar is [BAR]. Get the real thing and capture it for every piece in the same views, sizes and conditions we will capture ours in; compare against those captures, never against a description of the bar. [It also has to beat NUMBER on METRIC, measured the same way on both.] [Write STYLE.md from those captures - palette, light, type, shape, motion - and hold every builder to it.]

Then have the builders make a rough, working version of every checklist item, end to end, before any piece gets polished. The round budget below limits polish, never completeness.

Then the rounds. For each piece, run a builder, then a capture agent that captures ours and the bar the same way into an unlabeled A and B in the order you choose, then a separate critic with fresh context that sees only the pair. You keep the key. Every critic gets the same budget: one look at every file of the pair, the numbers, and the topics already compared for that piece - named neutrally, never saying which side had the problem - and a reply of its pick, one or two sentences of evidence pointing at what decided it, and at most three gaps, biggest first. You decide whether a gap is one already named. A pair whose sides differ in size, view or state is recaptured, not judged. Once the critic has picked, tell it which side is ours and give it the piece's code and test output; it judges those too - correctness, structure, performance - and its three gaps, biggest first, cover the look, the numbers and the code together. The builder closes the biggest gap first and the others where it can without risk. Pieces a capture cannot show - feel, timing, sound, logic - are judged on measurements and tests against the bar.

The critic should be a harsh critic. Praise is not useful, because the only thing that moves the work is the next gap. If a critic names the same biggest gap two rounds in a row, change the approach instead of polishing the old one.

Each piece gets up to six rounds, and up to ten while rounds still gain: a round gains when a number moved toward the bar or last round's biggest gap is no longer named, with nothing on the checklist broken, and after round six a piece goes on only if its last round gained. Each builder keeps every round's version of its own files, so any round can be undone. A round that breaks a checklist item that passed before is undone and still uses its round; when it is unclear whether a round helped, a fresh critic picks blind between this round's version and the last, and if it picks the last, the round is undone. A piece wins when the critic picks ours and a second critic, shown the same pair with A and B swapped, picks ours too. When a piece wins or its rounds are spent, keep its best version and put what is still open in STATUS.md. Rounds and time are budgets to use: check the clock at the start of every round and keep going while any piece is open and time remains; ending early with open gaps wastes them. Then judge the whole thing against the bar the same way, for up to three rounds, sending every gap it names back to its piece for one more round; pieces that win alone can still lose together.

Done means every checklist item passes with evidence from running it - captures, test output, measurements - not from reading the code; nothing in it is a placeholder, stub or TODO; and a fresh agent that has not seen the work has run it, checked my description line by line against what it saw, and found nothing missing. Items I said I judge myself are listed for me in DONE.md instead. If something cannot be done, say which and why instead of dropping it. Finish with DONE.md: the checklist with its evidence, the score from the first rough version to the last round, what beat the bar, what is still open, and how to run it.

/loop on each piece until the critic picks ours blind or its rounds are spent.

Fan out subagents and ultracode.
```

Rules for what you fill in:

- **The description goes in word for word** - the user's own message, not your summary. A paraphrase drops requirements, and the checklist can only be as complete as the text it is made from. When the user described the goal over several messages, paste all of them in order.
- **The context sentence gets real content** - audience, purpose, the feeling it has to land. The agent fills missing context with safe, generic defaults, and generic is what the loop is trying to beat.
- **The bar is a concrete, fetchable thing.** URL, product name, repo, title, and for games which scenes or moments.
- **"From running it" matches the goal.** Running it for software and games; reading the finished piece end to end for writing; re-running the analysis for research. "Keep every round's version" means commits for code and saved drafts for everything else.
- **STYLE.md goes in whenever the result is looked at** - a site, an app, a game, a deck. See "Visual quality" below.
- **Items the user will judge.** When the user says they judge something themselves (sound, feel), say so in the prompt; DONE.md lists those items for them instead of claiming them.
- **Limits only when the user named them.** A time or cost line is a budget to use and the exit it is: "Use the time up to [LIMIT] - check the clock every round - and stop there with the best version and the open gaps in STATUS.md."
- **Tool names only when the goal needs them** (image or video generation, a browser, an engine, a deploy target).
- **Everything else stays out.** No architecture, no file layout, no decomposition, no stack choice unless the user demanded it or their plan settled it - and then link the plan instead of restating it. The agent decides the rest, and it decides better than a spec written before the work started.

## Why the template reads the way it does

Each line fixes a failure seen when agents ran the original loop. Keep them when you adapt the wording.

- **The description, verbatim, becomes a checklist.** "All of it" is only checkable when it is counted. Agents that work from a summary build the summary.
- **Interpretation is allowed, and visible.** Users leave gaps on purpose. Filling them in the spirit of the rest makes the result feel intended; marking them on the checklist lets the user change a guess instead of discovering it.
- **A director with files for memory.** See "Long runs" above: fewer tokens, lower cost, more checks passed, and a run that survives compaction and restarts.
- **Breadth first.** Polishing one piece before the others exist is how a run ends beautiful and half-built. A rough version of everything first means the round budget can only cost polish.
- **A capture agent makes the pair, the critic judges it, the director holds the key.** A critic that takes its own screenshots knows which one is ours. Keeping captures out of the director also keeps images and logs out of its context.
- **The critic gets the earlier gaps.** With fresh context and no memory it contradicts itself - lighter, then darker, then mid-tone. The list of gaps already named keeps it consistent without handing over the builder's reasoning.
- **The same budget for every critic.** Equal, short replies keep rounds fast and comparable, and three gaps is as much as one round of building can close. An essay buries the gap that matters.
- **Topics, not gaps, for the critic.** Earlier gaps describe our side's flaws, so a critic that reads them can tell which side is ours. Neutral topics keep it consistent without breaking blindness, and the director - who holds the key - decides whether a gap repeats.
- **A win confirmed with the sides swapped.** LLM judges favour a position. A second pick with A and B swapped costs one critic call per win and stops a lucky pick from ending a piece.
- **Bar captures first, for every piece.** Critics with no matching view of the bar judge from memory.
- **Own files per builder.** Parallel builders on one project collide unless each owns its files.
- **Measure what a picture cannot show.** Movement feel, timing, sound and game logic do not survive a screenshot.
- **Rounds that pay off, with gain defined.** Early rounds bring most of the gain. A number moving toward the bar or last round's biggest gap no longer named counts as gain, and doubt is settled by a blind pick between this round and the last - never by the director's own taste. The gain test spends later rounds only where they still move the work, and ten is the ceiling so a run ends.
- **Undo worse rounds; wins must not regress.** A piece polished in isolation can break something that worked - a reload, a jump, the frame budget. The checklist catches it and the best version survives.
- **Budgets are used, not saved.** In the first benchmark run every method - the original and both earlier versions of this loop - stopped after 3 to 5 of its 10 minutes with pieces still open. A loop that quits early is no loop.
- **Comparable pairs, and a critic that also reads the code.** In the same run a critic picked ours over the bar on captures of different sizes, and blind judges later ranked that result last on looks. Recapturing mismatched pairs removes that false win; reviewing the code after the pick lets the same critic improve what the picture cannot show.
- **A score row every round.** Improvement is measured, not asserted: checklist items passing, pieces won and the key numbers per round show whether the loop is still paying off, and DONE.md shows the whole curve.
- **Done by evidence, checked by a fresh agent that runs it.** Agents report done on what they meant to build. Evidence from running it, and a fresh agent that runs it and compares the description line by line, catches what the builders stopped seeing.

Current Claude models follow a prompt closely and literally, plan and split work well on their own, and keep going without being pushed. So the prompt says each thing once, at normal volume, with the reason where the reason is not obvious. Firmness belongs on completeness, memory and the exit rules and nowhere else. Stacked MUST and NEVER lines make the agent rigid, and a prescribed plan is worse than the one it would make.

Effort is a session setting, not a line in the prompt. For hard goals, tell the user to run the session at high effort or above.

## Visual quality

When the result is looked at, the prompt asks for STYLE.md: palette, light, type, shape and motion, taken from the bar before anything is built, so every builder aims at one look instead of each inventing its own.

For websites and app UI, a general "avoid a generic look" does not work: without direction, Claude falls back on a few default styles, and a vague warning only swaps one default for another. Name the defaults in STYLE.md instead - a cream background, italic accent words in headlines, numbered "01 / 02 / 03" section labels, monospace labels, pill-shaped buttons - unless the bar itself uses one. When the first round shows another default, add it to the list.

For games, `game-dev.md` covers art direction, lighting, readability and the default engine look.

## Length and voice

As long as the goal needs, and no longer: the context, the user's description, and the template's paragraphs. The description can be any length; everything around it stays plain paragraphs. If your own part needs a heading to stay readable, it is too long.

Plain sentences. No bullet lists inside the prompt except the user's own. It should read like someone telling an agent plainly what complete and excellent look like.

## In Claude Code

The prompt runs as it is. Its last line, "Fan out subagents and ultracode", lets Claude Code orchestrate the builders, capture agents and critics itself - it can write and run its own workflows from the prompt - so the skill ships no scripts. Running the loop spends real tokens across many agents, so run it only when the user asks. A token target the user sets for the turn ("+2m") becomes the run's budget.

## Portability

`/loop` and `ultracode` are Claude Code features. `/loop` reruns the prompt on an interval or lets the model pace itself. `ultracode` opts the turn into multi-agent orchestration.

For any other agent, swap the last two lines for: "Keep looping on each piece until the critic picks ours or its rounds are spent. Run the builders and critics as parallel subagents." The structure carries over unchanged.

## Filled example

This is illustrative. Match its shape, not its wording. A full game example is in `game-dev.md`; a plan-driven one is in `plan.md`.

User: "Landing page for my running brand STRIDE. Athletic, green and dark, has to feel alive. Hero with a big video-like motion background, a section for our three shoes with prices, a newsletter signup, and it has to work on phones."

Bars offered: A) Nike's running page on nike.com B) On Running's homepage C) Gymshark's homepage. User picks A.

```
Build a landing page for STRIDE, a running brand. It is for young runners who train hard; it has to feel athletic, energetic and unmistakable.

Here is what I described, word for word. All of it is in scope and it is the minimum; add more wherever it makes the result better, never at the expense of something on this list. Where it leaves something open, decide it the way the rest of it points and be creative within that; ask me only when a guess would be expensive to undo.

"""
Landing page for my running brand STRIDE. Athletic, green and dark, has to feel alive. Hero with a big video-like motion background, a section for our three shoes with prices, a newsletter signup, and it has to work on phones.
"""

You direct this build: you plan, brief builders and critics as subagents, and keep the record, and you do not build or judge anything yourself. The run is long enough that your context will be compacted and lose details, so your memory lives in files. Write GOAL.md first: my description word for word, the bar, and the rules of this loop as this prompt states them; never rewrite it, only append decisions I make. Keep STATUS.md as the one page we both read: a score row for every round (checklist items passing, pieces won, load time), then each piece with its status, round, best version, current gaps and the agent working on it. Rewrite STATUS.md at the end of every round instead of appending: the last three rounds stay in detail, anything older folds into one line per piece, and the page stays under 80 lines. Re-read GOAL.md and STATUS.md at the start of every round and whenever you resume. Brief every subagent from the files, not from memory - builders get GOAL.md, CHECKLIST.md, STYLE.md, their piece and its gaps; critics get only the pair, the numbers and neutral topics - and have builders reply in five lines or fewer, so your context holds decisions, not transcripts.

Before building, turn my description into CHECKLIST.md: one numbered line for every single thing I asked for, each with how you will show it works - a capture, a test or a measurement - and every interpretation you made marked as yours, so I can change it. Nothing is left off, merged away or quietly reinterpreted. Break the work into the smallest pieces that can be improved and judged on their own, together covering every checklist item, and give each piece its own files. Mobile is a capture size for every piece, not a piece of its own.

The bar is Nike's running page on nike.com as it is on the day the run starts. Screenshot it at desktop and mobile, section by section, and capture ours the same way; compare against those captures, never against a description of the page. It also has to load faster than Nike's page, measured the same way on both. Write STYLE.md from those captures - palette, light, type, shape, motion - and hold every builder to it; it also names the default looks to stay away from: a cream background, italic accent words in headlines, numbered "01 / 02 / 03" section labels, monospace labels, pill-shaped buttons.

Then have the builders make a rough, working version of every checklist item, end to end, before any piece gets polished. The round budget below limits polish, never completeness.

Then the rounds. For each piece, run a builder, then a capture agent that captures ours and the bar the same way into an unlabeled A and B in the order you choose, then a separate critic with fresh context that sees only the pair. You keep the key. Every critic gets the same budget: one look at every file of the pair, the load times, and the topics already compared for that piece - named neutrally, never saying which side had the problem - and a reply of its pick, one or two sentences of evidence pointing at what decided it, and at most three gaps, biggest first. You decide whether a gap is one already named. A pair whose sides differ in size, view or state is recaptured, not judged. Once the critic has picked, tell it which side is ours and give it the piece's code and test output; it judges those too - correctness, structure, performance - and its three gaps, biggest first, cover the look, the numbers and the code together. The builder closes the biggest gap first and the others where it can without risk. Motion is judged on short frame strips of both, not single frames.

The critic should be a harsh critic. Praise is not useful, because the only thing that moves the work is the next gap. If a critic names the same biggest gap two rounds in a row, change the approach instead of polishing the old one.

Each piece gets up to six rounds, and up to ten while rounds still gain: a round gains when the load time moved toward Nike's or last round's biggest gap is no longer named, with nothing on the checklist broken, and after round six a piece goes on only if its last round gained. Each builder commits only its own files, once per round, so any round can be undone. A round that breaks a checklist item that passed before is undone and still uses its round; when it is unclear whether a round helped, a fresh critic picks blind between this round's version and the last, and if it picks the last, the round is undone. A piece wins when the critic picks ours and a second critic, shown the same pair with A and B swapped, picks ours too. When a piece wins or its rounds are spent, keep its best version and put what is still open in STATUS.md. Rounds and time are budgets to use: check the clock at the start of every round and keep going while any piece is open and time remains; ending early with open gaps wastes them. Then judge the whole page against Nike's the same way, for up to three rounds, sending every gap it names back to its piece for one more round.

Done means every checklist item passes with evidence from running it in a browser at desktop and phone sizes, not from reading the code; nothing in it is a placeholder, stub or TODO; and a fresh agent that has not seen the work has opened the page at both sizes, checked my description line by line against what it saw, and found nothing missing. If something cannot be done, say which and why instead of dropping it. Finish with DONE.md: the checklist with its evidence, the score from the first rough version to the last round, what beat the bar, what is still open, and how to run it.

/loop on each piece until the critic picks ours blind or its rounds are spent.

Fan out subagents and ultracode.
```

**Other goals change only a few lines.** For a 2000-word explainer with Julia Evans' posts on jvns.ca as the bar:
- **The checklist** holds every requirement of the brief (length, audience, what the reader must be able to do afterwards).
- **The capture** is the text itself, bylines stripped.
- **The pieces** are the opening, each explanation, the diagrams, the analogies and the ending.
- **The critic's question** is which one a non-engineer would understand faster.
- **"From running it"** means a reader going through the finished piece end to end.
- **"Keep every round's version"** means saved drafts.
- **The score row** is checklist items passing, pieces won and word count.

## What breaks a gauntlet loop

- **A vague bar.** The critic invents a comparison and approves everything. Most common failure by far.
- **A summary instead of the description.** The checklist inherits whatever the summary dropped, and so does the result.
- **Polish before completeness.** Rounds run out on a few beautiful pieces while others were never built.
- **Memory in the context.** A long run compacts, and the goal, the closed gaps and who is doing what go with it. The files carry them instead.
- **A lead that builds.** Its context fills with code and transcripts, compacts early, and loses the overview it exists to keep.
- **Status files that only grow.** A log nobody can afford to re-read is no memory. STATUS.md is rewritten, bounded and folded.
- **A foggy goal.** The loop optimizes what it is pointed at, so open questions get answered by whichever piece wins a round. On anything bigger than one session, clear the plan first.
- **The builder judging its own work.** The critic must be a separate agent with fresh context. It should not know how hard the builder tried.
- **Blindness nobody engineered.** If the critic captures ours itself, it knows which is ours. A separate capture agent makes the pair; the director decides the order and keeps the key.
- **A soft or rambling critic.** Say "harsh" in the prompt, give it a binary job - which one is better, A or B - and the same short reply budget every round. Scores out of 10 drift upward every round.
- **Rounds without a budget, or a budget without a gain test.** Unbounded rounds never end; a flat count stops good pieces early and wastes rounds on stuck ones.
- **Wins that break things.** A prettier piece that broke a feature or the frame budget moved the work backwards.
- **Done by assertion.** "Implemented" is not "works". Evidence from running it, and a fresh reader against the description, or it is not done.
- **Over-specifying.** Every extra instruction is one fewer decision the agent makes with its own judgment. The template holds what the loop needs; the rest is the agent's.
