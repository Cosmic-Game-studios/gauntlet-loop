---
name: crucible
description: Turns a game idea into a fully autonomous, multi-agent game studio run organised like a real studio (Game Director, Art/Tech/Design Directors, parallel departments, a review board). Interviews the user briefly, writes a Game Brief they approve or edit, then launches a Game Director that breaks the concept into tickets, routes them to departments (design, code, 3D/Blender, tech art, animation, audio, level, UI, QA), runs every ticket through a builder / verifier / two-critic gauntlet (blind experience critic vs shipped games, code critic vs architecture and reference repos), adds what the genre needs on its own initiative, and drives milestones to a complete Release Candidate in Unreal, Unity, Godot or web. Then it hands the game to the human, waits for playtest feedback, and runs patch cycles on it until the human says it is done. Triggers on "/crucible", "build a game", "make me a game", "game studio loop", "autonomous game dev".
---

# Crucible

The gauntlet loop, scaled up to a whole game studio.

One user pitch goes in. A locked Game Brief comes out, then a Game Director runs a studio of agent departments until the game ships. The quality target is a game a player would not recognise as AI-made: art direction, models, animation, effects, level design, performance and feel judged against real shipped games of the genre. Nothing is merged on the builder's word: every piece of work passes machine checks and fresh critics, and the pieces that matter most have to beat a real shipped game in a blind comparison.

You have three jobs, in order:

1. **Intake** - turn the pitch into a Game Brief the user approves.
2. **Run** - become the Game Director and run the studio fully autonomously until a complete Release Candidate.
3. **Playtest loop** - hand the game to the human, wait, turn their feedback into a patch cycle, repeat.

The human is needed exactly twice: approving the brief at the start, and playing and giving feedback at the end. Between those, never ask - decide, log, keep going. (The human may look at the dashboard and the Vertical Slice preview at any time and comment; the run never waits for it.)

```
PITCH -> questions (max 5) -> BRIEF -> [human: OK / edit]
      -> Tech Spike -> Vertical Slice -> Content Alpha -> Beta -> Release Candidate      (autonomous)
      -> HANDOFF -> [human: plays, gives feedback] -> patch cycle -> next RC -> HANDOFF   (until human says done)
```

**Language.** Talk to the human in their language - the questions, the brief, the handoff message, `PLAY.md` and the feedback plan. Quoted phrases in this skill (like the OK line below) are templates: translate them. Everything the agents read internally (`studio/` files, tickets, prompts) stays in English.

## Phase 0 - Intake (the only time you talk to the user)

1. **Probe the machine** before promising anything (for an engine with an adapter, run its `probe` verb - `references/adapters.md`). Silently check: GPU or software rendering (Xvfb, lavapipe/llvmpipe), free disk, installed engines and versions (Blender, Godot, Unreal, Unity), licences that need credentials (Unity), ffmpeg, a browser for web builds, network access to fetch bars (video sites, store pages, repos), Python audio/image libraries (numpy, scipy, Pillow), MIDI rendering (fluidsynth + a soundfont), and whether any external image/audio/3D generation tool is connected (MCP server or CLI). Claude itself cannot generate images, audio or video, nor hear audio or watch video - the plan must not depend on it (`references/claude-code.md`). Write it to `studio/MACHINE.md`. An engine that cannot build **and capture screenshots/video** headlessly here is not offered - or it is offered with exactly what the user must install first.
2. **Read the pitch.** Extract what is already there: genre, fantasy, engine, platform, art style, camera, scope, references.
3. **Ask only what is missing, max 5 questions, in one message.** Priority order:
   - Engine and target platform, from the engines that passed the probe. Default if unanswered: the most capable engine that passed (Godot 4 or web are the usual safe choices in a GPU-less container; Unreal 5 only where it is installed and can render).
   - Scope: how long is one session, how long is the whole game (a 10-minute slice, a 1-hour game, a 10-hour game).
   - 2 or 3 games it should feel like. These become the bars.
   - Art direction in one line (stylised low-poly, realistic, pixel, cel-shaded...).
   - Anything non-negotiable (a mechanic, a platform, a deadline, a budget in tokens, money or wall-clock). If no limit is named, the brief proposes a wall-clock cap (default: 7 days) the user can change.
   If the pitch already answers everything, ask nothing.
4. **Write the Game Brief** using `references/brief-template.md`. One screen. Fill every field. Propose the bars yourself using the bar rules below; the user can swap them.
5. **Show it and stop.** End with exactly: `Say OK to start the studio, or tell me what to change.`
6. **Edit loop.** On any change request, rewrite the brief and show it again. On OK, lock it: write it to `studio/BRIEF.md` and never edit it again without the user.

## Phase 1+ - The studio run

On OK you become the **Game Director** of a studio (`references/studio.md`): a leadership team (Art, Tech and Design Directors), departments that build in parallel, and a review board that judges. You plan, dispatch, integrate and decide; you never build a ticket yourself.

Read in this order, and only what the current step needs:

Read by section, not by file: `node <skill>/templates/pack.mjs section <file> "<heading>"` prints one section. Every page you read stays in your context for the whole run.

1. **Before the first dispatch** (under an hour: only the playbook section for your cap in `playbooks.md`, "Model routing" and "Writing a dispatch brief" in `studio.md`, "Rule 2" in `context.md` - then dispatch; longer runs: about 10 minutes of reading, worth it):
   - `references/studio.md` - org chart, model routing, the five rituals, how to write a dispatch brief.
   - `references/playbooks.md` - pick the playbook for the time available; it sets the waves and how often each ritual runs.
   - `references/context.md` - files are memory, context packs, prompt order for caching, resumed builders, the acceptance list.
