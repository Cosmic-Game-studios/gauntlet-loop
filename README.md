<p align="center">
  <img src="assets/banner.png" alt="gauntlet loop" width="100%">
</p>

# Gauntlet Loop

A skill that turns any goal into one short, paste-ready prompt. That prompt makes your agent pick a real quality bar, split the work into small pieces, run a builder and a separate harsh critic on each one, compare blind against the bar, and keep looping until it wins.

Most agent output stops at "good enough" because nothing is holding it to a standard. This gives it a standard it cannot argue with.

> The gauntlet loop is [Matt Shumer's](https://github.com/mshumer) idea. He wrote the original prompt and named the technique while building [Claude of Duty](https://github.com/mshumer/Claude-of-Duty). This repo packages that pattern as a reusable skill.

## Quick start

```
git clone https://github.com/robonuggets/gauntlet-loop
```

Copy the skill folder into your project:

```
cp -r gauntlet-loop/.claude/skills/gauntlet-loop your-project/.claude/skills/
```

Then in your agent:

```
/gauntlet-loop build me a pricing page for my SaaS
```

It offers you 2 or 3 quality bars to aim at, you pick one, and it hands back a single prompt you paste into a fresh session.

## What's included

```
.claude/skills/gauntlet-loop/
└── SKILL.md      # the whole skill, one file
README.md
LICENSE           # CC BY 4.0
```

## How it works

1. **You give a goal.** Anything. A site, an essay, a CLI tool, a research brief.
2. **It offers 2 or 3 bars.** Each one is a specific, real thing your agent can actually fetch and compare against. Not "award-winning design", but a named page, a named post, a named repo.
3. **You pick one.** It writes one short prompt, around 150 words, and stops.
4. **You paste it into a fresh session.** That agent splits the work, runs builder and critic pairs, and loops.

The critic is the part that matters. It is a separate agent with fresh context, it opens the actual output, it puts your work next to the bar with the labels stripped, and it says which one is better. Not a score out of 10, which drifts upward every round. A pick.

The loop exits when your work wins the blind comparison, or when you stop the run. Never after a fixed number of rounds.

## Gauntlet Studio: a whole game, autonomously

`gauntlet-studio` scales the loop up to a full game studio.

```
/gauntlet-studio a co-op roguelite about lighthouse keepers fighting sea monsters, Unreal 5, stylised like Sea of Thieves
```

1. **Intake.** It asks at most 5 questions (engine, scope, reference games, art direction, must-haves), only if the pitch leaves them open.
2. **Game Brief.** It writes a one-screen brief: pillars, "not this", core loop, bars per department, vertical slice. You say OK or ask for changes. After that it never asks you anything until the game is done.
3. **Game Director.** A lead agent breaks the brief into features and tickets, routes them to departments (Design, Code, Art, 3D/Blender, Animation, Tech Art, Audio, Level, UI/UX, QA, Build), and runs a heartbeat loop: load state, sense, judge the milestone gate, plan and cut, dispatch, integrate, report.
4. **Every ticket runs the gauntlet with two separate critics.** Builder -> machine verify -> an **Experience critic** judges blind against a real shipped game (two independent wins on hero tickets), and a **Code critic** reviews the diff against the architecture and a named reference repo (correctness, robustness, performance, architecture). Both must pass. Rounds are capped (hero 3, core 2, bulk 1) because longer loops start optimising for the critic instead of the player: the best version is kept, a held-out judge the builder never sees decides, and anything that falls short but meets the floor is merged as debt for a later polish pass. A ticket that misses the floor gets one re-scope, then is cut or replaced.
5. **It adds what you did not ask for.** A completeness pass lists what the genre expects (settings, rebinding, hit feedback, checkpoints, juice) and builds it.
6. **Milestones with hard gates.** Tech Spike -> Vertical Slice -> Content Alpha -> Beta -> Release Candidate, each judged on a real build.
7. **You play, it improves.** At the Release Candidate it hands you the game and waits. You play and write feedback in your own words ("gunplay should feel like CS2", "more borderless comic art", "I want smooth frame rates"). It turns each item into a diagnosis, a new bar and tickets, protects what you liked with regression bars, runs a patch cycle, and hands you the next build. Until you say it is done.
8. **Context engineering, so it can run for a week.** Files are the memory, context is a scratchpad. The Director works from a one-screen `STATUS.md` and a checkbox `TRACKER.md` (tickets and errors), ticked the moment something happens. Every subagent gets a small context pack and returns at most 5 lines; details go to files. Repeated mistakes become `LESSONS.md` rules. Compaction or a restart loses nothing.
9. **Spends effort where the player notices.** Tickets are tiered hero / core / bulk: full gauntlet for the core loop and the vertical slice, batched judging for props and filler. Cheap checks run before any critic, bars are calibrated so they can actually be beaten, and usage limits pause and resume the run instead of killing it.
10. **Built for Claude Code.** Ships subagent definitions (builder in its own git worktree, read-only critics, playtester) with per-role models and tool allowlists, hooks that re-inject `STATUS.md` after every compaction and snapshot state before it, and a driver that runs each heartbeat as a fresh headless session for multi-day runs. It is designed around the model's real limits: no image, audio or video generation, no hearing or watching video - art is made through Blender, SVG and procedural code, audio through synthesis and MIDI, and critics judge renders, frame strips and spectrograms.
11. **Everything headless.** Blender, Unreal, Unity, Godot and web are driven from scripts, with screenshots, turntables and video as the critic's evidence. All memory lives in a `studio/` folder so the run survives context resets, and a dashboard shows progress live.

```
.claude/skills/gauntlet-studio/
├── SKILL.md                     # intake flow, bar rules, entry point
├── agents/                      # subagents installed into the game project's .claude/agents/
│   ├── studio-builder.md        # builds one ticket, own worktree
│   ├── experience-critic.md     # coach / judge / coherence, read-only, images only
│   ├── code-critic.md           # ticket / architecture / audit, read-only
│   └── playtester.md            # plays via the step-play harness
├── templates/                   # CLAUDE.md, settings.json hooks, hook scripts, drive.sh
└── references/
    ├── brief-template.md        # the Game Brief the user approves
    ├── claude-code.md           # setup, roles -> subagents + models, hooks, heartbeat driver, model limits
    ├── context.md               # files as memory, STATUS/TRACKER, context packs, return contracts
    ├── director.md              # heartbeat, decomposition, routing, milestones, initiative, scope control
    ├── gauntlet.md              # capped rounds, code critic, coach, champion, held-out judge, debt
    ├── departments.md           # every department: builds, evidence, bar, verify
    ├── endurance.md             # ticket tiers, cheap-first gates, calibrated bars, week-long runs
    ├── engines.md               # headless Blender, Unreal, Unity, Godot, web + capture
    ├── state.md                 # the studio/ folder, ticket and heartbeat formats, resume
    └── feedback.md              # Release Candidate handoff, human playtest, feedback -> patch cycles
```

## Why a bar and not a rubric

A rubric asks the agent to grade itself against words it wrote. A bar makes it compare against something that already exists and is undeniably good.

The skill will not accept a vague bar. It checks three things before it writes anything:

- **Named.** A specific thing, not a category.
- **Fetchable.** The critic can screenshot it, read it, run it, or open it. If the agent cannot get the reference, it hallucinates the comparison and approves everything.
- **Comparable.** Both can sit side by side and a judge can pick one.

## Examples

```
/gauntlet-loop a landing page for my running brand, dark and green, has to feel alive
```
Bar becomes a specific brand's live campaign page, screenshotted at desktop and mobile.

```
/gauntlet-loop a 2000 word explainer on vector databases for non-engineers
```
Bar becomes a named writer's actual published posts, judged on which one a non-engineer understands faster.

```
/gauntlet-loop a CLI that formats JSON logs
```
Bar becomes a named tool's implementation plus its benchmark, so taste and a number both have to win.

## Works with any agent

`/loop` and `ultracode` are Claude Code features. `/loop` reruns a prompt until you stop it, and `ultracode` opts a turn into multi-agent orchestration.

For any other agent, the skill swaps those two lines for plain instructions: keep looping until the critic picks ours, and run the builders and critics as parallel subagents. The structure is identical.

## What breaks it

- A vague bar. The critic invents a comparison and approves everything. By far the most common failure.
- The builder judging its own work. The critic needs fresh context and no knowledge of how hard the builder tried.
- A soft critic. Give it a binary job, not a score.
- A fixed round count. The exit is winning, or you calling it. (For a single piece. At the scale of a whole game, `gauntlet-studio` caps rounds on purpose and moves the rest of the quality work to held-out judges and polish passes - see above.)

## Credit

The gauntlet loop technique is **[Matt Shumer's](https://github.com/mshumer)**. He built [Claude of Duty](https://github.com/mshumer/Claude-of-Duty), wrote the [original prompt](https://github.com/mshumer/Claude-of-Duty/blob/main/prompt.md), and named the loop. Every idea underneath this skill - the harsh critic, the blind comparison, the refusal to stop until the work wins - comes from that prompt.

This repo is not the technique. It is a skill that writes a gauntlet loop prompt for you, for any goal, so you do not have to hand-write one each time.

Related reading: [Anthropic on building effective agents](https://www.anthropic.com/engineering/building-effective-agents), which covers the evaluator pattern the loop is built on.

## License

CC BY 4.0. Free to use with attribution.

Skill by Jay E at [RoboNuggets](https://robonuggets.com). Technique by Matt Shumer.
