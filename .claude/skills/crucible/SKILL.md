---
name: crucible
description: Turns a game idea into a fully autonomous, multi-agent game studio run. Interviews the user briefly, writes a Game Brief they approve or edit, then launches a Game Director that breaks the concept into tickets, routes them to departments (design, code, 3D/Blender, tech art, animation, audio, level, UI, QA), runs every ticket through a builder / verifier / two-critic gauntlet (blind experience critic vs shipped games, code critic vs architecture and reference repos), adds what the genre needs on its own initiative, and drives milestones to a complete Release Candidate in Unreal, Unity, Godot or web. Then it hands the game to the human, waits for playtest feedback, and runs patch cycles on it until the human says it is done. Triggers on "/crucible", "build a game", "make me a game", "game studio loop", "autonomous game dev".
---

# Crucible

The gauntlet loop, scaled up to a whole game studio.

One user pitch goes in. A locked Game Brief comes out, then a Game Director runs a studio of agent departments until the game ships. Nothing is merged on the builder's word: every piece of work passes machine checks and fresh critics, and the pieces that matter most have to beat a real shipped game in a blind comparison.

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

1. **Probe the machine** before promising anything. Silently check: GPU or software rendering (Xvfb, lavapipe/llvmpipe), free disk, installed engines and versions (Blender, Godot, Unreal, Unity), licences that need credentials (Unity), ffmpeg, a browser for web builds, network access to fetch bars (video sites, store pages, repos), Python audio/image libraries (numpy, scipy, Pillow), MIDI rendering (fluidsynth + a soundfont), and whether any external image/audio/3D generation tool is connected (MCP server or CLI). Claude itself cannot generate images, audio or video, nor hear audio or watch video - the plan must not depend on it (`references/claude-code.md`). Write it to `studio/MACHINE.md`. An engine that cannot build **and capture screenshots/video** headlessly here is not offered - or it is offered with exactly what the user must install first.
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

On OK, read and follow, in this order:

- `references/context.md` - context engineering: files are memory, STATUS.md and the TRACKER.md checklist, context packs, 5-line return contracts, fresh context per heartbeat. Read this first; it governs how you read everything else.
- `references/claude-code.md` - how the studio runs in Claude Code: setup (install the subagents, hooks and `CLAUDE.md` into the game project), which subagent and model plays which role, the heartbeat driver, and the model's real limits (no image/audio/video generation, no hearing, no video). Do the setup in the first heartbeat.
- `references/director.md` - the Game Director's heartbeat, decomposition, milestones, initiative, scope control.
- `references/departments.md` - every department's builder, its bar, its verifier, its critic.
- `references/gauntlet.md` - the per-ticket gauntlet: capped rounds (hero 3, core 2, bulk 1), Code critic, coach critic, champion, held-out judge, WON / PASSED / FAILED, debt and polish passes. This is the quality engine.
- `references/engines.md` - how agents drive Unreal, Unity, Godot, Blender and the web headlessly, and how they capture evidence for critics.
- `references/state.md` - the `studio/` folder that holds all memory, so the run survives context resets.
- `references/endurance.md` - ticket tiers, cheap-first gates, model tiering, calibrated bars, stall economics, running for a week and surviving usage limits.
- `references/feedback.md` - the Release Candidate handoff, waiting for the human, and turning their feedback into bars, tickets and patch cycles.

**The heartbeat driver.** Heartbeats need something that wakes the Director even after a session ends or a usage limit hits: `tools/drive.sh` (a fresh headless session per heartbeat, for multi-day runs), a scheduled Routine (cloud), or a self-paced `/loop` (interactive). Details and trade-offs in `references/claude-code.md`. At handoff the Director stops the driver itself; how the human gets back in and the driver restarts is in `references/claude-code.md`.

Department fan-out uses parallel `Agent` calls to the studio subagents, run in the background. If the user has opted into multi-agent orchestration (Workflow / `ultracode`), ticket batches may run as workflows. On agents other than Claude Code: "Run one Director heartbeat at a time from the studio files. Run builders and critics as separate subagents with fresh context. Stop and wait for the human when the Release Candidate is handed off."

## Bar rules for games

A bar is a **named shipped game**, narrowed to the exact thing being judged, that the critic can actually **fetch** (official trailer, gameplay capture at a timestamp, store screenshots, a press-kit render, a GDC talk, a public repo) and **compare** blind.

- "Hades' dash feel, gameplay capture 0:40-1:10" works. "Good combat feel" does not.
- "A character from Hi-Fi Rush, press-kit render, front 3/4 view" works. "Stylised character" does not.
- Every department gets its own bar from the brief's reference games.
- Code gets its own bar too: a named reference implementation the Code critic can open (Epic's Lyra, Unity's official samples, Godot demo projects, a named open-source game). Pick the hardest bar the agent can genuinely reach. Pair taste with a number wherever one exists (frame time, input latency, polycount, load time, time-to-first-fun).

## What breaks an autonomous studio

- **The Director building.** The Director plans, routes, merges and cuts. It never writes a ticket's output itself.
- **Endless revision rounds.** After two or three rounds, revising mostly optimises for the critic, not the player. Rounds are capped per tier; a held-out judge decides; what falls short becomes debt for a polish pass with fresh eyes.
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