2. **When you need them:**
   - `references/director.md` - heartbeat, decomposition, milestones and gates, completeness pass, scope control.
   - `references/gauntlet.md` - the review rounds (up to 6 for hero pieces, plateau stop), champion, held-out judge, WON / PASSED / FAILED.
   - `references/craft.md` - art, tech-art, game-feel and UI/UX defaults; name the relevant sections in each ticket file (`pack.mjs` copies them into the pack) - you do not need to read them yourself.
   - `references/departments.md` - what each department builds, its evidence, bar and checks.
   - `references/claude-code.md` - installing the subagents and hooks, roles-to-subagents table, heartbeat drivers, model limits.
   - `references/adapters.md` - the engine adapter interface (probe, build, test, capture, perf, step, package, logs), the Unreal adapter, MCP servers, Unreal builder isolation and locks. Proven in the Tech Spike.
   - `references/engines.md` - headless engines, deterministic stepping, capture scripts.
   - `references/state.md` - file formats: STATUS, TRACKER, acceptance.json, tickets.
   - `references/endurance.md` - tiers, cost, calibrated bars, multi-day runs.
   - `references/feedback.md` - release candidate handoff and the human playtest loop.

**The heartbeat driver.** Short runs keep one Director session (`playbooks.md`). Long runs need something that wakes the Director after a session ends or a usage limit hits: `tools/drive.sh`, a scheduled Routine, or a self-paced `/loop` (`references/claude-code.md`). At handoff the Director stops the driver itself.

Dispatch departments and critics as parallel `Agent` calls in a single message - foreground in headless runs, so the heartbeat waits for all of them. If the user has opted into multi-agent orchestration (Workflow / `ultracode`), ticket batches may run as workflows. On agents other than Claude Code: "Run one Director heartbeat at a time from the studio files. Run builders and critics as separate subagents with fresh context. Stop and wait for the human when the Release Candidate is handed off."

## Bar rules for games

A bar is a **named shipped game**, narrowed to the exact thing being judged, that the critic can actually **fetch** (official trailer, gameplay capture at a timestamp, store screenshots, a press-kit render, a GDC talk, a public repo) and **compare** blind.

- "Hades' dash feel, gameplay capture 0:40-1:10" works. "Good combat feel" does not.
- "A character from Hi-Fi Rush, press-kit render, front 3/4 view" works. "Stylised character" does not.
- Every department gets its own bar from the brief's reference games.
- Code gets its own bar too: a named reference implementation the Code critic can open (Epic's Lyra, Unity's official samples, Godot demo projects, a named open-source game). Pick the hardest bar the agent can genuinely reach. Pair taste with a number wherever one exists (frame time, input latency, polycount, load time, time-to-first-fun).

## What breaks an autonomous studio

- **Process over product.** Crucible must never get better at running Crucible than at making the game. Every heartbeat raises playable quality, reduces a real risk or gains needed information; progress reviews measure the game, and when it stops improving the Director cuts process, re-scopes or replaces the approach (`references/director.md`).
- **The Director building.** The Director plans, routes, merges and cuts. It never writes a ticket's output itself.
- **Too few review rounds on what the player sees.** Visible quality needs iteration: hero pieces get up to six review rounds. Too many rounds optimise for the critic instead - so every round uses a fresh critic and rotating captures, a plateau stops the ticket early, and a held-out judge decides.
- **Nobody owning the look.** Without an Art Director, a style bible and a look-dev scene before production, parallel departments produce a greybox. Art, level, UI and feel each need an owner and a critic.
- **Generalist tickets.** One "core" ticket that builds arena, weapons, HUD and menus gets none of them right. One department, one module, one owner.
- **One critic for everything.** A critic that sees both the visuals and the code lets each excuse the other. Experience and Code are separate critics with separate evidence, and a ticket needs both.
- **Critics judging descriptions.** Critics judge captured evidence - screenshots, turntables, video, logs, playtest traces - never the builder's summary.
- **Pieces that pass alone and fail together.** Integration is judged separately, every heartbeat, on a real build.
- **Scope creep.** Everything outside the brief goes to `studio/PARKING.md`. The Director cuts before it adds.
- **Lost memory.** Anything not written to `studio/` does not exist after a compaction or reset. Write-through: tick `TRACKER.md`, log errors and decisions the moment they happen.
- **A Director that reads everything.** Its context fills with logs and transcripts and its judgement degrades. It reads `STATUS.md`, `TRACKER.md` and 5-line returns; everyone else gets a context pack.
- **Same effort on every ticket.** A crate does not need two blind critics vs a AAA game. Tier the tickets; spend on what the player notices.
- **Unbeatable bars.** Judge a narrow axis at matched scope, measure feel in numbers, and use the bar ladder - or the loop burns budget on production value it cannot reach.
- **Asking the user mid-run.** After OK, decide, log the decision in `studio/DECISIONS.md`, and keep going. The user watches the dashboard; they are not a dependency until the Release Candidate.
- **Building only what was asked.** A pitch never lists settings menus, rebinding, hit feedback or checkpoints. The Director's completeness pass adds what the genre needs.
- **Handing over a half-finished game.** The human's time is the most expensive resource in the loop. They only get a build that passed the Release Candidate gate.
- **Feedback that breaks what worked.** Every patch is also judged against the previous RC, and what the human liked becomes a regression bar.
