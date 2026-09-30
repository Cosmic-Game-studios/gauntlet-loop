<p align="center">
  <img src="assets/banner.png" alt="gauntlet loop" width="100%">
</p>

# Gauntlet Loop

A skill that turns any goal into one paste-ready prompt. That prompt makes your agent direct a long build. It builds **everything you described** first, then improves it piece by piece against a real quality bar - a builder and a separate harsh critic on each piece, compared blind, in bounded rounds - until the work is complete and beats the bar. Its memory lives in files, so a long run does not lose the plot when its context is compacted.

Most agent output stops at "good enough", or ships half of what was asked, because nothing holds it to a standard or counts what is missing. This does both.

> The gauntlet loop is [Matt Shumer's](https://github.com/mshumer) idea. He wrote the original prompt and named the technique while building [Claude of Duty](https://github.com/mshumer/Claude-of-Duty). This repo packages that pattern as a reusable skill and extends it.

## Quick start

```
git clone https://github.com/robonuggets/gauntlet-loop
```

Copy the skills into your project:

```
mkdir -p your-project/.claude
cp -r gauntlet-loop/.claude/skills your-project/.claude/
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
4. **You paste it into a fresh session**, or let the skill run it here. The agent becomes the director and:
   - writes the goal to a file it re-reads every round;
   - turns your description into a checklist;
   - builds a rough version of all of it first;
   - improves it piece by piece against the bar;
   - does not stop until everything you described exists and works.

The critic is the part that makes it better. It is a separate agent with fresh context. The director captures your work and the bar the same way, shuffles them into an unlabeled A and B and keeps the key, so the critic really is blind. Every critic gets the same short budget: a pick, one or two sentences of evidence, and at most three gaps, biggest first. Not a score out of 10, which drifts upward every round. A pick.

## Complete first, then better

Your description is copied into the prompt **word for word** and turned into `CHECKLIST.md`: one line per thing you asked for, each with how it will be shown to work. What you described is the minimum; the agent may add more where it makes the result better, never instead of something on your list.

The agent builds **breadth first**: a rough, working version of every checklist item, end to end, before anything gets polished. That is why the round budget can only ever cost polish, never a missing feature.

**Done** means:
- every checklist item passes with evidence the agent saw by running it;
- nothing is a placeholder, stub or TODO;
- a fresh agent that never saw the work has run it, checked your description line by line against what it saw, and found nothing missing.

The run ends with `DONE.md`: the checklist with evidence, what beat the bar, what is still open, and how to run it.

## Long runs: a director with files for memory

Every compaction of the context loses details - often the ones that mattered. So the lead agent is a **director**: it plans, briefs builders and critics as subagents, and keeps the record, but never builds or judges itself. Its memory is in files:

- **`GOAL.md`** holds your description word for word, the bar and the loop's rules. It is written once and never rewritten; only your own decisions get appended.
- **`STATUS.md`** is the one page you and the director both read. It has a score row per round (checklist items passing, pieces won, key numbers), then each piece with its status, gaps and the agent working on it. It is rewritten every round, not appended. The last three rounds stay in detail, anything older folds into one line per piece, and it stays under 80 lines.
- **Re-read every round.** The director re-reads both files at the start of every round and on every resume, and briefs every subagent from the files, not from memory. Builders reply in five lines or fewer.

This is measured. In two 30-minute benchmark runs on the same browser game, a lead with its state in files and short returns was compared with the original loop's single lead context:

| | Original loop, one lead context | Director with state files |
|---|---|---|
| Tokens processed (run 1 / run 2) | 12.2 M / 14.8 M | **6.4 M / 10.0 M** |
| Cost at list price | $7.89 / $9.11 | **$5.88 / $8.34** |
| Functional checks, run 2 (two resolutions) | 14/15, 13/15 | **15/15, 14/15** |
| Survives a restart | no | **yes** |
| Playability (blind judges) | 5 | 5 |

The heavier studio structure that run also tried - departments, leads per discipline - added cost without a measured gain, so it is not part of this loop.

## The round budget

Rounds are bounded so the loop moves fast and ends:

- **Each piece gets up to 6 rounds, and up to 10 while rounds still gain.** A round gains when a number moved toward the bar or last round's biggest gap is no longer named, with nothing broken. After round 6, a piece only goes on if its last round gained.
- **The same biggest gap two rounds in a row changes the approach.**
- **A round that made things worse is undone and still uses its round.** When it is unclear, a fresh critic picks blind between this round and the last. Every piece keeps its best version.
- **A win is confirmed with the sides swapped.** A second critic sees the same pair with A and B swapped and must pick ours too, so one lucky pick cannot end a piece.
- **A win only counts if every checklist item that passed before still passes.**
- **The whole thing then faces the bar for up to 3 rounds**, each sending every gap it names back to its piece for one more round.

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
| Done when the agent says so | Done by evidence, a fresh reader, and `DONE.md` with the score from first rough version to last round |
| One lead context that fills up and compacts; a restart loses the run | A director that keeps `GOAL.md` and a bounded `STATUS.md`, re-reads them every round, and briefs from files - measured: 32-48% fewer tokens, more checks passed |
| Everything must be specified up front | Your description is the minimum; open points are filled creatively in its spirit and marked on the checklist so you can change them |
| "Visually beautiful" as a wish | `STYLE.md` from the bar, named default looks to avoid, no default engine look in the final build |

## What is measured

**Long runs (30 minutes, a browser shooter).** A director with state files and short returns was compared with the original loop's single lead context. It used 32-48% fewer tokens, cost less, passed more functional checks and survived restarts (table above).

**Short runs (10 minutes, Claude Sonnet 5.5, same brief for every method, objective checks by a script validated against a reference implementation):**

| Brief | Original prompt | v4 (director) | v5 (v4 + use the budget, one critic for look and code) |
|---|---|---|---|
| Tetris, 30 checks | 29/30, $0.59 | 30/30, $1.03 | - |
| Tetris with modes, replays, remapping, 40 checks | **40/40**, $0.79 | 33/40, $1.56 | 39/40, **$0.65** |

What this shows:
- v5 beats v4 on completeness and cost, so its changes stay.
- In runs this short, the original prompt is not beaten. The model builds the whole brief in one pass, and the loop's process has no time to pay off.
- The loop's measured gains so far are from long runs: context, cost and restarts.
- Blind judges in the first short run preferred the original's look and this loop's code.

The next measurement worth making is a longer run on a brief too big for one pass. That is where this loop's process is meant to earn its cost.

## Games

Describe your game concept, the engine, and how it should look. The skill asks one more thing along with the bars: which assets may be used (starter content, free libraries, your own art, or only what the agent makes). That decides how high the visual bar can reach.

Agents cannot watch video, hear sound or play in real time, so the prompt gives every piece a way to be judged:
- stills from fixed cameras;
- frame strips of the same moves as the bar's footage, driven on your side by the same scripted input every round;
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

## Prompts only

The skill ships no scripts and no workflow code. The loop is the prompt. In Claude Code, the prompt's last line lets Claude Code orchestrate the subagents itself; in any other agent, the portable last lines do the same.

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
- **Memory in the context.** A long run compacts and forgets the goal. The files carry it instead, and they stay short enough to re-read every round.

## Credit

The gauntlet loop technique is **[Matt Shumer's](https://github.com/mshumer)**. He built [Claude of Duty](https://github.com/mshumer/Claude-of-Duty), wrote the [original prompt](https://github.com/mshumer/Claude-of-Duty/blob/main/prompt.md), and named the loop. The harsh critic, the blind comparison and the refusal to settle for less than the real thing all come from that prompt.

This repo is not the technique. It is a skill that writes a gauntlet loop prompt for you, for any goal, and extends the loop so it finishes what you asked for.

Wayfinder, to-spec and the skills they call are **[Matt Pocock's](https://github.com/mattpocock/skills)**, bundled under the MIT License.

Related reading: [Anthropic on building effective agents](https://www.anthropic.com/engineering/building-effective-agents), which covers the evaluator pattern the loop is built on.

## License

CC BY 4.0 for this repo's own files. Free to use with attribution. The bundled skills keep their MIT License.

Skill by Jay E at [RoboNuggets](https://robonuggets.com). Technique by Matt Shumer.
