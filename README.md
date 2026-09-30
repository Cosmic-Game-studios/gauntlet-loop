<p align="center">
  <img src="assets/banner.png" alt="gauntlet loop" width="100%">
</p>

# Gauntlet Loop

A skill that turns any goal into one paste-ready prompt. That prompt makes your agent build **everything you described**, then improve it piece by piece against a real quality bar - a builder and a separate harsh critic on each piece, compared blind, in bounded rounds - until the work is complete and beats the bar.

Most agent output stops at "good enough", or ships half of what was asked, because nothing holds it to a standard or counts what is missing. This does both.

> The gauntlet loop is [Matt Shumer's](https://github.com/mshumer) idea. He wrote the original prompt and named the technique while building [Claude of Duty](https://github.com/mshumer/Claude-of-Duty). This repo packages that pattern as a reusable skill and extends it.

## Quick start

```
git clone https://github.com/robonuggets/gauntlet-loop
```

Copy the skills, the critic subagent and the workflow into your project:

```
mkdir -p your-project/.claude
cp -r gauntlet-loop/.claude/skills gauntlet-loop/.claude/agents gauntlet-loop/.claude/workflows your-project/.claude/
```

Only want the prompt writer? `gauntlet-loop/.claude/skills/gauntlet-loop` on its own is enough.

Then in your agent:

```
/gauntlet-loop build me a pricing page for my SaaS
```

It offers you 2 or 3 quality bars to aim at, you pick one, and it hands back a single prompt you paste into a fresh session.

## What's included

```
.claude/skills/gauntlet-loop/
├── SKILL.md      # the skill
├── game-dev.md   # complete games: bars, captures, visual quality, engine notes (read only for game goals)
└── plan.md       # running the loop from a Wayfinder map or spec (read only when there is a plan)
.claude/workflows/gauntlet-loop.js   # the same loop as a Claude Code workflow
.claude/agents/gauntlet-critic.md    # read-only blind critic the workflow uses
.claude/skills/wayfinder, to-spec, grilling, domain-modeling,
               research, prototype, setup-matt-pocock-skills   # bundled from mattpocock/skills (MIT)
THIRD_PARTY.md    # source and license of the bundled skills
README.md
LICENSE           # CC BY 4.0, for this repo's own files
```

## How it works

1. **You describe what you want.** Anything: a game with its engine and look, a site, an essay, a CLI tool, a research brief. Describe as much as you like.
2. **It offers 2 or 3 bars.** Each one is a specific, real thing your agent can actually fetch and compare against. Not "award-winning design", but a named page, a named game, a named repo.
3. **You pick one.** It writes one prompt, with your description carried over word for word, and stops.
4. **You paste it into a fresh session** (or, in Claude Code, run it as a workflow). The agent then:
   - turns your description into a checklist;
   - builds a rough version of all of it first;
   - improves it piece by piece against the bar;
   - does not stop until everything you described exists and works.

The critic is the part that makes it better. It is a separate agent with fresh context. The lead captures your work and the bar the same way, shuffles them into an unlabeled A and B and keeps the key, so the critic really is blind. Every critic gets the same short budget: a pick, one or two sentences of evidence, and at most three gaps, biggest first. Not a score out of 10, which drifts upward every round. A pick.

## Complete first, then better

Your description is copied into the prompt **word for word** and turned into `CHECKLIST.md`: one line per thing you asked for, each with how it will be shown to work. What you described is the minimum; the agent may add more where it makes the result better, never instead of something on your list.

The agent builds **breadth first**: a rough, working version of every checklist item, end to end, before anything gets polished. That is why the round budget can only ever cost polish, never a missing feature.

**Done** means:
- every checklist item passes with evidence the agent saw by running it;
- nothing is a placeholder, stub or TODO;
- a fresh agent that never saw the work has checked your description line by line against the result and found nothing missing.

The run ends with `DONE.md`: the checklist with evidence, what beat the bar, what is still open, and how to run it.

## The round budget

Rounds are bounded so the loop moves fast and ends:

- **Each piece gets up to 6 rounds, and up to 10 while rounds still pay off.** After round 6, a piece only goes on if the last round brought a visible or measurable gain.
- **The same gap twice running changes the approach.**
- **A round that made things worse is undone**, so every piece keeps its best version.
- **A win only counts if every checklist item that passed before still passes.**
- **The whole thing then faces the bar for up to 3 rounds**, each sending its biggest gap back to its piece.

Name your own round budget, time limit or cost limit and the prompt uses yours.

## What's better than the original

The [original prompt](https://github.com/mshumer/Claude-of-Duty/blob/main/prompt.md) proved the core idea. A harsh, separate critic comparing side by side with the real thing pushes quality far beyond a single pass. Running it on real projects also showed where it falls short:

| Original | This loop |
|---|---|
| "At the level of the most recent Call of Duty games" - a category, not a thing | A named, fetchable, comparable bar, captured before round one for every piece |
| No list of what must exist; polished pieces next to missing ones | Your description verbatim → checklist → everything built rough first → fresh completeness check |
| "Compare them side by side blind" - but the critic takes the screenshots, so it knows | The lead captures and shuffles; the critic sees only an unlabeled A/B |
| Critics with no memory contradict each other round to round | Each critic sees the gaps already named |
| "Don't stop until utterly wowed" - no end, and effort sprawls | Equal critic budget, 6–10 rounds by gain, 3 whole-thing rounds |
| Improvements can break features that worked | A round only counts if the checklist still passes; worse rounds are undone |
| Parallel builders edit the same files | Each builder owns its files |
| Done when the agent says so | Done by evidence, a fresh reader, and `DONE.md` |
| "Visually beautiful" as a wish | `STYLE.md` from the bar, named default looks to avoid, no default engine look in the final build |

## Games

Describe your game concept, the engine, and how it should look. The skill asks one more thing along with the bars: which assets may be used (starter content, free libraries, your own art, or only what the agent makes). That decides how high the visual bar can reach.

Agents cannot watch video, hear sound or play in real time, so the prompt gives every piece a way to be judged:
- stills from fixed cameras;
- frame strips of the same scripted input on both sides;
- measured numbers for feel (dash length, time to top speed, hit-stop);
- a stepping hook that makes captures reliable;
- a frame budget as the measurable half.

The game counts as complete when a fresh agent can play it from the main menu to the end and back without hitting anything broken or placeholder. `game-dev.md` has the details, visual-quality rules and engine notes for Unreal Engine 5, Unity 6, Godot 4 and web games.

```
/gauntlet-loop Top-down twin-stick shooter in Unreal Engine 5.4 for PC. Neon cyberpunk city at night, rain, wet reflections. The player has a dash and two weapons... It should look like Ruiner.
```

## Plan first with Wayfinder

For anything bigger than one session, plan first with [Matt Pocock's Wayfinder](https://github.com/mattpocock/skills). It is bundled here with `to-spec` and the skills Wayfinder calls. When the plan is done, let the gauntlet loop build it. Run `/setup-matt-pocock-skills` once per repo first:

```
/wayfinder a vertical slice of my Unreal 5 action game
/to-spec
/gauntlet-loop <spec link>
```

Wayfinder plans and never builds; a cleared map hands off to execution, which is where this skill starts. What the loop takes from the plan:
- its decisions stay settled;
- its pieces and bars drive the loop;
- its out-of-scope list stays out;
- the spec's user stories become the checklist.

If the plan still has open questions, the skill sends you back to Wayfinder instead of looping on guesses. Details, including a one-line fix for long grilling rounds, are in `plan.md`.

## Run it as a Claude Code workflow

In Claude Code the same loop also runs as a workflow instead of a pasted prompt:

- The checklist is written and everything is built rough first.
- The bar is captured before round one.
- The A/B key stays inside the script, and the critic can only read the files it is given.
- Every critic gets the same budget, and the same round budget applies.
- Captures run only while no builder is editing, so they never see a half-built tree.
- The checklist gate, the whole-thing comparison and the fresh completeness check all run, and the run ends with `DONE.md`.
- Every round is logged under `gauntlet/progress/`. A run that hits its token budget stops cleanly with a summary.

Ask for it after the skill writes the prompt ("run it as the gauntlet-loop workflow"), or end a pasted prompt with "Run this with the gauntlet-loop workflow, passing this whole prompt as the brief." It runs many agents, so it spends real tokens. A token target for the turn (for example "+2m") becomes its budget.

## Works with any agent

`/loop` and `ultracode` are Claude Code features. `/loop` reruns a prompt on an interval or lets the model pace itself, and `ultracode` opts a turn into multi-agent orchestration.

For any other agent, the skill swaps those two lines for plain instructions: keep looping on each piece until the critic picks ours or its rounds are spent, and run the builders and critics as parallel subagents. The structure is identical.

## What breaks it

- **A vague bar.** The critic invents a comparison and approves everything. By far the most common failure.
- **A summary instead of your description.** The checklist inherits whatever the summary dropped.
- **Polish before completeness.** Rounds run out on a few beautiful pieces while others were never built.
- **The builder judging its own work.** The critic needs fresh context and no knowledge of how hard the builder tried.
- **Blindness nobody engineered.** A critic that takes its own screenshots knows which one is yours.
- **A soft or rambling critic.** Give it a binary job and the same short budget every round.
- **Wins that break things.** A prettier piece that broke a feature or the frame budget is a step back.
- **Done by assertion.** "Implemented" is not "works".

## Credit

The gauntlet loop technique is **[Matt Shumer's](https://github.com/mshumer)**. He built [Claude of Duty](https://github.com/mshumer/Claude-of-Duty), wrote the [original prompt](https://github.com/mshumer/Claude-of-Duty/blob/main/prompt.md), and named the loop. The harsh critic, the blind comparison and the refusal to settle for less than the real thing all come from that prompt.

This repo is not the technique. It is a skill that writes a gauntlet loop prompt for you, for any goal, and extends the loop so it finishes what you asked for.

Wayfinder, to-spec and the skills they call are **[Matt Pocock's](https://github.com/mattpocock/skills)**, bundled under the MIT License.

Related reading: [Anthropic on building effective agents](https://www.anthropic.com/engineering/building-effective-agents), which covers the evaluator pattern the loop is built on.

## License

CC BY 4.0 for this repo's own files. Free to use with attribution. The bundled skills keep their MIT License.

Skill by Jay E at [RoboNuggets](https://robonuggets.com). Technique by Matt Shumer.
